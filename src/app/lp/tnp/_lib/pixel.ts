/**
 * Camada de tracking do Meta Pixel.
 *
 * Cada evento é disparado duas vezes — no navegador (Pixel) e no servidor
 * (Conversions API) — compartilhando o mesmo `eventId`. É esse ID que permite
 * à Meta descartar a duplicata e contar a conversão uma única vez.
 */

type PixelCustomData = Record<string, string | number | undefined>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Gera um ID único por disparo, usado para deduplicar Pixel x CAPI. */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Dispara um evento padrão da Meta no browser e espelha no servidor.
 * Falhas de rede no CAPI são silenciosas: nunca devem travar a navegação.
 */
export function track(eventName: string, customData: PixelCustomData = {}): void {
  if (typeof window === "undefined") return;

  const eventId = newEventId();

  window.fbq?.("track", eventName, customData, { eventID: eventId });

  const payload = JSON.stringify({
    eventName,
    eventId,
    eventSourceUrl: window.location.href,
    customData,
  });

  // keepalive garante o envio mesmo quando o clique leva a outra página.
  fetch("/api/capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
