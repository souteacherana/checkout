/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, QrCode, User, Mail, CreditCard as IdCard, Loader2 } from "lucide-react";
import axios from "axios";
import { countries } from "@/lib/countries";

// Máscaras
const formatCpfCnpj = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }
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

type PaymentMethod = "CREDIT_CARD" | "PIX";

export default function CheckoutForm({ price, productName, productKey }: { price: number; productName: string; productKey: string }) {
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [loading, setLoading] = useState(false);

  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();

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
  }, [price, productName]);

  // Dados do cliente
  const [customer, setCustomer] = useState({ name: "", email: "", cpfCnpj: "", phone: "" });
  const [countryCode, setCountryCode] = useState("+55");

  // Dados do Cartão
  const [card, setCard] = useState({ number: "", holderName: "", expiryMonth: "", expiryYear: "", ccv: "" });
  const [installments, setInstallments] = useState(1);

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
          phone: `${countryCode}${customer.phone.replace(/\D/g, "")}`
        },
        paymentData: {
          productKey,
          installments,
          creditCard: method === "CREDIT_CARD" ? card : undefined,
          utms, // Repassa as UTMs para o backend
        }
      };

      const response = await axios.post("/api/checkout", payload);

      if (response.data.success) {
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
        } else {
          // O Purchase do Cartão será disparado de forma segura na página de /sucesso
          router.push(`/sucesso?product=${productKey}`);
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

  if (pixData) {
    return (
      <div className="text-center py-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Pagamento via Pix</h3>
        <p className="text-sm text-gray-600 mb-6">Escaneie o QR Code abaixo no app do seu banco:</p>

        <div className="flex justify-center mb-6">
          <img
            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
            alt="QR Code Pix"
            className="w-48 h-48 border border-gray-200 rounded-xl shadow-sm p-2"
          />
        </div>

        <div className="w-full text-left">
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
              className="px-4 py-2 bg-[var(--theme-accent)] text-white rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Copiar
            </button>
          </div>
        </div>
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

            <div>
              <label className="label-text">Opções de Parcelamento</label>
              <select
                className="input-field appearance-none bg-no-repeat bg-right pr-10"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")' }}
                value={installments}
                onChange={e => setInstallments(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                  let val = price;
                  let total = price;

                  if (num > 1) {
                    const i = 0.0249; // Taxa de juros de 2.49% a.m.
                    const n = num;
                    val = price * ((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));
                    total = val * num;
                  }

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
            Finalizar Compra - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              installments === 1
                ? price
                : (price * ((0.0249 * Math.pow(1 + 0.0249, installments)) / (Math.pow(1 + 0.0249, installments) - 1))) * installments
            )}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
      </p>
    </form>
  );
}
