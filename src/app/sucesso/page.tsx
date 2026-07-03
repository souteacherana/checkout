/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { THEMES } from "@/lib/products";
import { Suspense, useEffect } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const productKey = searchParams?.get("product") || "DEFAULT";
  const workshopConfig = THEMES[productKey] || THEMES["DEFAULT"];

  useEffect(() => {
    // Evita duplicidade se o cliente apertar F5 na página de sucesso
    const trackKey = `fbq_purchase_${productKey}`;
    if (!sessionStorage.getItem(trackKey)) {
      try {
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', { 
            value: workshopConfig.price, 
            currency: 'BRL',
            content_name: workshopConfig.title
          });
          sessionStorage.setItem(trackKey, "true");
        }
      } catch (e) {
        console.warn("Erro ao disparar Pixel (provável AdBlock):", e);
      }
    }
  }, [productKey, workshopConfig.price, workshopConfig.title]);

  return (
    <main
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-[var(--theme-accent)] selection:text-white"
      style={
        workshopConfig.accentColor
          ? ({
              "--theme-accent": workshopConfig.accentColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
          Pagamento Aprovado!
        </h1>
        
        <p className="text-gray-600 mb-8 font-medium">
          Sua compra do <strong>{workshopConfig.title}</strong> foi confirmada com sucesso.
        </p>

        <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100 text-sm text-gray-600 text-left">
          <p className="mb-2">🎉 <strong>Acesso Liberado!</strong></p>
          <p>
            Enviamos um e-mail com as instruções de acesso ao seu produto.
            Certifique-se de verificar sua caixa de Spam.
          </p>
        </div>

        <button 
          onClick={() => window.location.href = "https://teacherana.com.br"}
          className="w-full py-4 bg-[var(--theme-accent)] text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
        >
          Voltar para o site principal
        </button>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
