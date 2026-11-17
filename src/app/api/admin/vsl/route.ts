import { NextResponse } from 'next/server';
import { getRoleFromRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CAMPANHAS_VSL, type MetricasVsl } from '@/lib/vsl-metricas';

/** Funil da VSL agregado no banco (função vsl_metricas, migração 027). */
const PAPEIS_COM_ACESSO = ['EMMY', 'ANA', 'ADMIN', 'SUPERADMIN'];

export async function GET(request: Request) {
  const role = await getRoleFromRequest(request);
  if (!role) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (!PAPEIS_COM_ACESSO.includes(role)) {
    return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const campanha = params.get('campanha')?.toLowerCase() ?? '';
  if (!CAMPANHAS_VSL.includes(campanha)) {
    return NextResponse.json({ erro: 'Campanha desconhecida.' }, { status: 400 });
  }

  // Sem período = desde sempre até agora.
  const de = Number(params.get('de')) || 0;
  const ate = Number(params.get('ate')) || Date.now() + 60_000;

  const { data, error } = await supabaseAdmin.rpc('vsl_metricas', {
    p_campanha: campanha,
    p_de: new Date(de).toISOString(),
    p_ate: new Date(ate).toISOString(),
  });

  if (error) {
    console.error('Erro ao carregar métricas da VSL:', error);
    return NextResponse.json({ erro: 'Não foi possível carregar as métricas.' }, { status: 500 });
  }
  return NextResponse.json(data as MetricasVsl);
}
