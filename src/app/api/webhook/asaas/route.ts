import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { astronService } from '@/lib/astron';
import { sendCapiEvent } from '@/lib/capi';
import { detectMentoria, syncMentoradoFromAsaas } from '@/lib/mentorados';

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
        // Pagamento externo ao checkout: pode ser mentoria cobrada direto
        // no Asaas (Elite / Partiu 10k) → cria/atualiza o mentorado da Ana.
        const mentoria = detectMentoria(payment.description);
        if (mentoria && payment.customer) {
          try {
            const id = await syncMentoradoFromAsaas(payment.customer, mentoria);
            console.log(`[Webhook Asaas] Mentorado ${mentoria} sincronizado (${id}) a partir do pagamento ${paymentId}.`);
            return NextResponse.json({ success: true, message: 'Mentorado synced' }, { status: 200 });
          } catch (err) {
            Sentry.captureException(err, { tags: { area: 'mentorados-webhook' } });
            console.error('Erro ao sincronizar mentorado:', err);
            // 200 mesmo assim: o backfill/próxima parcela corrige
            return NextResponse.json({ success: true, message: 'Mentorado sync failed, ignored' }, { status: 200 });
          }
        }
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

      // Adicionar o aluno no Astron Members APENAS se for o produto LOW.
      // Decisão pelo product_key (definido no servidor a partir do slug),
      // nunca pelo product_name, que já foi controlável pelo cliente.
      if (checkout.product_key?.toUpperCase() === 'LOW') {
        console.log("Produto LOW detectado. Iniciando integração com Astron Members...");
        await astronService.forwardAsaasWebhook(body);
      } else {
        console.log(`Produto (${checkout.product_key}) não requer integração com Astron.`);
      }

      // Se foi pago via PIX, envia o evento de Purchase pro CAPI (já que não foi enviado no checkout)
      if (checkout.payment_method === 'PIX' && checkout.product_key) {
        const { data: productDB } = await supabaseAdmin
          .from('products')
          .select('fb_pixel_id, fb_capi_token')
          .eq('slug', checkout.product_key.toLowerCase())
          .single();

        if (productDB?.fb_pixel_id && productDB?.fb_capi_token) {
          console.log("Enviando CAPI Purchase para PIX pago...");
          await sendCapiEvent(
            productDB.fb_pixel_id, 
            productDB.fb_capi_token, 
            { email: checkout.customer_email, phone: checkout.customer_phone, fbp: checkout.fb_fbp, fbc: checkout.fb_fbc }, 
            Number(checkout.amount), 
            checkout.product_name || "Produto", 
            paymentId
          );
        }
      }

      return NextResponse.json({ success: true, message: 'Payment processed and student added' });
    }

    // Se for outro evento (ex: PAYMENT_CREATED, PAYMENT_OVERDUE), só ignoramos com sucesso
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'webhook-asaas' } });
    console.error("Erro no Webhook do Asaas:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
