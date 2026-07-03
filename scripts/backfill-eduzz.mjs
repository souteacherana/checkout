/**
 * Backfill completo do histórico de vendas da Eduzz para a tabela eduzz_sales.
 *
 * A rota /api/admin/sync-eduzz só cobre os últimos 30 dias (timeout da Vercel).
 * Este script roda localmente sem limite de tempo e importa TODA a história.
 *
 * Pré-requisito: rodar scripts/migrations/001-eduzz-sales-columns.sql no Supabase.
 * Uso: node scripts/backfill-eduzz.mjs [ano-inicial]   (padrão: 2020)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// --- Carrega .env.local manualmente ---
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const { EDUZZ_CLIENT_ID, EDUZZ_CLIENT_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
if (!EDUZZ_CLIENT_ID || !EDUZZ_CLIENT_SECRET || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Variáveis faltando no .env.local');
  process.exit(1);
}

// --- Espelho de src/lib/eduzz.ts (mantenha em sincronia) ---
function fixMojibake(value) {
  if (!value) return null;
  if (!/[ÃÂ]/.test(value)) return value;
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('�') ? value : decoded;
}

function mapEduzzSale(sale) {
  return {
    id: String(sale.id),
    client_name: fixMojibake(sale.buyer?.name) || 'Desconhecido',
    client_email: sale.buyer?.email || 'Desconhecido',
    client_phone: sale.buyer?.phone || null,
    product_name: fixMojibake(sale.product?.name) || 'Desconhecido',
    value: sale.total?.value ?? 0,
    net_value: sale.netGain?.value ?? null,
    status: (sale.status || 'unknown').toLowerCase(),
    created_at: sale.createdAt || new Date().toISOString(),
    paid_at: sale.paidAt || null,
    payment_method: sale.paymentMethod || sale.payment?.method || null,
    installments: sale.installments || 1,
    utm_source: fixMojibake(sale.utm?.source) || null,
    utm_medium: fixMojibake(sale.utm?.medium) || null,
    utm_campaign: fixMojibake(sale.utm?.campaign) || null,
    utm_content: fixMojibake(sale.utm?.content) || null,
    utm_term: fixMojibake(sale.utm?.term) || null,
    sku: sale.product?.sku || null,
    offer_name: fixMojibake(sale.offer?.name) || null,
  };
}

async function getToken() {
  const res = await fetch('https://accounts-api.eduzz.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: EDUZZ_CLIENT_ID,
      client_secret: EDUZZ_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Eduzz auth falhou: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function fetchRange(token, startDate, endDate) {
  const sales = [];
  let page = 1, totalPages = 1;
  do {
    const url = `https://api.eduzz.com/myeduzz/v1/sales?page=${page}&startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (res.status === 429) {
      console.log('  rate limit, aguardando 5s...');
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    if (!res.ok) throw new Error(`Eduzz sales falhou: ${res.status} ${await res.text()}`);
    const data = await res.json();
    totalPages = data.pages || 1;
    if (data.items?.length) sales.push(...data.items);
    process.stdout.write(`\r  ${startDate} a ${endDate}: página ${page}/${totalPages} (${sales.length} vendas)`);
    page++;
    await new Promise(r => setTimeout(r, 250)); // gentil com a API
  } while (page <= totalPages);
  process.stdout.write('\n');
  return sales;
}

async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const res = await fetch(`${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/eduzz_sales?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Supabase upsert falhou: ${res.status} ${await res.text()}`);
    console.log(`  upsert: ${Math.min(i + 500, rows.length)}/${rows.length}`);
  }
}

const startYear = Number(process.argv[2]) || 2020;
const token = await getToken();
console.log('Autenticado na Eduzz.');

let total = 0;
const today = new Date().toISOString().split('T')[0];
for (let year = startYear; year <= new Date().getFullYear(); year++) {
  // Semestres para manter as janelas pequenas e retomáveis
  for (const [s, e] of [[`${year}-01-01`, `${year}-06-30`], [`${year}-07-01`, `${year}-12-31`]]) {
    if (s > today) break;
    const end = e > today ? today : e;
    const sales = await fetchRange(token, s, end);
    const rows = sales.filter(x => x.id != null).map(mapEduzzSale);
    if (rows.length) await upsert(rows);
    total += rows.length;
  }
}
console.log(`\n✅ Backfill concluído: ${total} vendas importadas/atualizadas.`);
