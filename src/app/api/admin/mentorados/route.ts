import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';
import { MENTORIA_DURACAO_MESES } from '@/lib/mentorados';
import type { MentoradoRow } from '@/lib/database.types';

/** Início + duração da mentoria (meses) */
function calcularTermino(dataInicio: string, meses: number): string {
  const d = new Date(dataInicio + 'T12:00:00');
  d.setMonth(d.getMonth() + (meses || MENTORIA_DURACAO_MESES));
  return d.toISOString().split('T')[0];
}

/**
 * PATCH — atualiza um mentorado.
 * ANA/ADMIN/SUPERADMIN: qualquer campo editável.
 * EMMY: APENAS data_inicio, e APENAS em mentorados do Partiu 10k
 * (regra aplicada aqui no servidor — o cliente não decide nada).
 */
export async function PATCH(req: Request) {
  try {
    const role = await getRoleFromRequest(req);
    if (!role || !['EMMY', 'ANA', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...fields } = await req.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const { data: mentorado } = await supabaseAdmin
      .from('mentorados')
      .select('id, mentoria, data_termino, duracao_meses, asaas_customer_id')
      .eq('id', id)
      .single();

    if (!mentorado) return NextResponse.json({ error: 'Mentorado não encontrado' }, { status: 404 });

    // Campos que cada papel pode tocar
    const EDITAVEIS_ANA = [
      'nome', 'email', 'telefone', 'cpf', 'rg', 'endereco', 'cep',
      'imersao_rise', 'origem', 'materia', 'caneca', 'renovacao',
      'forma_pagamento', 'data_inicio', 'data_termino',
      'tags', 'notas', 'valor_contrato', 'ciclo', 'duracao_meses',
    ];
    const permitidos = role === 'EMMY' ? ['data_inicio'] : EDITAVEIS_ANA;

    if (role === 'EMMY' && mentorado.mentoria !== 'partiu10k') {
      return NextResponse.json({ error: 'EMMY só edita a data de início do Partiu 10k' }, { status: 403 });
    }

    const update: Partial<MentoradoRow> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (permitidos.includes(k)) (update as Record<string, unknown>)[k] = v;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo permitido no payload' }, { status: 400 });
    }

    // Definiu a data de início e não mandou término junto → início + duração
    if (typeof update.data_inicio === 'string' && update.data_inicio && !('data_termino' in update)) {
      const meses = Number(update.duracao_meses ?? mentorado.duracao_meses) || MENTORIA_DURACAO_MESES;
      update.data_termino = calcularTermino(update.data_inicio, meses);
    }
    // Editou o valor de um mentorado ligado ao Asaas → trava a automação
    // financeira (senão a próxima parcela desfaria o ajuste do multi-ciclo)
    if ('valor_contrato' in update && mentorado.asaas_customer_id) {
      update.financeiro_manual = true;
    }
    update.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin.from('mentorados').update(update).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'mentorados-api' } });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
