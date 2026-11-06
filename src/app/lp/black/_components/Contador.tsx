"use client";

import { useEffect, useState } from "react";
import { EVENT_DATE_ISO } from "../_lib/evento";

const ALVO = new Date(EVENT_DATE_ISO).getTime();
const pad = (n: number) => String(n).padStart(2, "0");

function restante(agora: number) {
  const diff = Math.max(0, ALVO - agora);
  return {
    Dias: pad(Math.floor(diff / 86_400_000)),
    Horas: pad(Math.floor((diff % 86_400_000) / 3_600_000)),
    Minutos: pad(Math.floor((diff % 3_600_000) / 60_000)),
    Segundos: pad(Math.floor((diff % 60_000) / 1_000)),
  };
}

/**
 * Renderiza "--" no servidor e assume na hidratação: o relógio muda entre o
 * HTML e a primeira renderização no cliente, e o React acusaria mismatch.
 */
export default function Contador() {
  const [tempo, setTempo] = useState<ReturnType<typeof restante> | null>(null);

  useEffect(() => {
    const tick = () => setTempo(restante(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="contador" aria-label="Contagem regressiva para a Black da Teacher">
      {(["Dias", "Horas", "Minutos", "Segundos"] as const).map((unidade) => (
        <div className="contador-item" key={unidade}>
          <span className="contador-num">{tempo ? tempo[unidade] : "--"}</span>
          <span className="contador-rotulo">{unidade}</span>
        </div>
      ))}
    </section>
  );
}
