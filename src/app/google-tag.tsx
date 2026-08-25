"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GOOGLE_ADS_ID, GOOGLE_TAG_ID, gtag } from "@/lib/gtag";

// Rotas onde o Google tag NÃO deve rodar.
// - /admin: o painel traz nome, e-mail e CPF de cliente no título e na URL,
//   e o GA4 manda page_title/page_location em TODO hit — seria despejar a
//   base de clientes dentro do Analytics.
//
// Checkout e landings ficam de fora desta lista de propósito: é o funil que
// o tráfego precisa medir de ponta a ponta. O motivo que tirou o heatmap do
// checkout (ver app/contentsquare.tsx) não se aplica aqui — o gtag conta
// página vista e evento, não grava o conteúdo dos campos do formulário.
const ROTAS_SEM_GOOGLE = ["/admin"];

/**
 * Google tag (gtag.js) — GA4 + Google Ads.
 *
 * Fica no layout raiz, como o Meta Pixel, mas se auto-desliga no painel:
 * mesma estratégia do <Contentsquare />, que também mora no raiz porque o
 * layout raiz serve checkout, landings E administrativo.
 *
 * A injeção é feita à mão, no useEffect, e NÃO com <Script> do next/script:
 * renderizado a partir de um client component no layout raiz, o <Script>
 * impedia o <Suspense> que envolve o CheckoutForm de revelar o conteúdo — a
 * página de checkout ficava presa no "Carregando formulário...". O
 * Contentsquare, aqui do lado, é injetado do mesmo jeito e pelo mesmo motivo.
 */
export function GoogleTag() {
  const pathname = usePathname();
  const habilitado = !ROTAS_SEM_GOOGLE.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );

  useEffect(() => {
    if (!habilitado || !GOOGLE_TAG_ID) return;
    // O efeito roda duas vezes em desenvolvimento (StrictMode), e o pathname
    // muda dentro da mesma sessão: um tag só, sempre.
    if (document.getElementById("google-tag")) return;

    // Enfileira antes de baixar o script: o gtag.js processa o acumulado
    // assim que carrega. A conta do Ads entra junto do GA4 — sem `config`
    // dela, a conversão de Compra do checkout não chega no Google Ads e o
    // remarketing das landings não monta público.
    gtag("js", new Date());
    gtag("config", GOOGLE_TAG_ID);
    gtag("config", GOOGLE_ADS_ID);

    const script = document.createElement("script");
    script.id = "google-tag";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`;
    document.head.appendChild(script);
  }, [habilitado]);

  return null;
}
