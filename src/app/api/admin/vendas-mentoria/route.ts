import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserFromRequest } from '@/lib/api-auth';
import { asaasService } from '@/lib/asaas';

// Sem caracteres ambíguos (0/O, 1/I/L) — o código vai por WhatsApp
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function gerarCodigo(tamanho = 8): string {
  const bytes = randomBytes(tamanho);
  let out = '';
  for (let i = 0; i < tamanho; i++) out += ALFABETO[bytes[i] % ALFABETO.length];
  return out;
}

/**
 * POST — cria uma venda de mentoria e devolve o link /m/{codigo}.
 * Qualquer papel logado pode criar (em dia de workshop todo mundo vende);
 * a atribuição é sempre o e-mail da sessão, nunca vem do payload.
 */
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      mentoria, renovacao, entrada_valor, entrada_facilitada,
      cliente, descricao, prazo_meses,
    } = body;

    if (!['elite', 'partiu10k'].includes(mentoria)) {
      return NextResponse.json({ error: 'Mentoria inválida' }, { status: 400 });
    }
    if (!cliente?.nome || !cliente?.cpf || !cliente?.email || !cliente?.telefone) {
      return NextResponse.json({ error: 'Nome, CPF, e-mail e telefone do cliente são obrigatórios' }, { status: 400 });
    }

    // Preço vem do banco, nunca do navegador (mesma regra do checkout de produtos).
    // Base da mentoria = 1x no cartão (valor cheio da tabela).
    const { data: precoBase } = await supabaseAdmin
      .from('mentoria_precos')
      .select('valor_parcela')
      .eq('mentoria', mentoria)
      .eq('metodo', 'CREDIT_CARD')
      .eq('parcelas', 1)
      .single();

    if (!precoBase) {
      return NextResponse.json({ error: 'Tabela de preços não encontrada para esta mentoria' }, { status: 500 });
    }

    const valorTotal = Number(precoBase.valor_parcela);
    const entrada = entrada_valor ? Number(entrada_valor) : null;
    if (entrada !== null && (isNaN(entrada) || entrada <= 0 || entrada >= valorTotal)) {
      return NextResponse.json({ error: 'Valor de entrada inválido (deve ser maior que zero e menor que o total)' }, { status: 400 });
    }

    // Cliente no Asaas já na criação do link — a página pública só usa o id
    const customer = await asaasService.createCustomer({
      name: cliente.nome,
      cpfCnpj: cliente.cpf,
      email: cliente.email,
      mobilePhone: cliente.telefone,
      address: cliente.end_rua || undefined,
      addressNumber: cliente.end_numero || undefined,
      province: cliente.end_bairro || undefined,
      postalCode: cliente.end_cep || undefined,
    });

    // Insere com retry no código (colisão de unique é improvável mas possível)
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const codigo = gerarCodigo();
      const { error } = await supabaseAdmin.from('vendas_mentoria').insert([{
        codigo,
        seller_email: user.email,
        mentoria,
        renovacao: !!renovacao,
        valor_total: valorTotal,
        entrada_valor: entrada,
        entrada_facilitada: !!entrada_facilitada,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        cliente_email: cliente.email,
        cliente_cpf: cliente.cpf,
        cliente_rg: cliente.rg || null,
        cliente_nacionalidade: cliente.nacionalidade || null,
        cliente_estado_civil: cliente.estado_civil || null,
        cliente_profissao: cliente.profissao || null,
        end_rua: cliente.end_rua || null,
        end_numero: cliente.end_numero || null,
        end_bairro: cliente.end_bairro || null,
        end_cidade: cliente.end_cidade || null,
        end_estado: cliente.end_estado || null,
        end_cep: cliente.end_cep || null,
        descricao: descricao || null,
        prazo_meses: Number(prazo_meses) || 6,
        status: 'LINK_CRIADO',
        asaas_customer_id: customer.id,
      }]);

      if (!error) {
        return NextResponse.json({ success: true, codigo });
      }
      // 23505 = unique_violation → tenta outro código; qualquer outro erro sobe
      if (error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Não foi possível gerar um código único, tente novamente' }, { status: 500 });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { area: 'vendas-mentoria' } });
    const error = err as { response?: { data?: { errors?: { description?: string }[] } }; message?: string };
    const asaasMsg = error.response?.data?.errors?.[0]?.description;
    return NextResponse.json({ error: asaasMsg || error.message || 'Unexpected error' }, { status: 500 });
  }
}
