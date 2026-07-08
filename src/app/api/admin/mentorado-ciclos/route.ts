import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';
import { asaasTotaisPeriodo } from '@/lib/mentorados';
import type { MentoradoCicloRow } from '@/lib/database.types';

const FULL = ['ANA', 'ADMIN', 'SUPERADMIN'];

function terminoAuto(inicio: string, meses: number): string {
  const d = new Date(inicio + 'T12:00:00');
  d.setMonth(d.getMonth() + (meses || 6));
  return d.toISOString().split('T')[0];
}

// POST: cria ciclo, OU (action=asaas) devolve os totais do Asaas de um período
export async function POST(req: Request) {
  try {
    const role = await getRoleFromRequest(req);
    if (!role || !FULL.includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    // Ação auxiliar: puxar cobranças do Asaas numa janela de datas
    if (body.action === 'asaas') {
      const { mentorado_id, data_inicio, data_termino } = body;
      const { data: m } = await supabaseAdmin
        .from('mentorados').select('asaas_customer_id').eq('id', mentorado_id).single();
      if (!m?.asaas_customer_id) {
        return NextResponse.json({ error: 'Mentorado sem vínculo com o Asaas' }, { status: 400 });
      }
      if (!data_inicio || !data_termino) {
        return NextResponse.json({ error: 'Informe início e término do ciclo primeiro' }, { status: 400 });
      }
      const totais = await asaasTotaisPeriodo(m.asaas_customer_id, data_inicio, data_termino);
      return NextResponse.json(totais);
    }

    // Criar ciclo
    const { mentorado_id } = body;
    if (!mentorado_id) return NextResponse.json({ error: 'mentorado_id obrigatório' }, { status: 400 });

    const { data: existentes } = await supabaseAdmin
      .from('mentorado_ciclos').select('numero').eq('mentorado_id', mentorado_id);
    const numero = body.numero || ((existentes?.reduce((m, c) => Math.max(m, c.numero), 0) || 0) + 1);

    const insert: Partial<MentoradoCicloRow> = {
      mentorado_id, numero,
      tags: body.tags?.length ? body.tags : ['ativo'],
      data_inicio: body.data_inicio || null,
      duracao_meses: body.duracao_meses || 6,
      data_termino: body.data_termino || (body.data_inicio ? terminoAuto(body.data_inicio, body.duracao_meses || 6) : null),
      valor_contrato: body.valor_contrato ?? null,
      valor_pago: body.valor_pago ?? null,
      forma_pagamento: body.forma_pagamento || null,
      imersao_rise: body.imersao_rise || null,
      caneca: body.caneca || null,
      origem: body.origem || null,
      notas: body.notas || null,
    };
    const { data, error } = await supabaseAdmin.from('mentorado_ciclos').insert([insert]).select('id').single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'ciclos-api' } });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

// PATCH: edita ciclo. EMMY só mexe em data_inicio de ciclos do Partiu 10k.
export async function PATCH(req: Request) {
  try {
    const role = await getRoleFromRequest(req);
    if (!role || (!FULL.includes(role) && role !== 'EMMY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, ...fields } = await req.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const { data: ciclo } = await supabaseAdmin
      .from('mentorado_ciclos')
      .select('id, duracao_meses, mentorados!inner(mentoria)')
      .eq('id', id)
      .single();
    if (!ciclo) return NextResponse.json({ error: 'Ciclo não encontrado' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mentoria = (ciclo as any).mentorados?.mentoria;

    const CAMPOS = ['numero', 'tags', 'data_inicio', 'data_termino', 'duracao_meses',
      'valor_contrato', 'valor_pago', 'forma_pagamento', 'imersao_rise', 'caneca', 'origem', 'notas'];
    const permitidos = role === 'EMMY' ? ['data_inicio'] : CAMPOS;

    if (role === 'EMMY' && mentoria !== 'partiu10k') {
      return NextResponse.json({ error: 'EMMY só edita a data de início do Partiu 10k' }, { status: 403 });
    }

    const update: Partial<MentoradoCicloRow> = {};
    for (const [k, v] of Object.entries(fields)) if (permitidos.includes(k)) (update as Record<string, unknown>)[k] = v;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo permitido' }, { status: 400 });
    }
    // Definiu início e não mandou término → início + duração
    if (typeof update.data_inicio === 'string' && update.data_inicio && !('data_termino' in update)) {
      const meses = Number(update.duracao_meses ?? ciclo.duracao_meses) || 6;
      update.data_termino = terminoAuto(update.data_inicio, meses);
    }
    update.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin.from('mentorado_ciclos').update(update).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'ciclos-api' } });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}

// DELETE: remove um ciclo (só ANA/ADMIN/SUPER)
export async function DELETE(req: Request) {
  try {
    const role = await getRoleFromRequest(req);
    if (!role || !FULL.includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    const { error } = await supabaseAdmin.from('mentorado_ciclos').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'ciclos-api' } });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
