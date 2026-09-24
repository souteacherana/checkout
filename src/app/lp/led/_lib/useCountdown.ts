"use client";

import { useEffect, useState } from "react";
import { EVENT_DATE_ISO, URGENCY_WINDOW_MS } from "./workshop";

export type Countdown = {
  d: string;
  h: string;
  m: string;
  s: string;
  /** 0–100: quanto da janela de urgência já passou. Enche até o evento. */
  progresso: number;
};

const TARGET = new Date(EVENT_DATE_ISO).getTime();
const INICIO_DA_JANELA = TARGET - URGENCY_WINDOW_MS;

/**
 * Exibido no HTML do servidor, antes de o cliente saber que horas são.
 * Repete os travessões do HTML original.
 */
const PLACEHOLDER: Countdown = { d: "--", h: "--", m: "--", s: "--", progresso: 0 };
const ZERO: Countdown = { d: "00", h: "00", m: "00", s: "00", progresso: 100 };

const pad = (n: number) => String(n).padStart(2, "0");

function countdownFrom(now: number): Countdown {
  const diff = TARGET - now;
  if (diff <= 0) return ZERO;

  // Antes da janela começar a barra ainda mostra um fiapo, pra não parecer
  // quebrada — era o `if (pct < 4) pct = 4` do script original.
  const decorrido = now - INICIO_DA_JANELA;
  const progresso = Math.min(100, Math.max(4, (decorrido / URGENCY_WINDOW_MS) * 100));

  return {
    d: pad(Math.floor(diff / 86_400_000)),
    h: pad(Math.floor((diff % 86_400_000) / 3_600_000)),
    m: pad(Math.floor((diff % 3_600_000) / 60_000)),
    s: pad(Math.floor((diff % 60_000) / 1_000)),
    progresso,
  };
}

/**
 * Contagem regressiva até o início do workshop, atualizada a cada segundo.
 *
 * Começa no placeholder para que o HTML renderizado no servidor seja idêntico
 * ao da primeira renderização no cliente — do contrário o React acusaria erro
 * de hidratação, já que o relógio muda entre um e outro.
 *
 * O script original calculava o alvo como "próximo dia 23 às 15h, no fuso de
 * QUEM ABRE A PÁGINA", avançando de mês sozinho. Isso fazia o contador nunca
 * zerar (no dia seguinte ao evento ele já apontava pro mês que vem) e marcava
 * hora diferente pra quem não estivesse em Brasília. Aqui o alvo é a data real
 * do workshop, vinda de EVENT_DATE_ISO com fuso explícito.
 */
export function useCountdown(): Countdown {
  const [value, setValue] = useState<Countdown>(PLACEHOLDER);

  useEffect(() => {
    const tick = () => setValue(countdownFrom(Date.now()));

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return value;
}
