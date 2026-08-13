import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { astronService } from '@/lib/astron';
import { sendCapiEvent } from '@/lib/capi';
import { notifyZoomConfirmation } from '@/lib/mailchimp';
import { detectMentoria, syncMentoradoFromAsaas } from '@/lib/mentorados';
import { asaasService } from '@/lib/asaas';

const PAGO_STATUSES = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED'];

// Folga após o horário da aula em que ainda faz sentido mandar o link da sala.
// O workshop dura ~3h e é normal alguém comprar com ele já rolando.
const HORAS_TOLERANCIA_POS_AULA = 6;

/**
 * Atualiza o status de uma venda de mentoria (/m/{codigo}) a partir do
 * estado real no Asaas: todas as parcelas pagas → PAGO; algumas → PARCIAL.
 * Devolve a venda pra quem chamou (a tag de entrada facilitada depende dela).
 */
async function atualizarVendaMentoria(codigo: string) {
  try {
    const { data: venda } = await supabaseAdmin
      .from('vendas_mentoria')
      .select('id, status, entrada_facilitada')
      .eq('codigo', codigo)
      .single();
    if (!venda || venda.status === 'CANCELADO') return venda ?? null;
    if (venda.status === 'PAGO') return venda;

    const cobrancas = (await asaasService.listPaymentsByExternalReference(codigo))
      .filter(p => !p.deleted);
    if (cobrancas.length === 0) return venda;

    const pagas = cobrancas.filter(p => PAGO_STATUSES.includes(p.status));
    const tudoPago = pagas.length === cobrancas.length;

    await supabaseAdmin.from('vendas_mentoria').update({
      status: tudoPago ? 'PAGO' : (pagas.length > 0 ? 'PARCIAL' : 'AGUARDANDO_PAGAMENTO'),
      paid_at: tudoPago ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', venda.id);

    console.log(`[Webhook Asaas] Venda mentoria ${codigo}: ${pagas.length}/${cobrancas.length} parcelas pagas.`);
    return venda;
  } catch (err) {
    Sentry.captureException(err, { tags: { area: 'vendas-mentoria-webhook' } });
    console.error(`Erro ao atualizar venda de mentoria ${codigo}:`, err);
    return null;
  }
}

/**
 * Marca o ciclo mais recente do mentorado com a tag entrada_facilitada
 * (o mesmo vocabulário da barra de filtros da aba Mentorados).
 */
async function aplicarTagEntradaFacilitada(mentoradoId: string) {
  try {
    const { data: ciclo } = await supabaseAdmin
      .from('mentorado_ciclos')
      .select('id, tags')
      .eq('mentorado_id', mentoradoId)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ciclo || (ciclo.tags || []).includes('entrada_facilitada')) return;

    await supabaseAdmin
      .from('mentorado_ciclos')
      .update({ tags: [...(ciclo.tags || []), 'entrada_facilitada'], updated_at: new Date().toISOString() })
      .eq('id', ciclo.id);
    console.log(`[Webhook Asaas] Tag entrada_facilitada aplicada ao ciclo do mentorado ${mentoradoId}.`);
  } catch (err) {
    Sentry.captureException(err, { tags: { area: 'vendas-mentoria-webhook' } });
    console.error(`Erro ao aplicar tag de entrada facilitada (${mentoradoId}):`, err);
  }
}

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
        // Venda de mentoria do nosso checkout? O externalReference carrega o
        // código do link (/m/{codigo}) — atualiza o status (PARCIAL/PAGO).
        let vendaMentoria: { entrada_facilitada: boolean } | null = null;
        if (payment.externalReference) {
          vendaMentoria = await atualizarVendaMentoria(String(payment.externalReference));
        }

        // Pagamento externo ao checkout: pode ser mentoria cobrada direto
        // no Asaas (Elite / Partiu 10k) → cria/atualiza o mentorado da Ana.
        const mentoria = detectMentoria(payment.description);
        if (mentoria && payment.customer) {
          try {
            const id = await syncMentoradoFromAsaas(payment.customer, mentoria);
            if (id && vendaMentoria?.entrada_facilitada) {
              await aplicarTagEntradaFacilitada(id);
            }
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

      // Validação Anti-Fraude: confere se o valor pago bate com a intenção de compra.
      //
      // Parcelamento muda a base da comparação: o Asaas cria UMA cobrança por
      // parcela, e o webhook chega com o valor da parcela — não com o total.
      // Comparar a parcela contra o total marcava toda venda parcelada como
      // fraude. `payment.installment` é o id do parcelamento no Asaas, presente
      // só quando a cobrança faz parte de um.
      const parcelas = Number(checkout.installments) || 1;
      const ehParcelado = !!payment.installment || parcelas > 1;
      const valorEsperado = ehParcelado ? Number(checkout.amount) / parcelas : Number(checkout.amount);

      // Tolerância de centavos: o valor da parcela é arredondado na criação da
      // cobrança, então a divisão nem sempre fecha exata. Fraude real erra em
      // reais, não em centavos.
      if (Math.abs(Number(payment.value) - valorEsperado) > 0.02) {
        console.error(`🚨 ALERTA DE FRAUDE/ERRO: Valor pago (${payment.value}) diverge do esperado (${valorEsperado.toFixed(2)}) para o pagamento ${paymentId}. Checkout: total ${checkout.amount} em ${parcelas}x.`);
        Sentry.captureMessage(`Divergência de valor no pagamento ${paymentId}: pago ${payment.value}, esperado ${valorEsperado.toFixed(2)}`, 'warning');
        await supabaseAdmin.from('checkouts').update({ status: 'PAYMENT_MISMATCH_REVIEW' }).eq('id', checkout.id);
        // 200 de propósito: a venda já está marcada pra revisão manual, e
        // reentregar não muda nada. Com 400 o Asaas reenviaria em loop e
        // acabaria suspendendo a fila — derrubando a confirmação de TODOS os
        // outros pagamentos, inclusive Pix.
        return NextResponse.json({ success: true, message: 'Payment value mismatch, flagged for review' }, { status: 200 });
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

      // O produto alimenta duas automações abaixo: o CAPI (só PIX, já que o
      // cartão dispara no checkout) e o e-mail com a sala do Zoom (ambos).
      const { data: productDB } = checkout.product_key
        ? await supabaseAdmin
            .from('products')
            .select('title, fb_pixel_id, fb_capi_token, zoom_link, zoom_datetime')
            .eq('slug', checkout.product_key.toLowerCase())
            .single()
        : { data: null };

      // E-mail de confirmação com a sala do Zoom, via Mailchimp.
      // O Asaas manda DOIS eventos por pagamento (PAYMENT_CONFIRMED e
      // PAYMENT_RECEIVED) e reentrega em caso de falha, então a trava precisa
      // ser atômica: o update condicionado a zoom_email_sent_at nulo só afeta
      // linha em UMA das execuções concorrentes — quem não recebe linha de
      // volta perdeu a corrida e não envia.
      //
      // A janela existe porque no cartão o PAYMENT_RECEIVED só chega quando a
      // compensação cai (~30 dias depois do PAYMENT_CONFIRMED). Sem ela, quem
      // comprou no cartão receberia o link da sala um mês após a aula. A folga
      // cobre quem compra com a aula já rolando, que é comum.
      const aulaNoPrazo = productDB?.zoom_datetime
        ? Date.now() < new Date(productDB.zoom_datetime).getTime() + HORAS_TOLERANCIA_POS_AULA * 60 * 60 * 1000
        : false;

      if (productDB?.zoom_link && aulaNoPrazo && checkout.customer_email) {
        const { data: travou } = await supabaseAdmin
          .from('checkouts')
          .update({ zoom_email_sent_at: new Date().toISOString() })
          .eq('id', checkout.id)
          .is('zoom_email_sent_at', null)
          .select('id');

        if (travou && travou.length > 0) {
          await notifyZoomConfirmation({
            email: checkout.customer_email,
            name: checkout.customer_name || '',
            productSlug: checkout.product_key!.toLowerCase(),
            productTitle: productDB.title || checkout.product_name || 'Workshop',
            zoomLink: productDB.zoom_link,
            zoomDatetime: productDB.zoom_datetime!,
          });
        }
      }

      // Se foi pago via PIX, envia o evento de Purchase pro CAPI (já que não foi enviado no checkout)
      if (checkout.payment_method === 'PIX' && checkout.product_key) {
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
