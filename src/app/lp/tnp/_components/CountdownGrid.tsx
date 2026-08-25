"use client";

import { useCountdown } from "../_lib/useCountdown";

const BOXES = [
  { unit: "d", label: "Dias" },
  { unit: "h", label: "Horas" },
  { unit: "m", label: "Minutos" },
  { unit: "s", label: "Segundos" },
] as const;

/** Contagem regressiva em blocos, na seção de fechamento. */
export default function CountdownGrid() {
  const countdown = useCountdown();

  return (
    <div
      className="countdown-grid"
      id="countdown"
      aria-label="Contagem regressiva até o workshop"
    >
      {BOXES.map(({ unit, label }) => (
        <div className="countdown-box" key={unit}>
          <div className="cd-number" data-u={unit}>
            {countdown[unit]}
          </div>
          <div className="cd-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
