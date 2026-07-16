import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';

// Requerer autenticação e checar se é SUPERADMIN para todas as rotas
async function verifySuperAdmin(request: Request) {
  return (await getRoleFromRequest(request)) === 'SUPERADMIN';
}

export async function GET(request: Request) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, password, role, utm_code } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Tenta criar o usuário no Auth
    if (password) {
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      // Se o erro for que o usuário já existe, podemos apenas prosseguir e dar acesso a ele
      if (authError && !authError.message.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Insere ou atualiza a role na tabela.
    // utm_code só entra no payload quando enviado — em upsert por conflito,
    // colunas omitidas são preservadas (não zera o código ao trocar a role).
    // created_at idem: só na criação, senão trocar cargo reescreve o "Desde".
    const { data: existing } = await supabaseAdmin
      .from('user_roles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    const payload: { email: string; role: string; created_at?: string; utm_code?: string | null } = {
      email, role
    };
    if (!existing) payload.created_at = new Date().toISOString();
    if (utm_code !== undefined) {
      payload.utm_code = utm_code ? String(utm_code).trim().toLowerCase() : null;
    }

    const { error: dbError } = await supabaseAdmin
      .from('user_roles')
      .upsert(payload);

    // PostgrestError não é instância de Error — se cair no catch a mensagem
    // real do banco vira "Unexpected error". Devolve direto, como no GET.
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await verifySuperAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    if (email === 'henryccost@gmail.com') {
      return NextResponse.json({ error: 'Cannot delete the main owner' }, { status: 400 });
    }

    // Remove apenas a permissão (não remove do auth para não deletar compras dele)
    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('email', email);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}
