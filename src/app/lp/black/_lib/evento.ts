/**
 * Configuração central da Black da Teacher.
 *
 * Esta landing NÃO vende: ela inscreve gente numa transmissão ao vivo. Não há
 * CHECKOUT_URL nem preço aqui de propósito — a oferta é revelada no dia, e a
 * conversão da página é o formulário (ver _components/LeadForm.tsx).
 *
 * A página original no WordPress escrevia a data à mão em dois lugares e a
 * do contador num terceiro (um timestamp Unix no widget do Elementor) — os
 * três ficaram desencontrados: a copy dizia 20h e o contador apontava 21h,
 * ambos de 2025. Aqui tudo deriva de EVENT_DATE_ISO.
 */

/** Slug da campanha. Vai no POST da inscrição e vira o evento do Mailchimp. */
export const CAMPANHA = "black";

/** 11 de novembro de 2026, 20h (Horário de Brasília). */
export const EVENT_DATE_ISO = "2026-11-11T20:00:00-03:00";

/** Onde a transmissão acontece. Aparece no selo de data. */
export const CANAL = "NO YOUTUBE";

const EVENTO = new Date(EVENT_DATE_ISO);

/**
 * A landing é servida no Brasil mas renderiza num servidor em UTC. Sem fixar
 * o fuso, "20h" viraria "23h" no HTML do servidor e voltaria pra 20h na
 * hidratação — mismatch do React e hora errada pra quem lê antes do JS.
 */
const TZ = "America/Sao_Paulo";

const parte = (tipo: Intl.DateTimeFormatPartTypes, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ })
    .formatToParts(EVENTO)
    .find((p) => p.type === tipo)!
    .value.replace(".", "");

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: TZ }).format(EVENTO);

/** Rótulos de data da copy, todos derivados de EVENT_DATE_ISO. */
export const DATA = {
  /** "11 DE NOVEMBRO" — selo do hero e do rodapé. */
  extensoCaixaAlta: fmt({ day: "numeric", month: "long" }).toUpperCase(),
  /** "11 de novembro". */
  extenso: fmt({ day: "numeric", month: "long" }),
  /**
   * "20H00" — como a página original escrevia.
   *
   * Hora e minuto são pedidos JUNTOS: `minute: "2-digit"` sozinho devolve "0"
   * em vez de "00" (o 2-digit só vale quando o minuto acompanha a hora), e a
   * primeira versão disto imprimiu "20H0" na página.
   */
  horaCaixaAlta: `${parte("hour", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}H${parte(
    "minute",
    { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
  )}`,
  /** "11/11". */
  barra: fmt({ day: "2-digit", month: "2-digit" }),
} as const;

/** "11 DE NOVEMBRO/ ÀS 20H00 / NO YOUTUBE", com a pontuação da copy original. */
export const SELO_DATA = `${DATA.extensoCaixaAlta}/ ÀS ${DATA.horaCaixaAlta} / ${CANAL}`;
