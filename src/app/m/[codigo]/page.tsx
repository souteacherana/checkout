"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, CreditCard, FileText, Loader2, Lock, QrCode, ShieldCheck } from "lucide-react";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Opcao = { metodo: string; parcelas: number; valor_parcela: number; total: number };

type Dados = {
  codigo: string;
  mentoria_label: string;
  primeiro_nome: string;
  valor_total: number;
  entrada_valor: number | null;
  restante: number;
  status: string;
  metodo_escolhido: string | null;
  opcoes: Opcao[];
  pagamento: { tipo: string; qr?: { encodedImage: string; payload: string }; invoiceUrl?: string; bankSlipUrl?: string } | null;
};

const METODOS = [
  { id: "PIX", label: "Pix", sub: "à vista", icon: QrCode },
  { id: "BOLETO", label: "Boleto", sub: "até 6x", icon: FileText },
  { id: "CREDIT_CARD", label: "Cartão", sub: "até 12x", icon: CreditCard },
];

export default function CheckoutMentoria({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [metodo, setMetodo] = useState("PIX");
  const [parcelas, setParcelas] = useState<Record<string, number>>({ PIX: 1, BOLETO: 6, CREDIT_CARD: 12 });
  const [pagando, setPagando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [resultado, setResultado] = useState<Dados["pagamento"] | null>(null);
  const [card, setCard] = useState({ holderName: "", number: "", expiry: "", ccv: "" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/m/${codigo}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Link não encontrado");
        return null;
      }
      setDados(data);
      return data as Dados;
    } catch {
      setErro("Erro de conexão. Recarregue a página.");
      return null;
    }
  }, [codigo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  // Enquanto aguarda pix/boleto, consulta o status a cada 6s
  useEffect(() => {
    const aguardando = dados?.status === "AGUARDANDO_PAGAMENTO" || dados?.status === "PARCIAL";
    if (aguardando && !pollRef.current) {
      pollRef.current = setInterval(carregar, 6000);
    }
    if (!aguardando && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [dados?.status, carregar]);

  const pagar = async () => {
    if (!dados) return;
    setPagando(true);
    try {
      const body: Record<string, unknown> = { metodo, parcelas: metodo === "PIX" ? 1 : parcelas[metodo] };
      if (metodo === "CREDIT_CARD") {
        const [mes, ano] = card.expiry.split("/").map(s => s.trim());
        body.creditCard = {
          holderName: card.holderName,
          number: card.number.replace(/\s/g, ""),
          expiryMonth: mes,
          expiryYear: ano?.length === 2 ? `20${ano}` : ano,
          ccv: card.ccv,
        };
      }
      const res = await fetch(`/api/m/${codigo}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao processar pagamento");
      } else if (data.tipo === "CREDIT_CARD") {
        await carregar();
      } else {
        setResultado(data);
        await carregar();
      }
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setPagando(false);
    }
  };

  const copiarPix = async (payload: string) => {
    await navigator.clipboard.writeText(payload);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // ===== Estados de tela =====
  if (erro) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md text-center">
        <p className="text-gray-700 font-medium">{erro}</p>
      </div>
    </div>
  );

  if (!dados) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500 mb-3" size={32} />
      <p className="text-gray-500 text-sm">Carregando...</p>
    </div>
  );

  if (dados.status === "PAGO") return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pagamento confirmado!</h1>
        <p className="text-sm text-gray-500">
          Bem-vindo(a) à mentoria <strong>{dados.mentoria_label}</strong>, {dados.primeiro_nome}!
          Nossa equipe vai entrar em contato pra começar o seu onboarding. 🚀
        </p>
      </div>
    </div>
  );

  const pagamentoAtivo = resultado || dados.pagamento;

  // Cobrança já gerada: mostra QR / boleto e o status ao vivo
  if (pagamentoAtivo) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-1">Mentoria {dados.mentoria_label}</h1>
          {dados.status === "PARCIAL" ? (
            <p className="text-sm text-emerald-600 font-medium mb-6">Primeira parcela paga! As demais chegam no seu e-mail. ✅</p>
          ) : (
            <p className="text-sm text-gray-500 mb-6">Estamos aguardando a confirmação do pagamento.</p>
          )}

          {pagamentoAtivo.tipo === "PIX" && pagamentoAtivo.qr && (
            <>
              {/* QR do Asaas, gerado na hora (data URI, sem request externo) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${pagamentoAtivo.qr.encodedImage}`}
                alt="QR Code Pix"
                className="w-52 h-52 mx-auto rounded-xl border border-gray-200 mb-4"
              />
              <button
                onClick={() => copiarPix(pagamentoAtivo.qr!.payload)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                {copiado ? <Check size={15} /> : <Copy size={15} />}
                {copiado ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
              </button>
              <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Confirmação automática em instantes após o pagamento
              </p>
            </>
          )}

          {pagamentoAtivo.tipo === "BOLETO" && (
            <>
              <a
                href={pagamentoAtivo.bankSlipUrl || pagamentoAtivo.invoiceUrl}
                target="_blank" rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <FileText size={15} /> Abrir 1º boleto
              </a>
              <p className="text-xs text-gray-500 mt-4">
                As próximas parcelas chegam automaticamente no seu e-mail, todo mês.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Pagamentos após o vencimento têm multa fixa de R$ 40,00 por parcela.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ===== Seleção de pagamento =====
  const opcoesDoMetodo = dados.opcoes
    .filter(o => o.metodo === metodo)
    .sort((a, b) => a.parcelas - b.parcelas);
  const selecionada = metodo === "PIX"
    ? opcoesDoMetodo[0]
    : opcoesDoMetodo.find(o => o.parcelas === parcelas[metodo]) || opcoesDoMetodo[opcoesDoMetodo.length - 1];

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-1">Olá, {dados.primeiro_nome}! Finalize sua inscrição na</p>
          <h1 className="text-2xl font-bold text-gray-900">Mentoria {dados.mentoria_label}</h1>
          <div className="mt-3 inline-flex flex-col items-center bg-white border border-gray-200 rounded-xl px-6 py-3">
            <span className="text-xs text-gray-400">Valor da mentoria</span>
            <span className="text-xl font-bold text-gray-900">{brl(dados.valor_total)}</span>
            {dados.entrada_valor ? (
              <span className="text-xs text-emerald-600 mt-1">
                Entrada de {brl(dados.entrada_valor)} combinada com seu consultor · aqui você paga {brl(dados.restante)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Métodos */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {METODOS.map(m => {
            const Icone = m.icon;
            const ativo = metodo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMetodo(m.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                  ativo ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                }`}
              >
                <Icone size={18} />
                {m.label}
                <span className={`text-[10px] font-normal ${ativo ? "text-emerald-100" : "text-gray-400"}`}>{m.sub}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Simulador de parcelas */}
          {metodo === "PIX" ? (
            <div className="text-center py-2 mb-4">
              <p className="text-sm text-gray-500">À vista no Pix, com desconto</p>
              <p className="text-3xl font-bold text-emerald-600">{selecionada ? brl(selecionada.total) : "—"}</p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Escolha o número de parcelas</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {opcoesDoMetodo.map(o => {
                  const ativo = selecionada?.parcelas === o.parcelas;
                  return (
                    <button
                      key={o.parcelas}
                      onClick={() => setParcelas(prev => ({ ...prev, [metodo]: o.parcelas }))}
                      className={`flex items-baseline justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        ativo ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-900">{o.parcelas}x {brl(o.valor_parcela)}</span>
                      <span className="text-[10px] text-gray-400 ml-1">{brl(o.total)}</span>
                    </button>
                  );
                })}
              </div>
              {metodo === "BOLETO" && (
                <p className="text-[11px] text-amber-600 mt-3">
                  ⚠ Parcela paga após o vencimento tem multa fixa de R$ 40,00.
                </p>
              )}
            </div>
          )}

          {/* Formulário do cartão */}
          {metodo === "CREDIT_CARD" && (
            <div className="space-y-3 mb-4 pt-3 border-t border-gray-100">
              <input
                placeholder="Número do cartão"
                value={card.number}
                onChange={e => setCard(c => ({ ...c, number: e.target.value }))}
                inputMode="numeric" autoComplete="cc-number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
              />
              <input
                placeholder="Nome impresso no cartão"
                value={card.holderName}
                onChange={e => setCard(c => ({ ...c, holderName: e.target.value }))}
                autoComplete="cc-name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Validade (MM/AA)"
                  value={card.expiry}
                  onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))}
                  autoComplete="cc-exp"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                />
                <input
                  placeholder="CVV"
                  value={card.ccv}
                  onChange={e => setCard(c => ({ ...c, ccv: e.target.value }))}
                  inputMode="numeric" autoComplete="cc-csc" maxLength={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900"
                />
              </div>
            </div>
          )}

          <button
            onClick={pagar}
            disabled={pagando || !selecionada}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {pagando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
            {pagando
              ? "Processando..."
              : metodo === "PIX"
                ? `Gerar Pix de ${selecionada ? brl(selecionada.total) : ""}`
                : metodo === "BOLETO"
                  ? `Gerar boletos — ${selecionada ? `${selecionada.parcelas}x ${brl(selecionada.valor_parcela)}` : ""}`
                  : `Pagar ${selecionada ? `${selecionada.parcelas}x ${brl(selecionada.valor_parcela)}` : ""}`}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
            <ShieldCheck size={12} /> Pagamento processado em ambiente seguro via Asaas
          </p>
        </div>
      </div>
    </div>
  );
}
