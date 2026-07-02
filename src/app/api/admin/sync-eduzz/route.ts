import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    // Basic auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    let allSales: any[] = [];
    let page = 1;
    let hasMore = true;

    console.log("Fetching sales from Eduzz...");
    while (hasMore && page <= 5) { // Limit to 5 pages max per sync to avoid timeouts for now
      const salesUrl = `https://api.eduzz.com/myeduzz/v1/sales?page=${page}&limit=50`;
      
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
      
      if (salesData && salesData.data && salesData.data.length > 0) {
        allSales = [...allSales, ...salesData.data];
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
        client_name: sale.client?.name || sale.customer?.name || 'Unknown',
        client_email: sale.client?.email || sale.customer?.email || 'Unknown',
        client_phone: sale.client?.phone || sale.customer?.phone || null,
        product_name: sale.item?.name || sale.product?.name || 'Unknown',
        value: sale.value || 0,
        status: sale.status?.name || sale.status || 'Unknown',
        created_at: sale.created_at || new Date().toISOString()
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
  } catch (error: any) {
    console.error('Error in sync-eduzz:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
