import { supabaseAdmin } from '@/lib/supabase-admin';

export type Mentoria = 'elite' | 'partiu10k';

export const MENTORIA_LABELS: Record<Mentoria, string> = {
  elite: 'Professores de Elite',
  partiu10k: 'Partiu 10k',
};

/** Rótulo do brinde muda por mentoria (planilha da Ana) */
export const BRINDE_LABELS: Record<Mentoria, string> = {
  elite: 'Caneca',
  partiu10k: 'Matéria',
};

export const MENTORIA_DURACAO_MESES = 6; // ambas: término = início + 6 meses

/**
 * Identifica a mentoria pela descrição da cobrança no Asaas.
 * Padrões reais da conta: "Parcela 3 de 12. Professores de Elite",
 * "Parcela 1 de 6. Mentoria Partiu 10k".
 */
export function detectMentoria(description?: string | null): Mentoria | null {
  const d = (description || '').toLowerCase();
  if (!d) return null;
  if (d.includes('elite')) return 'elite';
  if (d.includes('partiu 10k') || d.includes('partiu10k')) return 'partiu10k';
  return null;
}

const asaasHeaders = () => ({
  'Content-Type': 'application/json',
  'access_token': (process.env.ASAAS_API_KEY || '').replace(/['"]/g, ''),
});
const ASAAS_BASE = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  description?: string | null;
  customer: string;
  deleted?: boolean;
};

/**
 * Recalcula e faz upsert do mentorado a partir do estado real no Asaas:
 * busca o cliente e todas as cobranças dele daquela mentoria, e deriva
 * valor do contrato, quanto falta pagar e parcelas vencidas.
 */
export async function syncMentoradoFromAsaas(customerId: string, mentoria: Mentoria) {
  // 1. Cliente
  const custRes = await fetch(`${ASAAS_BASE}/customers/${customerId}`, { headers: asaasHeaders() });
  if (!custRes.ok) throw new Error(`Asaas customer ${customerId}: ${custRes.status}`);
  const cust = await custRes.json();

  // 2. Todas as cobranças do cliente (paginado)
  const payments: AsaasPayment[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore && offset < 500) {
    const res = await fetch(`${ASAAS_BASE}/payments?customer=${customerId}&limit=100&offset=${offset}`, { headers: asaasHeaders() });
    if (!res.ok) throw new Error(`Asaas payments ${customerId}: ${res.status}`);
    const data = await res.json();
    payments.push(...(data.data || []));
    hasMore = data.hasMore;
    offset += 100;
  }

  // 3. Só as cobranças desta mentoria, ignorando canceladas/estornadas
  const daMentoria = payments.filter(p =>
    !p.deleted &&
    detectMentoria(p.description) === mentoria &&
    !['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(p.status)
  );
  if (daMentoria.length === 0) return null;

  const valorContrato = daMentoria.reduce((acc, p) => acc + Number(p.value || 0), 0);
  const pagas = daMentoria.filter(p => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'].includes(p.status));
  const valorPago = pagas.reduce((acc, p) => acc + Number(p.value || 0), 0);
  const vencidas = daMentoria.filter(p => p.status === 'OVERDUE').length;

  const enderecoPartes = [cust.address, cust.addressNumber, cust.complement, cust.province, cust.cityName, cust.state]
    .filter(Boolean).join(', ');

  // 4. Upsert (chave: mentoria + cliente Asaas). Campos manuais da Ana
  //    (RG, datas, imersão, brinde, origem, notas) nunca são sobrescritos.
  const { data: existing } = await supabaseAdmin
    .from('mentorados')
    .select('id')
    .eq('mentoria', mentoria)
    .eq('asaas_customer_id', customerId)
    .maybeSingle();

  const autoFields = {
    nome: cust.name || 'Sem nome',
    email: cust.email || null,
    telefone: cust.mobilePhone || cust.phone || null,
    cpf: cust.cpfCnpj || null,
    valor_contrato: valorContrato,
    valor_pago: valorPago,
    parcelas_vencidas: vencidas,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdmin.from('mentorados').update(autoFields).eq('id', existing.id);
    return existing.id;
  }

  const { data: created, error } = await supabaseAdmin
    .from('mentorados')
    .insert([{
      mentoria,
      asaas_customer_id: customerId,
      endereco: enderecoPartes || null,
      cep: cust.postalCode || null,
      ...autoFields,
    }])
    .select('id')
    .single();

  if (error) throw error;
  return created?.id ?? null;
}
