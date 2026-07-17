"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, Check, CheckCircle, Copy, Hourglass, Link2, TrendingUp } from "lucide-react";
import type { VendaMentoriaRow } from "@/lib/database.types";
import { PeriodFilter, type DateRange } from "@/components/PeriodFilter";
import { getUserRole } from "../actions";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MENTORIA_LABELS: Record<string, string> = {
  partiu10k: "Partiu 10k",
  elite: "Elite",
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  LINK_CRIADO: { label: "Link criado", badge: "bg-gray-100 text-gray-600 border-gray-200" },
  AGUARDANDO_PAGAMENTO: { label: "Aguardando", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  PARCIAL: { label: "Parcial", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  PAGO: { label: "Pago", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO: { label: "Cancelado", badge: "bg-red-50 text-red-600 border-red-200" },
};

const METODO_LABELS: Record<string, string> = {
  PIX: "Pix",
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão",
};

const VE_TODAS = ["ANA", "ADMIN", "SUPERADMIN"];

export default function MinhasVendasPage() {
  const router = useRouter();
  const [vendas, setVendas] = useState<VendaMentoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("VIEWER");
  const [filtroSeller, setFiltroSeller] = useState("TODOS");
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      if (session.user?.email) {
        getUserRole(session.user.email).then(r => setRole(r));
      }
      // O RLS entrega o recorte certo: seller vê as suas, ANA+ vê todas
      supabase
        .from("vendas_mentoria")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setVendas(data);
          setLoading(false);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const veTodas = VE_TODAS.includes(role);
  const sellers = useMemo(
    () => Array.from(new Set(vendas.map(v => v.seller_email))).sort(),
    [vendas]
  );

  const filtradas = useMemo(() => vendas
    .filter(v => filtroSeller === "TODOS" || v.seller_email === filtroSeller)
    .filter(v => {
      if (range.from === null && range.to === null) return true;
      const t = new Date(v.created_at).getTime();
      return t >= (range.from ?? -Infinity) && t <= (range.to ?? Infinity);
    }), [vendas, filtroSeller, range]);

  const stats = useMemo(() => {
    const pagas = filtradas.filter(v => v.status === "PAGO");
    const andamento = filtradas.filter(v => ["AGUARDANDO_PAGAMENTO", "PARCIAL"].includes(v.status));
    return {
      pagasCount: pagas.length,
      pagasValor: pagas.reduce((a, v) => a + Number(v.valor_total || 0), 0),
      andamentoCount: andamento.length,
      andamentoValor: andamento.reduce((a, v) => a + Number(v.valor_total || 0), 0),
      linksCount: filtradas.filter(v => v.status === "LINK_CRIADO").length,
    };
  }, [filtradas]);

  const copiarLink = async (codigo: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/m/${codigo}`);
    setCopiado(codigo);
    setTimeout(() => setCopiado(null), 2000);
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400 text-sm">Carregando vendas...</div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{veTodas ? "Vendas de Mentoria" : "Minhas Vendas"}</h1>
            <p className="text-sm text-gray-500">
              {veTodas ? "Todas as vendas da equipe, com filtro por vendedor" : "Suas vendas de mentoria e o status de cada uma"}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/admin/nova-venda")}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          <BadgeDollarSign size={16} /> Nova Venda
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Vendas pagas</p>
            <p className="text-xl font-bold text-gray-900">{brl(stats.pagasValor)} <span className="text-sm font-normal text-gray-400">({stats.pagasCount})</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Hourglass size={22} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Em andamento</p>
            <p className="text-xl font-bold text-gray-900">{brl(stats.andamentoValor)} <span className="text-sm font-normal text-gray-400">({stats.andamentoCount})</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
            <Link2 size={22} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Links sem pagamento</p>
            <p className="text-xl font-bold text-gray-900">{stats.linksCount}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-4 flex-wrap">
        <PeriodFilter defaultDays={0} onChange={setRange} />
        {veTodas && sellers.length > 1 && (
          <select
            value={filtroSeller}
            onChange={e => setFiltroSeller(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-700 bg-white"
          >
            <option value="TODOS">Todos os vendedores</option>
            {sellers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Mentoria</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4 font-medium">Pagamento</th>
                <th className="p-4 font-medium">Status</th>
                {veTodas && <th className="p-4 font-medium">Vendedor</th>}
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={veTodas ? 8 : 7} className="p-8 text-center text-gray-400 text-sm">
                    Nenhuma venda no período. Bora vender! 🚀
                  </td>
                </tr>
              ) : filtradas.map(v => {
                const st = STATUS_CONFIG[v.status] || { label: v.status, badge: "bg-gray-100 text-gray-600 border-gray-200" };
                return (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 text-sm">{v.cliente_nome}</div>
                      <div className="text-xs text-gray-400">{v.cliente_email}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {MENTORIA_LABELS[v.mentoria] || v.mentoria}
                      {v.renovacao && <span className="ml-1.5 text-[10px] font-bold uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">renov.</span>}
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-gray-900">{brl(Number(v.valor_total))}</div>
                      {v.entrada_valor ? (
                        <div className="text-[11px] text-gray-400">
                          entrada {brl(Number(v.entrada_valor))}{v.entrada_facilitada ? " · facilitada" : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {v.metodo_escolhido
                        ? `${METODO_LABELS[v.metodo_escolhido] || v.metodo_escolhido}${(v.parcelas_escolhidas || 1) > 1 ? ` ${v.parcelas_escolhidas}x` : ""}`
                        : "—"}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${st.badge}`}>
                        {st.label}
                      </span>
                    </td>
                    {veTodas && <td className="p-4 text-xs text-gray-500">{v.seller_email}</td>}
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(v.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => copiarLink(v.codigo)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copiar link de pagamento"
                      >
                        {copiado === v.codigo ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copiado === v.codigo ? "Copiado" : v.codigo}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
