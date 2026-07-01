import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function escapeCSV(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Criamos um client do Supabase usando o token de sessão do admin para segurança (RLS)
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: checkouts, error } = await supabaseClient
      .from('checkouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      "Fatura", "Status", "Método de Pagamento", "Forma de Pagamento", "Nº Parcelas", "Moeda", "Contrato", 
      "Parcelamento Sem Limites", "Data de Criação", "Data de Vencimento", "Data de Pagamento", "Data de Crédito", 
      "Data de Solicitação de Reembolso", "Data de Reembolso", "Tipo de Reembolso", "SKU", "ID do Produto", 
      "Produto", "Quantidade", "Cupom", "Valor do Cupom", "Valor Inicial da Venda", "Valor Total da Venda", 
      "Valor Faturado Documento Fiscal", "Valor Inicial do Item", "Valor Total do Item", "Valor Reembolsado", 
      "Valor de Frete", "Liquidação do Parcelamento", "Taxa Eduzz", "Taxa Alumy", "Outros", 
      "Ganho Liquido", "Tipo Parceiro", "Parceiro", "Recebeu Doc Fiscal", "Cliente / Nome", "Cliente / E-mail", 
      "Cliente / Fones", "Cliente / Tipo Documento", "Cliente / Documento", "Endereço", "Numero", "Complemento", 
      "Bairro", "CEP", "Cidade", "IBGE", "UF", "UTM Source", "UTM Campaign", "UTM Medium", "UTM Content", 
      "UTM Term", "URL Boleto", "Nome da Oferta"
    ];

    const rows = (checkouts || []).map(c => {
      const isCreditCard = c.payment_method === 'CREDIT_CARD';
      const isPix = c.payment_method === 'PIX';
      const methodLabel = isPix ? 'Pix' : (isCreditCard ? 'Cartão de Crédito' : c.payment_method);
      const isInstallment = (c.installments && c.installments > 1) ? 'Parcelado' : 'À Vista';
      
      const amount = Number(c.amount || 0);
      const netValue = Number(c.net_value || amount);
      const fee = amount - netValue; // Diferença entre o Bruto e o Líquido é a Taxa do Gateway

      // Datas formato PT-BR
      const dateToBR = (isoStr: string | null) => isoStr ? new Date(isoStr).toLocaleDateString('pt-BR') : '';
      
      // Formata como 1234,56 (padrão excel pt-BR)
      const amountToStr = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let docType = '';
      if (c.customer_cpf) {
        docType = c.customer_cpf.length > 14 ? 'CNPJ' : 'CPF';
      }

      const statusMap: any = {
        'PAID': 'Paga',
        'PENDING': 'Aguardando Pagamento',
        'PIX_PENDING': 'Aguardando Pix',
        'PAYMENT_MISMATCH_REVIEW': 'Em Revisão'
      };

      return [
        c.asaas_invoice_number || c.payment_id || c.id, // Fatura
        statusMap[c.status] || c.status, // Status
        methodLabel, // Método de Pagamento
        isInstallment, // Forma de Pagamento
        c.installments || 1, // Nº Parcelas
        'BRL', // Moeda
        '', // Contrato
        'Não', // Parcelamento Sem Limites
        dateToBR(c.created_at), // Data de Criação
        dateToBR(c.payment_date || c.created_at), // Data de Vencimento
        dateToBR(c.payment_date), // Data de Pagamento
        dateToBR(c.credit_date), // Data de Crédito
        '', // Data de Solicitação de Reembolso
        '', // Data de Reembolso
        '', // Tipo de Reembolso
        c.product_key || '', // SKU
        '', // ID do Produto
        c.product_name || 'Produto Não Identificado', // Produto
        '1', // Quantidade
        '', // Cupom
        '0,00', // Valor do Cupom
        amountToStr(amount), // Valor Inicial da Venda
        amountToStr(amount), // Valor Total da Venda
        amountToStr(amount), // Valor Faturado Documento Fiscal
        amountToStr(amount), // Valor Inicial do Item
        amountToStr(amount), // Valor Total do Item
        '0,00', // Valor Reembolsado
        '0,00', // Valor de Frete
        '', // Liquidação do Parcelamento
        amountToStr(fee), // Taxa Eduzz (Taxa Asaas simulada)
        '0,00', // Taxa Alumy
        '0,00', // Outros
        amountToStr(netValue), // Ganho Liquido
        '', // Tipo Parceiro
        '', // Parceiro
        'Não', // Recebeu Doc Fiscal
        c.customer_name || '', // Cliente / Nome
        c.customer_email || '', // Cliente / E-mail
        c.customer_phone || '', // Cliente / Fones
        docType, // Cliente / Tipo Documento
        c.customer_cpf || '', // Cliente / Documento
        '', // Endereço
        '', // Numero
        '', // Complemento
        '', // Bairro
        '', // CEP
        '', // Cidade
        '', // IBGE
        '', // UF
        c.utm_source || '', // UTM Source
        c.utm_campaign || '', // UTM Campaign
        c.utm_medium || '', // UTM Medium
        c.utm_content || '', // UTM Content
        c.utm_term || '', // UTM Term
        c.asaas_invoice_url || '', // URL Boleto
        c.product_name || '' // Nome da Oferta
      ].map(escapeCSV).join(';'); // Usando ponto e vírgula para abrir corretamente no Excel pt-br
    });

    // \uFEFF é o BOM do UTF-8, obriga o Excel a reconhecer acentos
    const csvContent = "\uFEFF" + headers.map(escapeCSV).join(';') + "\n" + rows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Relatorio_Vendas_Tier_S_${new Date().getTime()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Export CSV Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
