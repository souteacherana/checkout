import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

export async function sendCapiEvent(
  pixelId: string,
  token: string,
  customerData: { email?: string | null; phone?: string | null; fbp?: string | null; fbc?: string | null },
  value: number,
  productName: string,
  eventId: string,
  clientIp?: string | null,
  userAgent?: string | null
) {
  try {
    const hash = (data?: string | null) => data ? crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex') : undefined;
    
    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: eventId,
          user_data: {
            em: [hash(customerData.email)],
            ph: [hash(customerData.phone)],
            client_ip_address: clientIp || undefined,
            client_user_agent: userAgent || undefined,
            fbp: customerData.fbp || undefined,
            fbc: customerData.fbc || undefined,
          },
          custom_data: {
            value: value,
            currency: 'BRL',
            content_name: productName,
          }
        }
      ]
    };

    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log("CAPI Result:", result);
    if (result?.error) {
      Sentry.captureMessage(`CAPI rejeitou evento: ${JSON.stringify(result.error).slice(0, 300)}`, 'warning');
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'capi' } });
    console.error("Erro ao enviar evento CAPI:", error);
  }
}

/**
 * Lead da captação, espelhando o fbq('track', 'Lead') do navegador com o mesmo
 * eventId. Aqui existe o que /api/capi não tem: e-mail, telefone e nome, que
 * melhoram o casamento da Meta. Sem token configurado, não envia nada.
 */
export async function sendLeadCapi(params: {
  eventId: string | null;
  eventSourceUrl: string | null;
  email: string;
  telefone: string;
  nome: string;
  campanhaTitulo: string;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token || !params.eventId) return;

  const hash = (dado: string) => crypto.createHash('sha256').update(dado).digest('hex');

  // A Meta quer o telefone só com dígitos e com o código do país. Números de
  // 10 ou 11 dígitos são brasileiros digitados sem o 55.
  const digitos = params.telefone.replace(/\D/g, '');
  const telefone = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  const primeiroNome = params.nome.trim().split(/\s+/)[0].toLowerCase();

  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '1084815880338708';

  try {
    const res = await fetch(`https://graph.facebook.com/v23.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            event_name: 'Lead',
            event_id: params.eventId,
            event_time: Math.floor(Date.now() / 1000),
            event_source_url: params.eventSourceUrl || undefined,
            action_source: 'website',
            user_data: {
              em: [hash(params.email.trim().toLowerCase())],
              ph: [hash(telefone)],
              fn: [hash(primeiroNome)],
              fbp: params.fbp || undefined,
              fbc: params.fbc || undefined,
              client_ip_address: params.clientIp || undefined,
              client_user_agent: params.userAgent || undefined,
            },
            custom_data: { content_name: params.campanhaTitulo },
          },
        ],
        ...(process.env.META_CAPI_TEST_EVENT_CODE
          ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
          : {}),
      }),
    });
    if (!res.ok) {
      const erro = await res.json().catch(() => null);
      Sentry.captureMessage(`CAPI rejeitou Lead: ${JSON.stringify(erro).slice(0, 300)}`, 'warning');
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'capi-lead' } });
    console.error('Erro ao enviar Lead pra CAPI:', error);
  }
}
