import { supabaseAdmin } from '@/lib/supabase-admin';

export type UserRole = 'VIEWER' | 'VENDEDOR' | 'EMMY' | 'ANA' | 'ADMIN' | 'SUPERADMIN';

/** Papéis com visão financeira completa (sem janela de 30 dias, líquido visível) */
export const FINANCE_ROLES = ['ANA', 'ADMIN', 'SUPERADMIN'];

/**
 * Valida o Bearer token da requisição e retorna a role do usuário
 * na tabela user_roles, ou null se não autenticado / sem role.
 */
export async function getRoleFromRequest(request: Request): Promise<UserRole | null> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;

  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('email', user.email)
    .single();

  return (data?.role as UserRole) || null;
}
