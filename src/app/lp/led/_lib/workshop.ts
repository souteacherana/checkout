/**
 * Configuração central do workshop LED.
 * Alterar aqui atualiza a página inteira (CTAs, contadores, datas na copy e
 * eventos do Pixel).
 *
 * É a MESMA decisão tomada no TNP: a landing não lê a tabela `products` do
 * Supabase. O catálogo é a fonte de verdade do CHECKOUT (preço cobrado, pixel
 * do produto, conversão do Google Ads); aqui o preço e a data aparecem dentro
 * da copy da expert em meia dúzia de lugares, então amarrar a página no banco
 * não eliminaria a duplicação — só acrescentaria uma consulta no caminho de
 * uma página de campanha, onde o LCP é o que importa.
 *
 * O que essa escolha CUSTA, pra ficar registrado: o preço abaixo e o preço do
 * produto `led` no painel precisam ser alterados juntos. Se divergirem, a
 * landing anuncia um valor e o checkout cobra outro.
 */

/** Página de checkout oficial. Usada por todos os botões de compra. */
export const CHECKOUT_URL = "https://checkout.riseeducacao.com.br/led";

/** Data e hora do evento: 23 de outubro de 2026, 15h (Horário de Brasília). */
export const EVENT_DATE_ISO = "2026-10-23T15:00:00-03:00";

/** ID do Meta Pixel (Rise Educação). */
export const META_PIXEL_ID = "1084815880338708";

/** Dados do produto enviados junto aos eventos de conversão. */
export const PRODUCT = {
  id: "LED-001",
  name: "Lucrando com Escola Digital",
  value: 49.9,
  currency: "BRL",
} as const;

/**
 * Janela da barra de urgência: quanto do caminho até o evento já passou.
 * Sete dias era o valor do HTML original.
 */
export const URGENCY_WINDOW_MS = 7 * 86_400_000;

const EVENT_DATE = new Date(EVENT_DATE_ISO);

/**
 * A landing é servida no Brasil mas renderiza num servidor em UTC. Sem fixar o
 * fuso, "23 de outubro, 15h" viraria "23 de outubro, 18h" no HTML do servidor
 * e voltaria pra 15h na hidratação — mismatch do React e data errada pra quem
 * lê antes do JS carregar.
 */
const TZ = "America/Sao_Paulo";

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ }).format(EVENT_DATE);

/**
 * Um pedaço solto da data. Existe porque `month: "short"` em pt-BR devolve
 * "23 de out." quando junto com o dia, e o crachá do hero quer "23 OUT".
 */
const parte = (tipo: Intl.DateTimeFormatPartTypes, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ })
    .formatToParts(EVENT_DATE)
    .find((p) => p.type === tipo)!
    .value.replace(".", "");

/**
 * Rótulos de data usados na copy. Derivados de EVENT_DATE_ISO de propósito:
 * na versão estática a data estava escrita à mão em seis lugares, e adiar o
 * workshop significava caçar todos eles.
 */
export const DATA = {
  /** "23 de outubro" — hero, cabeçalho da oferta. */
  extenso: fmt({ day: "numeric", month: "long" }),
  /** "23 DE OUTUBRO" — faixa de urgência do fechamento. */
  extensoCaixaAlta: fmt({ day: "numeric", month: "long" }).toUpperCase(),
  /** "23 OUT" — crachá "ao vivo" sobre a foto do hero. */
  curta: `${parte("day", { day: "numeric" })} ${parte("month", { month: "short" }).toUpperCase()}`,
  /** "23/10" — barra de urgência do topo. */
  barra: fmt({ day: "numeric", month: "numeric" }),
  /** "23/10" com zero à esquerda — selo de encerramento do ticket. */
  barraZeroEsquerda: fmt({ day: "2-digit", month: "2-digit" }),
  /** "23" — "a gente começa dia 23", no fechamento. */
  dia: fmt({ day: "numeric" }),
  /** "15h" — hero e cabeçalho da oferta. */
  hora: `${fmt({ hour: "numeric", hour12: false })}h`,
} as const;
