"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getUserRole } from "../actions";
import { vendaToUI, type VendaUI } from "@/lib/vendas";
import { MessageCircle, CheckCircle, RotateCcw, Search, X, Clock } from "lucide-react";

const CHECKOUT_BASE_URL = "https://checkout.riseeducacao.com.br";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function timeSince(iso: string, now: number): string {
  const hours = Math.floor((now - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "agora há pouco";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

function whatsappUrl(v: VendaUI): string | null {
  const digits = (v.customer_phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const firstName = (v.customer_name || "").trim().split(" ")[0] || "";
  const produto = v.product_name || "nosso workshop";
  const link = v.produto_slug ? `${CHECKOUT_BASE_URL}/${v.produto_slug}` : CHECKOUT_BASE_URL;
  const msg = `Oi${firstName ? ` ${firstName}` : ""}! Aqui é da equipe da Teacher Ana 💜 Vi que você começou sua inscrição no ${produto} e não chegou a finalizar. Ficou alguma dúvida? Se quiser, seu link de inscrição é esse: ${link}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export default function RecuperacaoPage() {
  const router = useRouter();
  const [rows, setRows] = useState<VendaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"pendentes" | "contatados" | "todos">("pendentes");
  const [search, setSearch] = useState("");
  const [now] = useState(() => Date.now());

  const fetchRows = async () => {
    // Abandonos do checkout próprio (a Eduzz não fornece telefone de quem não pagou)
    const { data } = await supabase
      .from("vendas")
      .select("*")
      .eq("fonte", "checkout")
      .eq("status", "abandono")
      .order("created_at", { ascending: false });
    setRows((data || []).map(vendaToUI));
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      if (session.user?.email) {
        getUserRole(session.user.email).then(role =>
          setIsAdmin(["ANA", "ADMIN", "SUPERADMIN"].includes(role))
        );
      }
      fetchRows();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleContacted = async (v: VendaUI) => {
    const newValue = v.recovery_contacted_at ? null : new Date().toISOString();
    // Optimistic
    setRows(prev => prev.map(r => r.id === v.id ? { ...r, recovery_contacted_at: newValue } : r));
    const { error, count } = await supabase
      .from("checkouts")
      .update({ recovery_contacted_at: newValue }, { count: "exact" })
      .eq("id", v.id_origem);
    if (error || count === 0) {
      alert("Sem permissão para marcar (apenas ADMIN).");
      fetchRows();
    }
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "pendentes") list = list.filter(r => !r.recovery_contacted_at);
    if (filter === "contatados") list = list.filter(r => r.recovery_contacted_at);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.customer_name?.toLowerCase() || "").includes(q) ||
        (r.customer_email?.toLowerCase() || "").includes(q) ||
        (r.customer_phone || "").includes(q)
      );
    }
    return list;
  }, [rows, filter, search]);

  const potentialRevenue = useMemo(
    () => filtered.reduce((acc, r) => acc + Number(r.amount || 0), 0),
    [filtered]
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-500 font-medium">Carregando abandonos...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
              <RotateCcw size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Recuperação de Abandonos</h1>
              <p className="text-xs text-gray-400 -mt-0.5">
                {filtered.length} carrinho{filtered.length !== 1 ? "s" : ""}
                {potentialRevenue > 0 && <> · até <b className="text-orange-600">{brl(potentialRevenue)}</b> em potencial</>}
              </p>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([["pendentes", "A contatar"], ["contatados", "Contatados"], ["todos", "Todos"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filter === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nome, e-mail ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filtered.map(v => {
            const wa = whatsappUrl(v);
            const contacted = !!v.recovery_contacted_at;
            return (
              <div key={v.id} className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${contacted ? "border-gray-100 opacity-70" : "border-gray-200 shadow-sm"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{v.customer_name || "Sem nome"}</p>
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Clock size={11} /> {timeSince(v.created_at, now)}</span>
                    {contacted && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">Contatado</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{v.customer_email} {v.customer_phone && <>· {v.customer_phone}</>}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.product_name || "Produto não identificado"}
                    {v.amount != null && <> · <span className="font-semibold text-gray-600">{brl(Number(v.amount))}</span></>}
                    {v.utm_content && <> · <span className="font-mono">{v.utm_content}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300 px-3">sem telefone</span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => toggleContacted(v)}
                      title={contacted ? "Desmarcar contato" : "Marcar como contatado"}
                      className={`p-2 rounded-lg transition-colors ${contacted ? "text-emerald-500 bg-emerald-50 hover:bg-emerald-100" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 text-emerald-300" />
              <p className="font-medium text-gray-600">
                {filter === "pendentes" ? "Nenhum abandono aguardando contato 🎉" : "Nenhum registro encontrado"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
