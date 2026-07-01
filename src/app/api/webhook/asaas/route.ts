import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { astronService } from '@/lib/astron';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validação de segurança do Token do Webhook
    const asaasToken = req.headers.get('asaas-access-token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    
    if (!expectedToken || asaasToken !== expectedToken) {
      console.error('Webhook Inválido: Token ausente ou incorreto.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // O Asaas envia o webhook com o evento e os dados do pagamento
    const { event, payment } = body;

    // Apenas nos importamos com pagamentos recebidos/confirmados
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const paymentId = payment.id; // Ex: pay_123456789

      console.log(`[Webhook Asaas] Pagamento confirmado: ${paymentId}`);

      // Buscar o checkout no Supabase usando o paymentId
      const { data: checkout, error: fetchError } = await supabaseAdmin
        .from('checkouts')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (fetchError || !checkout) {
        console.warn(`Checkout não encontrado no banco para o pagamento ${paymentId}. Ignorando evento (provavelmente gerado externo ao nosso checkout).`);
        // Retornamos 200 OK para o Asaas não achar que o webhook falhou e não nos penalizar.
        return NextResponse.json({ success: true, message: 'Checkout not found locally, ignored.' }, { status: 200 });
      }

      // Validação Anti-Fraude: Confere se o valor pago bate com o valor da intenção de compra
      if (Number(payment.value) !== Number(checkout.amount)) {
        console.error(`🚨 ALERTA DE FRAUDE/ERRO: Valor pago (${payment.value}) é diferente do valor do checkout (${checkout.amount}) para o pagamento ${paymentId}`);
        // Atualizamos o banco como FRAUD_ATTEMPT ou PENDING REVIEW, mas não liberamos
        await supabaseAdmin.from('checkouts').update({ status: 'PAYMENT_MISMATCH_REVIEW' }).eq('id', checkout.id);
        return NextResponse.json({ error: 'Payment value mismatch' }, { status: 400 });
      }

      // Atualizar o status do checkout para PAID e salvar os metadados TIER S
      const { error: updateError } = await supabaseAdmin
        .from('checkouts')
        .update({ 
          status: 'PAID',
          net_value: payment.netValue,
          payment_date: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : new Date().toISOString(),
          credit_date: payment.creditDate ? new Date(payment.creditDate).toISOString() : (payment.estimatedCreditDate ? new Date(payment.estimatedCreditDate).toISOString() : null),
          asaas_invoice_url: payment.invoiceUrl,
          asaas_invoice_number: payment.invoiceNumber,
          asaas_payload: body
        })
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
