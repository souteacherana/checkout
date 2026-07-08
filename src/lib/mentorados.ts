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

  // 4. A PESSOA guarda contato + resumo financeiro BRUTO do Asaas.
  //    Os ciclos (período/valor curado) NUNCA são tocados pela automação.
  const { data: existing } = await supabaseAdmin
    .from('mentorados')
    .select('id')
    .eq('mentoria', mentoria)
    .eq('asaas_customer_id', customerId)
    .maybeSingle();

  const pessoa = {
    nome: cust.name || 'Sem nome',
    email: cust.email || null,
    telefone: cust.mobilePhone || cust.phone || null,
    cpf: cust.cpfCnpj || null,
    asaas_total_contratado: valorContrato,
    asaas_total_pago: valorPago,
    parcelas_vencidas: vencidas,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdmin.from('mentorados').update(pessoa).eq('id', existing.id);
    return existing.id;
  }

  // Pessoa nova: cria a pessoa e um Ciclo 1 rascunho já com os valores do
  // Asaas como ponto de partida (a Ana ajusta datas/valores depois).
  const { data: created, error } = await supabaseAdmin
    .from('mentorados')
    .insert([{
      mentoria,
      asaas_customer_id: customerId,
      endereco: enderecoPartes || null,
      cep: cust.postalCode || null,
      ...pessoa,
    }])
    .select('id')
    .single();

  if (error) throw error;

  if (created) {
    await supabaseAdmin.from('mentorado_ciclos').insert([{
      mentorado_id: created.id,
      numero: 1,
      tags: ['ativo'],
      valor_contrato: valorContrato,
      valor_pago: valorPago,
    }]);
  }
  return created?.id ?? null;
}

/**
 * Soma as cobranças do cliente no Asaas dentro de uma janela de datas
 * (usado pelo botão "puxar cobranças do período" ao curar um ciclo).
 */
export async function asaasTotaisPeriodo(customerId: string, inicio: string, fim: string) {
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
  const de = new Date(inicio).getTime();
  const ate = new Date(fim).getTime() + 86400000; // inclui o dia final
  const naJanela = payments.filter(p => {
    const d = new Date((p as AsaasPayment & { dueDate?: string; dateCreated?: string }).dueDate
      || (p as AsaasPayment & { dateCreated?: string }).dateCreated || 0).getTime();
    return d >= de && d < ate && !p.deleted;
  });
  const pagos = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'];
  return {
    contratado: naJanela.reduce((a, p) => a + Number(p.value || 0), 0),
    pago: naJanela.filter(p => pagos.includes(p.status)).reduce((a, p) => a + Number(p.value || 0), 0),
    parcelas: naJanela.length,
  };
}
