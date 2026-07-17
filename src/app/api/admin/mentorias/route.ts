import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';

/**
 * PUT — atualiza a config de uma mentoria: um valor da tabela de preços
 * ({metodo, parcelas, valor_parcela}) OU a foto do checkout ({image_src}).
 * ANA, ADMIN e SUPERADMIN — a aba Mentorias é onde a Ana ajusta tudo
 * sem depender de deploy. A leitura é feita direto via RLS no cliente.
 */
export async function PUT(req: Request) {
  try {
    const role = await getRoleFromRequest(req);
    if (!role || !['ANA', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mentoria } = body;

    if (!['elite', 'partiu10k'].includes(mentoria)) {
      return NextResponse.json({ error: 'Mentoria inválida' }, { status: 400 });
    }

    // Foto do checkout
    if ('image_src' in body) {
      let src = String(body.image_src || '').trim();
      if (src && !/^https?:\/\//i.test(src)) src = `https://${src}`;

      const { error } = await supabaseAdmin
        .from('mentoria_config')
        .upsert({ mentoria, image_src: src || null, updated_at: new Date().toISOString() });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Valor de uma opção de pagamento
    const { metodo, parcelas, valor_parcela } = body;
    if (!['PIX', 'BOLETO', 'CREDIT_CARD'].includes(metodo) ||
        !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }
    const valor = Number(valor_parcela);
    if (isNaN(valor) || valor <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('mentoria_precos')
      .upsert({ mentoria, metodo, parcelas, valor_parcela: valor });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected error' }, { status: 500 });
  }
}
