import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
  }

  try {
    const { data: checkout, error } = await supabaseAdmin
      .from('checkouts')
      .select('status')
      .eq('payment_id', paymentId)
      .single();

    if (error || !checkout) {
      return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
    }

    return NextResponse.json({ status: checkout.status });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
