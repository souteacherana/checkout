/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.sessionId) {
      // Nova sessão (Carrinho Abandonado)
      const { data: session, error } = await supabase
        .from('checkouts')
        .insert([{
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone,
          customer_cpf: data.cpfCnpj,
          product_name: data.productName,
          status: 'PENDING', // Intenção de compra
          utm_source: data.utms?.source,
          utm_medium: data.utms?.medium,
          utm_campaign: data.utms?.campaign,
          utm_term: data.utms?.term,
          utm_content: data.utms?.content,
        }])
        .select('id')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, sessionId: session.id });
    } else {
      // Atualizar sessão existente com mais dados
      const { error } = await supabase
        .from('checkouts')
        .update({
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone,
          customer_cpf: data.cpfCnpj,
        })
        .eq('id', data.sessionId);

      if (error) throw error;
      return NextResponse.json({ success: true, sessionId: data.sessionId });
    }

  } catch (err: unknown) {
    const error = err as any;
    console.error("Erro no checkout-session:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
