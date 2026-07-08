/**
 * Backfill de mentorados a partir do histórico da conta Asaas.
 * Varre TODAS as cobranças, identifica Elite / Partiu 10k pela descrição,
 * agrupa por cliente e cria/atualiza os mentorados com valor do contrato,
 * quanto falta pagar e parcelas vencidas.
 *
 * Campos manuais da Ana (RG, datas, imersão, brinde, origem) NUNCA são tocados.
 * Pré-requisito: migração 007 aplicada. Uso: node scripts/backfill-mentorados.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const ASAAS_KEY = (env.ASAAS_API_KEY || '').replace(/['"]/g, '');
const ASAAS_BASE = env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!ASAAS_KEY || !SUPA_URL || !SUPA_KEY) {
  console.error('Variáveis faltando no .env.local');
  process.exit(1);
}

const headers = { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json' };

function detectMentoria(description) {
  const d = (description || '').toLowerCase();
  if (d.includes('elite')) return 'elite';
  if (d.includes('partiu 10k') || d.includes('partiu10k')) return 'partiu10k';
  return null;
}

// 1. Varre todas as cobranças da conta
console.log('Varrendo cobranças da conta Asaas...');
const all = [];
let offset = 0, hasMore = true;
while (hasMore) {
  const res = await fetch(`${ASAAS_BASE}/payments?limit=100&offset=${offset}`, { headers });
  if (!res.ok) throw new Error(`Asaas payments: ${res.status} ${await res.text()}`);
  const data = await res.json();
  all.push(...(data.data || []));
  hasMore = data.hasMore;
  offset += 100;
  process.stdout.write(`\r  ${all.length}/${data.totalCount} cobranças`);
  await new Promise(r => setTimeout(r, 150));
}
console.log();

// 2. Agrupa por (mentoria, cliente)
const grupos = new Map();
for (const p of all) {
  if (p.deleted) continue;
  const mentoria = detectMentoria(p.description);
  if (!mentoria || !p.customer) continue;
  if (['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(p.status)) continue;
  const key = `${mentoria}|${p.customer}`;
  if (!grupos.has(key)) grupos.set(key, []);
  grupos.get(key).push(p);
}
console.log(`Encontrados ${grupos.size} mentorados (elite: ${[...grupos.keys()].filter(k => k.startsWith('elite')).length}, partiu10k: ${[...grupos.keys()].filter(k => k.startsWith('partiu10k')).length})`);

// 3. Busca os clientes e monta os upserts
let processados = 0;
for (const [key, pagamentos] of grupos) {
  const [mentoria, customerId] = key.split('|');
  const custRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, { headers });
  if (!custRes.ok) {
    console.warn(`  cliente ${customerId} falhou (${custRes.status}), pulando`);
    continue;
  }
  const cust = await custRes.json();

  const valorContrato = pagamentos.reduce((acc, p) => acc + Number(p.value || 0), 0);
  const pagas = pagamentos.filter(p => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'].includes(p.status));
  const valorPago = pagas.reduce((acc, p) => acc + Number(p.value || 0), 0);
  const vencidas = pagamentos.filter(p => p.status === 'OVERDUE').length;
  const endereco = [cust.address, cust.addressNumber, cust.complement, cust.province, cust.cityName, cust.state].filter(Boolean).join(', ');

  // Existe?
  const existRes = await fetch(
    `${SUPA_URL}/rest/v1/mentorados?select=id,financeiro_manual&mentoria=eq.${mentoria}&asaas_customer_id=eq.${customerId}`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  const existentes = await existRes.json();

  const contato = {
    nome: cust.name || 'Sem nome',
    email: cust.email || null,
    telefone: cust.mobilePhone || cust.phone || null,
    cpf: cust.cpfCnpj || null,
    updated_at: new Date().toISOString(),
  };
  const financeiro = {
    valor_contrato: valorContrato,
    valor_pago: valorPago,
    parcelas_vencidas: vencidas,
  };
  const autoFields = { ...contato, ...financeiro };

  let res;
  if (existentes.length > 0) {
    // Trava financeira: valores editados à mão não são sobrescritos
    const update = existentes[0].financeiro_manual ? contato : autoFields;
    res = await fetch(`${SUPA_URL}/rest/v1/mentorados?id=eq.${existentes[0].id}`, {
      method: 'PATCH',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(update),
    });
  } else {
    res = await fetch(`${SUPA_URL}/rest/v1/mentorados`, {
      method: 'POST',
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify([{
        mentoria,
        asaas_customer_id: customerId,
        endereco: endereco || null,
        cep: cust.postalCode || null,
        ...autoFields,
      }]),
    });
  }
  if (!res.ok) console.warn(`  upsert ${cust.name} falhou: ${res.status} ${await res.text()}`);

  processados++;
  process.stdout.write(`\r  ${processados}/${grupos.size} mentorados processados`);
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\n✅ Backfill concluído: ${processados} mentorados importados/atualizados.`);
