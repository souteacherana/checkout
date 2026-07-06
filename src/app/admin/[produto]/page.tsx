"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle, AlertCircle, RefreshCw, DollarSign,
  CreditCard, Users, TrendingUp, Percent, Search, X
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { vendaToUI, type VendaUI } from "@/lib/vendas";

type Product = {
  slug: string;
  title: string;
  price: number;
  accent_color: string | null;
};

const PERIODS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Tudo", days: 0 },
];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// Paleta pras linhas de criativo (cores distintas e legíveis sobre branco)
const CREATIVE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

// Métricas de uma janela de tempo (pro comparativo período atual × anterior)
function windowMetrics(list: VendaUI[], from: number, to: number) {
  const inWin = list.filter(r => {
    const t = new Date(r.created_at).getTime();
    return t >= from && t < to;
  });
  const paid = inWin.filter(r => r.status === "PAID");
  const funnel = inWin.filter(r => ["PAID", "PENDING", "PIX_PENDING"].includes(r.status)).length;
  const gross = paid.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  return {
    paidCount: paid.length,
    gross,
    conversion: funnel > 0 ? (paid.length / funnel) * 100 : 0,
  };
}

// Badge de variação % vs período anterior
function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">novo</span>;
  if (Math.abs(value) < 0.5) return <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">=</span>;
  const up = value > 0;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${up ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export default function ProductDashboard({ params }: { params: Promise<{ produto: string }> }) {
  const { produto } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [rows, setRows] = useState<VendaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [search, setSearch] = useState("");
  // Congela o "agora" no mount: useMemo precisa ser puro (react-hooks/purity)
  const [now] = useState(() => Date.now());
  const [hiddenCreatives, setHiddenCreatives] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const slug = produto.toLowerCase();
      const { data: prod } = await supabase
        .from("products")
        .select("slug, title, price, accent_color")
        .eq("slug", slug)
        .single();

      if (!prod) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProduct(prod);

      // A view `vendas` já resolve o produto (product_key, nome legado
      // e prefixo de título na Eduzz) e traduz status — uma query só.
      const { data } = await supabase
        .from("vendas")
        .select("*")
        .eq("produto_slug", slug)
        .order("created_at", { ascending: false });

      setRows((data || []).map(vendaToUI));
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto]);

  // Recorte do período selecionado
  const filtered = useMemo(() => {
    let list = rows;
    if (periodDays > 0) {
      const cutoff = now - periodDays * 24 * 60 * 60 * 1000;
      list = list.filter(r => new Date(r.created_at).getTime() >= cutoff);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.customer_name?.toLowerCase() || "").includes(q) ||
        (r.customer_email?.toLowerCase() || "").includes(q) ||
        (r.customer_phone?.toLowerCase() || "").includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rows, periodDays, search, now]);

  const metrics = useMemo(() => {
    const paid = filtered.filter(r => r.status === "PAID");
    const abandoned = filtered.filter(r => r.status === "PENDING");
    const pixPending = filtered.filter(r => r.status === "PIX_PENDING");
    const gross = paid.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const net = paid.reduce((acc, r) => acc + Number(r.net_value ?? Number(r.amount || 0) * 0.95), 0);
    const funnel = paid.length + abandoned.length + pixPending.length;
    return {
      gross,
      net,
      paidCount: paid.length,
      abandonedCount: abandoned.length,
      pixPendingCount: pixPending.length,
      conversion: funnel > 0 ? (paid.length / funnel) * 100 : 0,
      avgTicket: paid.length > 0 ? gross / paid.length : 0,
    };
  }, [filtered]);

  // Vendas pagas agrupadas por dia (preenchendo dias sem venda com zero)
  const chartData = useMemo(() => {
    const paid = filtered.filter(r => r.status === "PAID");
    const byDay = new Map<string, { vendas: number; receita: number }>();

    const end = new Date(now);
    const start = periodDays > 0
      ? new Date(now - periodDays * 24 * 60 * 60 * 1000)
      : (filtered.length ? new Date(Math.min(...filtered.map(r => new Date(r.created_at).getTime()))) : end);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      byDay.set(d.toISOString().split("T")[0], { vendas: 0, receita: 0 });
    }
    for (const r of paid) {
      const day = new Date(r.created_at).toISOString().split("T")[0];
      const cur = byDay.get(day) || { vendas: 0, receita: 0 };
      cur.vendas += 1;
      cur.receita += Number(r.amount || 0);
      byDay.set(day, cur);
    }
    return Array.from(byDay.entries()).map(([day, v]) => ({
      dia: new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ...v,
    }));
  }, [filtered, periodDays, now]);

  // Comparativo: período selecionado × período anterior de mesmo tamanho
  const comparison = useMemo(() => {
    if (periodDays <= 0) return null;
    const P = periodDays * 24 * 60 * 60 * 1000;
    const cur = windowMetrics(rows, now - P, now + 1);
    const prev = windowMetrics(rows, now - 2 * P, now - P);
    const delta = (c: number, p: number): number | null =>
      p > 0 ? ((c - p) / p) * 100 : (c > 0 ? null : 0);
    return {
      vendas: delta(cur.paidCount, prev.paidCount),
      receita: delta(cur.gross, prev.gross),
      conversao: delta(cur.conversion, prev.conversion),
    };
  }, [rows, periodDays, now]);

  // Vendas pagas por dia, uma série por criativo (top 6 utm_content)
  const creativeChart = useMemo(() => {
    const paid = filtered.filter(r => r.status === "PAID");

    const totals = new Map<string, number>();
    for (const r of paid) {
      const key = r.utm_content || "(sem content)";
      totals.set(key, (totals.get(key) || 0) + 1);
    }
    const top = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);

    if (top.length === 0) return { data: [], top };

    const byDay = new Map<string, Record<string, number>>();
    const end = new Date(now);
    const start = periodDays > 0
      ? new Date(now - periodDays * 24 * 60 * 60 * 1000)
      : (filtered.length ? new Date(Math.min(...filtered.map(r => new Date(r.created_at).getTime()))) : end);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      byDay.set(d.toISOString().split("T")[0], Object.fromEntries(top.map(t => [t, 0])));
    }
    for (const r of paid) {
      const key = r.utm_content || "(sem content)";
      if (!top.includes(key)) continue;
      const day = new Date(r.created_at).toISOString().split("T")[0];
      const cur = byDay.get(day);
      if (cur) cur[key] += 1;
    }

    const data = Array.from(byDay.entries()).map(([day, v]) => ({
      dia: new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ...v,
    }));
    return { data, top };
  }, [filtered, periodDays, now]);

  // Breakdown por UTM Content (só vendas pagas) — o content é o que
  // diferencia o anúncio/criativo; source e campaign viram contexto
  const utmBreakdown = useMemo(() => {
    const paid = filtered.filter(r => r.status === "PAID");
    const groups = new Map<string, { count: number; revenue: number; context: string }>();
    for (const r of paid) {
      const key = r.utm_content || "(sem content)";
      const cur = groups.get(key) || { count: 0, revenue: 0, context: "" };
      cur.count += 1;
      cur.revenue += Number(r.amount || 0);
      cur.context = [r.utm_source, r.utm_campaign].filter(Boolean).join(" · ") || "-";
      groups.set(key, cur);
    }
    return Array.from(groups.entries())
      .map(([content, v]) => ({ content, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filtered]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-500 font-medium">Carregando painel do produto...</p>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
      <p className="text-gray-600 font-medium">Produto &quot;{produto}&quot; não encontrado.</p>
      <Link href="/admin" className="text-emerald-600 font-semibold hover:underline">← Voltar ao Dashboard</Link>
    </div>
  );

  const accent = product?.accent_color || "#10b981";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      {/* Header do Produto */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: accent }}>
              <TrendingUp size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">{product?.title}</h1>
              <p className="text-xs text-gray-400 -mt-0.5">/{product?.slug} · {brl(Number(product?.price || 0))}</p>
            </div>
          </div>

          {/* Filtro de Período */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriodDays(p.days)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  periodDays === p.days ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2"><DollarSign size={16} /><span className="text-xs font-semibold text-gray-500 uppercase">Receita Bruta</span></div>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-2">{brl(metrics.gross)} {comparison && <Delta value={comparison.receita} />}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2"><CreditCard size={16} /><span className="text-xs font-semibold text-gray-500 uppercase">Líquido</span></div>
            <p className="text-xl font-bold text-emerald-600">{brl(metrics.net)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-indigo-600 mb-2"><CheckCircle size={16} /><span className="text-xs font-semibold text-gray-500 uppercase">Vendas</span></div>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-2">{metrics.paidCount} {comparison && <Delta value={comparison.vendas} />}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2"><Users size={16} /><span className="text-xs font-semibold text-gray-500 uppercase">Abandonos</span></div>
            <p className="text-xl font-bold text-gray-900">{metrics.abandonedCount}<span className="text-sm font-normal text-gray-400"> + {metrics.pixPendingCount} pix</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2"><Percent size={16} /><span className="text-xs font-semibold text-gray-500 uppercase">Conversão</span></div>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-2">{metrics.conversion.toFixed(1)}% {comparison && <Delta value={comparison.conversao} />}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-teal-600 mb-2"><TrendingUp size={16} /><span className="text-xs font-semibold text-gray-500 uppercase">Ticket Médio</span></div>
            <p className="text-xl font-bold text-gray-900">{brl(metrics.avgTicket)}</p>
          </div>
        </div>

        {/* Gráfico de Vendas por Dia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Vendas por dia</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="receita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [name === "receita" ? brl(Number(value)) : String(value), name === "receita" ? "Receita" : "Vendas"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Area type="monotone" dataKey="receita" stroke={accent} strokeWidth={2} fill="url(#receita)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Vendas por Criativo */}
        {creativeChart.top.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Vendas por criativo (UTM Content)</h2>
              <p className="text-xs text-gray-400">clique na legenda pra ligar/desligar um criativo</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creativeChart.data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) => [`${value} venda${Number(value) === 1 ? "" : "s"}`, String(name)]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, cursor: "pointer", paddingTop: 8 }}
                    formatter={(value: string) => {
                      const label = value.length > 22 ? value.slice(0, 22) + "…" : value;
                      return <span style={{ opacity: hiddenCreatives.includes(value) ? 0.35 : 1 }}>{label}</span>;
                    }}
                    onClick={(e) => {
                      const key = String((e as { dataKey?: unknown }).dataKey ?? "");
                      if (!key) return;
                      setHiddenCreatives(prev =>
                        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                      );
                    }}
                  />
                  {creativeChart.top.map((c, i) => (
                    <Line
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={CREATIVE_COLORS[i % CREATIVE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      hide={hiddenCreatives.includes(c)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Breakdown por UTM */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Origem das Vendas (UTM Content)</h2>
            </div>
            {utmBreakdown.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">Nenhuma venda paga no período.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {utmBreakdown.map((u, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate" title={u.content}>{u.content}</p>
                      <p className="text-xs text-gray-400 truncate">{u.context}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{brl(u.revenue)}</p>
                      <p className="text-xs text-gray-400">{u.count} venda{u.count > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de Compradores */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex-shrink-0">Compradores</h2>
              <div className="relative w-full max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar nome, e-mail, telefone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-[#f8fafc] border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Origem</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-xs">
                        <span className="text-gray-900 font-medium">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span><br />
                        <span className="text-gray-400">{new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="px-5 py-3">
                        {c.status === "PAID" && <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold"><CheckCircle size={12} /> Paga</span>}
                        {c.status === "PENDING" && <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold"><AlertCircle size={12} /> Abandono</span>}
                        {c.status === "PIX_PENDING" && <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold"><RefreshCw size={12} /> Pix</span>}
                        {c.status === "PAYMENT_MISMATCH_REVIEW" && <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-semibold"><AlertCircle size={12} /> Revisão</span>}
                        {c.status === "REFUNDED" && <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold"><X size={12} /> Reembolso</span>}
                        {c.status === "CANCELED" && <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-semibold"><X size={12} /> Cancelada</span>}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{c.customer_name || "Sem Nome"}</p>
                        <p className="text-xs text-gray-500">{c.customer_email}</p>
                        <p className="text-xs text-gray-400">{c.customer_phone}</p>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {c.utm_content || c.utm_source ? (
                          <div>
                            {c.utm_content && <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono max-w-[180px] truncate align-bottom" title={c.utm_content}>{c.utm_content}</span>}
                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase truncate max-w-[180px]">
                              {[c.utm_source, c.utm_campaign].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        ) : <span className="text-gray-300">-</span>}
                        {c.source === "Eduzz" && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider">Via Eduzz</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        {c.amount != null ? brl(Number(c.amount)) : <span className="text-gray-300 font-normal">-</span>}
                        {c.installments && c.installments > 1 && <p className="text-[10px] text-gray-400 font-normal">{c.installments}x</p>}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                        Nenhum registro deste produto no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
              Mostrando <b>{filtered.length}</b> registros
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
