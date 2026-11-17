"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, MessageCircle, Play, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { PeriodFilter, rangeFromDays, type DateRange } from "@/components/PeriodFilter";
import type { EventoVsl, MetricasVsl } from "@/lib/vsl-metricas";

/** Mesma cor validada do painel de leads. */
const COR = "#c81010";

const ETAPAS: { evento: EventoVsl; rotulo: string; Icone: typeof Eye }[] = [
  { evento: "acesso", rotulo: "Acessos", Icone: Eye },
  { evento: "play", rotulo: "Deram play", Icone: Play },
  { evento: "pitch", rotulo: "Chegaram ao pitch", Icone: Target },
  { evento: "clique", rotulo: "Clicaram no WhatsApp", Icone: MessageCircle },
];

const pct = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toFixed(1).replace(".", ",")}%` : "—";

function TabelaOrigem({ titulo, linhas }: { titulo: string; linhas: MetricasVsl["por_origem"] }) {
  const ordenadas = [...linhas].sort((a, b) => b.acessos - a.acessos).slice(0, 8);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-0">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{titulo}</h3>
      {ordenadas.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum dado no período.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-400">
            <tr>
              <th className="text-left font-semibold pb-2"></th>
              <th className="text-right font-semibold pb-2">Acessos</th>
              <th className="text-right font-semibold pb-2">Cliques</th>
              <th className="text-right font-semibold pb-2">Taxa</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {ordenadas.map((l) => (
              <tr key={l.valor} className="border-t border-gray-100">
                <td className="py-2 pr-2 truncate max-w-[140px]" title={l.valor}>{l.valor}</td>
                <td className="py-2 text-right tabular-nums">{l.acessos}</td>
                <td className="py-2 text-right tabular-nums">{l.cliques}</td>
                <td className="py-2 text-right tabular-nums font-semibold text-gray-900">{pct(l.cliques, l.acessos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Painel de produto de captação com VSL: funil acesso → play → pitch → clique. */
export default function PainelVsl({ slug, titulo }: { slug: string; titulo: string }) {
  const [periodo, setPeriodo] = useState<DateRange>(() => rangeFromDays(30));
  const [dados, setDados] = useState<MetricasVsl | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({ campanha: slug });
      if (periodo.from) params.set("de", String(periodo.from));
      if (periodo.to) params.set("ate", String(periodo.to));
      const resposta = await fetch(`/api/admin/vsl?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.erro ?? "Não foi possível carregar as métricas.");
        return;
      }
      setErro(null);
      setDados(corpo);
    };
    carregar().catch(() => setErro("Não foi possível carregar as métricas."));
  }, [slug, periodo]);

  const pessoas = useMemo(() => {
    const m = new Map<EventoVsl, { eventos: number; visitantes: number }>();
    for (const f of dados?.funil ?? []) m.set(f.evento, f);
    return (e: EventoVsl) => m.get(e) ?? { eventos: 0, visitantes: 0 };
  }, [dados]);

  const porDia = useMemo(() => {
    const dias = new Map<string, { acessos: number; cliques: number }>();
    for (const d of dados?.por_dia ?? []) {
      const atual = dias.get(d.dia) ?? { acessos: 0, cliques: 0 };
      if (d.evento === "acesso") atual.acessos = d.visitantes;
      if (d.evento === "clique") atual.cliques = d.visitantes;
      dias.set(d.dia, atual);
    }
    return [...dias.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, v]) => ({ dia: `${dia.slice(8)}/${dia.slice(5, 7)}`, ...v }));
  }, [dados]);

  const acessos = pessoas("acesso").visitantes;
  const base: Record<EventoVsl, { valor: number; rotulo: string }> = {
    acesso: { valor: acessos, rotulo: `${pessoas("acesso").eventos} visualizações da página` },
    play: { valor: acessos, rotulo: "dos acessos" },
    pitch: { valor: pessoas("play").visitantes, rotulo: "de quem deu play" },
    clique: { valor: acessos, rotulo: "dos acessos" },
  };

  const origem = (campo: MetricasVsl["por_origem"][number]["campo"]) =>
    (dados?.por_origem ?? []).filter((o) => o.campo === campo);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/produtos" title="Voltar para produtos" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{titulo}</h1>
              <p className="text-xs text-gray-400">VSL · /{slug} · pessoas únicas</p>
            </div>
          </div>
          <PeriodFilter defaultDays={30} onChange={setPeriodo} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {erro && <p className="p-4 rounded-lg bg-red-50 text-sm text-red-700">{erro}</p>}
        {!dados && !erro && <p className="p-10 text-center text-gray-400">Carregando métricas...</p>}

        {dados && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {ETAPAS.map(({ evento, rotulo, Icone }) => {
                const valor = pessoas(evento).visitantes;
                return (
                  <div key={evento} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Icone size={16} />
                      <span className="text-xs font-semibold uppercase">{rotulo}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{valor}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {evento === "acesso" ? base.acesso.rotulo : `${pct(valor, base[evento].valor)} ${base[evento].rotulo}`}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Funil</h2>
              <ul className="space-y-4">
                {ETAPAS.map(({ evento, rotulo }) => {
                  const valor = pessoas(evento).visitantes;
                  return (
                    <li key={evento}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gray-700">{rotulo}</span>
                        <span className="tabular-nums text-gray-900 font-semibold">
                          {valor} <span className="font-normal text-gray-500">({pct(valor, acessos)})</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full" style={{ width: acessos ? `${(valor / acessos) * 100}%` : 0, backgroundColor: COR }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Acessos por dia</h2>
              {porDia.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">Nenhum acesso no período.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porDia} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "#f1f5f9" }}
                        formatter={(valor, _nome, item) => [
                          `${valor} (${item.payload.cliques} cliques no WhatsApp)`,
                          "Acessos",
                        ]}
                      />
                      <Bar dataKey="acessos" fill={COR} radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TabelaOrigem titulo="Origem" linhas={origem("utm_source")} />
              <TabelaOrigem titulo="Campanha" linhas={origem("utm_campaign")} />
              <TabelaOrigem titulo="Criativo" linhas={origem("utm_content")} />
            </div>

            <p className="text-xs text-gray-400">
              Conta pessoas únicas (um id aleatório por navegador, sem dado pessoal). &quot;Deram play&quot; ignora o
              autoplay mudo. O WhatsApp registra o clique, não o envio da mensagem. Retenção minuto a minuto do
              vídeo fica no Analytics do Panda.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
