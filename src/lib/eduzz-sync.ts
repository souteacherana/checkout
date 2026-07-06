import { supabaseAdmin } from '@/lib/supabase-admin';
import { mapEduzzSale, type EduzzSale } from '@/lib/eduzz';

/**
 * Sincroniza as vendas recentes da Eduzz para a tabela eduzz_sales.
 * A API exige startDate/endDate e retorna FIXO 10 itens por página
 * (ignora o parâmetro limit). Para caber no timeout da Vercel,
 * cobre só os últimos `days` dias; o histórico completo é importado
 * pelo script local scripts/backfill-eduzz.mjs.
 */
export async function syncEduzz(days = 30): Promise<{ count: number }> {
  const clientId = process.env.EDUZZ_CLIENT_ID;
  const clientSecret = process.env.EDUZZ_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Eduzz credentials not configured');
  }

  // 1. OAuth token
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
    console.error("Eduzz Auth Error:", await tokenRes.text());
    throw new Error('Failed to authenticate with Eduzz');
  }

  const { access_token: accessToken } = await tokenRes.json();

  // 2. Busca as vendas paginando até o fim
  const today = new Date();
  const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const allSales: EduzzSale[] = [];
  let page = 1;
  let totalPages = 1;
  const MAX_PAGES = 60; // 600 vendas por sync — proteção contra timeout

  do {
    const salesUrl = `https://api.eduzz.com/myeduzz/v1/sales?page=${page}&startDate=${startDate}&endDate=${endDate}`;
    const salesRes = await fetch(salesUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });

    if (!salesRes.ok) {
      console.error("Eduzz Sales Fetch Error", salesRes.status, await salesRes.text());
      break;
    }

    const salesData = await salesRes.json();
    totalPages = salesData.pages || 1;
    if (salesData.items?.length) allSales.push(...salesData.items);
    page++;
  } while (page <= totalPages && page <= MAX_PAGES);

  // Ignora vendas sem id (não dá pra fazer upsert idempotente sem chave)
  const mappedData = allSales.filter(s => s.id != null).map(mapEduzzSale);

  if (mappedData.length === 0) return { count: 0 };

  // 3. Upsert no Supabase
  const { error } = await supabaseAdmin
    .from('eduzz_sales')
    .upsert(mappedData, { onConflict: 'id' });

  if (error) {
    console.error("Supabase upsert error:", error);
    throw new Error(`Failed to save to database: ${error.message}`);
  }

  return { count: mappedData.length };
}
