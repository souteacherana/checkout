"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Calendar, Download, Search, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { PeriodFilter, rangeFromDays, type DateRange } from "@/components/PeriodFilter";
import { dataBR, horaBR } from "@/lib/datas";
import type { LeadRow } from "@/lib/database.types";

/** Validada contra a superfície clara (luminosidade, croma e contraste 3:1). */
const COR_DO_GRAFICO = "#c81010";

/** Quantas linhas a tabela desenha. A exportação leva todas as filtradas. */
const LIMITE_DA_TABELA = 200;

const SEM_ORIGEM = "(sem UTM)";

/** Dia de Brasília como "AAAA-MM-DD". */
const chaveDoDia = (data: Date | string) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));

/** Número pro wa.me: 10 ou 11 dígitos são brasileiros sem o 55. */
function linkWhatsApp(telefone: string | null) {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

/**
 * Nome e e-mail vêm de um formulário público: um valor começando com "=" viraria
 * fórmula ao abrir no Excel. O apóstrofo faz o Excel tratar como texto.
 */
const celula = (valor: string | null | undefined) => {
  const texto = valor ?? "";
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

function exportarCsv(leads: LeadRow[], slug: string) {
  const linhas = leads.map((l) =>
    [
      dataBR(l.created_at),
      horaBR(l.created_at),
      celula(l.nome),
      celula(l.email),
      // Telefone começa com "+" legitimamente, então só mantém o que é de telefone.
      (l.telefone ?? "").replace(/[^\d()+\s-]/g, ""),
      celula(l.utm_source),
      celula(l.utm_medium),
      celula(l.utm_campaign),
      celula(l.utm_content),
      celula(l.utm_term),
    ].join(";")
  );
  const cabecalho = "Data;Hora;Nome;E-mail;Telefone;UTM Source;UTM Medium;UTM Campaign;UTM Content;UTM Term";
  // O BOM faz o Excel reconhecer os acentos, e ";" é o separador do Excel pt-BR.
  const arquivo = new Blob([`﻿${[cabecalho, ...linhas].join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Leads_${slug}_${chaveDoDia(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Origem({ titulo, itens }: { titulo: string; itens: [string, number][] }) {
  const maior = itens[0]?.[1] ?? 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 min-w-0">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{titulo}</h3>
      {itens.length === 0 && <p className="text-sm text-gray-400">Nenhum dado no período.</p>}
      <ul className="space-y-3">
        {itens.slice(0, 6).map(([nome, total]) => (
          <li key={nome}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-gray-700" title={nome}>{nome}</span>
              <span className="font-semibold text-gray-900 tabular-nums">{total}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-gray-100">
              <div className="h-1 rounded-full" style={{ width: `${(total / maior) * 100}%`, backgroundColor: COR_DO_GRAFICO }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const contarPor = (leads: LeadRow[], campo: "utm_source" | "utm_campaign" | "utm_content") => {
  const totais = new Map<string, number>();
  for (const lead of leads) {
    const chave = lead[campo] || SEM_ORIGEM;
    totais.set(chave, (totais.get(chave) ?? 0) + 1);
  }
  return [...totais.entries()].sort((a, b) => b[1] - a[1]);
};

/** A tela em si, sem busca de dados. */
export function PainelLeadsView({
  slug,
  titulo,
  leads,
  agora,
}: {
  slug: string;
  titulo: string;
  leads: LeadRow[];
  agora: number;
}) {
  const [periodo, setPeriodo] = useState<DateRange>(() => rangeFromDays(30));
  const [busca, setBusca] = useState("");

  const noPeriodo = useMemo(() => {
    const de = periodo.from ?? -Infinity;
    const ate = periodo.to ?? Infinity;
    return leads.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= de && t <= ate;
    });
  }, [leads, periodo]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return noPeriodo;
    return noPeriodo.filter((l) =>
      [l.nome, l.email, l.telefone].some((campo) => campo?.toLowerCase().includes(q))
    );
  }, [noPeriodo, busca]);

  // Começa no primeiro lead do período, pra não desenhar semanas vazias antes
  // do lançamento, e preenche com zero os dias sem inscrição.
  const porDia = useMemo(() => {
    if (noPeriodo.length === 0) return [];
    const totais = new Map<string, number>();
    for (const lead of noPeriodo) {
      const dia = chaveDoDia(lead.created_at);
      totais.set(dia, (totais.get(dia) ?? 0) + 1);
    }
    const ultimo = chaveDoDia(new Date(Math.min(agora, periodo.to ?? Infinity)));
    const dias = [];
    let dia = [...totais.keys()].sort()[0];
    while (dia <= ultimo) {
      dias.push({ dia: `${dia.slice(8)}/${dia.slice(5, 7)}`, leads: totais.get(dia) ?? 0 });
      dia = chaveDoDia(new Date(new Date(`${dia}T12:00:00-03:00`).getTime() + 86_400_000));
    }
    return dias;
  }, [noPeriodo, agora, periodo.to]);

  const hoje = chaveDoDia(new Date(agora));
  const leadsDeHoje = leads.filter((l) => chaveDoDia(l.created_at) === hoje).length;
  const falhasMailchimp = noPeriodo.filter((l) => l.mailchimp_ok === false).length;
  const comUtm = noPeriodo.filter((l) => l.utm_source).length;

  const cartoes = [
    { rotulo: "Leads no período", valor: noPeriodo.length, Icone: Users },
    { rotulo: "Hoje", valor: leadsDeHoje, Icone: Calendar },
    { rotulo: "Com UTM", valor: comUtm, Icone: Search },
    { rotulo: "Falhas no Mailchimp", valor: falhasMailchimp, Icone: AlertCircle },
  ];

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
              <p className="text-xs text-gray-400">Captação de leads · /{slug}</p>
            </div>
          </div>
          <PeriodFilter defaultDays={30} onChange={setPeriodo} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cartoes.map(({ rotulo, valor, Icone }) => (
            <div key={rotulo} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Icone size={16} />
                <span className="text-xs font-semibold uppercase">{rotulo}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{valor}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Leads por dia</h2>
          {porDia.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">Nenhum lead no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porDia} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(valor) => [valor, "Leads"]} />
                  <Bar dataKey="leads" fill={COR_DO_GRAFICO} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Origem titulo="Origem" itens={contarPor(noPeriodo, "utm_source")} />
          <Origem titulo="Campanha" itens={contarPor(noPeriodo, "utm_campaign")} />
          <Origem titulo="Criativo" itens={contarPor(noPeriodo, "utm_content")} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail ou telefone"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => exportarCsv(filtrados, slug)}
              disabled={filtrados.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={16} /> Exportar CSV ({filtrados.length})
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">E-mail</th>
                  <th className="px-4 py-3 font-semibold">Telefone</th>
                  <th className="px-4 py-3 font-semibold">Origem</th>
                  <th className="px-4 py-3 font-semibold">Criativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtrados.slice(0, LIMITE_DA_TABELA).map((lead) => {
                  const whatsapp = linkWhatsApp(lead.telefone);
                  return (
                    <tr key={lead.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{dataBR(lead.created_at)} {horaBR(lead.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{lead.nome}</td>
                      <td className="px-4 py-3">{lead.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {whatsapp ? (
                          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium hover:underline">
                            {lead.telefone}
                          </a>
                        ) : lead.telefone}
                      </td>
                      <td className="px-4 py-3">{lead.utm_source || SEM_ORIGEM}</td>
                      <td className="px-4 py-3">{lead.utm_content || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtrados.length === 0 && <p className="p-8 text-center text-sm text-gray-400">Nenhum lead encontrado.</p>}
          </div>
          {filtrados.length > LIMITE_DA_TABELA && (
            <p className="p-3 text-center text-xs text-gray-500 border-t border-gray-100">
              Mostrando os {LIMITE_DA_TABELA} mais recentes de {filtrados.length}. O CSV traz todos.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

/** Painel do produto de captação: busca os leads e desenha a tela. */
export default function PainelLeads({ slug, titulo }: { slug: string; titulo: string }) {
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resposta = await fetch(`/api/admin/leads?campanha=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.erro ?? "Não foi possível carregar os leads.");
        return;
      }
      setLeads(corpo.leads);
    };
    carregar().catch(() => setErro("Não foi possível carregar os leads."));
  }, [slug]);

  if (erro) return <div className="p-10 text-center text-gray-600">{erro}</div>;
  if (!leads) return <div className="p-10 text-center text-gray-400">Carregando leads...</div>;
  return <PainelLeadsView slug={slug} titulo={titulo} leads={leads} agora={agora} />;
}
