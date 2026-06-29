/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { asaasService } from '@/lib/asaas';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getProductPrice, calculateTotalValue, THEMES } from '@/lib/products';

export async function POST(request: Request) {
  console.log("Iniciando checkout. Chave do Asaas atual:", process.env.ASAAS_API_KEY ? "EXISTS" : "MISSING", "Lenght:", process.env.ASAAS_API_KEY?.length);
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

    // 1. Criar Cliente no Asaas
    const customer = await asaasService.createCustomer({
      name: customerData.name,
      cpfCnpj: customerData.cpfCnpj,
      email: customerData.email,
    });

    const customerId = customer.id;
    const basePrice = getProductPrice(paymentData.productKey);
    const value = paymentMethod === 'CREDIT_CARD' 
      ? calculateTotalValue(basePrice, paymentData.installments || 1)
      : basePrice;

    const description = "Pedido via Checkout";

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
          product_name: THEMES[paymentData.productKey]?.title,
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
          product_name: THEMES[paymentData.productKey]?.title,
          utm_source: paymentData.utms?.source,
          utm_medium: paymentData.utms?.medium,
          utm_campaign: paymentData.utms?.campaign,
          utm_term: paymentData.utms?.term,
          utm_content: paymentData.utms?.content,
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
          postalCode: '01310-100', // Mock de CEP (Asaas exige na API antiga, mas para v3 com cartão as vezes é opcional. Preenchendo com mock ou exigir do usuario)
          addressNumber: '1000',
          phone: customerData.phone, // Telefone real do cliente
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
          product_name: THEMES[paymentData.productKey]?.title,
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
          product_name: THEMES[paymentData.productKey]?.title,
          utm_source: paymentData.utms?.source,
          utm_medium: paymentData.utms?.medium,
          utm_campaign: paymentData.utms?.campaign,
          utm_term: paymentData.utms?.term,
          utm_content: paymentData.utms?.content,
        }]);
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
    console.error("Erro no checkout:", error);
    return NextResponse.json(
      { error: 'Erro ao processar checkout', details: error.response?.data || error.message },
      { status: 500 }
    );
  }
}
