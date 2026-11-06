import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

/**
 * Formata a data/hora da aula no fuso de Brasília, no padrão usado nas
 * landings (ex: "22/08 às 15h00") — é o texto que vai pro merge tag ZOOMDATE.
 */
function formatZoomDate(iso: string): string {
  const date = new Date(iso);
  const dataFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date);
  // hourCycle h23 explícito: com hour12:false, pt-BR pode render "24h00" à meia-noite.
  const horaFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hourCycle: 'h23' }).format(date);
  return `${dataFmt} às ${horaFmt.replace(':', 'h')}`;
}

/** Nome de evento do Mailchimp: só minúsculas, números e "_", até 30 chars. */
function sanitizeEventName(productSlug: string): string {
  const slug = productSlug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `compra_${slug}`.slice(0, 30);
}

/** Credenciais + URL base do Mailchimp, ou null quando não configurado. */
function conexao() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) return null;

  // A API key traz o server prefix no sufixo (ex: ...-us14).
  const serverPrefix = apiKey.split('-').pop();
  return {
    audienceId,
    baseUrl: `https://${serverPrefix}.api.mailchimp.com/3.0`,
    authHeader: 'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64'),
  };
}

/** O Mailchimp identifica o contato pelo md5 do e-mail em minúsculas. */
const hashEmail = (email: string) =>
  crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');

/**
 * Inscreve um lead de captação na audiência e dispara o evento que aciona a
 * Customer Journey da campanha.
 *
 * Diferente de notifyZoomConfirmation, aqui NÃO existe compra: é quem se
 * inscreveu numa landing pra assistir a um evento. Por isso o evento tem nome
 * próprio (`lead_<campanha>`) — a jornada de quem se inscreveu não é a mesma
 * de quem pagou, e misturar os dois no mesmo evento tornaria impossível
 * segmentar depois.
 *
 * Devolve true/false em vez de nunca falhar silenciosamente: quem chama grava
 * o resultado no banco, pra dar pra reprocessar um lead que o Mailchimp
 * recusou sem ter perdido o cadastro.
 */
export async function inscreverLead(params: {
  email: string;
  nome: string;
  telefone?: string | null;
  /** Slug da campanha, ex: "black". Vira o nome do evento. */
  campanha: string;
  /** Rótulo legível da campanha, ex: "Black da Teacher". */
  campanhaTitulo: string;
}): Promise<boolean> {
  const conn = conexao();
  if (!conn) {
    console.warn('Aviso: MAILCHIMP_API_KEY/MAILCHIMP_AUDIENCE_ID não configuradas — inscrição do lead pulada.');
    return false;
  }

  try {
    const { baseUrl, audienceId, authHeader } = conn;
    const subscriberHash = hashEmail(params.email);
    const firstName = params.nome.trim().split(/\s+/)[0] || params.nome;

    const upsertRes = await fetch(`${baseUrl}/lists/${audienceId}/members/${subscriberHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        email_address: params.email,
        // status_if_new, e não status: quem já está na base não volta pra
        // "subscribed" por ter preenchido um formulário — se descadastrou
        // antes, reinscrever por fora seria ressuscitar um opt-out.
        status_if_new: 'subscribed',
        merge_fields: {
          FNAME: firstName,
          // MMERGE2 é o campo "Telefone" desta audiência; não existe PHONE nela.
          ...(params.telefone ? { MMERGE2: params.telefone } : {}),
        },
      }),
    });

    if (!upsertRes.ok) {
      const erro = await upsertRes.json().catch(() => null);
      Sentry.captureMessage(
        `Mailchimp rejeitou upsert de lead (${params.campanha}): ${JSON.stringify(erro).slice(0, 300)}`,
        'warning'
      );
      console.error('Erro ao dar upsert no lead do Mailchimp:', erro);
      return false;
    }

    const eventName = `lead_${params.campanha.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`.slice(0, 30);
    const eventRes = await fetch(`${baseUrl}/lists/${audienceId}/members/${subscriberHash}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ name: eventName, properties: { campanha: params.campanhaTitulo } }),
    });

    if (!eventRes.ok) {
      const erro = await eventRes.json().catch(() => null);
      Sentry.captureMessage(
        `Mailchimp rejeitou evento "${eventName}": ${JSON.stringify(erro).slice(0, 300)}`,
        'warning'
      );
      console.error(`Erro ao disparar evento "${eventName}" no Mailchimp:`, erro);
      return false;
    }

    console.log(`[Mailchimp] Evento "${eventName}" disparado para ${params.email}.`);
    return true;
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'mailchimp-lead' } });
    console.error('Erro ao inscrever lead no Mailchimp:', error);
    return false;
  }
}

/**
 * Upsert do contato no Mailchimp (com os merge fields da aula) + disparo do
 * evento customizado que aciona a Customer Journey configurada no painel do
 * Mailchimp. Nunca lança — a confirmação de pagamento não pode falhar por
 * causa do Mailchimp estar fora do ar ou mal configurado.
 */
export async function notifyZoomConfirmation(params: {
  email: string;
  name: string;
  productSlug: string;
  productTitle: string;
  zoomLink: string;
  zoomDatetime: string; // ISO
}): Promise<void> {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    console.warn('Aviso: MAILCHIMP_API_KEY/MAILCHIMP_AUDIENCE_ID não configuradas — automação de Zoom pulada.');
    return;
  }

  try {
    const serverPrefix = apiKey.split('-').pop();
    const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
    const authHeader = 'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64');
    const subscriberHash = crypto.createHash('md5').update(params.email.trim().toLowerCase()).digest('hex');

    const firstName = params.name.trim().split(/\s+/)[0] || params.name;

    const upsertRes = await fetch(`${baseUrl}/lists/${audienceId}/members/${subscriberHash}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        email_address: params.email,
        status_if_new: 'subscribed',
        merge_fields: {
          FNAME: firstName,
          ZOOMLINK: params.zoomLink,
          ZOOMDATE: formatZoomDate(params.zoomDatetime),
          PRODUCT: params.productTitle,
        },
      }),
    });
    const upsertResult = await upsertRes.json();
    if (!upsertRes.ok) {
      Sentry.captureMessage(`Mailchimp rejeitou upsert de contato: ${JSON.stringify(upsertResult).slice(0, 300)}`, 'warning');
      console.error('Erro ao dar upsert no contato do Mailchimp:', upsertResult);
      return;
    }

    const eventName = sanitizeEventName(params.productSlug);
    const eventRes = await fetch(`${baseUrl}/lists/${audienceId}/members/${subscriberHash}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        name: eventName,
        properties: { produto: params.productTitle },
      }),
    });
    if (!eventRes.ok) {
      const eventResult = await eventRes.json().catch(() => null);
      Sentry.captureMessage(`Mailchimp rejeitou evento "${eventName}": ${JSON.stringify(eventResult).slice(0, 300)}`, 'warning');
      console.error(`Erro ao disparar evento "${eventName}" no Mailchimp:`, eventResult);
      return;
    }

    console.log(`[Mailchimp] Evento "${eventName}" disparado para ${params.email}.`);
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'mailchimp-zoom' } });
    console.error('Erro ao notificar Mailchimp (automação de Zoom):', error);
  }
}
