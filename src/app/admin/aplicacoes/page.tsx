"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Download, FileText, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dataBR, horaBR } from "@/lib/datas";
import type { AplicacaoRow } from "@/lib/database.types";
import type { Pagamento } from "@/app/api/admin/aplicacoes/route";
import { PERGUNTAS } from "@/app/lp/black/_lib/aplicacao";

const CAMPANHA = "black";
const PRODUTO = "black-sinal";

type Filtro = "todas" | "pagas" | "nao_pagas";

type Linha = AplicacaoRow & {
  pagamento: Pagamento | null;
  /** Ordem de chegada do pagamento (1 = primeiro a pagar). */
  posicao: number | null;
};

function linkWhatsApp(telefone: string | null) {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

/** Valor vindo de formulário público: "=" no começo viraria fórmula no Excel. */
const celula = (valor: string | null | undefined) => {
  const texto = valor ?? "";
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[;"\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

const STATUS: Record<string, string> = {
  PAID: "Pago",
  PIX_PENDING: "Pix gerado, não pago",
  PENDING: "Cartão não concluído",
  REFUNDED: "Reembolsado",
  CANCELED: "Cancelado",
};

function exportarCsv(linhas: Linha[]) {
  const cabecalho = [
    "Posição no pagamento", "Status do pagamento", "Pago em", "Data da aplicação",
    "Nome", "E-mail", "WhatsApp", "Instagram",
    ...PERGUNTAS.map((p) => p.titulo),
    "UTM Source", "UTM Campaign", "UTM Content",
  ];
  const corpo = linhas.map((l) =>
    [
      l.posicao ?? "",
      l.pagamento ? STATUS[l.pagamento.status] ?? l.pagamento.status : "Não iniciou",
      l.pagamento?.pago_em ? `${dataBR(l.pagamento.pago_em)} ${horaBR(l.pagamento.pago_em)}` : "",
      `${dataBR(l.created_at)} ${horaBR(l.created_at)}`,
      celula(l.nome), celula(l.email), (l.whatsapp ?? "").replace(/[^\d()+\s-]/g, ""), celula(l.instagram),
      ...PERGUNTAS.map((p) => celula(l.respostas?.[p.chave])),
      celula(l.utm_source), celula(l.utm_campaign), celula(l.utm_content),
    ].join(";")
  );
  const arquivo = new Blob([`﻿${[cabecalho.map(celula).join(";"), ...corpo].join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Aplicacoes_${CAMPANHA}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Aplicações da Black cruzadas com o sinal de R$ 50.
 *
 * A posição é a ordem em que o PAGAMENTO foi confirmado, não a ordem da
 * aplicação: é ela que define os "5 primeiros" e a "primeira hora".
 */
export default function Aplicacoes() {
  const [dados, setDados] = useState<{ aplicacoes: AplicacaoRow[]; pagamentos: Pagamento[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resposta = await fetch(`/api/admin/aplicacoes?campanha=${CAMPANHA}&produto=${PRODUTO}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) return setErro(corpo?.erro ?? "Não foi possível carregar as aplicações.");
      setDados(corpo);
    })().catch(() => setErro("Não foi possível carregar as aplicações."));
  }, []);

  const { linhas, pagasSemAplicacao } = useMemo(() => {
    if (!dados) return { linhas: [] as Linha[], pagasSemAplicacao: [] as Pagamento[] };

    // Pagos em ordem de confirmação: é daí que sai a posição.
    const pagos = dados.pagamentos
      .filter((p) => p.status === "PAID")
      .sort((a, b) => new Date(a.pago_em ?? a.criado_em).getTime() - new Date(b.pago_em ?? b.criado_em).getTime());
    const posicaoPorEmail = new Map<string, number>();
    pagos.forEach((p, i) => {
      if (p.email && !posicaoPorEmail.has(p.email)) posicaoPorEmail.set(p.email, i + 1);
    });

    // Pra quem não pagou, o pagamento mais recente mostra até onde chegou.
    const ultimoPorEmail = new Map<string, Pagamento>();
    for (const p of dados.pagamentos) if (p.email) ultimoPorEmail.set(p.email, p);
    const pagoPorEmail = new Map(pagos.filter((p) => p.email).map((p) => [p.email as string, p]));

    // Uma linha por e-mail: vale a aplicação mais recente.
    const vistos = new Set<string>();
    const linhas: Linha[] = [];
    for (const a of dados.aplicacoes) {
      const email = a.email.toLowerCase();
      if (vistos.has(email)) continue;
      vistos.add(email);
      linhas.push({
        ...a,
        pagamento: pagoPorEmail.get(email) ?? ultimoPorEmail.get(email) ?? null,
        posicao: posicaoPorEmail.get(email) ?? null,
      });
    }
    linhas.sort((x, y) => {
      if (x.posicao && y.posicao) return x.posicao - y.posicao;
      if (x.posicao) return -1;
      if (y.posicao) return 1;
      return new Date(y.created_at).getTime() - new Date(x.created_at).getTime();
    });

    const pagasSemAplicacao = pagos.filter((p) => !p.email || !vistos.has(p.email));
    return { linhas, pagasSemAplicacao };
  }, [dados]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (filtro === "pagas" && !l.posicao) return false;
      if (filtro === "nao_pagas" && l.posicao) return false;
      if (!q) return true;
      return [l.nome, l.email, l.whatsapp, l.instagram].some((c) => c?.toLowerCase().includes(q));
    });
  }, [linhas, filtro, busca]);

  if (erro) return <div className="p-10 text-center text-gray-600">{erro}</div>;
  if (!dados) return <div className="p-10 text-center text-gray-400">Carregando aplicações...</div>;

  const pagas = linhas.filter((l) => l.posicao).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-3">
          <Link href="/admin/black" title="Voltar para os leads da Black" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Aplicações · Black</h1>
            <p className="text-xs text-gray-400">Respostas da aplicação e o sinal de R$ 50 (/{PRODUTO})</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { rotulo: "Aplicações", valor: linhas.length, Icone: FileText },
            { rotulo: "Sinal pago", valor: pagas, Icone: CheckCircle },
            { rotulo: "Sem pagamento", valor: linhas.length - pagas, Icone: Clock },
            { rotulo: "Pagou sem aplicação", valor: pagasSemAplicacao.length, Icone: Search },
          ].map(({ rotulo, valor, Icone }) => (
            <div key={rotulo} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Icone size={16} />
                <span className="text-xs font-semibold uppercase">{rotulo}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{valor}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {([["todas", "Todas"], ["pagas", "Pagas"], ["nao_pagas", "Sem pagamento"]] as const).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltro(valor)}
                  className={`px-3 py-2 font-semibold ${filtro === valor ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail, WhatsApp ou @"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => exportarCsv(visiveis)}
              disabled={visiveis.length === 0}
              className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download size={16} /> Exportar CSV ({visiveis.length})
            </button>
          </div>

          <ul className="divide-y divide-gray-100">
            {visiveis.map((l) => {
              const whatsapp = linkWhatsApp(l.whatsapp);
              const pago = l.pagamento?.status === "PAID";
              return (
                <li key={l.id}>
                  <details className="group">
                    <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 cursor-pointer hover:bg-gray-50">
                      <span className="w-10 text-sm font-bold text-gray-900 tabular-nums">{l.posicao ? `#${l.posicao}` : "—"}</span>
                      <span className="min-w-[160px] flex-1 font-semibold text-gray-900">{l.nome}</span>
                      {whatsapp ? (
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-emerald-700 font-medium hover:underline">
                          {l.whatsapp}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">{l.whatsapp}</span>
                      )}
                      <span className="text-sm text-gray-500">{l.instagram}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${pago ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {pago
                          ? `Pago ${horaBR(l.pagamento!.pago_em ?? l.pagamento!.criado_em)} · ${dataBR(l.pagamento!.pago_em ?? l.pagamento!.criado_em)}`
                          : l.pagamento ? STATUS[l.pagamento.status] ?? l.pagamento.status : "Não iniciou o pagamento"}
                      </span>
                    </summary>
                    <dl className="px-4 pb-4 pl-[72px] grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-gray-500 uppercase">E-mail · aplicação</dt>
                        <dd className="text-gray-800">{l.email} · {dataBR(l.created_at)} {horaBR(l.created_at)}</dd>
                      </div>
                      {PERGUNTAS.map((p) => (
                        <div key={p.chave}>
                          <dt className="text-xs font-semibold text-gray-500">{p.titulo}</dt>
                          <dd className="text-gray-800 whitespace-pre-line">{l.respostas?.[p.chave] ?? "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </li>
              );
            })}
          </ul>
          {visiveis.length === 0 && <p className="p-8 text-center text-sm text-gray-400">Nenhuma aplicação encontrada.</p>}
        </div>

        {pagasSemAplicacao.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Pagaram o sinal sem aplicação correspondente</h2>
            <p className="text-xs text-gray-500 mb-3">
              O cruzamento é pelo e-mail. Quem digitou outro e-mail no checkout aparece aqui.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              {pagasSemAplicacao.map((p, i) => (
                <li key={`${p.email}-${i}`}>
                  {p.nome} · {p.email} · {p.telefone} · pago {p.pago_em ? `${dataBR(p.pago_em)} ${horaBR(p.pago_em)}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
