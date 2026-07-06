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
