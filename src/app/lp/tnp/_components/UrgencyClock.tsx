"use client";

import { useCountdown } from "../_lib/useCountdown";

/** Relógio da barra de urgência, no topo da página. */
export default function UrgencyClock() {
  const { d, h, m, s } = useCountdown();

  return (
    <span
      className="urgency-clock"
      id="urgency-clock"
      aria-label="Tempo restante para o evento"
    >
      <span data-uc="d">{d}</span><span className="uc-lbl">d</span>
      <span>:</span>
      <span data-uc="h">{h}</span><span className="uc-lbl">h</span>
      <span>:</span>
      <span data-uc="m">{m}</span><span className="uc-lbl">m</span>
      <span>:</span>
      <span data-uc="s">{s}</span><span className="uc-lbl">s</span>
    </span>
  );
}
