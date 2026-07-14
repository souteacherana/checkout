import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { syncEduzz } from '@/lib/eduzz-sync';

// Sync de 30 dias leva alguns segundos mesmo paralelizado — não deixar
// o limite padrão da Vercel cortar no meio.
export const maxDuration = 60;

/**
 * Endpoint de sincronização automática da Eduzz. Chamado por:
 *  - pg_cron do Supabase a cada 10 min com ?days=7 (novas vendas + status recentes)
 *  - Cron da Vercel 1x/dia sem parâmetro (varredura de 30 dias — pega
 *    reembolsos/cancelamentos de vendas mais antigas)
 * Protegido pelo CRON_SECRET ("Authorization: Bearer <CRON_SECRET>").
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(searchParams.get('days')) || 30));

  try {
    const { count } = await syncEduzz(days);
    console.log(`[Cron Eduzz] Sync de ${days} dias concluído: ${count} vendas atualizadas.`);
    return NextResponse.json({ success: true, count, days });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'cron-eduzz' } });
    console.error('[Cron Eduzz] Erro:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
