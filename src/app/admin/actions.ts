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
