/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { GraduationCap, ImageIcon, Pencil, ChevronDown, Check, X } from "lucide-react";
import type { MentoriaPrecoRow, MentoriaConfigRow } from "@/lib/database.types";
import { getUserRole } from "../actions";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MENTORIAS = [
  { slug: "partiu10k", label: "Partiu 10k", accent: "#0E7C5A" },
  { slug: "elite", label: "Professores de Elite", accent: "#B5924B" },
];

const METODO_LABELS: Record<string, string> = {
  PIX: "Pix à vista",
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão de crédito",
};

const PODE_VER = ["ANA", "ADMIN", "SUPERADMIN"];

export default function MentoriasPage() {
  const router = useRouter();
  const [precos, setPrecos] = useState<MentoriaPrecoRow[]>([]);
  const [configs, setConfigs] = useState<MentoriaConfigRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);   // qual card tem a tabela expandida
  const [editandoFoto, setEditandoFoto] = useState<string | null>(null);
  const [fotoInput, setFotoInput] = useState("");
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  const fetchTudo = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("mentoria_precos").select("*").order("mentoria").order("metodo").order("parcelas"),
      supabase.from("mentoria_config").select("*"),
    ]);
    if (p) setPrecos(p);
    if (c) setConfigs(c);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      if (session.user?.email) {
        getUserRole(session.user.email).then(r => setRole(r));
      }
      fetchTudo();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const putMentoria = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/mentorias", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Erro ao salvar: " + (err.error || "Desconhecido"));
      return false;
    }
    return true;
  };

  const editarValor = async (p: MentoriaPrecoRow) => {
    const input = window.prompt(
      `${MENTORIAS.find(m => m.slug === p.mentoria)?.label} · ${METODO_LABELS[p.metodo]} · ${p.parcelas}x\nNovo valor da parcela (ex: 1250,00):`,
      String(p.valor_parcela).replace(".", ",")
    );
    if (input === null) return;
    const valor = Number(input.replace(/\./g, "").replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      alert("Valor inválido.");
      return;
    }
    if (await putMentoria({ mentoria: p.mentoria, metodo: p.metodo, parcelas: p.parcelas, valor_parcela: valor })) {
      fetchTudo();
    }
  };

  const abrirEdicaoFoto = (slug: string, atual: string | null) => {
    setEditandoFoto(slug);
    setFotoInput(atual || "");
  };

  const salvarFoto = async (slug: string) => {
    setSalvandoFoto(true);
    if (await putMentoria({ mentoria: slug, image_src: fotoInput })) {
      setEditandoFoto(null);
      await fetchTudo();
    }
    setSalvandoFoto(false);
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400 text-sm">Carregando mentorias...</div>
  );

  if (role && !PODE_VER.includes(role)) return (
    <div className="p-8 text-center text-gray-500 text-sm">Sem permissão para acessar esta página.</div>
  );

  const imgDe = (slug: string) => configs.find(c => c.mentoria === slug)?.image_src || null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
          <GraduationCap size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mentorias</h1>
          <p className="text-sm text-gray-500">Foto e tabela de valores de cada mentoria — tudo editável na hora, sem deploy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MENTORIAS.map(m => {
          const doM = precos.filter(p => p.mentoria === m.slug);
          const base = doM.find(p => p.metodo === "CREDIT_CARD" && p.parcelas === 1);
          const img = imgDe(m.slug);
          const expandida = aberta === m.slug;

          return (
            <div key={m.slug} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              {/* Banner com foto (mesmo padrão dos Produtos) */}
              <div className="h-40 relative group" style={{ backgroundColor: m.accent + "18" }}>
                {img ? (
                  <img src={img} alt={m.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: m.accent }}>
                    <ImageIcon size={30} />
                    <span className="text-[11px] font-medium opacity-70">sem foto</span>
                  </div>
                )}
                <button
                  onClick={() => abrirEdicaoFoto(m.slug, img)}
                  className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/95 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                >
                  <Pencil size={12} /> {img ? "Trocar foto" : "Adicionar foto"}
                </button>
                <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: m.accent }} />
              </div>

              {/* Editor de foto (inline) */}
              {editandoFoto === m.slug && (
                <div className="px-5 pt-4 pb-2 border-b border-gray-100 bg-gray-50/60">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">URL da foto</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      autoFocus
                      value={fotoInput}
                      onChange={e => setFotoInput(e.target.value)}
                      placeholder="https://teacherana.com.br/.../mentoria.jpg"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                    <button
                      onClick={() => salvarFoto(m.slug)}
                      disabled={salvandoFoto}
                      className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      title="Salvar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditandoFoto(null)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="Cancelar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Cole a URL da imagem (deixe em branco pra remover). Aparece no topo do checkout do cliente.</p>
                </div>
              )}

              {/* Corpo */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-bold text-gray-900 leading-tight">{m.label}</h2>
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">/{m.slug}</span>
                </div>
                {base && (
                  <p className="text-sm font-semibold mb-4" style={{ color: m.accent }}>
                    Valor cheio {brl(Number(base.valor_parcela))}
                  </p>
                )}

                {/* Tabela de valores recolhida */}
                <button
                  onClick={() => setAberta(expandida ? null : m.slug)}
                  className="mt-auto flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>Tabela de valores <span className="text-gray-400 font-normal">({doM.length} opções)</span></span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandida ? "rotate-180" : ""}`} />
                </button>

                {expandida && (
                  <div className="mt-3 space-y-4">
                    {["PIX", "BOLETO", "CREDIT_CARD"].map(metodo => {
                      const linhas = doM.filter(p => p.metodo === metodo);
                      if (linhas.length === 0) return null;
                      return (
                        <div key={metodo}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{METODO_LABELS[metodo]}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {linhas.map(p => (
                              <button
                                key={p.parcelas}
                                onClick={() => editarValor(p)}
                                className="group flex items-center justify-between px-2.5 py-2 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/40 transition-colors text-left"
                                title="Editar valor"
                              >
                                <span className="text-xs text-gray-400">{p.parcelas}x</span>
                                <span className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                                  {brl(Number(p.valor_parcela))}
                                  <Pencil size={9} className="text-gray-300 group-hover:text-purple-400" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
