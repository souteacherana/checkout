import { NextResponse } from 'next/server';
import { getRoleFromRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { AplicacaoRow } from '@/lib/database.types';

/**
 * Aplicações de uma campanha cruzadas com o pagamento do sinal.
 *
 * O cruzamento é pelo e-mail: a pessoa digita de novo no checkout (os dados
 * não vão na URL), então quem pagou com outro e-mail aparece como "sem
 * aplicação" — por isso a lista de pagamentos sem aplicação vem junto.
 */
const PAPEIS_COM_ACESSO = ['EMMY', 'ANA', 'ADMIN', 'SUPERADMIN'];

export type Pagamento = {
  email: string | null;
  nome: string | null;
  telefone: string | null;
  status: string;
  metodo: string | null;
  valor: number | null;
  pago_em: string | null;
  criado_em: string;
};

export async function GET(request: Request) {
  const role = await getRoleFromRequest(request);
  if (!role) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (!PAPEIS_COM_ACESSO.includes(role)) {
    return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const campanha = params.get('campanha')?.toLowerCase();
  const produto = params.get('produto')?.toUpperCase();
  if (!campanha || !produto) {
    return NextResponse.json({ erro: 'Informe campanha e produto.' }, { status: 400 });
  }

  const [aplicacoes, checkouts] = await Promise.all([
    supabaseAdmin
      .from('aplicacoes')
      .select('*')
      .eq('campanha', campanha)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from('checkouts')
      .select('customer_email, customer_name, customer_phone, status, payment_method, amount, payment_date, created_at')
      .eq('product_key', produto)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(5000),
  ]);

  if (aplicacoes.error || checkouts.error) {
    console.error('Erro ao listar aplicações:', aplicacoes.error ?? checkouts.error);
    return NextResponse.json({ erro: 'Não foi possível carregar as aplicações.' }, { status: 500 });
  }

  const pagamentos: Pagamento[] = (checkouts.data ?? []).map((c) => ({
    email: c.customer_email?.trim().toLowerCase() ?? null,
    nome: c.customer_name,
    telefone: c.customer_phone,
    status: c.status,
    metodo: c.payment_method,
    valor: c.amount,
    pago_em: c.payment_date,
    criado_em: c.created_at,
  }));

  return NextResponse.json({ aplicacoes: (aplicacoes.data ?? []) as AplicacaoRow[], pagamentos });
}
