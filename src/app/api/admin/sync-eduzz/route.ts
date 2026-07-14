import { NextResponse } from 'next/server';
import { getRoleFromRequest } from '@/lib/api-auth';
import { syncEduzz } from '@/lib/eduzz-sync';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Apenas ADMIN e SUPERADMIN podem disparar o sync (VIEWER só visualiza)
    const role = await getRoleFromRequest(req);
    if (!role || !['ANA', 'ADMIN', 'SUPERADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count } = await syncEduzz(30);
    return NextResponse.json({ success: true, count });
  } catch (error: unknown) {
    console.error('Error in sync-eduzz:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
