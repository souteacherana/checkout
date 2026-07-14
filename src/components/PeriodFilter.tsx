"use client";

import { useState } from "react";

// Janela de tempo ativa. epoch ms; null = sem limite naquele extremo.
export type DateRange = { from: number | null; to: number | null };

const DIA = 24 * 60 * 60 * 1000;

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Tudo", days: 0 },
];

// Converte um preset de N dias numa janela {from, to}. Tudo (0) = sem limites.
export function rangeFromDays(days: number): DateRange {
  if (days <= 0) return { from: null, to: null };
  return { from: Date.now() - days * DIA, to: null };
}

const toDateInput = (ms: number) => new Date(ms).toISOString().split("T")[0];
const startOfDay = (v: string) => new Date(v + "T00:00:00").getTime();
const endOfDay = (v: string) => new Date(v + "T23:59:59.999").getTime();

/**
 * Filtro de período reutilizável: presets 7/30/90/Tudo + "Personalizado"
 * (intervalo de datas). Emite um DateRange; o pai só guarda e filtra por ele.
 */
export function PeriodFilter({ defaultDays = 30, onChange }: {
  defaultDays?: number;
  onChange: (r: DateRange) => void;
}) {
  const [modo, setModo] = useState<number | "custom">(defaultDays);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const escolherPreset = (days: number) => {
    setModo(days);
    onChange(rangeFromDays(days));
  };

  const aplicarCustom = (novoDe: string, novoAte: string) => {
    setDe(novoDe); setAte(novoAte);
    onChange({
      from: novoDe ? startOfDay(novoDe) : null,
      to: novoAte ? endOfDay(novoAte) : null,
    });
  };

  const abrirCustom = () => {
    setModo("custom");
    // pré-preenche De com hoje-30d e Até com hoje, se ainda vazio
    if (!de && !ate) {
      const hoje = toDateInput(Date.now());
      const trintaAtras = toDateInput(Date.now() - 30 * DIA);
      aplicarCustom(trintaAtras, hoje);
    } else {
      aplicarCustom(de, ate);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => escolherPreset(p.days)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              modo === p.days ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={abrirCustom}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            modo === "custom" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Personalizado
        </button>
      </div>

      {modo === "custom" && (
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={de}
            max={ate || undefined}
            onChange={e => aplicarCustom(e.target.value, ate)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <span className="text-gray-400">até</span>
          <input
            type="date"
            value={ate}
            min={de || undefined}
            onChange={e => aplicarCustom(de, e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      )}
    </div>
  );
}
