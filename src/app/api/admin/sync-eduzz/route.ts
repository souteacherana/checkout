import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRoleFromRequest } from '@/lib/api-auth';

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

    console.log("Fetching Eduzz Token...");
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
    type EduzzSale = {
      id?: number | string;
      buyer?: { name?: string; email?: string; phone?: string };
      product?: { name?: string };
      grossGain?: { value?: number };
      total?: { value?: number };
      status?: string;
      createdAt?: string;
    };
    let allSales: EduzzSale[] = [];
    let page = 1;
    let hasMore = true;
    
    // Eduzz API requires startDate and endDate. To avoid Vercel 10s timeout,
    // we only sync the last 30 dias in this automatic route.
    // Historical data is seeded manually.
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]; 
    const endDate = today.toISOString().split('T')[0];

    console.log(`Fetching sales from Eduzz (${startDate} to ${endDate})...`);
    while (hasMore && page <= 5) { // Limit to 5 pages max per sync
      const salesUrl = `https://api.eduzz.com/myeduzz/v1/sales?page=${page}&limit=50&startDate=${startDate}&endDate=${endDate}`;
      
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
      
      if (salesData && salesData.items && salesData.items.length > 0) {
        allSales = [...allSales, ...salesData.items];
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allSales.length === 0) {
      return NextResponse.json({ success: true, message: 'No sales found to sync', count: 0 });
    }

    // 3. Upsert to Supabase
    const mappedData = allSales.map(sale => {
      return {
        id: sale.id?.toString() || `eduzz_${Math.random().toString(36).substring(7)}`,
        client_name: sale.buyer?.name || 'Unknown',
        client_email: sale.buyer?.email || 'Unknown',
        client_phone: sale.buyer?.phone || null,
        product_name: sale.product?.name || 'Unknown',
        value: sale.grossGain?.value || sale.total?.value || 0,
        status: sale.status || 'Unknown',
        created_at: sale.createdAt || new Date().toISOString()
      };
    });

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
