"use client";

import { useEffect, useState } from "react";

const CHECKOUT_BASE = "https://checkout.riseeducacao.com.br";

/**
 * Link de destino do CTA da landing, preservando a query string.
 *
 * É o ponto onde a atribuição costuma morrer: o tráfego chega na landing com
 * as UTMs (?utm_source=crla...), e se o CTA aponta pro destino "pelado" a
 * venda aparece sem origem no relatório. Repassando a query, o destino recebe
 * as mesmas UTMs que trouxeram a pessoa.
 *
 * `destino` aceita o slug do nosso checkout ('pht') ou uma URL completa
 * (ex: um link da Eduzz, para testes de plataforma).
 *
 * O valor inicial (sem query) já é um link válido, então o botão funciona
 * mesmo antes do JS hidratar — só sem atribuição, nunca quebrado.
 */
export function useCheckoutHref(destino: string): string {
  const base = destino.startsWith("http") ? destino : `${CHECKOUT_BASE}/${destino}`;
  const [href, setHref] = useState(base);

  useEffect(() => {
    const busca = window.location.search;
    if (!busca) return;
    // Preserva parâmetros que o próprio destino já tenha (usa & em vez de ?)
    const separador = base.includes("?") ? "&" : "?";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(`${base}${separador}${busca.slice(1)}`);
  }, [base]);

  return href;
}
