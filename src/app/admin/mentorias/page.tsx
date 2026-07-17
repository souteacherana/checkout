"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { GraduationCap, Pencil } from "lucide-react";
import type { MentoriaPrecoRow } from "@/lib/database.types";
import { getUserRole } from "../actions";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MENTORIA_LABELS: Record<string, string> = {
  partiu10k: "Partiu 10k",
  elite: "Professores de Elite",
};

const METODO_LABELS: Record<string, string> = {
  PIX: "Pix à vista",
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão de crédito",
};

const PODE_VER = ["ANA", "ADMIN", "SUPERADMIN"];

export default function MentoriasPage() {
  const router = useRouter();
  const [precos, setPrecos] = useState<MentoriaPrecoRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrecos = async () => {
    const { data } = await supabase
      .from("mentoria_precos")
      .select("*")
      .order("mentoria")
      .order("metodo")
      .order("parcelas");
    if (data) setPrecos(data);
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
      fetchPrecos();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editarValor = async (p: MentoriaPrecoRow) => {
    const input = window.prompt(
      `${MENTORIA_LABELS[p.mentoria]} · ${METODO_LABELS[p.metodo]} · ${p.parcelas}x\nNovo valor da parcela (ex: 1250,00):`,
      String(p.valor_parcela).replace(".", ",")
    );
    if (input === null) return;
    const valor = Number(input.replace(/\./g, "").replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      alert("Valor inválido.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/mentorias", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ mentoria: p.mentoria, metodo: p.metodo, parcelas: p.parcelas, valor_parcela: valor }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Erro ao salvar: " + (err.error || "Desconhecido"));
    }
    fetchPrecos();
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400 text-sm">Carregando mentorias...</div>
  );

  if (role && !PODE_VER.includes(role)) return (
    <div className="p-8 text-center text-gray-500 text-sm">Sem permissão para acessar esta página.</div>
  );

  const mentorias = ["partiu10k", "elite"];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
          <GraduationCap size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mentorias</h1>
          <p className="text-sm text-gray-500">Tabela de valores por forma de pagamento — clique num valor pra editar (vale na hora, sem deploy)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {mentorias.map(m => {
          const doM = precos.filter(p => p.mentoria === m);
          const base = doM.find(p => p.metodo === "CREDIT_CARD" && p.parcelas === 1);
          return (
            <div key={m} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
              <div className="p-5 border-b border-gray-100 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{MENTORIA_LABELS[m]}</h2>
                {base && <span className="text-sm text-gray-500">valor cheio {brl(Number(base.valor_parcela))}</span>}
              </div>

              {["PIX", "BOLETO", "CREDIT_CARD"].map(metodo => {
                const linhas = doM.filter(p => p.metodo === metodo);
                if (linhas.length === 0) return null;
                return (
                  <div key={metodo} className="px-5 py-4 border-b border-gray-50 last:border-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{METODO_LABELS[metodo]}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {linhas.map(p => (
                        <button
                          key={p.parcelas}
                          onClick={() => editarValor(p)}
                          className="group flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors text-left"
                          title="Editar valor"
                        >
                          <span className="text-xs text-gray-500">{p.parcelas}x</span>
                          <span className="text-xs font-semibold text-gray-900 flex items-center gap-1">
                            {brl(Number(p.valor_parcela))}
                            <Pencil size={10} className="text-gray-300 group-hover:text-indigo-400" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
