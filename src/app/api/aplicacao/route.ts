import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PERGUNTAS } from '@/app/lp/black/_lib/aplicacao';

/**
 * Respostas da aplicação da Black, gravadas antes de a pessoa seguir pro
 * checkout do sinal. Cada envio vira uma linha: quem responde duas vezes fica
 * com as duas, e o time vê a mais recente.
 */

const CAMPANHAS = ['black'];

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const texto = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t === '' ? null : t;
};

const ORIGEM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ erro: 'Corpo inválido.' }, { status: 400 });
    }

    // Campo invisível preenchido: robô. Responde como sucesso e não grava.
    if (texto(body.site)) return NextResponse.json({ ok: true });

    const campanha = texto(body.campanha, 40)?.toLowerCase() ?? '';
    if (!CAMPANHAS.includes(campanha)) {
      return NextResponse.json({ erro: 'Campanha desconhecida.' }, { status: 400 });
    }

    const email = texto(body.email)?.toLowerCase() ?? null;
    const nome = texto(body.nome, 120);
    const whatsapp = texto(body.whatsapp, 40);
    const instagram = texto(body.instagram, 80);

    if (!email || !EMAIL_OK.test(email)) {
      return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 400 });
    }
    if (!nome) return NextResponse.json({ erro: 'Informe seu nome completo.' }, { status: 400 });
    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ erro: 'Informe seu WhatsApp com DDD.' }, { status: 400 });
    }
    if (!instagram) return NextResponse.json({ erro: 'Informe seu @ no Instagram.' }, { status: 400 });

    // Só aceita as perguntas conhecidas e, nas de opção, só as opções da lista.
    const entrada = (body.respostas ?? {}) as Record<string, unknown>;
    const respostas: Record<string, string> = {};
    for (const pergunta of PERGUNTAS) {
      const valor = texto(entrada[pergunta.chave], 4000);
      if (!valor || (pergunta.tipo === 'opcoes' && !pergunta.opcoes.includes(valor))) {
        return NextResponse.json({ erro: `Responda: ${pergunta.titulo}` }, { status: 400 });
      }
      respostas[pergunta.chave] = valor;
    }

    const origem = Object.fromEntries(
      ORIGEM.flatMap((coluna) => {
        const valor = texto(body[coluna]);
        return valor ? [[coluna, valor]] : [];
      })
    );

    const { error } = await supabaseAdmin
      .from('aplicacoes')
      .insert({ campanha, email, nome, whatsapp, instagram, respostas, ...origem });

    if (error) {
      Sentry.captureException(error, { tags: { area: 'aplicacao' } });
      console.error('Erro ao gravar aplicação:', error);
      return NextResponse.json({ erro: 'Não conseguimos salvar suas respostas. Tente de novo.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { area: 'aplicacao' } });
    console.error('Erro inesperado na aplicação:', error);
    return NextResponse.json({ erro: 'Erro inesperado. Tente de novo.' }, { status: 500 });
  }
}
