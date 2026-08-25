"use client";

import type { CSSProperties, ReactNode } from "react";
import { CHECKOUT_URL, PRODUCT } from "../_lib/workshop";
import { track } from "../_lib/pixel";

type CheckoutLinkProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
  /** Identifica qual CTA gerou o clique nos relatórios da Meta. */
  location: string;
};

/**
 * Botão de compra. Leva ao checkout oficial e registra InitiateCheckout
 * no Pixel e na CAPI antes de sair da página.
 */
export default function CheckoutLink({
  children,
  className,
  id,
  style,
  location,
}: CheckoutLinkProps) {
  return (
    <a
      href={CHECKOUT_URL}
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
