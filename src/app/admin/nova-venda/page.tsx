"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { BadgeDollarSign, Check, Copy, Link2, Mail, MessageCircle, User, MapPin, FileText } from "lucide-react";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MENTORIAS = [
  { value: "partiu10k", label: "Partiu 10k" },
  { value: "elite", label: "Professores de Elite" },
];

const vazio = {
  nome: "", telefone: "", email: "", cpf: "", rg: "",
  nacionalidade: "", estado_civil: "", profissao: "",
  end_rua: "", end_numero: "", end_bairro: "", end_cidade: "", end_estado: "", end_cep: "",
};

export default function NovaVendaPage() {
  const router = useRouter();
  const [precosBase, setPrecosBase] = useState<Record<string, number>>({});
  const [mentoria, setMentoria] = useState("partiu10k");
  const [renovacao, setRenovacao] = useState(false);
  const [temEntrada, setTemEntrada] = useState(false);
  const [entradaValor, setEntradaValor] = useState("");
  const [entradaFacilitada, setEntradaFacilitada] = useState(false);
  const [cliente, setCliente] = useState({ ...vazio });
  const [descricao, setDescricao] = useState("");
  const [prazoMeses, setPrazoMeses] = useState(6);
  const [salvando, setSalvando] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/admin/login");
        return;
      }
      // Valor cheio de cada mentoria = 1x no cartão (RLS libera leitura pra logados)
      supabase
        .from("mentoria_precos")
        .select("mentoria, valor_parcela")
        .eq("metodo", "CREDIT_CARD")
        .eq("parcelas", 1)
        .then(({ data }) => {
          if (data) {
            setPrecosBase(Object.fromEntries(data.map(p => [p.mentoria, Number(p.valor_parcela)])));
          }
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valorTotal = precosBase[mentoria] || 0;
  const entrada = temEntrada ? Number(entradaValor.replace(",", ".")) || 0 : 0;
  const restante = Math.max(valorTotal - entrada, 0);

  const setC = (campo: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCliente(prev => ({ ...prev, [campo]: e.target.value }));

  const input = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900";
  const label = "text-xs font-semibold text-gray-600 block mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (temEntrada && (entrada <= 0 || entrada >= valorTotal)) {
      alert("Valor de entrada inválido: precisa ser maior que zero e menor que o valor da mentoria.");
      return;
    }

    setSalvando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/vendas-mentoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          mentoria,
          renovacao,
          entrada_valor: temEntrada ? entrada : null,
          entrada_facilitada: temEntrada && entradaFacilitada,
          cliente,
          descricao,
          prazo_meses: prazoMeses,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Erro ao criar venda: " + (data.error || "Desconhecido"));
      } else {
        setLinkGerado(`${window.location.origin}/m/${data.codigo}`);
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  };

  const copiarLink = async () => {
    if (!linkGerado) return;
    await navigator.clipboard.writeText(linkGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const novaVenda = () => {
    setLinkGerado(null);
    setCliente({ ...vazio });
    setTemEntrada(false);
    setEntradaValor("");
    setEntradaFacilitada(false);
    setRenovacao(false);
    setDescricao("");
    setPrazoMeses(6);
  };

  // ===== Tela de sucesso: link pronto pra enviar =====
  if (linkGerado) {
    const msg = encodeURIComponent(
      `Olá, ${cliente.nome.split(" ")[0]}! Aqui está o link para finalizar a sua inscrição na mentoria: ${linkGerado}`
    );
    const foneDigitos = cliente.telefone.replace(/\D/g, "");
    const whatsHref = `https://wa.me/${foneDigitos.length >= 12 ? foneDigitos : "55" + foneDigitos}?text=${msg}`;
    const mailHref = `mailto:${cliente.email}?subject=${encodeURIComponent("Link da sua mentoria")}&body=${msg}`;

    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Link criado!</h1>
          <p className="text-sm text-gray-500 mb-6">
            {cliente.nome} · {MENTORIAS.find(m => m.value === mentoria)?.label} · {brl(valorTotal)}
            {entrada > 0 && <> · entrada de {brl(entrada)} (pix combinado)</>}
          </p>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
            <Link2 size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-mono text-gray-800 truncate flex-1 text-left">{linkGerado}</span>
            <button
              onClick={copiarLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              {copiado ? <Check size={13} /> : <Copy size={13} />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href={whatsHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle size={16} /> Enviar no WhatsApp
            </a>
            <a
              href={mailHref}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Mail size={16} /> Enviar por e-mail
            </a>
          </div>

          <button onClick={novaVenda} className="mt-6 text-sm text-gray-500 hover:text-gray-800 font-medium">
            + Criar outra venda
          </button>
        </div>
      </div>
    );
  }

  // ===== Formulário =====
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
          <BadgeDollarSign size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Venda de Mentoria</h1>
          <p className="text-sm text-gray-500">Preencha os dados e gere o link de pagamento pro cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mentoria e condições */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Mentoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Mentoria oferecida</label>
              <select value={mentoria} onChange={e => setMentoria(e.target.value)} className={input}>
                {MENTORIAS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}{precosBase[m.value] ? ` — ${brl(precosBase[m.value])}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={renovacao} onChange={e => setRenovacao(e.target.checked)} className="rounded" />
                Renovação
              </label>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-3">
              <input type="checkbox" checked={temEntrada} onChange={e => setTemEntrada(e.target.checked)} className="rounded" />
              Tem entrada (pix combinado com o cliente, fora do link)
            </label>
            {temEntrada && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className={label}>Valor da entrada (R$)</label>
                  <input
                    type="text" inputMode="decimal" required
                    value={entradaValor} onChange={e => setEntradaValor(e.target.value)}
                    placeholder="ex: 1000"
                    className={input}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-2">
                  <input type="checkbox" checked={entradaFacilitada} onChange={e => setEntradaFacilitada(e.target.checked)} className="rounded" />
                  Entrada facilitada <span className="text-xs text-gray-400">(vira tag no mentorado)</span>
                </label>
                <div className="pb-2 text-sm text-gray-600">
                  Restante a parcelar: <strong className="text-gray-900">{brl(restante)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dados gerais */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
            <User size={14} className="text-gray-400" /> Dados Gerais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={label}>Nome completo *</label>
              <input required value={cliente.nome} onChange={setC("nome")} className={input} />
            </div>
            <div>
              <label className={label}>Telefone (com DDD) *</label>
              <input required value={cliente.telefone} onChange={setC("telefone")} placeholder="11 91234-5678" className={input} />
            </div>
            <div>
              <label className={label}>E-mail *</label>
              <input required type="email" value={cliente.email} onChange={setC("email")} className={input} />
            </div>
            <div>
              <label className={label}>CPF *</label>
              <input required value={cliente.cpf} onChange={setC("cpf")} className={input} />
            </div>
            <div>
              <label className={label}>RG</label>
              <input value={cliente.rg} onChange={setC("rg")} className={input} />
            </div>
            <div>
              <label className={label}>Nacionalidade</label>
              <input value={cliente.nacionalidade} onChange={setC("nacionalidade")} className={input} />
            </div>
            <div>
              <label className={label}>Estado civil</label>
              <input value={cliente.estado_civil} onChange={setC("estado_civil")} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Profissão</label>
              <input value={cliente.profissao} onChange={setC("profissao")} className={input} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
            <MapPin size={14} className="text-gray-400" /> Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-4">
              <label className={label}>Rua</label>
              <input value={cliente.end_rua} onChange={setC("end_rua")} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Número</label>
              <input value={cliente.end_numero} onChange={setC("end_numero")} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Bairro</label>
              <input value={cliente.end_bairro} onChange={setC("end_bairro")} className={input} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Cidade</label>
              <input value={cliente.end_cidade} onChange={setC("end_cidade")} className={input} />
            </div>
            <div>
              <label className={label}>Estado</label>
              <input value={cliente.end_estado} onChange={setC("end_estado")} maxLength={2} placeholder="SP" className={input} />
            </div>
            <div>
              <label className={label}>CEP</label>
              <input value={cliente.end_cep} onChange={setC("end_cep")} placeholder="00000-000" className={input} />
            </div>
          </div>
        </div>

        {/* Contrato */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
            <FileText size={14} className="text-gray-400" /> Contrato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className={label}>Descrição</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Prazo (meses)</label>
              <input
                type="number" min={1} max={24}
                value={prazoMeses} onChange={e => setPrazoMeses(Number(e.target.value))}
                className={input}
              />
            </div>
          </div>
        </div>

        <button
          type="submit" disabled={salvando || !valorTotal}
          className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {salvando ? "Criando..." : `Gerar link de pagamento${valorTotal ? ` — ${brl(valorTotal)}` : ""}`}
        </button>
      </form>
    </div>
  );
}
