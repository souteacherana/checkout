import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { syncEduzz } from '@/lib/eduzz-sync';

/**
 * Endpoint chamado pelo Cron da Vercel (ver vercel.json).
 * Protegido pelo CRON_SECRET: a Vercel envia "Authorization: Bearer <CRON_SECRET>"
 * automaticamente quando a env var existe no projeto.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { count } = await syncEduzz(30);
    console.log(`[Cron Eduzz] Sync concluído: ${count} vendas atualizadas.`);
    return NextResponse.json({ success: true, count });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: 'cron-eduzz' } });
    console.error('[Cron Eduzz] Erro:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
