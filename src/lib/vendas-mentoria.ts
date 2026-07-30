import type { MentoriaPrecoRow } from './database.types';

export const MENTORIA_CHECKOUT_LABELS: Record<string, string> = {
  partiu10k: 'Partiu 10k',
  elite: 'Professores de Elite',
};

/**
 * Descrição da cobrança no Asaas. O prefixo "Mentoria" + o nome batem com o
 * detectMentoria() do webhook, então a criação automática do mentorado na aba
 * Mentorados continua funcionando sem código novo.
 */
export function descricaoCobranca(mentoria: string): string {
  return `Mentoria ${MENTORIA_CHECKOUT_LABELS[mentoria] || mentoria}`;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * A cobrança já gerada ainda serve pro cliente pagar?
 *
 * O checkout impede gerar duas cobranças pro mesmo link, mas uma cobrança
 * que morreu não pode deixar o cliente preso — ele fica olhando um QR/boleto
 * inútil sem conseguir escolher outra forma de pagamento. Não serve mais:
 *
 * - removida do Asaas (404 ou deleted): cancelada pela equipe no painel;
 * - Pix vencido: o QR expira (vence em 24h) e não é mais pagável.
 *
 * Boleto vencido CONTINUA pagável — a regra comercial é multa fixa de R$ 40,
 * então liberar cobrança nova seria dar ao cliente uma forma de fugir dela.
 */
export function cobrancaPagavel(
  payment: { status?: string; deleted?: boolean } | null,
  metodo: string | null,
): boolean {
  if (!payment || payment.deleted) return false;
  if (metodo === 'PIX' && payment.status === 'OVERDUE') return false;
  return true;
}

export type OpcaoPagamento = {
  metodo: string;
  parcelas: number;
  valor_parcela: number;
  total: number;
};

/**
 * Converte a tabela de preços (que vale pro preço cheio) nas opções reais
 * do cliente, considerando a entrada paga fora do link:
 *
 * - Sem entrada: os valores saem exatamente como estão na tabela.
 * - PIX: o desconto é proporcional ao restante (ex: 5% continua 5%).
 * - Boleto/cartão: preserva o ACRÉSCIMO FIXO de cada opção — a tabela define
 *   quanto cada plano soma sobre o preço cheio (49/parcela no P10k, âncoras
 *   do 12x/6x inclusas); esse acréscimo é mantido e aplicado sobre o restante:
 *   parcela = (restante + acréscimo_da_opção) / n.
 */
export function calcularOpcoes(
  precos: MentoriaPrecoRow[],
  valorTotal: number,
  restante: number,
): OpcaoPagamento[] {
  return precos.map(p => {
    const tabelaParcela = Number(p.valor_parcela);
    let parcela: number;

    if (restante >= valorTotal) {
      parcela = tabelaParcela;
    } else if (p.metodo === 'PIX') {
      parcela = round2(restante * (tabelaParcela / valorTotal));
    } else {
      const acrescimo = tabelaParcela * p.parcelas - valorTotal;
      parcela = round2((restante + acrescimo) / p.parcelas);
    }

    return {
      metodo: p.metodo,
      parcelas: p.parcelas,
      valor_parcela: parcela,
      total: round2(parcela * p.parcelas),
    };
  }).filter(o => o.valor_parcela > 0);
}
