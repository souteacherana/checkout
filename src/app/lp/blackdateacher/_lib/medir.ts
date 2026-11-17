import type { EventoVsl } from "@/lib/vsl-metricas";

/**
 * Registra no nosso banco um passo do funil da VSL (acesso, play, pitch,
 * clique), pro painel do produto. Não substitui Meta/GA4: é a contagem nossa.
 *
 * Sem dado pessoal: o visitante é um id aleatório guardado no navegador, só pra
 * contar pessoas em vez de recarregamentos.
 */
const CAMPANHA = "blackdateacher";
const CHAVE_VISITANTE = "vsl_visitante";
const CHAVE_UTMS = "vsl_utms";
const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** Cada passo conta uma vez por carregamento da página. */
const jaMedidos = new Set<EventoVsl>();

function visitante(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_VISITANTE);
    if (salvo) return salvo;
    const novo = crypto.randomUUID();
    localStorage.setItem(CHAVE_VISITANTE, novo);
    return novo;
  } catch {
    // Sem localStorage: conta só esta visita.
    return crypto.randomUUID();
  }
}

/**
 * UTMs do link do anúncio. Ficam guardadas na sessão pra quem recarrega a página
 * sem os parâmetros continuar atribuído ao anúncio.
 */
function utms(): Record<string, string> {
  const daUrl = Object.fromEntries(
    UTMS.flatMap((c) => {
      const v = new URLSearchParams(window.location.search).get(c);
      return v ? [[c, v]] : [];
    })
  );
  try {
    if (Object.keys(daUrl).length > 0) {
      sessionStorage.setItem(CHAVE_UTMS, JSON.stringify(daUrl));
      return daUrl;
    }
    return JSON.parse(sessionStorage.getItem(CHAVE_UTMS) ?? "{}");
  } catch {
    return daUrl;
  }
}

export function medir(evento: EventoVsl) {
  if (jaMedidos.has(evento)) return;
  jaMedidos.add(evento);
  try {
    fetch("/api/vsl-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campanha: CAMPANHA, visitante: visitante(), evento, ...utms() }),
      // O clique abre o WhatsApp: keepalive garante o envio mesmo saindo da aba.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Medir nunca pode quebrar a página.
  }
}
