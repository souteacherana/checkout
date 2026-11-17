/**
 * Funil das VSLs, gravado em `vsl_eventos` (scripts/migrations/027).
 *
 * Produtos de captação cujo slug está aqui mostram o funil da VSL no painel em
 * vez da lista de leads.
 */
export const CAMPANHAS_VSL = ["blackdateacher"];

export const EVENTOS_VSL = ["acesso", "play", "pitch", "clique"] as const;
export type EventoVsl = (typeof EVENTOS_VSL)[number];

export type MetricasVsl = {
  funil: { evento: EventoVsl; eventos: number; visitantes: number }[];
  por_dia: { dia: string; evento: EventoVsl; visitantes: number }[];
  por_origem: {
    campo: "utm_source" | "utm_campaign" | "utm_content";
    valor: string;
    acessos: number;
    cliques: number;
  }[];
};
