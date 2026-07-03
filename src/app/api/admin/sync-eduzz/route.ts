import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';
import { mapEduzzSale, type EduzzSale } from '@/lib/eduzz';

export async function POST(req: Request) {
  try {
    // Apenas ADMIN e SUPERADMIN podem disparar o sync (VIEWER só visualiza)
    const role = await getRoleFromRequest(req);
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.EDUZZ_CLIENT_ID;
    const clientSecret = process.env.EDUZZ_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Eduzz credentials not configured' }, { status: 500 });
    }

    // 1. Get OAuth Token from Eduzz
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'client_credentials');
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);

    const tokenRes = await fetch('https://accounts-api.eduzz.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error("Eduzz Auth Error:", errData);
      return NextResponse.json({ error: 'Failed to authenticate with Eduzz' }, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch Sales from Eduzz
    // A API exige startDate/endDate e retorna FIXO 10 itens por página
    // (ignora o parâmetro limit). Para não estourar o timeout da Vercel,
    // esta rota sincroniza só os últimos 30 dias; o histórico completo
    // é importado pelo script local scripts/backfill-eduzz.mjs.
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const allSales: EduzzSale[] = [];
    let page = 1;
    let totalPages = 1;
    const MAX_PAGES = 60; // 600 vendas por sync — proteção contra timeout

    console.log(`Fetching sales from Eduzz (${startDate} to ${endDate})...`);
    do {
      const salesUrl = `https://api.eduzz.com/myeduzz/v1/sales?page=${page}&startDate=${startDate}&endDate=${endDate}`;

      const salesRes = await fetch(salesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!salesRes.ok) {
        console.error("Eduzz Sales Fetch Error", salesRes.status, await salesRes.text());
        break;
      }

      const salesData = await salesRes.json();
      totalPages = salesData.pages || 1;

      if (salesData.items?.length) {
        allSales.push(...salesData.items);
      }
      page++;
    } while (page <= totalPages && page <= MAX_PAGES);

    // Ignora vendas sem id (não dá pra fazer upsert idempotente sem chave)
    const mappedData = allSales.filter(s => s.id != null).map(mapEduzzSale);

    if (mappedData.length === 0) {
      return NextResponse.json({ success: true, message: 'No sales found to sync', count: 0 });
    }

    // 3. Upsert to Supabase
    const { error } = await supabaseAdmin
      .from('eduzz_sales')
      .upsert(mappedData, { onConflict: 'id' });

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: 'Failed to save to database', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: mappedData.length });
  } catch (error: unknown) {
    console.error('Error in sync-eduzz:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
