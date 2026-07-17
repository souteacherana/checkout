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
