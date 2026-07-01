import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: adminData } = await supabaseAdmin.from('checkouts').select('id');
  const { data: anonData } = await supabase.from('checkouts').select('id');
  return NextResponse.json({ 
    adminCount: adminData?.length, 
    anonCount: anonData?.length 
  });
}
