"use client";

import { useEffect, useState } from "react";

const CHECKOUT_BASE = "https://checkout.riseeducacao.com.br";

/**
 * Link da landing para o checkout do produto, preservando a query string.
 *
 * É o ponto onde a atribuição costuma morrer: o tráfego chega na landing com
 * as UTMs (?utm_source=crla...), e se o CTA aponta pro checkout "pelado" a
 * venda aparece sem origem no painel. Repassando a query, o checkout grava as
 * mesmas UTMs que trouxeram a pessoa.
 *
 * O valor inicial (sem query) é o mesmo link, então o botão funciona mesmo
 * antes do JS hidratar — só sem atribuição, nunca quebrado.
 */
export function useCheckoutHref(slug: string): string {
  const [href, setHref] = useState(`${CHECKOUT_BASE}/${slug}`);

  useEffect(() => {
    const busca = window.location.search;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (busca) setHref(`${CHECKOUT_BASE}/${slug}${busca}`);
  }, [slug]);

  return href;
}
