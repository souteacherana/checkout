import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { astronService } from '@/lib/astron';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // O Asaas envia o webhook com o evento e os dados do pagamento
    const { event, payment } = body;

    // Apenas nos importamos com pagamentos recebidos/confirmados
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paymentId = payment.id; // Ex: pay_123456789

      console.log(`[Webhook Asaas] Pagamento confirmado: ${paymentId}`);

      // Buscar o checkout no Supabase usando o paymentId
      const { data: checkout, error: fetchError } = await supabase
        .from('checkouts')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (fetchError || !checkout) {
        console.error(`Checkout não encontrado para o pagamento ${paymentId}`);
        return NextResponse.json({ error: 'Checkout not found' }, { status: 404 });
      }

      // Atualizar o status do checkout para PAID
      const { error: updateError } = await supabase
        .from('checkouts')
        .update({ status: 'PAID' })
        .eq('id', checkout.id);

      if (updateError) {
        console.error("Erro ao atualizar checkout:", updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`[Webhook Asaas] Checkout ${checkout.id} atualizado para PAID.`);

      // Adicionar o aluno no Astron Members APENAS se for o produto LOW
      if (checkout.product_name === 'Preço Certo = Aula Lucrativa') {
        console.log("Produto LOW detectado. Iniciando integração com Astron Members...");
        await astronService.forwardAsaasWebhook(body);
      } else {
        console.log(`Produto (${checkout.product_name}) não requer integração com Astron.`);
      }

      return NextResponse.json({ success: true, message: 'Payment processed and student added' });
    }

    // Se for outro evento (ex: PAYMENT_CREATED, PAYMENT_OVERDUE), só ignoramos com sucesso
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: any) {
    console.error("Erro no Webhook do Asaas:", error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
