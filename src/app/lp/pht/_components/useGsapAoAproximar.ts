"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";

/**
 * Cria o contexto GSAP da seção só quando ela se aproxima da tela.
 *
 * Todas as seções montavam seus ScrollTriggers durante o carregamento, de uma
 * vez — era o que o PageSpeed reportava como "tarefas longas" e trabalho na
 * thread principal. Distribuindo pela rolagem, o carregamento inicial fica
 * livre e cada seção paga o próprio custo quando está prestes a aparecer.
 *
 * O rootMargin é folgado de propósito: o estado inicial das animações (o
 * `from` dos tweens) precisa ser aplicado ANTES da seção entrar em cena, senão
 * o conteúdo apareceria e sumiria. Se o IntersectionObserver não existir ou
 * não disparar, nada é animado e a seção fica simplesmente visível — nunca
 * escondida.
 */
export function useGsapAoAproximar(
  alvoRef: RefObject<HTMLElement | null>,
  montarAnimacoes: () => void,
) {
  useEffect(() => {
    const alvo = alvoRef.current;
    if (!alvo) return;

    let ctx: gsap.Context | undefined;
    const iniciar = () => {
      if (ctx) return;
      ctx = gsap.context(montarAnimacoes, alvo);
    };

    if (typeof IntersectionObserver === "undefined") {
      iniciar();
      return () => ctx?.revert();
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          iniciar();
          obs.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    obs.observe(alvo);

    return () => {
      obs.disconnect();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
