"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Download, FileText, Loader2, Paperclip, Receipt, Trash2, Upload } from "lucide-react";
import type { MentoradoDocRow } from "@/lib/database.types";

const GRUPOS = [
  { tipo: "contrato", label: "Contrato", icon: FileText },
  { tipo: "nota_fiscal", label: "Nota Fiscal", icon: Receipt },
];

/**
 * Anexos de um mentorado (contrato / nota fiscal). Leitura via RLS
 * (ANA/ADMIN/SUPERADMIN/EMMY); upload e exclusão pela API (ANA+).
 * Excluir + reanexar é o fluxo esperado quando um arquivo sobe errado.
 */
export default function MentoradoDocs({ mentoradoId, canEdit }: { mentoradoId: string; canEdit: boolean }) {
  const [docs, setDocs] = useState<MentoradoDocRow[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const carregar = async () => {
    const { data } = await supabase
      .from("mentorado_docs")
      .select("*")
      .eq("mentorado_id", mentoradoId)
      .order("created_at", { ascending: false });
    if (data) setDocs(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentoradoId]);

  const enviar = async (tipo: string, file: File) => {
    setEnviando(tipo);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("mentorado_id", mentoradoId);
      form.append("tipo", tipo);
      form.append("file", file);

      const res = await fetch("/api/admin/mentorado-docs", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao anexar: " + (err.error || "Desconhecido"));
      }
      await carregar();
    } catch {
      alert("Erro de conexão");
    } finally {
      setEnviando(null);
    }
  };

  const baixar = async (doc: MentoradoDocRow) => {
    setBaixando(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/mentorado-docs?id=${doc.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Erro ao baixar: " + (data.error || "Desconhecido"));
        return;
      }
      window.open(data.url, "_blank", "noopener");
    } catch {
      alert("Erro de conexão");
    } finally {
      setBaixando(null);
    }
  };

  const excluir = async (doc: MentoradoDocRow) => {
    if (!confirm(`Excluir "${doc.nome_arquivo}"? Você pode anexar outro em seguida.`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/mentorado-docs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id: doc.id }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Erro ao excluir: " + (err.error || "Desconhecido"));
    }
    await carregar();
  };

  return (
    <div className="space-y-4 pt-2">
      {GRUPOS.map(g => {
        const Icone = g.icon;
        const doGrupo = docs.filter(d => d.tipo === g.tipo);
        return (
          <div key={g.tipo}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <Icone size={13} className="text-gray-400" /> {g.label}
              </p>
              {canEdit && (
                <>
                  <input
                    ref={el => { inputsRef.current[g.tipo] = el; }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) enviar(g.tipo, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => inputsRef.current[g.tipo]?.click()}
                    disabled={enviando !== null}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    {enviando === g.tipo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {enviando === g.tipo ? "Enviando..." : "Anexar"}
                  </button>
                </>
              )}
            </div>

            {doGrupo.length === 0 ? (
              <p className="text-xs text-gray-300 flex items-center gap-1"><Paperclip size={11} /> nenhum arquivo</p>
            ) : (
              <div className="space-y-1">
                {doGrupo.map(d => (
                  <div key={d.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-700 truncate flex-1" title={d.nome_arquivo}>{d.nome_arquivo}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(d.created_at).toLocaleDateString("pt-BR")}{d.uploaded_by ? ` · ${d.uploaded_by.split("@")[0]}` : ""}
                    </span>
                    <button
                      onClick={() => baixar(d)}
                      disabled={baixando === d.id}
                      className="p-1 text-gray-400 hover:text-indigo-600 rounded disabled:opacity-50"
                      title="Baixar"
                    >
                      {baixando === d.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => excluir(d)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Excluir (pra reanexar corrigido)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {canEdit && <p className="text-[10px] text-gray-400">PDF, JPG, PNG ou WebP · máx 4 MB por arquivo</p>}
    </div>
  );
}
