"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { injectContentsquareScript } from "@contentsquare/tag-sdk";

// Rotas onde o heatmap NÃO deve rodar.
// - /admin: o painel lista nome, e-mail e CPF de clientes; gravar essas telas
//   mandaria a base de clientes inteira pro Contentsquare.
// - /lp: as landings trazem o próprio tag quando precisam (ver lp/pht/layout).
const ROTAS_SEM_HEATMAP = ["/admin", "/lp"];

/**
 * Heatmap e gravação de sessão (Contentsquare), restrito ao checkout.
 *
 * Fica no layout raiz mas se auto-desliga fora do funil de compra, porque o
 * layout raiz também serve o painel administrativo.
 *
 * `injectContentsquareScript` só roda no navegador: daí o "use client" e o
 * useEffect, em vez de chamar direto no módulo (que executaria no SSR).
 */
export function Contentsquare() {
  const pathname = usePathname();
  const habilitado = !ROTAS_SEM_HEATMAP.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  );

  useEffect(() => {
    if (!habilitado) return;
    injectContentsquareScript({ clientId: "5b651f7f96b38" });
  }, [habilitado]);

  return null;
}
