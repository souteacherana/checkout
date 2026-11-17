import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CAMPANHAS_VSL, EVENTOS_VSL, type EventoVsl } from '@/lib/vsl-metricas';

/**
 * Registra um passo do funil da VSL. Rota pública, chamada pela própria página.
 *
 * Responde 204 mesmo quando ignora o pedido: medir nunca pode atrapalhar quem
 * está assistindo.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const vazio = new NextResponse(null, { status: 204 });
  if (!body || typeof body !== 'object') return vazio;

  const { campanha, visitante, evento } = body as Record<string, unknown>;
  if (
    typeof campanha !== 'string' || !CAMPANHAS_VSL.includes(campanha) ||
    typeof evento !== 'string' || !(EVENTOS_VSL as readonly string[]).includes(evento) ||
    typeof visitante !== 'string' || !UUID.test(visitante)
  ) {
    return vazio;
  }

  const utms = Object.fromEntries(UTMS.map((c) => [c, texto((body as Record<string, unknown>)[c])]));

  const { error } = await supabaseAdmin
    .from('vsl_eventos')
    .insert({ campanha, visitante, evento: evento as EventoVsl, ...utms });

  if (error) console.error('Erro ao gravar evento da VSL:', error);
  return vazio;
}
