/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import CheckoutForm from "@/components/CheckoutForm";
import { ShieldCheck } from "lucide-react";

import { THEMES } from "@/lib/products";

export default function Home() {
  // Pega a variável de ambiente (do Vercel ou .env local)
  const themeKey = process.env.WORKSHOP_THEME || "DEFAULT";

  // Pega as configs baseadas na key ou cai no default
  const workshopConfig = THEMES[themeKey] || THEMES["DEFAULT"];

  return (
    <main
      className="min-h-screen pb-12 pt-6 px-4 sm:px-6 flex flex-col items-center selection:bg-[var(--theme-accent)] selection:text-white"
      style={
        workshopConfig.accentColor
          ? ({
            "--theme-accent": workshopConfig.accentColor,
            "--theme-accent-hover": workshopConfig.accentColorHover,
          } as React.CSSProperties)
          : undefined
      }
    >
      <div className="w-full max-w-lg mx-auto">
        {/* Header Simples de Alta Conversão */}
        <header className="mb-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-[var(--theme-accent)]/10 rounded-full mb-2 text-[var(--theme-accent)]">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Finalize sua inscrição
          </h1>
          <p className="text-gray-500 font-medium text-sm">
            Pagamento 100% seguro e criptografado
          </p>
        </header>

        {/* Banner do Workshop (Bem "apertado" do tamanho dos campos) */}
        {workshopConfig.imageSrc && (
          <div className="w-full h-32 sm:h-36 mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
            <img
              src={workshopConfig.imageSrc}
              alt={`Banner do ${workshopConfig.title}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Resumo do Pedido */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Produto</p>
            <h2 className="font-bold text-gray-900 line-clamp-1">{workshopConfig.title}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p>
            <p className="font-bold text-xl text-[var(--theme-accent)]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(workshopConfig.price)}
            </p>
          </div>
        </div>

        {/* Formulário de Checkout */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
          <Suspense fallback={<div className="text-center py-4 text-gray-500">Carregando formulário...</div>}>
            <CheckoutForm price={workshopConfig.price} productName={workshopConfig.title} productKey={themeKey} />
          </Suspense>
        </div>

        {/* Badges de Segurança */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-gray-400">
          <span className="flex items-center gap-1.5"><ShieldCheck size={16} /> Compra Segura</span>
          <span>•</span>
          <span>Ambiente Criptografado</span>
        </div>
      </div>
    </main>
  );
}
