import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';
import type { MentoradoRow } from '@/lib/database.types';

/**
 * PATCH — atualiza os dados da PESSOA (contato + matéria).
 * Só ANA/ADMIN/SUPERADMIN. Ciclos são editados em /api/admin/mentorado-ciclos
 * (inclusive a permissão da EMMY sobre a data de início do Partiu 10k).
 */
export async function PATCH(req: Request) {
  try {
    const role = await getRoleFromRequest(req);
    if (!role || !['ANA', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...fields } = await req.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const EDITAVEIS = [
      'nome', 'email', 'telefone', 'cpf', 'rg', 'endereco', 'cep',
      'materia_pessoa', 'notas',
    ];

    const update: Partial<MentoradoRow> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (EDITAVEIS.includes(k)) (update as Record<string, unknown>)[k] = v;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo permitido no payload' }, { status: 400 });
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
