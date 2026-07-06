"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getUserRole(email: string) {
  if (!email) return 'VIEWER';

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('email', email)
    .single();

  if (error || !data) {
    return 'VIEWER';
  }

  return data.role;
}

export async function getUserProfile(email: string): Promise<{ role: string; utm_code: string | null }> {
  if (!email) return { role: 'VIEWER', utm_code: null };

  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role, utm_code')
    .eq('email', email)
    .single();

  return { role: data?.role || 'VIEWER', utm_code: data?.utm_code || null };
}
