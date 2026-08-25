import type { NextRequest } from "next/server";
import { META_PIXEL_ID } from "@/app/lp/tnp/_lib/workshop";

/**
 * Meta Conversions API (CAPI).
 *
 * Recebe os eventos disparados pelo Pixel no browser e reenvia pelo servidor,
 * repetindo o mesmo `eventId` para que a Meta deduplique os dois sinais.
 *
 * Requer a variável de ambiente META_CAPI_ACCESS_TOKEN. Enquanto ela não
 * existir, a rota responde 200 sem enviar nada — o Pixel do browser continua
 * funcionando normalmente e nada quebra no front.
 */

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION ?? "v23.0";

/** Nunca prerenderizar: a rota depende de cookies e headers da requisição. */
export const dynamic = "force-dynamic";

type IncomingEvent = {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  customData?: Record<string, string | number | undefined>;
};

/** Extrai o IP real do visitante atrás de proxy/CDN. */
function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

export async function POST(request: NextRequest) {
  let body: IncomingEvent;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { eventName, eventId, eventSourceUrl, customData } = body;

  if (!eventName || !eventId) {
    return Response.json(
      { ok: false, error: "eventName e eventId são obrigatórios" },
      { status: 400 }
    );
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!accessToken) {
    // Token ainda não configurado: falha silenciosa e explícita.
    return Response.json({ ok: false, reason: "capi_not_configured" });
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_id: eventId,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: {
          // Identificadores do browser: é o que temos sem formulário na página.
          fbp: request.cookies.get("_fbp")?.value,
          fbc: request.cookies.get("_fbc")?.value,
          client_ip_address: getClientIp(request),
          client_user_agent: request.headers.get("user-agent") ?? undefined,
        },
        custom_data: customData,
      },
    ],
    // Preenchido apenas ao depurar em Eventos de Teste no Gerenciador da Meta.
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await res.json();

    if (!res.ok) {
      console.error("[capi] Meta recusou o evento:", result);
      return Response.json({ ok: false, error: result }, { status: 502 });
    }

    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("[capi] Falha ao enviar evento:", error);
    return Response.json({ ok: false, error: "upstream_failure" }, { status: 502 });
  }
}
