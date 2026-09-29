"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  GA4_ID,
  GOOGLE_ADS_GT_ID,
  GOOGLE_ADS_ID,
  GTM_ID,
  gtag,
} from "@/lib/gtag";

// Rotas onde o Google tag e GTM NÃO devem rodar.
// - /admin: o painel traz nome, e-mail e CPF de cliente no título e na URL,
//   e o GA4/GTM mandaria page_title/page_location em TODO hit — seria despejar a
//   base de clientes dentro do Analytics.
//
// Checkout e landings ficam de fora desta lista de propósito: é o funil que
// o tráfego precisa medir de ponta a ponta.
const ROTAS_SEM_GOOGLE = ["/admin"];

/**
 * Google Tag (gtag.js: GA4 + Google Ads) e Google Tag Manager (GTM).
 *
 * Fica no layout raiz, como o Meta Pixel, mas se auto-desliga no painel:
 * mesma estratégia do <Contentsquare />, que também mora no raiz porque o
 * layout raiz serve checkout, landings E administrativo.
 *
 * A injeção é feita à mão, no useEffect, e NÃO com <Script> do next/script:
 * renderizado a partir de um client component no layout raiz, o <Script>
 * impedia o <Suspense> que envolve o CheckoutForm de revelar o conteúdo.
 */
export function GoogleTag() {
  const pathname = usePathname();
  const habilitado = !ROTAS_SEM_GOOGLE.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );

  useEffect(() => {
    if (!habilitado) return;

    // Inicializa a fila global do dataLayer caso ainda não exista
    window.dataLayer = window.dataLayer || [];

    // 1. Google Tag Manager (GTM: GTM-MPNW6FZ9)
    if (GTM_ID && !document.getElementById("gtm-script")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.dataLayer as any).push({
        "gtm.start": new Date().getTime(),
        event: "gtm.js",
      });

      const gtmScript = document.createElement("script");
      gtmScript.id = "gtm-script";
      gtmScript.async = true;
      gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      document.head.appendChild(gtmScript);
    }

    // 2. Google Tag (gtag.js: GA4 = G-WVX3E9E4ME, ADS = GT-K54PN64Q e AW-17580476040)
    if (GA4_ID && !document.getElementById("google-tag")) {
      gtag("js", new Date());
      gtag("config", GA4_ID);
      if (GOOGLE_ADS_GT_ID) {
        gtag("config", GOOGLE_ADS_GT_ID);
      }
      if (GOOGLE_ADS_ID) {
        gtag("config", GOOGLE_ADS_ID);
      }

      const script = document.createElement("script");
      script.id = "google-tag";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
      document.head.appendChild(script);
    }
  }, [habilitado]);

  return null;
}
