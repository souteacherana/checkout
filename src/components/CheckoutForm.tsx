/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, QrCode, User, Mail, CreditCard as IdCard, Loader2, CheckCircle, XCircle, Timer } from "lucide-react";
import axios from "axios";
import { countries } from "@/lib/countries";
import { calculateTotalValue } from "@/lib/products";
import { conversaoDeCompra, gtag, rastrearCompra } from "@/lib/gtag";

// Máscaras
const formatCpfCnpj = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
};

const formatCep = (value: string) => {
  const v = value.replace(/\D/g, "").slice(0, 8);
  return v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v;
};

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{4})$/, "$1-$2");
  }
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})$/, "$1-$2");
};

// Validador de CPF
const isValidCpf = (cpf: string) => {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

type PaymentMethod = "CREDIT_CARD" | "PIX";

export default function CheckoutForm({
  price,
  productName,
  productKey,
  // "AW-000000/RÓTULO" da conversão de Compra deste produto no Google Ads.
  // Quem não informa (as telas legadas / e /low, que não vêm do banco) cai na
  // conversão padrão da conta — elas também vendem, e sem isso a venda não
  // chegaria no Ads.
  conversaoGoogle = conversaoDeCompra(),
}: {
  price: number;
  productName: string;
  productKey: string;
  conversaoGoogle?: string | null;
}) {
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [loading, setLoading] = useState(false);

  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos

  // Rastreio do Facebook: Iniciar Checkout (Dispara assim que a tela abre)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq('track', 'InitiateCheckout', {
          value: price,
          currency: 'BRL',
          content_name: productName
        });
      }
    } catch (e) {
      console.warn("Erro ao disparar Pixel (provável AdBlock):", e);
    }

    // O mesmo momento, no GA4. Não checa se o gtag.js já carregou: o helper
    // enfileira o evento e o Google processa a fila quando o script chega.
    gtag("event", "begin_checkout", {
      value: price,
      currency: "BRL",
      items: [{ item_id: productKey, item_name: productName, price, quantity: 1 }],
    });
  }, [price, productName, productKey]);

  // Timer e Polling para PIX
  useEffect(() => {
    if (pixData && !isSuccess && !isExpired && paymentId) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const poller = setInterval(async () => {
        try {
          const res = await axios.get(`/api/checkout/status?paymentId=${paymentId}`);
          if (res.data.status === 'PAID') {
            setIsSuccess(true);
            clearInterval(poller);
            clearInterval(timer);
          }
        } catch {}
      }, 3000);

      return () => {
        clearInterval(timer);
        clearInterval(poller);
      };
    }
  }, [pixData, isSuccess, isExpired, paymentId]);

  const checkPaymentManual = async () => {
    if (!paymentId) return;
    try {
      const res = await axios.get(`/api/checkout/status?paymentId=${paymentId}`);
      if (res.data.status === 'PAID') {
        setIsSuccess(true);
      } else {
        alert("Pagamento ainda não identificado. Aguarde alguns segundos e tente novamente.");
      }
    } catch {
      alert("Erro ao checar pagamento.");
    }
  };

  // Dados do cliente
  const [customer, setCustomer] = useState({ name: "", email: "", cpfCnpj: "", phone: "" });
  const [countryCode, setCountryCode] = useState("+55");

  // Dados do Cartão
  const [card, setCard] = useState({ number: "", holderName: "", expiryMonth: "", expiryYear: "", ccv: "" });
  const [installments, setInstallments] = useState(1);

  // Endereço de cobrança do titular. O antifraude do Asaas e a própria
  // bandeira usam esses dados na decisão de aprovar; até aqui iam valores
  // fixos, o que derrubava a taxa de aprovação sem deixar rastro.
  const [endereco, setEndereco] = useState({ cep: "", numero: "" });

  // O que vai ser cobrado de fato — mesmo critério que api/checkout usa pra
  // criar a cobrança: no cartão, o total com juros do parcelamento escolhido;
  // no Pix, sempre o preço à vista.
  //
  // Fica num lugar só de propósito. O parcelamento continua selecionado ao
  // trocar pro Pix (o <select> apenas some da tela), e enquanto o botão fazia
  // essa conta por fora ele anunciava o total parcelado numa compra que ia ser
  // cobrada à vista.
  const valorCobrado = method === "CREDIT_CARD" ? calculateTotalValue(price, installments) : price;

  // Compra confirmada → Google (GA4 + Ads).
  //
  // Cobre de uma vez os três caminhos que chegam em isSuccess (cartão
  // aprovado, polling do Pix e o "já realizei o pagamento"), em vez de
  // repetir o disparo em cada um deles.
  //
  // Pix apenas GERADO fica de fora de propósito: o lance automático do Google
  // Ads é calibrado por este sinal, e ensiná-lo com Pix que nunca foi pago
  // encarece a campanha. O Meta segue contando na geração — as duas contagens
  // divergem por decisão, não por esquecimento.
  useEffect(() => {
    if (!isSuccess || !paymentId) return;
    try {
      // Um F5 na tela de sucesso não repete a conversão.
      const chave = `google_purchase_${paymentId}`;
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "true");
    } catch {
      // Navegador sem sessionStorage: dispara mesmo assim — o transaction_id
      // ainda deduplica do lado do Google.
    }

    rastrearCompra({
      paymentId,
      valor: valorCobrado,
      productKey,
      productName,
      conversao: conversaoGoogle,
    });
  }, [isSuccess, paymentId, valorCobrado, productKey, productName, conversaoGoogle]);

  // Tratamento da Data de Validade (MM/YY ou MM/YYYY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length >= 2) {
      setCard({ ...card, expiryMonth: val.substring(0, 2), expiryYear: val.substring(2, 6) });
    } else {
      setCard({ ...card, expiryMonth: val, expiryYear: "" });
    }
  };
  const displayExpiry = card.expiryMonth + (card.expiryYear ? `/${card.expiryYear}` : "");

  // Rastreio silencioso (Carrinho abandonado)
  const handleBlur = async () => {
    if (!customer.email && !customer.phone && !customer.name) return;
    try {
      const utms = {
        source: searchParams?.get('utm_source') || "",
        medium: searchParams?.get('utm_medium') || "",
        campaign: searchParams?.get('utm_campaign') || "",
        term: searchParams?.get('utm_term') || "",
        content: searchParams?.get('utm_content') || "",
      };
      const res = await axios.post('/api/checkout-session', {
        ...customer,
        sessionId,
        productName,
        productKey,
        utms
      });
      if (res.data.sessionId && !sessionId) {
        setSessionId(res.data.sessionId);
      }
    } catch {
      // Ignora erro silenciosamente
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de Email
    if (!customer.email.includes("@") || !customer.email.includes(".")) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }

    // Validação de CPF
    const rawCpf = customer.cpfCnpj.replace(/\D/g, '');
    if (rawCpf.length === 11 && !isValidCpf(rawCpf)) {
      alert("O CPF informado é inválido. Por favor, verifique.");
      return;
    }

    // Endereço de cobrança: obrigatório só no cartão (o Pix não usa)
    if (method === "CREDIT_CARD") {
      if (endereco.cep.replace(/\D/g, "").length !== 8) {
        alert("Informe um CEP válido, com 8 dígitos.");
        return;
      }
      if (!endereco.numero.trim()) {
        alert("Informe o número do endereço de cobrança do cartão.");
        return;
      }
    }

    // Captura as UTMs da URL
    const utms = {
      source: searchParams?.get('utm_source') || "",
      medium: searchParams?.get('utm_medium') || "",
      campaign: searchParams?.get('utm_campaign') || "",
      term: searchParams?.get('utm_term') || "",
      content: searchParams?.get('utm_content') || "",
    };

    setLoading(true);

    try {
      const payload = {
        sessionId,
        paymentMethod: method,
        customerData: {
          ...customer,
          phone: `${countryCode}${customer.phone.replace(/\D/g, "")}`,
          postalCode: endereco.cep.replace(/\D/g, ""),
          addressNumber: endereco.numero.trim(),
          fbp: getCookie('_fbp') || searchParams?.get('fbp') || null,
          fbc: getCookie('_fbc') || searchParams?.get('fbc') || null
        },
        paymentData: {
          productKey,
          productName,
          installments,
          creditCard: method === "CREDIT_CARD" ? card : undefined,
          utms, // Repassa as UTMs para o backend
        }
      };

      const response = await axios.post("/api/checkout", payload);

      if (response.data.success) {
        setPaymentId(response.data.paymentId);
        
        if (method === "PIX") {
          // Dispara a conversão de Purchase para o Facebook (Pix Gerado)
          try {
            if (typeof window !== "undefined" && (window as any).fbq) {
              (window as any).fbq('track', 'Purchase', { value: price, currency: 'BRL', content_name: productName });
            }
          } catch (e) {
            console.warn("Erro ao disparar Pixel (provável AdBlock):", e);
          }

          setPixData({
            qrCodeBase64: response.data.qrCode.encodedImage,
            copyPaste: response.data.qrCode.payload,
          });
          setTimeLeft(900);
          setIsExpired(false);
        } else {
          // O Purchase do Cartão será disparado de forma segura no frontend
          try {
            const trackKey = `fbq_purchase_${productKey}`;
            if (!sessionStorage.getItem(trackKey)) {
              if (typeof window !== "undefined" && (window as any).fbq) {
                (window as any).fbq('track', 'Purchase', { value: price, currency: 'BRL', content_name: productName });
                sessionStorage.setItem(trackKey, "true");
              }
            }
          } catch {}
          setIsSuccess(true);
        }
      }
    } catch (err: unknown) {
      const error = err as any;
      console.error(error);
      alert(error.response?.data?.details?.errors?.[0]?.description || "Erro ao processar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Aprovado!</h2>
        <p className="text-gray-600 mb-6 font-medium">Sua compra foi confirmada com sucesso.</p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-left border border-gray-100 mb-6">
          <p className="font-semibold mb-1">🎉 Acesso Liberado!</p>
          <p>Enviamos as instruções de acesso para o seu e-mail. Verifique também a caixa de spam.</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="text-center py-8 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tempo Esgotado</h2>
        <p className="text-gray-600 mb-6">O tempo limite para o pagamento deste Pix expirou.</p>
        <button 
          onClick={() => {
            setPixData(null);
            setIsExpired(false);
            setPaymentId(null);
          }}
          className="btn-primary w-full"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (pixData) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="text-center py-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Pagamento via Pix</h3>
        <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code abaixo no app do seu banco:</p>

        <div className="flex justify-center mb-4">
          <img
            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
            alt="QR Code Pix"
            className="w-48 h-48 border border-gray-200 rounded-xl shadow-sm p-2"
          />
        </div>

        <div className="flex justify-center items-center gap-2 mb-6 text-[var(--theme-accent)] font-semibold bg-[var(--theme-accent)]/10 py-2 px-4 rounded-full mx-auto w-fit">
          <Timer size={18} />
          <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>

        <div className="w-full text-left mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ou código Copia e Cola:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={pixData.copyPaste}
              className="input-field text-xs text-gray-500 truncate bg-gray-50"
            />
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(pixData.copyPaste); alert("Copiado!"); }}
              className="px-4 py-2 bg-[var(--theme-accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Copiar
            </button>
          </div>
        </div>

        <button 
          onClick={checkPaymentManual}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 underline decoration-gray-300 underline-offset-4"
        >
          Já realizei o pagamento
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCheckout} className="space-y-6">
      {/* 1. Dados Pessoais */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="text-[var(--theme-accent)]" size={20} /> Seus Dados
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label-text">Nome Completo</label>
            <input required type="text" className="input-field" placeholder="João da Silva" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} onBlur={handleBlur} />
          </div>
          <div>
            <label className="label-text">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input required type="email" className="input-field pl-10" placeholder="joao@email.com" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} onBlur={handleBlur} />
            </div>
          </div>
          <div>
            <label className="label-text">Telefone / WhatsApp</label>
            <div className="relative flex">
              <select
                className="absolute left-0 top-0 h-full w-[100px] bg-transparent border-r border-gray-200 text-gray-700 text-sm font-medium focus:outline-none pl-3 pr-2 z-10 appearance-none cursor-pointer"
                value={countryCode}
                onChange={e => {
                  setCountryCode(e.target.value);
                  setCustomer({ ...customer, phone: "" });
                }}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.dial_code}>
                    {country.code} ({country.dial_code})
                  </option>
                ))}
              </select>
              <input required type="tel" className="input-field pl-[110px]" placeholder={countryCode === "+55" ? "(11) 99999-9999" : "Número do telefone"} maxLength={16} value={customer.phone} onChange={e => setCustomer({ ...customer, phone: countryCode === "+55" ? formatPhone(e.target.value) : e.target.value.replace(/[^\d+ ]/g, "") })} onBlur={handleBlur} />
            </div>
          </div>
          <div>
            <label className="label-text">CPF ou CNPJ</label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input required type="text" className="input-field pl-10" placeholder="000.000.000-00" maxLength={18} value={customer.cpfCnpj} onChange={e => setCustomer({ ...customer, cpfCnpj: formatCpfCnpj(e.target.value) })} onBlur={handleBlur} />
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* 2. Método de Pagamento */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Como você prefere pagar?</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMethod("CREDIT_CARD")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === "CREDIT_CARD"
                ? "border-[var(--theme-accent)] bg-[var(--theme-accent)]/5 text-[var(--theme-accent)]"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
          >
            <CreditCard size={24} className="mb-2" />
            <span className="font-semibold text-sm">Cartão de Crédito</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod("PIX")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${method === "PIX"
                ? "border-[#10B981] bg-[#10B981]/5 text-[#10B981]"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
          >
            <QrCode size={24} className="mb-2" />
            <span className="font-semibold text-sm">Pix</span>
            <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded-full mt-1">Aprovação imediata</span>
          </button>
        </div>

        {/* Formulário do Cartão */}
        {method === "CREDIT_CARD" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div>
              <label className="label-text">Número do Cartão</label>
              <input required type="text" maxLength={16} className="input-field tracking-widest font-mono text-lg" placeholder="0000 0000 0000 0000" value={card.number} onChange={e => setCard({ ...card, number: e.target.value.replace(/\D/g, '') })} />
            </div>

            <div>
              <label className="label-text">Nome Impresso no Cartão</label>
              <input required type="text" className="input-field uppercase" placeholder="JOAO S SILVA" value={card.holderName} onChange={e => setCard({ ...card, holderName: e.target.value.toUpperCase() })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Validade (MM/AA)</label>
                <input required type="text" maxLength={5} className="input-field text-center tracking-widest font-mono" placeholder="MM/AA" value={displayExpiry} onChange={handleExpiryChange} />
              </div>
              <div>
                <label className="label-text">CVC</label>
                <input required type="text" maxLength={4} className="input-field text-center tracking-widest font-mono" placeholder="123" value={card.ccv} onChange={e => setCard({ ...card, ccv: e.target.value.replace(/\D/g, '') })} />
              </div>
            </div>

            {/* Endereço de cobrança — o banco emissor confere estes dados na
                autorização. Só CEP e número: é o que o Asaas exige, e cada
                campo a mais aqui derruba conversão. */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label-text">CEP de cobrança</label>
                <input required type="text" inputMode="numeric" maxLength={9} className="input-field font-mono" placeholder="00000-000" value={endereco.cep} onChange={e => setEndereco({ ...endereco, cep: formatCep(e.target.value) })} />
              </div>
              <div>
                <label className="label-text">Número</label>
                <input required type="text" maxLength={10} className="input-field" placeholder="123" value={endereco.numero} onChange={e => setEndereco({ ...endereco, numero: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              É o endereço da fatura do cartão. Ajuda o banco a aprovar a compra.
            </p>

            <div>
              <label className="label-text">Opções de Parcelamento</label>
              <select
                className="input-field appearance-none bg-no-repeat bg-right pr-10"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")' }}
                value={installments}
                onChange={e => setInstallments(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                  // Mesma conta que o servidor faz ao criar a cobrança
                  // (lib/products): o total exibido é o total cobrado — e é
                  // ele que vai como `value` da conversão do Google.
                  const total = calculateTotalValue(price, num);
                  const val = total / num;

                  return (
                    <option key={num} value={num}>
                      {num}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} {num === 1 ? 'à vista' : `(Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)})`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

      </div>

      <button type="submit" disabled={loading} className="btn-primary mt-8">
        {loading ? (
          <><Loader2 className="animate-spin mr-2" /> Processando...</>
        ) : (
          <>
            Finalizar Compra - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorCobrado)}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
      </p>
    </form>
  );
}
