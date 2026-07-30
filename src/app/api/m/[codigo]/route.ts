import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { asaasService } from '@/lib/asaas';
import { calcularOpcoes, cobrancaPagavel, MENTORIA_CHECKOUT_LABELS } from '@/lib/vendas-mentoria';

/**
 * GET — dados públicos de uma venda de mentoria pro checkout do cliente.
 * O código na URL é a credencial (8 chars não ambíguos, não enumerável).
 * Expõe APENAS o necessário: primeiro nome, mentoria, valores e opções.
 * CPF, RG, endereço e afins nunca saem daqui.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;

    const { data: venda } = await supabaseAdmin
      .from('vendas_mentoria')
      .select('*')
      .eq('codigo', codigo.toUpperCase())
      .single();

    if (!venda) {
      return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 });
    }
    if (venda.status === 'CANCELADO') {
      return NextResponse.json({ error: 'Este link não está mais ativo. Fale com seu consultor.' }, { status: 410 });
    }

    const valorTotal = Number(venda.valor_total);
    const entrada = venda.entrada_valor ? Number(venda.entrada_valor) : 0;
    const restante = Math.max(valorTotal - entrada, 0);

    const [{ data: precos }, { data: config }] = await Promise.all([
      supabaseAdmin
        .from('mentoria_precos')
        .select('*')
        .eq('mentoria', venda.mentoria)
        .order('metodo')
        .order('parcelas'),
      supabaseAdmin
        .from('mentoria_config')
        .select('image_src')
        .eq('mentoria', venda.mentoria)
        .maybeSingle(),
    ]);

    const opcoes = calcularOpcoes(precos || [], valorTotal, restante);

    // Se já existe cobrança gerada, reapresenta em vez de deixar duplicar
    let pagamento: Record<string, unknown> | null = null;
    let status = venda.status;
    let metodoEscolhido = venda.metodo_escolhido;

    if (venda.asaas_payment_id && status !== 'LINK_CRIADO') {
      try {
        const p = await asaasService.getPaymentSafe(venda.asaas_payment_id);

        if (status === 'AGUARDANDO_PAGAMENTO' && !cobrancaPagavel(p, metodoEscolhido)) {
          // A cobrança morreu (cancelada no Asaas ou Pix vencido). Devolve a
          // venda pra tela de escolha em vez de prender o cliente num QR
          // inútil — recarregar a página conserta sozinho.
          await supabaseAdmin.from('vendas_mentoria').update({
            status: 'LINK_CRIADO',
            metodo_escolhido: null,
            parcelas_escolhidas: null,
            asaas_payment_id: null,
            updated_at: new Date().toISOString(),
          }).eq('id', venda.id);

          console.log(`[Checkout mentoria] Cobrança ${venda.asaas_payment_id} morta (${p ? p.status : 'removida'}) — venda ${venda.codigo} liberada para nova escolha.`);
          status = 'LINK_CRIADO';
          metodoEscolhido = null;
        } else if (p) {
          if (metodoEscolhido === 'PIX' && status === 'AGUARDANDO_PAGAMENTO') {
            const qr = await asaasService.getPixQrCode(venda.asaas_payment_id);
            pagamento = { tipo: 'PIX', qr };
          } else if (metodoEscolhido === 'BOLETO') {
            pagamento = { tipo: 'BOLETO', invoiceUrl: p.invoiceUrl, bankSlipUrl: p.bankSlipUrl };
          }
        }
      } catch {
        // Sem drama: o cliente ainda vê o status; só não reexibimos o QR/boleto
        pagamento = null;
      }
    }

    return NextResponse.json({
      codigo: venda.codigo,
      mentoria: venda.mentoria,
      mentoria_label: MENTORIA_CHECKOUT_LABELS[venda.mentoria] || venda.mentoria,
      image_src: config?.image_src || null,
      primeiro_nome: (venda.cliente_nome || '').split(' ')[0],
      valor_total: valorTotal,
      entrada_valor: entrada || null,
      restante,
      status,
      metodo_escolhido: metodoEscolhido,
      parcelas_escolhidas: status === 'LINK_CRIADO' ? null : venda.parcelas_escolhidas,
      opcoes,
      pagamento,
    });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: 'checkout-mentoria' } });
    return NextResponse.json({ error: 'Erro ao carregar' }, { status: 500 });
  }
}
