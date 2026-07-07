"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserRole } from "../../actions";
import type { MentoradoRow } from "@/lib/database.types";
import {
  GraduationCap, Search, X, AlertCircle, CheckCircle, Gift,
  CalendarClock, Pencil, Save, Loader2
} from "lucide-react";

const LABELS: Record<string, { titulo: string; brinde: string; cor: string }> = {
  elite: { titulo: "Professores de Elite", brinde: "Caneca", cor: "#8b5cf6" },
  partiu10k: { titulo: "Partiu 10k", brinde: "Matéria", cor: "#0ea5e9" },
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const dateBR = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR") : "—";

function diasParaTermino(m: MentoradoRow, now: number): number | null {
  if (!m.data_termino) return null;
  return Math.ceil((new Date(m.data_termino + "T12:00:00").getTime() - now) / 86400000);
}

export default function MentoradosPage({ params }: { params: Promise<{ mentoria: string }> }) {
  const { mentoria } = use(params);
  const router = useRouter();
  const cfg = LABELS[mentoria];

  const [rows, setRows] = useState<MentoradoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"ativos" | "renovacao" | "inadimplentes" | "todos">("ativos");
  const [editing, setEditing] = useState<MentoradoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());

  const canEditAll = ["ANA", "ADMIN", "SUPERADMIN"].includes(role);
  const canEditInicio = canEditAll || (role === "EMMY" && mentoria === "partiu10k");

  const fetchRows = async () => {
    const { data } = await supabase
      .from("mentorados")
      .select("*")
      .eq("mentoria", mentoria as "elite" | "partiu10k")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!cfg) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      if (session.user?.email) {
        getUserRole(session.user.email).then(r => setRole(r));
      }
      fetchRows();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentoria]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filtro === "ativos") list = list.filter(m => m.status === "ativo");
    if (filtro === "renovacao") list = list.filter(m => {
      const d = diasParaTermino(m, now);
      return m.status === "ativo" && d !== null && d <= 30;
    });
    if (filtro === "inadimplentes") list = list.filter(m => m.parcelas_vencidas > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.nome.toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.cpf || "").includes(q) ||
        (m.telefone || "").includes(q)
      );
    }
    return list;
  }, [rows, filtro, search, now]);

  const totals = useMemo(() => ({
    ativos: rows.filter(m => m.status === "ativo").length,
    renovacao: rows.filter(m => {
      const d = diasParaTermino(m, now);
      return m.status === "ativo" && d !== null && d <= 30;
    }).length,
    inadimplentes: rows.filter(m => m.parcelas_vencidas > 0).length,
    aReceber: rows.filter(m => m.status === "ativo").reduce((acc, m) => acc + Number(m.a_pagar || 0), 0),
  }), [rows, now]);

  const saveEditing = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/mentorados", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(
          canEditAll
            ? {
                id: editing.id,
                nome: editing.nome, email: editing.email, telefone: editing.telefone,
                cpf: editing.cpf, rg: editing.rg, endereco: editing.endereco, cep: editing.cep,
                imersao_rise: editing.imersao_rise, origem: editing.origem,
                brinde_enviado: editing.brinde_enviado, status: editing.status,
                data_inicio: editing.data_inicio, data_termino: editing.data_termino,
                notas: editing.notas,
              }
            : { id: editing.id, data_inicio: editing.data_inicio }
        ),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao salvar: " + (err.error || "desconhecido"));
      } else {
        setEditing(null);
        fetchRows();
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setSaving(false);
    }
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

  if (role && !["ANA", "ADMIN", "SUPERADMIN", "EMMY"].includes(role)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-3">
      <AlertCircle size={32} className="text-gray-300" />
      <p className="text-gray-600 font-medium">Seu perfil não tem acesso à área de Mentorados.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: cfg.cor }}>
              <GraduationCap size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Mentorados · {cfg.titulo}</h1>
              <p className="text-xs text-gray-400 -mt-0.5">
                {totals.ativos} ativos
                {totals.aReceber > 0 && canEditAll && <> · <b className="text-gray-600">{brl(totals.aReceber)}</b> a receber</>}
              </p>
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              ["ativos", `Ativos`],
              ["renovacao", `Renovação${totals.renovacao ? ` (${totals.renovacao})` : ""}`],
              ["inadimplentes", `Vencidos${totals.inadimplentes ? ` (${totals.inadimplentes})` : ""}`],
              ["todos", "Todos"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  filtro === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="relative mb-6 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nome, e-mail, CPF ou telefone..."
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-[#f8fafc] border-b border-gray-200 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-5 py-3">Mentorado</th>
                  <th className="px-5 py-3">Contrato</th>
                  <th className="px-5 py-3">Início → Término</th>
                  <th className="px-5 py-3 text-center">{cfg.brinde}</th>
                  <th className="px-5 py-3 text-center">Imersão</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(m => {
                  const dias = diasParaTermino(m, now);
                  const emRenovacao = m.status === "ativo" && dias !== null && dias <= 30;
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${m.status !== "ativo" ? "opacity-60" : ""}`}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">{m.nome}</p>
                        <p className="text-xs text-gray-500">{m.email}</p>
                        <p className="text-xs text-gray-400">{m.telefone} {m.cpf && <>· {m.cpf}</>}</p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-bold text-gray-900">{m.valor_contrato != null ? brl(Number(m.valor_contrato)) : "—"}</p>
                        {Number(m.a_pagar || 0) > 0 && (
                          <p className={`text-xs ${m.parcelas_vencidas > 0 ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                            {m.parcelas_vencidas > 0 && <AlertCircle size={11} className="inline mr-0.5 -mt-0.5" />}
                            a pagar: {brl(Number(m.a_pagar))}
                            {m.parcelas_vencidas > 0 && <> · {m.parcelas_vencidas} vencida{m.parcelas_vencidas > 1 ? "s" : ""}</>}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-xs">
                        <span className="text-gray-700 font-medium">{dateBR(m.data_inicio)}</span>
                        <span className="text-gray-300 mx-1">→</span>
                        <span className="text-gray-700 font-medium">{dateBR(m.data_termino)}</span>
                        {!m.data_inicio && <span className="ml-2 text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">definir início</span>}
                        {emRenovacao && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            <CalendarClock size={10} /> renova em {dias}d
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {m.brinde_enviado
                          ? <CheckCircle size={16} className="inline text-emerald-500" />
                          : <Gift size={16} className="inline text-gray-300" />}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {m.imersao_rise
                          ? <CheckCircle size={16} className="inline text-emerald-500" />
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 max-w-[140px] truncate">{m.origem || "—"}</td>
                      <td className="px-5 py-3 text-center">
                        {canEditInicio && (
                          <button
                            onClick={() => setEditing({ ...m })}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title={canEditAll ? "Editar mentorado" : "Definir data de início"}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                      Nenhum mentorado nesse filtro. Novos pagamentos no Asaas entram aqui automaticamente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
            Mostrando <b>{filtered.length}</b> de <b>{rows.length}</b> mentorados
          </div>
        </div>
      </main>

      {/* Painel de Edição */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-end" onClick={() => !saving && setEditing(null)}>
          <div className="bg-white h-full w-full max-w-md shadow-2xl overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{canEditAll ? "Editar Mentorado" : "Data de Início"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {canEditAll ? (
                <>
                  <Campo label="Nome"><input className="input-edit" value={editing.nome} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="E-mail"><input className="input-edit" value={editing.email || ""} onChange={e => setEditing({ ...editing, email: e.target.value })} /></Campo>
                    <Campo label="Telefone"><input className="input-edit" value={editing.telefone || ""} onChange={e => setEditing({ ...editing, telefone: e.target.value })} /></Campo>
                    <Campo label="CPF"><input className="input-edit" value={editing.cpf || ""} onChange={e => setEditing({ ...editing, cpf: e.target.value })} /></Campo>
                    <Campo label="RG"><input className="input-edit" value={editing.rg || ""} onChange={e => setEditing({ ...editing, rg: e.target.value })} /></Campo>
                  </div>
                  <Campo label="Endereço"><input className="input-edit" value={editing.endereco || ""} onChange={e => setEditing({ ...editing, endereco: e.target.value })} /></Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="CEP"><input className="input-edit" value={editing.cep || ""} onChange={e => setEditing({ ...editing, cep: e.target.value })} /></Campo>
                    <Campo label="Origem"><input className="input-edit" placeholder="Ex: Workshop VST" value={editing.origem || ""} onChange={e => setEditing({ ...editing, origem: e.target.value })} /></Campo>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900">{editing.nome}</p>
                  <p className="text-xs text-gray-500">{editing.email}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Campo label="Data de Início">
                  <input type="date" className="input-edit" value={editing.data_inicio || ""} onChange={e => setEditing({ ...editing, data_inicio: e.target.value || null })} />
                </Campo>
                {canEditAll && (
                  <Campo label="Data de Término">
                    <input type="date" className="input-edit" value={editing.data_termino || ""} onChange={e => setEditing({ ...editing, data_termino: e.target.value || null })} />
                  </Campo>
                )}
              </div>
              {!canEditAll && (
                <p className="text-xs text-gray-400">O término é calculado automaticamente: início + 6 meses.</p>
              )}
              {canEditAll && !editing.data_termino && editing.data_inicio && (
                <p className="text-xs text-gray-400">Deixe o término vazio pra calcular automaticamente (início + 6 meses).</p>
              )}

              {canEditAll && (
                <>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={editing.brinde_enviado} onChange={e => setEditing({ ...editing, brinde_enviado: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                      {cfg.brinde} enviada
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={editing.imersao_rise} onChange={e => setEditing({ ...editing, imersao_rise: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                      Imersão Rise
                    </label>
                  </div>
                  <Campo label="Status">
                    <select className="input-edit" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                      <option value="ativo">Ativo</option>
                      <option value="concluido">Concluído</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </Campo>
                  <Campo label="Notas">
                    <textarea className="input-edit min-h-[70px]" value={editing.notas || ""} onChange={e => setEditing({ ...editing, notas: e.target.value })} />
                  </Campo>
                </>
              )}
            </div>

            <button
              onClick={saveEditing}
              disabled={saving}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-edit {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-edit:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
      `}</style>
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
