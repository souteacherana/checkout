/**
 * Configuração central do workshop.
 * Alterar aqui atualiza a página inteira (CTAs, contadores e eventos do Pixel).
 */

/** Página de checkout oficial. Usada por todos os botões de compra. */
export const CHECKOUT_URL = "https://checkout.riseeducacao.com.br/tnp";

/** Data e hora do evento: 19 de setembro de 2026, 15h (Horário de Brasília, UTC-3). */
export const EVENT_DATE_ISO = "2026-09-19T15:00:00-03:00";

/** ID do Meta Pixel (Rise Educação · Turmas na Prática). */
export const META_PIXEL_ID = "1084815880338708";

/** Dados do produto enviados junto aos eventos de conversão. */
export const PRODUCT = {
  id: "TNP-001",
  name: "Turmas na Prática: Planejamento e Pedagógico",
  value: 49.9,
  currency: "BRL",
} as const;
