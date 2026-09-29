/* eslint-disable @next/next/no-img-element */
import Script from "next/script";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { THEMES } from "@/lib/products";
import { GOOGLE_ADS_ID, conversaoDeCompra, normalizarContaAds } from "@/lib/gtag";
import ObrigadoTracker from "./ObrigadoTracker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    produto: string;
  }> | {
    produto: string;
  };
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaginaObrigado({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await searchParams;

  const slug = (resolvedParams.produto || "").toLowerCase();
  const paymentId = typeof resolvedSearchParams.payment_id === "string" ? resolvedSearchParams.payment_id : undefined;

  // 1. Busca dinamicamente os dados do produto no Supabase
  const { data: productDB } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  // Fallback nos temas legados caso o slug seja estático ou pré-banco
  const themeFallback = THEMES[slug.toUpperCase()] || THEMES["DEFAULT"];

  const productTitle = productDB?.title || themeFallback.title || "Workshop";
  const productPrice = productDB?.price != null ? Number(productDB.price) : themeFallback.price;
  const productImage = productDB?.image_src || themeFallback.imageSrc;
  const accentColor = productDB?.accent_color || themeFallback.accentColor || "#10b981";
  const accentColorHover = productDB?.accent_color_hover || themeFallback.accentColorHover || accentColor;

  // Google Ads e Pixel do produto
  const contaAdsProduto = normalizarContaAds(productDB?.google_ads_conversion_id);
  const conversaoCompra = conversaoDeCompra(
    productDB?.google_ads_conversion_id,
    productDB?.google_ads_conversion_label
  );

  return (
    <main
      className="min-h-screen pb-16 pt-10 px-4 sm:px-6 flex flex-col items-center justify-center selection:bg-[var(--theme-accent)] selection:text-white"
      style={
        {
          "--theme-accent": accentColor,
          "--theme-accent-hover": accentColorHover,
        } as React.CSSProperties
      }
    >
      {/* Event snippet for Compra (49,90) conversion page */}
      <Script id="google-ads-conversion" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('event', 'conversion', {
            'send_to': '${conversaoCompra || "AW-17580476040/OwCmCPjiseMcEIiNg79B"}',
            'value': ${productPrice},
            'currency': 'BRL',
            'transaction_id': '${paymentId || ""}'
          });
        `}
      </Script>

      {/* Tracker de conversão no cliente (Meta Pixel e GA4) */}
      <ObrigadoTracker
        paymentId={paymentId}
        price={productPrice}
        productKey={slug.toUpperCase()}
        productName={productTitle}
      />

      {/* Pixel Dinâmico do Produto (se configurado de forma independente) */}
      {productDB?.fb_pixel_id && productDB.fb_pixel_id !== process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
        <Script id={`pixel-${productDB.fb_pixel_id}`} strategy="afterInteractive">
          {`
            fbq('init', '${productDB.fb_pixel_id}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* Conta do Google Ads específica do produto, se for diferente da padrão */}
      {contaAdsProduto && contaAdsProduto !== GOOGLE_ADS_ID && (
        <Script id={`google-ads-${contaAdsProduto}`} strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', '${contaAdsProduto}');
          `}
        </Script>
      )}

      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Card Principal de Confirmação */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-500">
          {/* Badge de Sucesso com Pulso */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-600 ring-8 ring-emerald-50">
              <CheckCircle2 size={44} strokeWidth={2.4} />
            </div>
          </div>

          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold tracking-wide uppercase mb-3">
            Inscrição Aprovada
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            Pagamento Confirmado!
          </h1>

          <p className="text-gray-600 text-sm sm:text-base font-medium max-w-md mx-auto mb-6">
            Sua vaga no <strong className="text-gray-900 font-bold">{productTitle}</strong> foi garantida com sucesso. Enviamos as instruções de acesso para o seu e-mail.
          </p>

          {/* Banner do Produto se houver */}
          {productImage && (
            <div className="w-full h-32 sm:h-40 mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
              <img
                src={productImage}
                alt={`Banner de ${productTitle}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Resumo do Pedido */}
          <div className="bg-gray-50/80 rounded-2xl p-4 sm:p-5 border border-gray-100 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Produto</span>
              <span className="font-semibold text-gray-900 text-right line-clamp-1">{productTitle}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Valor</span>
              <span className="font-bold text-[var(--theme-accent)]">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(productPrice)}
              </span>
            </div>
            {paymentId && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200/60 text-gray-400">
                <span>Protocolo do Pedido</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
                  {paymentId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Badges de Segurança do Rodapé */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-gray-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-500" /> Compra 100% Segura
          </span>
          <span>•</span>
          <span>Ambiente Criptografado</span>
          <span>•</span>
          <span>Pagamento via Asaas</span>
        </div>
      </div>
    </main>
  );
}
