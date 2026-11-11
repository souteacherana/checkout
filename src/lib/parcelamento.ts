/**
 * Quantas parcelas o checkout oferece no cartão.
 *
 * O padrão é até 9x com juros. Produtos desta lista só aceitam à vista: o
 * sinal da Black é R$ 50 e parcelar não faz sentido. Quem garante é o
 * servidor (api/checkout), o formulário só esconde a escolha.
 */
const PRODUTOS_SO_A_VISTA = ["black-sinal"];

const PARCELAS_PADRAO = 9;

export function maxParcelas(slug: string | null | undefined): number {
  return PRODUTOS_SO_A_VISTA.includes((slug ?? "").toLowerCase()) ? 1 : PARCELAS_PADRAO;
}
