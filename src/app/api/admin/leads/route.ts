import { NextResponse } from 'next/server';
import { getRoleFromRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { LeadRow } from '@/lib/database.types';

/**
 * Leads de uma campanha, pro painel do produto de captação.
 *
 * A tabela não tem policy de leitura: nome, e-mail e telefone só saem por aqui,
 * depois de conferir o papel de quem pede. Vendedor e visitante do painel ficam
 * de fora.
 */
const PAPEIS_COM_ACESSO = ['EMMY', 'ANA', 'ADMIN', 'SUPERADMIN'];

/** O Supabase devolve no máximo 1000 linhas por consulta. */
const TAMANHO_DA_PAGINA = 1000;

export async function GET(request: Request) {
  const role = await getRoleFromRequest(request);
  if (!role) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (!PAPEIS_COM_ACESSO.includes(role)) {
    return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });
  }

  const campanha = new URL(request.url).searchParams.get('campanha')?.toLowerCase();
  if (!campanha) return NextResponse.json({ erro: 'Informe a campanha.' }, { status: 400 });

  const leads: LeadRow[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_DA_PAGINA) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('campanha', campanha)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(inicio, inicio + TAMANHO_DA_PAGINA - 1);

    if (error) {
      console.error('Erro ao listar leads:', error);
      return NextResponse.json({ erro: 'Não foi possível carregar os leads.' }, { status: 500 });
    }
    leads.push(...(data ?? []));
    if (!data || data.length < TAMANHO_DA_PAGINA) break;
  }

  return NextResponse.json({ leads });
}
