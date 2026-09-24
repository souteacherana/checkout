"use client";

import { useCountdown } from "../_lib/useCountdown";
import { DATA } from "../_lib/workshop";

/**
 * Faixa grudada no topo: relógio regressivo + barra que enche conforme o
 * evento se aproxima.
 *
 * É client component inteiro porque o relógio e a largura da barra mudam a
 * cada segundo. Renderiza "--" e 0% no servidor e assume na hidratação — sem
 * isso o React acusa mismatch, que foi a lição 2 da migração do TNP.
 */
export default function UrgencyBar() {
  const { d, h, m, s, progresso } = useCountdown();

  return (
    <div className="urgency-bar" role="region" aria-label="Aviso de urgência">
      <div className="urgency-inner">
        <span className="urgency-flag">
          <span className="pulse" aria-hidden="true" />
          <b></b>
        </span>
        <span className="urgency-text">AS INSCRIÇÕES ENCERRAM DIA {DATA.barra}</span>
        <span className="urgency-clock" id="urgency-clock" aria-label="Tempo restante">
          <span data-uc="d">{d}</span>
          <span className="uc-lbl">d</span>
          <span className="uc-sep">:</span>
          <span data-uc="h">{h}</span>
          <span className="uc-lbl">h</span>
          <span className="uc-sep">:</span>
          <span data-uc="m">{m}</span>
          <span className="uc-lbl">m</span>
          <span className="uc-sep">:</span>
          <span data-uc="s">{s}</span>
          <span className="uc-lbl">s</span>
        </span>
      </div>
      <div className="urgency-progress" aria-hidden="true">
        <div
          className="urgency-progress-fill"
          id="urgency-progress-fill"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  );
}
