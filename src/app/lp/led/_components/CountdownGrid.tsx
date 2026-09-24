"use client";

import { useCountdown } from "../_lib/useCountdown";

const CELULAS = [
  { unit: "d", label: "dias" },
  { unit: "h", label: "horas" },
  { unit: "m", label: "minutos" },
  { unit: "s", label: "segundos" },
] as const;

/** Contagem regressiva em blocos, na seção de fechamento. */
export default function CountdownGrid() {
  const countdown = useCountdown();

  return (
    <div
      className="countdown"
      id="countdown"
      aria-label="Contagem regressiva para o evento"
    >
      {CELULAS.map(({ unit, label }) => (
        <div className="cd-cell" key={unit}>
          <div className="cd-n" data-u={unit}>
            {countdown[unit]}
          </div>
          <div className="cd-l">{label}</div>
        </div>
      ))}
    </div>
  );
}
