import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Requerer autenticação e checar se é SUPERADMIN para todas as rotas
async function verifySuperAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user?.email) return false;

  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('email', user.email)
    .single();

  return data?.role === 'SUPERADMIN';
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
    const { email, password, role } = await request.json();

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

    // Insere ou atualiza a role na tabela
    const { error: dbError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ email, role, created_at: new Date().toISOString() });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
