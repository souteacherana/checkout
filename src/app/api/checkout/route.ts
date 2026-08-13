/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { asaasService } from '@/lib/asaas';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductPrice, calculateTotalValue, THEMES } from '@/lib/products';
import { sendCapiEvent } from '@/lib/capi';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, paymentMethod, customerData, paymentData } = body;

    // 0. Validação de segurança do payload
    if (!paymentMethod || !customerData || !paymentData) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 });
    }
    if (!customerData.name || !customerData.email || !customerData.cpfCnpj) {
      return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 });
    }
    if (!paymentData.productKey) {
      return NextResponse.json({ error: 'Produto não informado' }, { status: 400 });
    }

    // Busca o produto no DB — fonte da verdade para preço, título e config de CAPI.
    // Nunca confiamos em preço ou nome de produto vindos do navegador.
    const { data: productDB } = await supabaseAdmin
      .from('products')
      .select('price, title, fb_pixel_id, fb_capi_token, archived_at')
      .eq('slug', paymentData.productKey.toLowerCase())
      .single();

    if (!productDB && !THEMES[paymentData.productKey]) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }
    if (productDB?.archived_at) {
      return NextResponse.json({ error: 'Produto não está mais disponível' }, { status: 410 });
    }

    // 1. Criar Cliente no Asaas
    const customer = await asaasService.createCustomer({
      name: customerData.name,
      cpfCnpj: customerData.cpfCnpj,
      email: customerData.email,
    });

    const customerId = customer.id;
    const basePrice = Number(productDB?.price) || getProductPrice(paymentData.productKey);
    const value = paymentMethod === 'CREDIT_CARD'
      ? calculateTotalValue(basePrice, paymentData.installments || 1)
      : basePrice;

    const productName = productDB?.title || THEMES[paymentData.productKey]?.title || "Pedido via Checkout";
    const description = productName;

    // Preparar dados do CAPI
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const userAgent = request.headers.get('user-agent');
    const fbPixelId = productDB?.fb_pixel_id;
    const fbCapiToken = productDB?.fb_capi_token;


    // 2. Criar Cobrança
    if (paymentMethod === 'PIX') {
      const payment = await asaasService.createPixPayment({
        customer: customerId,
        value, // PIX geralmente não tem juros
        description,
      });

      // Busca o QR Code gerado para o PIX
      const qrCode = await asaasService.getPixQrCode(payment.id);

      // Atualiza o banco de dados
      if (sessionId) {
        await supabaseAdmin.from('checkouts').update({
          status: 'PIX_PENDING',
          amount: value,
          payment_method: 'PIX',
          payment_id: payment.id,
          product_name: productName,
          product_key: paymentData.productKey,
          installments: 1,
          utm_source: paymentData.utms?.source,
          utm_medium: paymentData.utms?.medium,
          utm_campaign: paymentData.utms?.campaign,
          utm_term: paymentData.utms?.term,
          utm_content: paymentData.utms?.content,
          fb_fbp: customerData.fbp || null,
          fb_fbc: customerData.fbc || null,
        }).eq('id', sessionId);
      } else {
        await supabaseAdmin.from('checkouts').insert([{
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          customer_cpf: customerData.cpfCnpj,
          status: 'PIX_PENDING',
          amount: value,
          payment_method: 'PIX',
          payment_id: payment.id,
          product_name: productName,
          product_key: paymentData.productKey,
          installments: 1,
          utm_source: paymentData.utms?.source,
          utm_medium: paymentData.utms?.medium,
          utm_campaign: paymentData.utms?.campaign,
          utm_term: paymentData.utms?.term,
          utm_content: paymentData.utms?.content,
          fb_fbp: customerData.fbp || null,
          fb_fbc: customerData.fbc || null,
        }]);
      }

      return NextResponse.json({
        success: true,
        paymentMethod: 'PIX',
        paymentId: payment.id,
        qrCode,
      });
    } 
    
    if (paymentMethod === 'CREDIT_CARD') {
      // Endereço de cobrança do titular. O formulário passou a coletar, mas a
      // ausência não pode barrar a venda: uma aba aberta desde antes do deploy
      // ainda envia o payload antigo. Nesses casos cai no endereço genérico
      // (comportamento anterior) e registra, pra dar pra confirmar que o campo
      // realmente chega antes de tornar obrigatório.
      const cepEnviado = String(customerData.postalCode || '').replace(/\D/g, '');
      const numeroEnviado = String(customerData.addressNumber || '').trim();
      const cepTitular = cepEnviado.length === 8 ? cepEnviado : '01310100';
      const numeroTitular = numeroEnviado || '1000';

      if (cepEnviado.length !== 8 || !numeroEnviado) {
        Sentry.captureMessage('Checkout de cartão sem endereço de cobrança — usando fallback genérico', 'warning');
        console.warn('Checkout de cartão sem CEP/número do titular; usando fallback.');
      }

      // Cria a cobrança já processando o cartão
      // Para testes no sandbox Asaas, certifique-se de usar cartões válidos do sandbox
      const payment = await asaasService.createCreditCardPayment({
        customer: customerId,
        value,
        description,
        creditCard: paymentData.creditCard,
        creditCardHolderInfo: {
          name: customerData.name,
          email: customerData.email,
          cpfCnpj: customerData.cpfCnpj,
          postalCode: cepTitular,
          addressNumber: numeroTitular,
          // Sem o prefixo internacional: o Asaas espera o número nacional, e
          // "+55…" chegava como dígito a mais na análise do emissor.
          phone: String(customerData.phone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''),
        },
        installmentCount: paymentData.installments,
      });

      // Atualiza o banco de dados
      if (sessionId) {
        await supabaseAdmin.from('checkouts').update({
          status: payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' ? 'PAID' : 'PENDING',
          amount: value,
          payment_method: 'CREDIT_CARD',
          payment_id: payment.id,
          product_name: productName,
          product_key: paymentData.productKey,
          installments: paymentData.installments || 1,
          utm_source: paymentData.utms?.source,
          utm_medium: paymentData.utms?.medium,
          utm_campaign: paymentData.utms?.campaign,
          utm_term: paymentData.utms?.term,
          utm_content: paymentData.utms?.content,
          fb_fbp: customerData.fbp || null,
          fb_fbc: customerData.fbc || null,
        }).eq('id', sessionId);
      } else {
        await supabaseAdmin.from('checkouts').insert([{
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_phone: customerData.phone,
          customer_cpf: customerData.cpfCnpj,
          status: payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' ? 'PAID' : 'PENDING',
          amount: value,
          payment_method: 'CREDIT_CARD',
          payment_id: payment.id,
          product_name: productName,
          product_key: paymentData.productKey,
          installments: paymentData.installments || 1,
          utm_source: paymentData.utms?.source,
          utm_medium: paymentData.utms?.medium,
          utm_campaign: paymentData.utms?.campaign,
          utm_term: paymentData.utms?.term,
          utm_content: paymentData.utms?.content,
          fb_fbp: customerData.fbp || null,
          fb_fbc: customerData.fbc || null,
        }]);
      }

      // Se pagou via cartão e foi Aprovado, envia pro CAPI
      if ((payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') && fbPixelId && fbCapiToken) {
        // Dispara de forma assíncrona
        sendCapiEvent(fbPixelId, fbCapiToken, { ...customerData, fbp: customerData.fbp, fbc: customerData.fbc }, value, description, payment.id, clientIp, userAgent);
      }

      return NextResponse.json({
        success: true,
        paymentMethod: 'CREDIT_CARD',
        paymentId: payment.id,
        status: payment.status,
      });
    }

    return NextResponse.json({ error: 'Método de pagamento inválido' }, { status: 400 });

  } catch (err: unknown) {
    const error = err as any;
    Sentry.captureException(err, { tags: { area: 'checkout' } });
    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: 'Erro ao processar checkout', details: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
