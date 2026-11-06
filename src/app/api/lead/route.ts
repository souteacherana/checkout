import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { inscreverLead } from '@/lib/mailchimp';
import { sendLeadCapi } from '@/lib/capi';

/**
 * Captação de lead das landings de campanha.
 *
 * ORDEM IMPORTA: grava no Supabase PRIMEIRO, chama Mailchimp e Meta depois.
 *
 * O banco é nosso e os outros dois são de terceiros. Se o Mailchimp estiver
 * fora do ar no dia do lançamento, o pior caso é um contato salvo que ainda não
 * recebeu e-mail: `mailchimp_ok=false` marca quem precisa ser reprocessado.
 * Por isso a resposta é 200 mesmo quando eles recusam: pra quem preencheu, a
 * inscrição funcionou.
 */

/** Campanhas que podem receber lead por aqui, e o rótulo que vai pro e-mail. */
const CAMPANHAS: Record<string, string> = {
  black: 'Black da Teacher',
};

/** Validação de forma, não de existência. */
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Corta no limite e normaliza vazio em null. */
const texto = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t === '' ? null : t;
};

const COLUNAS_DE_ORIGEM = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 });
    }

    // Robô preencheu o campo invisível: responde como sucesso, sem gravar nada,
    // pra ele não ter o que ajustar e tentar de novo.
    if (texto(body.site)) return NextResponse.json({ ok: true });

    const campanha = texto(body.campanha, 40)?.toLowerCase() ?? '';
    const campanhaTitulo = CAMPANHAS[campanha];
    if (!campanhaTitulo) {
      return NextResponse.json({ erro: 'Campanha desconhecida.' }, { status: 400 });
    }

    const nome = texto(body.nome, 120);
    const email = texto(body.email, 200)?.toLowerCase() ?? null;
    const telefone = texto(body.telefone, 40);

    if (!nome) return NextResponse.json({ erro: 'Informe seu nome.' }, { status: 400 });
    if (!email || !EMAIL_OK.test(email)) {
      return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 400 });
    }
    if (!telefone || telefone.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ erro: 'Informe um telefone válido.' }, { status: 400 });
    }

    // Só entram as colunas de origem que vieram preenchidas: no upsert, um null
    // apagaria a UTM de quem voltou à página por um link sem parâmetros.
    const origem = Object.fromEntries(
      COLUNAS_DE_ORIGEM.flatMap((coluna) => {
        const valor = texto(body[coluna]);
        return valor ? [[coluna, valor]] : [];
      })
    );

    const { data, error } = await supabaseAdmin
      .from('leads')
      .upsert(
        {
          campanha,
          nome,
          email,
          telefone,
          ...origem,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'campanha,email' }
      )
      .select('id')
      .single();

    if (error) {
      Sentry.captureException(error, { tags: { area: 'lead-supabase' } });
      console.error('Erro ao gravar lead:', error);
      return NextResponse.json({ erro: 'Não conseguimos salvar sua inscrição. Tente de novo.' }, { status: 500 });
    }

    const [mailchimpOk] = await Promise.all([
      inscreverLead({ email, nome, telefone, campanha, campanhaTitulo }),
      sendLeadCapi({
        eventId: texto(body.eventId, 100),
        eventSourceUrl: texto(body.eventSourceUrl, 1000),
        email,
        telefone,
        nome,
        campanhaTitulo,
        fbp: request.cookies.get('_fbp')?.value,
        fbc: request.cookies.get('_fbc')?.value,
        clientIp: request.headers.get('x-forwarded-for')?.split(',')[0].trim(),
        userAgent: request.headers.get('user-agent'),
      }),
    ]);

    const { error: erroMarca } = await supabaseAdmin
      .from('leads')
      .update({ mailchimp_ok: mailchimpOk })
      .eq('id', data.id);
    if (erroMarca) console.error('Erro ao marcar mailchimp_ok:', erroMarca);

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'lead-api' } });
    console.error('Erro inesperado na captação de lead:', error);
    return NextResponse.json({ erro: 'Erro inesperado. Tente de novo.' }, { status: 500 });
  }
}
