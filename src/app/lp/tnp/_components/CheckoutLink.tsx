"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { CHECKOUT_URL, PRODUCT } from "../_lib/workshop";
import { track } from "../_lib/pixel";

/** A query da visita não muda enquanto a página está aberta: nunca notifica. */
const naoAssina = () => () => {};
const queryNoCliente = () => window.location.search;
const queryNoServidor = () => "";

type CheckoutLinkProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  /** Identifica qual CTA gerou o clique nos relatórios da Meta. */
  location: string;
};

/**
 * Botão de compra. Leva ao checkout oficial, carregando a query da visita, e
 * registra InitiateCheckout no Pixel e na CAPI antes de sair da página.
 */
export default function CheckoutLink({
  children,
  className,
  id,
  style,
  location,
}: CheckoutLinkProps) {
  // O checkout lê as UTMs da PRÓPRIA URL e grava na venda. Como ele vive em
  // outro domínio, o que não for repassado neste link se perde no caminho —
  // foi assim que as duas primeiras vendas do TNP entraram sem origem
  // nenhuma. O fbp/fbc sobreviveu por ser cookie de domínio compartilhado; a
  // UTM, que anda só na URL, não.
  //
  // Repassa a query inteira, e não só os utm_*: gclid e fbclid valem tanto
  // quanto, e o checkout também sabe ler os dois.
  //
  // useSyncExternalStore, e não useSearchParams(): o hook do Next tornaria a
  // landing dinâmica ou exigiria um <Suspense> em volta de cada botão. Aqui o
  // servidor renderiza a URL limpa e o cliente reescreve na hidratação, sem
  // descasar o HTML. Sem JS, o href fica na URL limpa — o comportamento de
  // antes, nunca pior.
  const query = useSyncExternalStore(naoAssina, queryNoCliente, queryNoServidor).slice(1);
  const href = query
    ? `${CHECKOUT_URL}${CHECKOUT_URL.includes("?") ? "&" : "?"}${query}`
    : CHECKOUT_URL;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      id={id}
      style={style}
      onClick={() =>
        track("InitiateCheckout", {
          content_ids: PRODUCT.id,
          content_name: PRODUCT.name,
          content_type: "product",
          value: PRODUCT.value,
          currency: PRODUCT.currency,
          cta_location: location,
        })
      }
    >
      {children}
    </a>
  );
}
