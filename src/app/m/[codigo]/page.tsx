"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, CreditCard, FileText, Loader2, Lock, QrCode, ShieldCheck } from "lucide-react";

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Opcao = { metodo: string; parcelas: number; valor_parcela: number; total: number };

type Dados = {
  codigo: string;
  mentoria: string;
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

// Foto do topo por mentoria (mesmo papel do imageSrc dos checkouts padrão).
// null = cabeçalho tipográfico; é só colar a URL quando a arte existir.
const TEMAS: Record<string, { imageSrc: string | null }> = {
  partiu10k: { imageSrc: null },
  elite: { imageSrc: null },
};

// Mesma gramática do checkout de produtos (accent via CSS), refinada:
// acento ink profundo + detalhes champagne, serifa nos títulos e valores.
const INK = "#101828";
const GOLD = "#B5924B";

const METODOS = [
  { id: "PIX", label: "Pix", sub: "à vista", icon: QrCode },
  { id: "BOLETO", label: "Boleto", sub: "até 6x", icon: FileText },
  { id: "CREDIT_CARD", label: "Cartão", sub: "até 12x", icon: CreditCard },
];

const serif = { fontFamily: "var(--font-fraunces), Georgia, serif" };

function Rodape() {
  return (
    <div className="mt-6 text-center space-y-1">
      <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} /> Pagamento processado em ambiente seguro via Asaas
      </p>
      <p className="text-[10px] text-gray-300">Teacher Ana de Araújo · CNPJ 49.168.017/0001-41</p>
    </div>
  );
}

export default function CheckoutMentoria({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [metodo, setMetodo] = useState("PIX");
  const [parcelas, setParcelas] = useState<Record<string, number>>({ PIX: 1, BOLETO: 6, CREDIT_CARD: 12 });
  const [listaAberta, setListaAberta] = useState(false);
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
    <div className="min-h-screen bg-[#FBFAF8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md text-center">
        <p className="text-gray-700 font-medium">{erro}</p>
      </div>
    </div>
  );

  if (!dados) return (
    <div className="min-h-screen bg-[#FBFAF8] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin mb-3" size={30} style={{ color: GOLD }} />
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  );

  const tema = TEMAS[dados.mentoria] || { imageSrc: null };

  const Cabecalho = (
    <header className="mb-6 text-center">
      {tema.imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tema.imageSrc}
          alt={`Mentoria ${dados.mentoria_label}`}
          className="w-full rounded-2xl mb-6 shadow-md"
        />
      )}
      <p className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-2" style={{ color: GOLD }}>
        Rise Educação
      </p>
      <h1 className="text-[30px] leading-tight text-gray-900" style={serif}>
        Mentoria {dados.mentoria_label}
      </h1>
      <div className="w-10 h-px mx-auto mt-3 mb-2.5" style={{ backgroundColor: GOLD }} />
      <p className="text-sm text-gray-500">
        Olá, {dados.primeiro_nome}. Falta pouco para a sua jornada começar.
      </p>
    </header>
  );

  if (dados.status === "PAGO") return (
    <main className="min-h-screen bg-[#FBFAF8] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {Cabecalho}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${GOLD}1f`, color: GOLD }}
          >
            <Check size={30} />
          </div>
          <h2 className="text-2xl text-gray-900 mb-2" style={serif}>Inscrição confirmada</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Seja bem-vindo(a), {dados.primeiro_nome}. Nossa equipe entrará em contato
            em breve para iniciar o seu onboarding.
          </p>
        </div>
        <Rodape />
      </div>
    </main>
  );

  const pagamentoAtivo = resultado || dados.pagamento;

  // Cobrança já gerada: QR / boleto + status ao vivo
  if (pagamentoAtivo) {
    return (
      <main className="min-h-screen bg-[#FBFAF8] py-10 px-4">
        <div className="max-w-lg mx-auto">
          {Cabecalho}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            {dados.status === "PARCIAL" ? (
              <p className="text-sm font-medium mb-6" style={{ color: GOLD }}>
                Primeira parcela confirmada — as demais chegam no seu e-mail.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-6">Aguardando a confirmação do pagamento…</p>
            )}

            {pagamentoAtivo.tipo === "PIX" && pagamentoAtivo.qr && (
              <>
                {/* QR do Asaas (data URI, sem request externo) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pagamentoAtivo.qr.encodedImage}`}
                  alt="QR Code Pix"
                  className="w-52 h-52 mx-auto rounded-2xl border border-gray-200 mb-5"
                />
                <button
                  onClick={() => copiarPix(pagamentoAtivo.qr!.payload)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: INK }}
                >
                  {copiado ? <Check size={15} style={{ color: GOLD }} /> : <Copy size={15} />}
                  {copiado ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
                </button>
                <p className="text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Confirmação automática em instantes
                </p>
              </>
            )}

            {pagamentoAtivo.tipo === "BOLETO" && (
              <>
                <a
                  href={pagamentoAtivo.bankSlipUrl || pagamentoAtivo.invoiceUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: INK }}
                >
                  <FileText size={15} style={{ color: GOLD }} /> Abrir primeiro boleto
                </a>
                <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                  As próximas parcelas chegam automaticamente no seu e-mail, todo mês.
                  <br />
                  <span className="text-gray-400">Pagamentos após o vencimento têm multa fixa de R$ 40,00 por parcela.</span>
                </p>
              </>
            )}
          </div>
          <Rodape />
        </div>
      </main>
    );
  }

  // ===== Seleção de pagamento =====
  const opcoesDoMetodo = dados.opcoes
    .filter(o => o.metodo === metodo)
    .sort((a, b) => a.parcelas - b.parcelas);
  const selecionada = metodo === "PIX"
    ? opcoesDoMetodo[0]
    : opcoesDoMetodo.find(o => o.parcelas === parcelas[metodo]) || opcoesDoMetodo[opcoesDoMetodo.length - 1];

  const trocarMetodo = (id: string) => {
    setMetodo(id);
    setListaAberta(false);
  };

  return (
    <main className="min-h-screen bg-[#FBFAF8] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {Cabecalho}

        {/* Investimento */}
        <div className="text-center mb-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-1">Investimento</p>
          <p className="text-3xl text-gray-900" style={serif}>{brl(dados.valor_total)}</p>
          {dados.entrada_valor ? (
            <p className="text-xs text-gray-500 mt-2">
              Entrada de <strong>{brl(dados.entrada_valor)}</strong> combinada com seu consultor
              — aqui você paga <strong>{brl(dados.restante)}</strong>
            </p>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {/* Métodos */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {METODOS.map(m => {
              const Icone = m.icon;
              const ativo = metodo === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => trocarMetodo(m.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-[13px] font-semibold transition-all ${
                    ativo ? "text-white shadow-md" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                  style={ativo ? { backgroundColor: INK, borderColor: INK } : undefined}
                >
                  <Icone size={17} style={ativo ? { color: GOLD } : undefined} />
                  {m.label}
                  <span className={`text-[10px] font-normal ${ativo ? "text-white/50" : "text-gray-400"}`}>{m.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Simulador */}
          {metodo === "PIX" ? (
            <div className="text-center py-3.5 mb-4 rounded-xl border" style={{ backgroundColor: "#FBF7EF", borderColor: `${GOLD}44` }}>
              <p className="text-xs text-gray-500 mb-0.5">À vista no Pix, com desconto</p>
              <p className="text-[26px] text-gray-900" style={serif}>{selecionada ? brl(selecionada.total) : "—"}</p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Parcelamento</p>

              {/* Fechado: só a opção escolhida; clicar abre a lista */}
              <button
                onClick={() => setListaAberta(a => !a)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors hover:border-gray-300"
                style={{ borderColor: listaAberta ? GOLD : "#e5e7eb" }}
              >
                <span className="flex-1 text-sm font-semibold text-gray-900">
                  {selecionada ? `${selecionada.parcelas}x de ${brl(selecionada.valor_parcela)}` : "Escolher parcelas"}
                </span>
                {selecionada && <span className="text-[11px] text-gray-400">{brl(selecionada.total)}</span>}
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${listaAberta ? "rotate-180" : ""}`}
                />
              </button>

              {listaAberta && (
                <div className="mt-1.5 rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm">
                  {opcoesDoMetodo.map(o => {
                    const ativo = selecionada?.parcelas === o.parcelas;
                    return (
                      <button
                        key={o.parcelas}
                        onClick={() => {
                          setParcelas(prev => ({ ...prev, [metodo]: o.parcelas }));
                          setListaAberta(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        style={ativo ? { backgroundColor: "#FBF7EF" } : undefined}
                      >
                        <span
                          className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                          style={{ borderColor: ativo ? GOLD : "#d1d5db" }}
                        >
                          {ativo && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GOLD }} />}
                        </span>
                        <span className="flex-1 text-sm font-medium text-gray-900">
                          {o.parcelas}x de {brl(o.valor_parcela)}
                        </span>
                        <span className="text-[11px] text-gray-400">{brl(o.total)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {metodo === "BOLETO" && (
                <p className="text-[11px] text-gray-400 mt-3">
                  Parcela paga após o vencimento tem multa fixa de R$ 40,00.
                </p>
              )}
            </div>
          )}

          {/* Cartão */}
          {metodo === "CREDIT_CARD" && (
            <div className="space-y-2.5 mb-4 pt-4 border-t border-gray-100">
              <input
                placeholder="Número do cartão"
                value={card.number}
                onChange={e => setCard(c => ({ ...c, number: e.target.value }))}
                inputMode="numeric" autoComplete="cc-number"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-gray-900 focus:border-transparent focus:ring-2"
                style={{ ["--tw-ring-color" as string]: GOLD }}
              />
              <input
                placeholder="Nome impresso no cartão"
                value={card.holderName}
                onChange={e => setCard(c => ({ ...c, holderName: e.target.value }))}
                autoComplete="cc-name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-gray-900 focus:border-transparent focus:ring-2"
                style={{ ["--tw-ring-color" as string]: GOLD }}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  placeholder="Validade (MM/AA)"
                  value={card.expiry}
                  onChange={e => setCard(c => ({ ...c, expiry: e.target.value }))}
                  autoComplete="cc-exp"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-gray-900 focus:border-transparent focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: GOLD }}
                />
                <input
                  placeholder="CVV"
                  value={card.ccv}
                  onChange={e => setCard(c => ({ ...c, ccv: e.target.value }))}
                  inputMode="numeric" autoComplete="cc-csc" maxLength={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none text-gray-900 focus:border-transparent focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: GOLD }}
                />
              </div>
            </div>
          )}

          <button
            onClick={pagar}
            disabled={pagando || !selecionada}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-4 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: INK }}
          >
            {pagando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} style={{ color: GOLD }} />}
            {pagando
              ? "Processando..."
              : metodo === "PIX"
                ? `Gerar Pix de ${selecionada ? brl(selecionada.total) : ""}`
                : metodo === "BOLETO"
                  ? `Gerar boletos — ${selecionada ? `${selecionada.parcelas}x de ${brl(selecionada.valor_parcela)}` : ""}`
                  : `Pagar ${selecionada ? `${selecionada.parcelas}x de ${brl(selecionada.valor_parcela)}` : ""}`}
          </button>
        </div>

        <Rodape />
      </div>
    </main>
  );
}
