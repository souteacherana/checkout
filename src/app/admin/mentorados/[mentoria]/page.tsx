"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "../../actions";
import type { MentoradoComCiclos, MentoradoCicloRow, MentoradoReuniaoRow } from "@/lib/database.types";
import {
  GraduationCap, Search, X, AlertCircle, CalendarClock, Save, Loader2,
  Plus, Trash2, Download, Layers, ChevronDown, ChevronRight, Users2, CheckCircle,
} from "lucide-react";

const LABELS: Record<string, { titulo: string; extraLabel: string; materiaPessoa: boolean; cor: string }> = {
  elite: { titulo: "Professores de Elite", extraLabel: "Caneca", materiaPessoa: false, cor: "#8b5cf6" },
  partiu10k: { titulo: "Partiu 10k", extraLabel: "Caneca", materiaPessoa: true, cor: "#0ea5e9" },
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

// Controle de Reuniões por mentoria
const REUNIAO_TIPOS: Record<string, { key: string; label: string; mensal: boolean }[]> = {
  elite: [
    { key: "consultoria", label: "Consultoria Individual", mensal: true },
  ],
  partiu10k: [
    { key: "cs", label: "CS (Customer Success)", mensal: true },
    { key: "extra_ana", label: "Extra — Consultoria com a Ana", mensal: false },
  ],
};
const CONSULTORES_ELITE = ["Henrique", "Ricardo", "Ana", "Renata Saia"];

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
function reuniaoNoMes(reunioes: MentoradoReuniaoRow[], tipo: string, now: number): boolean {
  const ref = new Date(now);
  return (reunioes || []).some(r => {
    const d = new Date(r.data + "T12:00:00");
    return r.tipo === tipo && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  });
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
  const [expandido, setExpandido] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const canEditAll = ["ANA", "ADMIN", "SUPERADMIN"].includes(role);
  const canView = ["ANA", "ADMIN", "SUPERADMIN", "EMMY"].includes(role);

  const fetchRows = async () => {
    const { data } = await supabase
      .from("mentorados")
      .select("*, mentorado_ciclos(*), mentorado_reunioes(*)")
      .eq("mentoria", mentoria as "elite" | "partiu10k")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setRows((data || []) as unknown as MentoradoComCiclos[]);
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
      .select("id").single();
    if (error || !data) { alert("Erro ao criar: " + (error?.message || "")); return; }
    await supabase.from("mentorado_ciclos").insert([{ mentorado_id: data.id, numero: 1, tags: ["ativo"] }]);
    await fetchRows();
    setExpandido(data.id);
  };

  const excluirPessoa = async (m: MentoradoComCiclos) => {
    if (!confirm(`Excluir "${m.nome}" e todos os ciclos?\n(Reversível: fica marcado no banco.)`)) return;
    const { error, count } = await supabase.from("mentorados")
      .update({ deleted_at: new Date().toISOString() }, { count: "exact" }).eq("id", m.id);
    if (error || count === 0) { alert("Sem permissão para excluir."); return; }
    setExpandido(null);
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
                  <th className="px-5 py-3 w-8"></th>
                  <th className="px-5 py-3">Mentorado</th>
                  <th className="px-5 py-3">Tags (ciclo atual)</th>
                  <th className="px-5 py-3">Ciclo</th>
                  <th className="px-5 py-3">Período</th>
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
                  const aberto = expandido === m.id;
                  return (
                    <MentoradoLinha key={m.id} m={m} c={c} tags={tags} dias={dias} perto={perto}
                      encerrado={encerrado} nCiclos={nCiclos} aberto={aberto} canView={canView}
                      onToggle={() => setExpandido(aberto ? null : m.id)}>
                      {aberto && (
                        <FichaInline pessoa={m} mentoria={mentoria} cfg={cfg} canEditAll={canEditAll}
                          role={role} now={now} onChange={fetchRows} onExcluirPessoa={excluirPessoa} />
                      )}
                    </MentoradoLinha>
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

      <style jsx global>{`
        .input-edit { width:100%; border:1px solid #e5e7eb; border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none; background:#fff; }
        .input-edit:focus { border-color:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,0.1); }
      `}</style>
    </div>
  );
}

// ---------- Linha da tabela + área expandida (cascata) ----------
function MentoradoLinha({ m, c, tags, dias, perto, encerrado, nCiclos, aberto, canView, onToggle, children }: {
  m: MentoradoComCiclos; c: MentoradoCicloRow | null; tags: string[]; dias: number | null;
  perto: boolean; encerrado: boolean; nCiclos: number; aberto: boolean; canView: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <>
      <tr onClick={() => canView && onToggle()}
        className={`cursor-pointer transition-colors ${perto ? "bg-red-50 hover:bg-red-100 border-l-4 border-red-500" : `hover:bg-gray-50 ${encerrado && !aberto ? "opacity-60" : ""}`} ${aberto ? "!bg-slate-50" : ""}`}>
        <td className="pl-4 py-3 text-gray-400">{aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
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
      </tr>
      {aberto && (
        <tr className="!bg-slate-50">
          <td colSpan={5} className="px-4 sm:px-8 pb-6 pt-1">{children}</td>
        </tr>
      )}
    </>
  );
}

// ---------- Seção sanfonada ----------
function Secao({ titulo, resumo, defaultOpen = false, children }: {
  titulo: React.ReactNode; resumo?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
          {titulo}
        </span>
        {resumo && <span className="text-xs text-gray-400 truncate">{resumo}</span>}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ---------- Ficha inline: pessoa + ciclos + reuniões ----------
function FichaInline({ pessoa, mentoria, cfg, canEditAll, role, now, onChange, onExcluirPessoa }: {
  pessoa: MentoradoComCiclos; mentoria: string;
  cfg: { extraLabel: string; materiaPessoa: boolean };
  canEditAll: boolean; role: string; now: number;
  onChange: () => Promise<void>;
  onExcluirPessoa: (m: MentoradoComCiclos) => void;
}) {
  const [p, setP] = useState(pessoa);
  const [savingP, setSavingP] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setP(pessoa), [pessoa]);

  const ciclos = [...(p.mentorado_ciclos || [])].sort((a, b) => b.numero - a.numero);
  const reunioes = [...(pessoa.mentorado_reunioes || [])].sort((a, b) => b.data.localeCompare(a.data));
  const tipos = REUNIAO_TIPOS[mentoria] || [];
  const mensal = tipos.find(t => t.mensal);
  const emDia = mensal ? reuniaoNoMes(reunioes, mensal.key, now) : true;

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

  const cicloAtualNum = ciclos[0]?.numero;

  return (
    <div className="space-y-2 max-w-3xl">
      {/* Dados da pessoa */}
      <Secao
        titulo="Dados da pessoa"
        resumo={<>{p.cpf || "sem CPF"}{p.rg ? " · RG ok" : ""}{cfg.materiaPessoa && p.materia_pessoa ? ` · ${p.materia_pessoa}` : ""}</>}
      >
        {canEditAll ? (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Nome"><input className="input-edit" value={p.nome} onChange={e => setP({ ...p, nome: e.target.value })} /></Campo>
              <Campo label="E-mail"><input className="input-edit" value={p.email || ""} onChange={e => setP({ ...p, email: e.target.value })} /></Campo>
              <Campo label="Telefone"><input className="input-edit" value={p.telefone || ""} onChange={e => setP({ ...p, telefone: e.target.value })} /></Campo>
              <Campo label="CPF"><input className="input-edit" value={p.cpf || ""} onChange={e => setP({ ...p, cpf: e.target.value })} /></Campo>
              <Campo label="RG"><input className="input-edit" value={p.rg || ""} onChange={e => setP({ ...p, rg: e.target.value })} /></Campo>
              <Campo label="CEP"><input className="input-edit" value={p.cep || ""} onChange={e => setP({ ...p, cep: e.target.value })} /></Campo>
            </div>
            <Campo label="Endereço"><input className="input-edit" value={p.endereco || ""} onChange={e => setP({ ...p, endereco: e.target.value })} /></Campo>
            {cfg.materiaPessoa && (
              <Campo label="Matéria que ensina"><input className="input-edit" placeholder="Ex: Inglês" value={p.materia_pessoa || ""} onChange={e => setP({ ...p, materia_pessoa: e.target.value })} /></Campo>
            )}
            <Campo label="Notas"><textarea className="input-edit min-h-[54px]" value={p.notas || ""} onChange={e => setP({ ...p, notas: e.target.value })} /></Campo>
            {(p.asaas_total_contratado != null || p.asaas_total_pago != null) && (
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 flex gap-4">
                <span>Asaas (bruto): contratado <b>{brl(Number(p.asaas_total_contratado || 0))}</b></span>
                <span>pago <b>{brl(Number(p.asaas_total_pago || 0))}</b></span>
              </div>
            )}
            <button onClick={salvarPessoa} disabled={savingP}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold text-xs hover:bg-gray-900 disabled:opacity-50">
              {savingP ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar dados da pessoa
            </button>
          </div>
        ) : (
          <div className="pt-2 text-sm text-gray-600">
            <p>{p.email} · {p.telefone}</p>
            {p.cpf && <p className="text-xs text-gray-400 mt-1">CPF {p.cpf}</p>}
          </div>
        )}
      </Secao>

      {/* Ciclos */}
      <Secao
        titulo={<>Ciclos de mentoria <span className="text-gray-400 font-normal">({ciclos.length})</span></>}
        resumo={ciclos[0] ? `atual: ${ciclos[0].numero}º · ${dateBR(ciclos[0].data_inicio)} → ${dateBR(ciclos[0].data_termino)}` : "nenhum ciclo"}
        defaultOpen
      >
        <div className="space-y-2 pt-2">
          {canEditAll && (
            <button onClick={novoCiclo} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              <Plus size={13} /> Novo ciclo
            </button>
          )}
          {ciclos.length === 0 && <p className="text-sm text-gray-400">Nenhum ciclo ainda.</p>}
          {ciclos.map(c => (
            <CicloCard key={c.id} ciclo={c} mentoria={mentoria} cfg={cfg} canEditAll={canEditAll}
              role={role} mentoradoId={p.id} onChange={onChange} defaultOpen={false} atual={c.numero === cicloAtualNum} />
          ))}
        </div>
      </Secao>

      {/* Consultorias / Reuniões */}
      <Secao
        titulo={<span className="flex items-center gap-2">Consultorias
          {mensal && (emDia
            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded"><CheckCircle size={10} /> {mensal.label} em dia</span>
            : <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded"><CalendarClock size={10} /> pendente este mês</span>)}
        </span>}
        resumo={`${reunioes.length} registro${reunioes.length !== 1 ? "s" : ""}`}
      >
        <ReunioesSecao mentoradoId={p.id} mentoria={mentoria} reunioes={reunioes} canEdit={canEditAll} onChange={onChange} />
      </Secao>

      {canEditAll && (
        <button onClick={() => onExcluirPessoa(p)}
          className="flex items-center gap-2 px-3 py-1.5 text-red-600 rounded-lg font-medium text-xs hover:bg-red-50">
          <Trash2 size={13} /> Excluir mentorado
        </button>
      )}
    </div>
  );
}

// ---------- Card de ciclo (sanfonado) ----------
function CicloCard({ ciclo, mentoria, cfg, canEditAll, role, mentoradoId, onChange, defaultOpen, atual }: {
  ciclo: MentoradoCicloRow; mentoria: string; cfg: { extraLabel: string };
  canEditAll: boolean; role: string; mentoradoId: string;
  onChange: () => Promise<void>; defaultOpen: boolean; atual: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [c, setC] = useState(ciclo);
  const [saving, setSaving] = useState(false);
  const [puxando, setPuxando] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setC(ciclo), [ciclo]);

  const canEditInicio = canEditAll || (role === "EMMY" && mentoria === "partiu10k");
  const tags = c.tags || [];

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

  return (
    <div className={`border rounded-lg overflow-hidden ${atual ? "border-emerald-200" : "border-gray-200"}`}>
      {/* Cabeçalho do ciclo (sempre visível) */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2 text-sm">
          {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <b className="text-gray-900">{c.numero}º ciclo</b>
          {atual && <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">atual</span>}
          <span className="text-xs text-gray-400">{dateBR(c.data_inicio)} → {dateBR(c.data_termino)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {c.valor_contrato != null && <span className="text-xs font-bold text-gray-700">{brl(Number(c.valor_contrato))}</span>}
          {tags.slice(0, 2).map(t => {
            const cc = TAGS_CONFIG[t] || { label: t, badge: "bg-gray-100 text-gray-600" };
            return <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cc.badge}`}>{cc.label}</span>;
          })}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          {!canEditAll ? (
            <>
              <Campo label="Data de Início">
                <input type="date" className="input-edit" value={c.data_inicio || ""} onChange={e => setC({ ...c, data_inicio: e.target.value || null })} disabled={!canEditInicio} />
              </Campo>
              <p className="text-[11px] text-gray-400">Término automático: início + {c.duracao_meses} meses.</p>
              {canEditInicio && (
                <button onClick={salvar} disabled={saving} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar início
                </button>
              )}
            </>
          ) : (
            <>
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

              <div className="flex gap-2">
                <button onClick={salvar} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar ciclo
                </button>
                <button onClick={excluir} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Excluir ciclo"><Trash2 size={15} /></button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Controle de Reuniões / Consultorias ----------
function ReunioesSecao({ mentoradoId, mentoria, reunioes, canEdit, onChange }: {
  mentoradoId: string; mentoria: string; reunioes: MentoradoReuniaoRow[];
  canEdit: boolean; onChange: () => Promise<void>;
}) {
  const tipos = REUNIAO_TIPOS[mentoria] || [];
  const [tipo, setTipo] = useState(tipos[0]?.key || "");
  const [consultor, setConsultor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const registrar = async () => {
    if (!tipo) return;
    setSaving(true);
    const { error } = await supabase.from("mentorado_reunioes").insert([{
      mentorado_id: mentoradoId,
      tipo,
      consultor: tipo === "extra_ana" ? "Ana" : (consultor || null),
      data,
      notas: notas || null,
    }]);
    setSaving(false);
    if (error) { alert("Erro ao registrar: " + error.message); return; }
    setNotas(""); setConsultor("");
    await onChange();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este registro de reunião?")) return;
    const { error } = await supabase.from("mentorado_reunioes").delete().eq("id", id);
    if (error) alert("Erro ao excluir."); else await onChange();
  };

  const labelTipo = (k: string) => tipos.find(t => t.key === k)?.label || k;

  return (
    <div className="pt-2 space-y-3">
      {canEdit && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Campo label="Tipo">
              <select className="input-edit" value={tipo} onChange={e => setTipo(e.target.value)}>
                {tipos.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Campo>
            <Campo label="Consultor(a)">
              {mentoria === "elite" ? (
                <select className="input-edit" value={consultor} onChange={e => setConsultor(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {CONSULTORES_ELITE.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : tipo === "extra_ana" ? (
                <div className="input-edit bg-gray-100 text-gray-500 cursor-not-allowed">Ana</div>
              ) : (
                <input className="input-edit" placeholder="Quem fez o CS" value={consultor} onChange={e => setConsultor(e.target.value)} />
              )}
            </Campo>
            <Campo label="Data">
              <input type="date" className="input-edit" value={data} onChange={e => setData(e.target.value)} />
            </Campo>
          </div>
          <div className="flex gap-2">
            <input className="input-edit flex-1" placeholder="Notas da reunião (opcional)" value={notas} onChange={e => setNotas(e.target.value)} />
            <button onClick={registrar} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Registrar
            </button>
          </div>
          {tipo === "extra_ana" && (
            <p className="text-[11px] text-gray-400">Extra: consultoria com a Ana quando o mentorado bate o faturamento. 🎯</p>
          )}
        </div>
      )}

      {reunioes.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma reunião registrada.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {reunioes.map(r => (
            <div key={r.id} className="py-2 flex items-center gap-3 text-sm">
              <Users2 size={14} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-800">
                  <b>{labelTipo(r.tipo)}</b>
                  {r.consultor && <> · {r.consultor}</>}
                  <span className="text-gray-400"> · {dateBR(r.data)}</span>
                </p>
                {r.notas && <p className="text-xs text-gray-500 truncate">{r.notas}</p>}
              </div>
              {canEdit && (
                <button onClick={() => excluir(r.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded flex-shrink-0" title="Excluir registro">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
