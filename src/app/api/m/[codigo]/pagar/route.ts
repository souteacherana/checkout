/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { asaasService } from '@/lib/asaas';
import { calcularOpcoes, descricaoCobranca } from '@/lib/vendas-mentoria';

const MULTA_BOLETO = 40; // R$ fixos por parcela em atraso (regra comercial)

/**
 * POST — o cliente escolheu método/parcelas e paga.
 * O valor NUNCA vem do navegador: é recalculado da tabela de preços aqui.
 * Body: { metodo, parcelas, creditCard? }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;
    const body = await req.json();
    const { metodo, parcelas, creditCard } = body;

    const { data: venda } = await supabaseAdmin
      .from('vendas_mentoria')
      .select('*')
      .eq('codigo', codigo.toUpperCase())
      .single();

    if (!venda) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }
    if (venda.status === 'PAGO' || venda.status === 'PARCIAL') {
      return NextResponse.json({ error: 'Este pagamento já foi iniciado. Se precisar de ajuda, fale com seu consultor.' }, { status: 409 });
    }
    if (venda.status === 'CANCELADO') {
      return NextResponse.json({ error: 'Este link não está mais ativo.' }, { status: 410 });
    }
    // Cobrança já gerada (pix/boleto aguardando): não duplica — o GET reexibe
    if (venda.status === 'AGUARDANDO_PAGAMENTO' && venda.asaas_payment_id) {
      return NextResponse.json({ error: 'Já existe uma cobrança gerada para este link. Recarregue a página para vê-la.' }, { status: 409 });
    }
    if (!venda.asaas_customer_id) {
      return NextResponse.json({ error: 'Cadastro incompleto. Fale com seu consultor.' }, { status: 500 });
    }

    const valorTotal = Number(venda.valor_total);
    const entrada = venda.entrada_valor ? Number(venda.entrada_valor) : 0;
    const restante = Math.max(valorTotal - entrada, 0);

    const { data: precos } = await supabaseAdmin
      .from('mentoria_precos')
      .select('*')
      .eq('mentoria', venda.mentoria);

    const opcao = calcularOpcoes(precos || [], valorTotal, restante)
      .find(o => o.metodo === metodo && o.parcelas === Number(parcelas));

    if (!opcao) {
      return NextResponse.json({ error: 'Opção de pagamento inválida' }, { status: 400 });
    }

    const descricao = descricaoCobranca(venda.mentoria);
    const externalReference = venda.codigo;

    // ===== PIX (só à vista) =====
    if (metodo === 'PIX') {
      const payment = await asaasService.createPixPayment({
        customer: venda.asaas_customer_id,
        value: opcao.total,
        description: descricao,
        externalReference,
      });
      const qr = await asaasService.getPixQrCode(payment.id);

      await supabaseAdmin.from('vendas_mentoria').update({
        status: 'AGUARDANDO_PAGAMENTO',
        metodo_escolhido: 'PIX',
        parcelas_escolhidas: 1,
        asaas_payment_id: payment.id,
        updated_at: new Date().toISOString(),
      }).eq('id', venda.id);

      return NextResponse.json({ success: true, tipo: 'PIX', qr });
    }

    // ===== BOLETO (1ª parcela vence em 3 dias — é a "entrada" do plano) =====
    if (metodo === 'BOLETO') {
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const payment = await asaasService.createBoletoPayment({
        customer: venda.asaas_customer_id,
        installmentCount: opcao.parcelas,
        installmentValue: opcao.valor_parcela,
        description: descricao,
        dueDate,
        fineValue: MULTA_BOLETO,
        externalReference,
      });

      await supabaseAdmin.from('vendas_mentoria').update({
        status: 'AGUARDANDO_PAGAMENTO',
        metodo_escolhido: 'BOLETO',
        parcelas_escolhidas: opcao.parcelas,
        asaas_payment_id: payment.id,
        updated_at: new Date().toISOString(),
      }).eq('id', venda.id);

      return NextResponse.json({
        success: true,
        tipo: 'BOLETO',
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
      });
    }

    // ===== CARTÃO =====
    if (metodo === 'CREDIT_CARD') {
      if (!creditCard?.holderName || !creditCard?.number || !creditCard?.expiryMonth || !creditCard?.expiryYear || !creditCard?.ccv) {
        return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 });
      }

      const payment = await asaasService.createCreditCardPayment({
        customer: venda.asaas_customer_id,
        value: opcao.total,
        description: descricao,
        creditCard,
        creditCardHolderInfo: {
          name: venda.cliente_nome,
          email: venda.cliente_email || '',
          cpfCnpj: venda.cliente_cpf || '',
          postalCode: venda.end_cep || '01310-100',
          addressNumber: venda.end_numero || '1000',
          phone: venda.cliente_telefone || '',
        },
        installmentCount: opcao.parcelas,
        externalReference,
      });

      const aprovado = payment.status === 'CONFIRMED' || payment.status === 'RECEIVED';

      await supabaseAdmin.from('vendas_mentoria').update({
        status: aprovado ? 'PAGO' : 'AGUARDANDO_PAGAMENTO',
        metodo_escolhido: 'CREDIT_CARD',
        parcelas_escolhidas: opcao.parcelas,
        asaas_payment_id: payment.id,
        paid_at: aprovado ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', venda.id);

      return NextResponse.json({ success: true, tipo: 'CREDIT_CARD', status: payment.status, aprovado });
    }

    return NextResponse.json({ error: 'Método de pagamento inválido' }, { status: 400 });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: 'checkout-mentoria-pagar' } });
    const error = err as any;
    const asaasMsg = error.response?.data?.errors?.[0]?.description;
    console.error('Erro no pagamento de mentoria:', error.response?.data || error.message);
    return NextResponse.json({ error: asaasMsg || 'Erro ao processar pagamento' }, { status: 500 });
  }
}
