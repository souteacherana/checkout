"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "../../actions";
import type { MentoradoComCiclos, MentoradoCicloRow } from "@/lib/database.types";
import {
  GraduationCap, Search, X, AlertCircle, CalendarClock, Save, Loader2,
  Plus, Trash2, Download, Layers,
} from "lucide-react";

const LABELS: Record<string, { titulo: string; extra: "caneca"; extraLabel: string; materiaPessoa: boolean; cor: string }> = {
  elite: { titulo: "Professores de Elite", extra: "caneca", extraLabel: "Caneca", materiaPessoa: false, cor: "#8b5cf6" },
  partiu10k: { titulo: "Partiu 10k", extra: "caneca", extraLabel: "Caneca", materiaPessoa: true, cor: "#0ea5e9" },
};

const TAGS_CONFIG: Record<string, { label: string; badge: string }> = {
  ativo:              { label: "Ativo",              badge: "bg-emerald-100 text-emerald-700" },
  entrada_facilitada: { label: "Entrada Facilitada", badge: "bg-amber-100 text-amber-700" },
  devedor:            { label: "Devedor",            badge: "bg-red-100 text-red-700" },
  cliente_problema:   { label: "Cliente problema",   badge: "bg-purple-100 text-purple-700" },
  suspenso:           { label: "Suspenso",           badge: "bg-slate-200 text-slate-600" },
  finalizado:         { label: "Finalizado",         badge: "bg-gray-100 text-gray-600" },
  cancelado:          { label: "Contrato cancelado", badge: "bg-rose-100 text-rose-700" },
};

const FILTROS_BARRA = ["ativo", "entrada_facilitada"];
const RISE_ANOS = ["2025", "2026", "2027"];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const dateBR = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR") : "—";
function riseAnosDe(v: string | null): Set<string> {
  return new Set((v || "").split(/[^\d]+/).filter(a => /^\d{4}$/.test(a)));
}
function diasParaTermino(termino: string | null, now: number): number | null {
  if (!termino) return null;
  return Math.ceil((new Date(termino + "T12:00:00").getTime() - now) / 86400000);
}
function cicloAtual(m: MentoradoComCiclos): MentoradoCicloRow | null {
  const cs = m.mentorado_ciclos || [];
  if (!cs.length) return null;
  return [...cs].sort((a, b) => b.numero - a.numero)[0];
}

export default function MentoradosPage({ params }: { params: Promise<{ mentoria: string }> }) {
  const { mentoria } = use(params);
  const router = useRouter();
  const cfg = LABELS[mentoria];

  const [rows, setRows] = useState<MentoradoComCiclos[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");
  const [aberto, setAberto] = useState<MentoradoComCiclos | null>(null);
  const [now] = useState(() => Date.now());

  const canEditAll = ["ANA", "ADMIN", "SUPERADMIN"].includes(role);
  const canView = ["ANA", "ADMIN", "SUPERADMIN", "EMMY"].includes(role);

  const fetchRows = async () => {
    const { data } = await supabase
      .from("mentorados")
      .select("*, mentorado_ciclos(*)")
      .eq("mentoria", mentoria as "elite" | "partiu10k")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const list = (data || []) as unknown as MentoradoComCiclos[];
    setRows(list);
    setAberto(prev => prev ? list.find(m => m.id === prev.id) || null : null);
    setLoading(false);
  };

  useEffect(() => {
    if (!cfg) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/admin/login"); return; }
      if (session.user?.email) getUserRole(session.user.email).then(r => setRole(r));
      fetchRows();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentoria]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filtro !== "todos") list = list.filter(m => (cicloAtual(m)?.tags || []).includes(filtro));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.nome.toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.cpf || "").includes(q) ||
        (m.telefone || "").includes(q));
    }
    return list;
  }, [rows, filtro, search]);

  const totals = useMemo(() => {
    const porTag: Record<string, number> = {};
    for (const m of rows) for (const t of (cicloAtual(m)?.tags || [])) porTag[t] = (porTag[t] || 0) + 1;
    return { porTag, ativos: porTag["ativo"] || 0 };
  }, [rows]);

  const criarPessoa = async () => {
    const nome = window.prompt("Nome do novo mentorado (inclusão manual):");
    if (!nome?.trim()) return;
    const { data, error } = await supabase.from("mentorados")
      .insert([{ mentoria: mentoria as "elite" | "partiu10k", nome: nome.trim() }])
      .select("*, mentorado_ciclos(*)").single();
    if (error) { alert("Erro ao criar: " + error.message); return; }
    await supabase.from("mentorado_ciclos").insert([{ mentorado_id: data.id, numero: 1, tags: ["ativo"] }]);
    await fetchRows();
    const { data: full } = await supabase.from("mentorados")
      .select("*, mentorado_ciclos(*)").eq("id", data.id).single();
    setAberto(full as unknown as MentoradoComCiclos);
  };

  const excluirPessoa = async (m: MentoradoComCiclos) => {
    if (!confirm(`Excluir "${m.nome}" e todos os ciclos?\n(Reversível: fica marcado no banco.)`)) return;
    const { error, count } = await supabase.from("mentorados")
      .update({ deleted_at: new Date().toISOString() }, { count: "exact" }).eq("id", m.id);
    if (error || count === 0) { alert("Sem permissão para excluir."); return; }
    setAberto(null);
    fetchRows();
  };

  if (!cfg) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-3">
      <p className="text-gray-600">Mentoria &quot;{mentoria}&quot; não existe.</p>
      <Link href="/admin" className="text-emerald-600 font-semibold hover:underline">← Dashboard</Link>
    </div>
  );
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-gray-500 font-medium">Carregando mentorados...</p>
    </div>
  );
  if (role && !canView) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-3">
      <AlertCircle size={32} className="text-gray-300" />
      <p className="text-gray-600 font-medium">Seu perfil não tem acesso à área de Mentorados.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: cfg.cor }}>
              <GraduationCap size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Mentorados · {cfg.titulo}</h1>
              <p className="text-xs text-gray-400 -mt-0.5">{totals.ativos} com ciclo ativo · {rows.length} pessoas</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEditAll && (
              <button onClick={criarPessoa} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-all">
                <Plus size={14} /> Adicionar
              </button>
            )}
            <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
              {[["todos", `Todos (${rows.length})`] as [string, string],
                ...FILTROS_BARRA.map(k => [k, `${TAGS_CONFIG[k].label}${totals.porTag[k] ? ` (${totals.porTag[k]})` : ""}`] as [string, string])
              ].map(([key, label]) => (
                <button key={key} onClick={() => setFiltro(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filtro === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar nome, e-mail, CPF ou telefone..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-[#f8fafc] border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-5 py-3">Mentorado</th>
                  <th className="px-5 py-3">Tags (ciclo atual)</th>
                  <th className="px-5 py-3">Ciclo</th>
                  <th className="px-5 py-3">Período</th>
                  <th className="px-5 py-3">Ingresso Rise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(m => {
                  const c = cicloAtual(m);
                  const tags = c?.tags || [];
                  const dias = diasParaTermino(c?.data_termino ?? null, now);
                  const encerrado = tags.includes("finalizado") || tags.includes("cancelado");
                  const perto = !encerrado && dias !== null && dias <= 30;
                  const nCiclos = (m.mentorado_ciclos || []).length;
                  return (
                    <tr key={m.id} onClick={() => canView && setAberto(m)}
                      className={`cursor-pointer transition-colors ${perto ? "bg-red-50 hover:bg-red-100 border-l-4 border-red-500" : `hover:bg-gray-50 ${encerrado ? "opacity-60" : ""}`}`}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{m.nome}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                        <p className="text-xs text-gray-400">{m.telefone} {m.cpf && <>· {m.cpf}</>}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {tags.length === 0 && <span className="text-gray-300 text-xs">—</span>}
                          {tags.map(t => {
                            const cc = TAGS_CONFIG[t] || { label: t, badge: "bg-gray-100 text-gray-600" };
                            return <span key={t} className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cc.badge}`}>{cc.label}</span>;
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-bold text-gray-900">
                          {c?.valor_contrato != null ? brl(Number(c.valor_contrato)) : "—"}
                          {nCiclos > 1 && <span className="ml-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded align-middle inline-flex items-center gap-0.5"><Layers size={9} />{nCiclos} ciclos</span>}
                        </p>
                        {c?.valor_pago != null && <p className="text-xs text-gray-400">pago: {brl(Number(c.valor_pago))}</p>}
                        {m.parcelas_vencidas > 0 && (
                          <p className="text-xs text-red-600 font-semibold"><AlertCircle size={11} className="inline mr-0.5 -mt-0.5" />{m.parcelas_vencidas} vencida{m.parcelas_vencidas > 1 ? "s" : ""} (Asaas)</p>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-xs">
                        <span className="text-gray-700 font-medium">{dateBR(c?.data_inicio ?? null)}</span>
                        <span className="text-gray-300 mx-1">→</span>
                        <span className="text-gray-700 font-medium">{dateBR(c?.data_termino ?? null)}</span>
                        {c && !c.data_inicio && <span className="ml-2 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">definir início</span>}
                        {perto && <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-red-600 text-white px-1.5 py-0.5 rounded"><CalendarClock size={10} /> {dias !== null && dias < 0 ? "vencido" : `finaliza em ${dias}d`}</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-600 max-w-[110px] truncate">{c?.imersao_rise || "—"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">Nenhum mentorado nesse filtro. Novos pagamentos no Asaas entram aqui automaticamente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
            Mostrando <b>{filtered.length}</b> de <b>{rows.length}</b> mentorados
          </div>
        </div>
      </main>

      {aberto && (
        <FichaMentorado
          pessoa={aberto} mentoria={mentoria} cfg={cfg} canEditAll={canEditAll} role={role}
          onClose={() => setAberto(null)} onChange={fetchRows} onExcluirPessoa={excluirPessoa}
        />
      )}

      <style jsx global>{`
        .input-edit { width:100%; border:1px solid #e5e7eb; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none; }
        .input-edit:focus { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,0.1); }
      `}</style>
    </div>
  );
}

// ---------- Ficha do mentorado (drawer): pessoa + linha do tempo de ciclos ----------
function FichaMentorado({ pessoa, mentoria, cfg, canEditAll, role, onClose, onChange, onExcluirPessoa }: {
  pessoa: MentoradoComCiclos;
  mentoria: string;
  cfg: { extraLabel: string; materiaPessoa: boolean; cor: string };
  canEditAll: boolean;
  role: string;
  onClose: () => void;
  onChange: () => Promise<void>;
  onExcluirPessoa: (m: MentoradoComCiclos) => void;
}) {
  const [p, setP] = useState(pessoa);
  const [savingP, setSavingP] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setP(pessoa), [pessoa]);

  const ciclos = [...(p.mentorado_ciclos || [])].sort((a, b) => b.numero - a.numero);

  const salvarPessoa = async () => {
    setSavingP(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/mentorados", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          id: p.id, nome: p.nome, email: p.email, telefone: p.telefone, cpf: p.cpf,
          rg: p.rg, endereco: p.endereco, cep: p.cep, materia_pessoa: p.materia_pessoa, notas: p.notas,
        }),
      });
      if (!res.ok) alert("Erro ao salvar dados da pessoa.");
      else await onChange();
    } finally { setSavingP(false); }
  };

  const novoCiclo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/mentorado-ciclos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ mentorado_id: p.id, tags: ["ativo"] }),
    });
    if (!res.ok) { alert("Erro ao criar ciclo."); return; }
    await onChange();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-end" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-lg shadow-2xl overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 truncate">{p.nome || "Mentorado"}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Dados da pessoa */}
        {canEditAll ? (
          <div className="space-y-3 mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dados da pessoa</p>
            <Campo label="Nome"><input className="input-edit" value={p.nome} onChange={e => setP({ ...p, nome: e.target.value })} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="E-mail"><input className="input-edit" value={p.email || ""} onChange={e => setP({ ...p, email: e.target.value })} /></Campo>
              <Campo label="Telefone"><input className="input-edit" value={p.telefone || ""} onChange={e => setP({ ...p, telefone: e.target.value })} /></Campo>
              <Campo label="CPF"><input className="input-edit" value={p.cpf || ""} onChange={e => setP({ ...p, cpf: e.target.value })} /></Campo>
              <Campo label="RG"><input className="input-edit" value={p.rg || ""} onChange={e => setP({ ...p, rg: e.target.value })} /></Campo>
            </div>
            <Campo label="Endereço"><input className="input-edit" value={p.endereco || ""} onChange={e => setP({ ...p, endereco: e.target.value })} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="CEP"><input className="input-edit" value={p.cep || ""} onChange={e => setP({ ...p, cep: e.target.value })} /></Campo>
              {cfg.materiaPessoa && <Campo label="Matéria que ensina"><input className="input-edit" placeholder="Ex: Inglês" value={p.materia_pessoa || ""} onChange={e => setP({ ...p, materia_pessoa: e.target.value })} /></Campo>}
            </div>
            {(p.asaas_total_contratado != null || p.asaas_total_pago != null) && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 flex gap-4">
                <span>Asaas (bruto): contratado <b>{brl(Number(p.asaas_total_contratado || 0))}</b></span>
                <span>pago <b>{brl(Number(p.asaas_total_pago || 0))}</b></span>
              </div>
            )}
            <button onClick={salvarPessoa} disabled={savingP}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold text-sm hover:bg-gray-900 disabled:opacity-50">
              {savingP ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar dados da pessoa
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
            <p className="font-semibold text-gray-900">{p.nome}</p>
            <p className="text-xs text-gray-500">{p.email} · {p.telefone}</p>
          </div>
        )}

        {/* Linha do tempo de ciclos */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ciclos de mentoria</p>
          {canEditAll && (
            <button onClick={novoCiclo} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              <Plus size={13} /> Novo ciclo
            </button>
          )}
        </div>
        <div className="space-y-3">
          {ciclos.length === 0 && <p className="text-sm text-gray-400">Nenhum ciclo ainda.</p>}
          {ciclos.map(c => (
            <CicloCard key={c.id} ciclo={c} mentoria={mentoria} cfg={cfg} canEditAll={canEditAll} role={role} mentoradoId={p.id} onChange={onChange} />
          ))}
        </div>

        {canEditAll && (
          <button onClick={() => onExcluirPessoa(p)}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50">
            <Trash2 size={15} /> Excluir mentorado
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Card de um ciclo (editável) ----------
function CicloCard({ ciclo, mentoria, cfg, canEditAll, role, mentoradoId, onChange }: {
  ciclo: MentoradoCicloRow;
  mentoria: string;
  cfg: { extraLabel: string };
  canEditAll: boolean;
  role: string;
  mentoradoId: string;
  onChange: () => Promise<void>;
}) {
  const [c, setC] = useState(ciclo);
  const [saving, setSaving] = useState(false);
  const [puxando, setPuxando] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setC(ciclo), [ciclo]);

  const canEditInicio = canEditAll || (role === "EMMY" && mentoria === "partiu10k");

  const salvar = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body = canEditAll
        ? { id: c.id, tags: c.tags, data_inicio: c.data_inicio, data_termino: c.data_termino,
            duracao_meses: c.duracao_meses, valor_contrato: c.valor_contrato, valor_pago: c.valor_pago,
            forma_pagamento: c.forma_pagamento, imersao_rise: c.imersao_rise, caneca: c.caneca,
            origem: c.origem, notas: c.notas }
        : { id: c.id, data_inicio: c.data_inicio };
      const res = await fetch("/api/admin/mentorado-ciclos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); alert("Erro: " + (e.error || "")); }
      else await onChange();
    } finally { setSaving(false); }
  };

  const excluir = async () => {
    if (!confirm(`Excluir o ${c.numero}º ciclo?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/mentorado-ciclos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id: c.id }),
    });
    if (!res.ok) alert("Erro ao excluir ciclo."); else await onChange();
  };

  const puxarAsaas = async () => {
    if (!c.data_inicio || !c.data_termino) { alert("Preencha início e término do ciclo primeiro."); return; }
    setPuxando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/mentorado-ciclos", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: "asaas", mentorado_id: mentoradoId, data_inicio: c.data_inicio, data_termino: c.data_termino }),
      });
      const data = await res.json();
      if (!res.ok) { alert("Erro: " + (data.error || "")); return; }
      setC({ ...c, valor_contrato: data.contratado || 0, valor_pago: data.pago || 0 });
      alert(`Puxado do Asaas: contratado ${brl(data.contratado || 0)} · pago ${brl(data.pago || 0)} (${data.parcelas} cobrança(s)). Clique em Salvar ciclo.`);
    } finally { setPuxando(false); }
  };

  const tags = c.tags || [];

  // EMMY: só data de início
  if (!canEditAll) {
    return (
      <div className="border border-gray-200 rounded-lg p-3">
        <p className="font-semibold text-gray-800 text-sm mb-2">{c.numero}º ciclo</p>
        <Campo label="Data de Início">
          <input type="date" className="input-edit" value={c.data_inicio || ""} onChange={e => setC({ ...c, data_inicio: e.target.value || null })} disabled={!canEditInicio} />
        </Campo>
        <p className="text-[11px] text-gray-400 mt-1">Término automático: início + {c.duracao_meses} meses.</p>
        {canEditInicio && (
          <button onClick={salvar} disabled={saving} className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar início
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-gray-900">{c.numero}º ciclo</span>
        <button onClick={excluir} className="p-1 text-gray-300 hover:text-red-500 rounded" title="Excluir ciclo"><Trash2 size={14} /></button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(TAGS_CONFIG).map(([value, s]) => {
          const ativa = tags.includes(value);
          return (
            <button key={value} type="button"
              onClick={() => { const set = new Set(tags); if (ativa) set.delete(value); else set.add(value); setC({ ...c, tags: [...set] }); }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${ativa ? s.badge + " border-transparent" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"}`}>
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Início"><input type="date" className="input-edit" value={c.data_inicio || ""} onChange={e => setC({ ...c, data_inicio: e.target.value || null })} /></Campo>
        <Campo label="Término"><input type="date" className="input-edit" value={c.data_termino || ""} onChange={e => setC({ ...c, data_termino: e.target.value || null })} /></Campo>
        <Campo label="Duração (meses)">
          <select className="input-edit" value={c.duracao_meses || 6} onChange={e => setC({ ...c, duracao_meses: Number(e.target.value) })}>
            {[3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} meses</option>)}
          </select>
        </Campo>
        <Campo label="Forma de Pagamento"><input className="input-edit" placeholder="Ex: Asaas 12x" value={c.forma_pagamento || ""} onChange={e => setC({ ...c, forma_pagamento: e.target.value })} /></Campo>
        <Campo label="Valor do Contrato (R$)"><input type="number" step="0.01" className="input-edit" value={c.valor_contrato ?? ""} onChange={e => setC({ ...c, valor_contrato: e.target.value === "" ? null : Number(e.target.value) })} /></Campo>
        <Campo label="Valor Pago (R$)"><input type="number" step="0.01" className="input-edit" value={c.valor_pago ?? ""} onChange={e => setC({ ...c, valor_pago: e.target.value === "" ? null : Number(e.target.value) })} /></Campo>
      </div>

      <button onClick={puxarAsaas} disabled={puxando}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
        {puxando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Puxar cobranças deste período (Asaas)
      </button>

      <div className="grid grid-cols-2 gap-2">
        <Campo label={cfg.extraLabel}><input className="input-edit" placeholder="Não / Em produção / Sim" value={c.caneca || ""} onChange={e => setC({ ...c, caneca: e.target.value })} /></Campo>
        <Campo label="Origem"><input className="input-edit" placeholder="Ex: Workshop VST" value={c.origem || ""} onChange={e => setC({ ...c, origem: e.target.value })} /></Campo>
      </div>

      <Campo label="Ingresso Rise (ano)">
        <div className="flex gap-1.5">
          {RISE_ANOS.map(ano => {
            const anos = riseAnosDe(c.imersao_rise); const marcado = anos.has(ano);
            return (
              <button key={ano} type="button"
                onClick={() => { const nv = new Set(anos); if (marcado) nv.delete(ano); else nv.add(ano); setC({ ...c, imersao_rise: [...nv].sort().join(", ") || null }); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${marcado ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                {ano}
              </button>
            );
          })}
        </div>
      </Campo>

      <Campo label="Notas"><textarea className="input-edit min-h-[54px]" value={c.notas || ""} onChange={e => setC({ ...c, notas: e.target.value })} /></Campo>

      <button onClick={salvar} disabled={saving}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar ciclo
      </button>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
