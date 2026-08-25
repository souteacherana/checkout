-- ============================================================
-- 021 — Google Ads por produto (espelha fb_pixel_id / fb_capi_token).
--
-- google_ads_conversion_id    → conta da conversão ("AW-17580476040").
--   Aceito também sem o prefixo AW-; a normalização é feita no app.
-- google_ads_conversion_label → rótulo da ação de conversão de Compra
--   ("OwCmCPjiseMcEIiNg79B"). Os dois juntos formam o `send_to` do gtag.
--
-- Nullable: produto sem os campos preenchidos cai na conversão padrão da
-- conta (NEXT_PUBLIC_GOOGLE_ADS_ID / _LABEL), do mesmo jeito que um produto
-- sem fb_pixel_id cai no pixel global.
--
-- O par é tratado como uma coisa só no app: rótulo pertence a UMA conta,
-- então preencher só um dos dois faz o produto usar a conversão padrão.
--
-- Rodar no SQL Editor do Supabase.
-- ============================================================

alter table public.products
  add column if not exists google_ads_conversion_id text,
  add column if not exists google_ads_conversion_label text;
