"use client";

import { useEffect, useState } from "react";
import { EVENT_DATE_ISO } from "./workshop";

export type Countdown = { d: string; h: string; m: string; s: string };

const TARGET = new Date(EVENT_DATE_ISO).getTime();

/** Exibido no HTML do servidor, antes de o cliente saber que horas são. */
const PLACEHOLDER: Countdown = { d: "--", h: "--", m: "--", s: "--" };
const ZERO: Countdown = { d: "00", h: "00", m: "00", s: "00" };

const pad = (n: number) => String(n).padStart(2, "0");

function countdownFrom(now: number): Countdown {
  const diff = TARGET - now;
  if (diff <= 0) return ZERO;

  return {
    d: pad(Math.floor(diff / 86_400_000)),
    h: pad(Math.floor((diff % 86_400_000) / 3_600_000)),
    m: pad(Math.floor((diff % 3_600_000) / 60_000)),
    s: pad(Math.floor((diff % 60_000) / 1_000)),
  };
}

/**
 * Contagem regressiva até o início do workshop, atualizada a cada segundo.
 *
 * Começa no placeholder para que o HTML renderizado no servidor seja idêntico
 * ao da primeira renderização no cliente — do contrário o React acusaria erro
 * de hidratação, já que o relógio muda entre um e outro.
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
