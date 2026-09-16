"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Package, Search, X } from "lucide-react";

/**
 * Seleção de produtos do filtro de vendas. Multi-seleção porque um mesmo
 * lançamento costuma estar quebrado em vários produtos (ex.: "Turmas na
 * Prática" tem uma linha por oferta) e o relatório precisa somar todas juntas.
 *
 * Lista vazia = todos os produtos.
 */
export function ProductFilter({ opcoes, selecionados, onChange }: {
  opcoes: string[];
  selecionados: string[];
  onChange: (produtos: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const foraDaCaixa = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", foraDaCaixa);
    return () => document.removeEventListener("mousedown", foraDaCaixa);
  }, [aberto]);

  const alternar = (nome: string) => {
    onChange(
      selecionados.includes(nome)
        ? selecionados.filter(p => p !== nome)
        : [...selecionados, nome]
    );
  };

  const filtradas = opcoes.filter(o => o.toLowerCase().includes(busca.trim().toLowerCase()));

  const resumo =
    selecionados.length === 0 ? "Todos os Produtos"
    : selecionados.length === 1 ? selecionados[0]
    : `${selecionados.length} produtos`;

  return (
    <div className="relative w-full md:w-64" ref={caixa}>
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        title={selecionados.length > 1 ? selecionados.join("\n") : undefined}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-left transition-colors bg-white ${
          selecionados.length
            ? "border-emerald-500 text-gray-900 ring-2 ring-emerald-500/20"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <Package size={16} className={selecionados.length ? "text-emerald-600 shrink-0" : "text-gray-400 shrink-0"} />
        <span className="flex-1 truncate">{resumo}</span>
        {selecionados.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Limpar produtos"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange([]); } }}
            className="text-gray-400 hover:text-gray-700 shrink-0"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="absolute z-30 mt-1 w-full md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {filtradas.map(nome => {
              const marcado = selecionados.includes(nome);
              return (
                <button
                  key={nome}
                  type="button"
                  onClick={() => alternar(nome)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    marcado ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300"
                  }`}>
                    {marcado && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className={marcado ? "text-gray-900 font-medium" : "text-gray-600"}>{nome}</span>
                </button>
              );
            })}
            {filtradas.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-400">Nenhum produto encontrado</p>
            )}
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <span className="text-xs text-gray-500">
              {selecionados.length === 0 ? "Todos incluídos" : `${selecionados.length} selecionado${selecionados.length > 1 ? "s" : ""}`}
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selecionados.length === 0}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
