"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const faqs = [
  {
    question: "As aulas serão gravadas?",
    answer: "Sim! O workshop será transmitido ao vivo no Zoom, mas você terá acesso à gravação por 15 dias para rever quando quiser."
  },
  {
    question: "Serve para professores de qualquer idioma?",
    answer: "Absolutamente. Os princípios de posicionamento, ancoragem de preço e negociação se aplicam para professores particulares de inglês, espanhol, matemática, música e qualquer outra disciplina."
  },
  {
    question: "E se eu não tiver nenhum aluno ainda?",
    answer: "Melhor ainda! Você já vai começar do jeito certo, construindo um posicionamento Premium desde o dia 1, sem precisar passar pelo ciclo de cobrar barato."
  },
  {
    question: "Quais as formas de pagamento?",
    answer: "Você pode pagar via PIX, cartão de crédito ou boleto através da plataforma segura."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="relative py-16 md:py-32 px-6 bg-transparent z-10 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl text-white mb-10 md:mb-16 text-center">
          Dúvidas <span className="text-gold-500 italic">Frequentes</span>
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={clsx(
                  "border rounded-2xl transition-colors duration-300 overflow-hidden",
                  isOpen ? "border-gold-500/50 bg-white/5" : "border-white/10 bg-transparent hover:border-white/20"
                )}
              >
                <button 
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 md:p-8 text-left"
                >
                  <span className="text-base sm:text-lg md:text-xl text-white font-medium pr-8">{faq.question}</span>
                  <ChevronDown className={clsx(
                    "w-6 h-6 text-gold-500 transition-transform duration-300 flex-shrink-0",
                    isOpen && "rotate-180"
                  )} />
                </button>
                <div 
                  className={clsx(
                    "px-6 md:px-8 overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-40 pb-6 md:pb-8 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <p className="text-sm sm:text-base text-zinc-400 font-light leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
