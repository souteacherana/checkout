"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Calendar, Clock, Video, CheckCircle2, ShieldCheck, BookOpen } from "lucide-react";
import BorderGlow from "../ui/BorderGlow";
import { useCheckoutHref } from "@/lib/landing";

gsap.registerPlugin(ScrollTrigger);

export default function Offer() {
  const container = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // TESTE DE PLATAFORMA: o CTA desta landing aponta pra Eduzz em vez do nosso
  // checkout. Pra voltar ao normal, troque a URL abaixo por "pht".
  // As UTMs continuam sendo repassadas ao destino de qualquer forma.
  const checkoutHref = useCheckoutHref("https://sun.eduzz.com/Q9N2O4GB01");

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animação de entrada dos elementos (texto e card) sem clip-path
      gsap.fromTo(
        ".offer-stagger",
        { 
          y: 60, 
          opacity: 0 
        },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: "expo.out",
          scrollTrigger: {
            trigger: container.current,
            start: "top 75%", // Inicia quando o topo da seção atinge 75% da tela
            toggleActions: "play none none none" // Toca apenas uma vez para não ficar cortando/piscando no scroll reverso
          }
        }
      );
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={container}
      id="oferta"
      className="relative py-24 md:py-32 px-4 md:px-6 z-20 flex justify-center bg-zinc-50 w-full"
    >
      <div 
        ref={contentRef}
        className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
      >
        {/* LADO ESQUERDO: Entregáveis */}
        <div className="flex flex-col text-center lg:text-left">
          
          <h2 className="offer-stagger font-serif text-[2.5rem] leading-[1.1] md:text-6xl text-zinc-900 mb-8">
            Participe do nosso <span className="text-gold-500 italic">Workshop Ao Vivo</span>
          </h2>
          
          <p className="offer-stagger text-zinc-600 text-lg mb-10 leading-relaxed">
            Uma imersão prática para você aprender a se posicionar como um professor premium e atrair alunos que pagam o seu valor real.
          </p>

          <ul className="flex flex-col gap-6 text-left w-full max-w-md mx-auto lg:mx-0">
            <li className="offer-stagger flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center shrink-0 mt-1">
                <Video className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <h4 className="text-zinc-900 font-semibold text-lg mb-1">Acesso ao Vivo no Zoom</h4>
                <p className="text-zinc-500 text-sm">Cerca de 3 horas de conteúdo denso, prático e sem enrolação no dia 22 de agosto.</p>
              </div>
            </li>
            
            <li className="offer-stagger flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 mt-1 shadow-md">
                <CheckCircle2 className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h4 className="text-zinc-900 font-bold text-lg mb-1">Gravação Liberada por 15 Dias</h4>
                <p className="text-zinc-500 text-sm">Assista, revise e anote tudo com calma. O conteúdo fica salvo e disponível para você.</p>
              </div>
            </li>

            <li className="offer-stagger flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center shrink-0 mt-1">
                <BookOpen className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <h4 className="text-zinc-900 font-semibold text-lg mb-1">E-book Exclusivo de Apoio</h4>
                <p className="text-zinc-500 text-sm">Um material complementar para você colocar em prática tudo o que aprendeu.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* LADO DIREITO: Card de Pagamento */}
        <div className="offer-stagger relative">
          <BorderGlow
            edgeSensitivity={40}
            glowColor="43 85% 60%" // Tom dourado aproximado do tailwind gold-500
            backgroundColor="#ffffff" // Fundo branco
            borderRadius={24}
            glowRadius={50}
            glowIntensity={1.5}
            coneSpread={30}
            animated={true}
            colors={['#f59e0b', '#fbbf24', '#fcd34d']} // Tons dourados (amber)
          >
            <div className="p-8 md:p-12 flex flex-col items-center text-center relative overflow-hidden">
              
              {/* Brilho de fundo no card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-gold-500/5 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="flex flex-row justify-center gap-6 mb-10 w-full text-zinc-600 relative z-10">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="w-6 h-6 text-gold-500" />
                  <span className="font-medium text-sm text-zinc-800">22/08</span>
                </div>
                <div className="w-px h-10 bg-zinc-200"></div>
                <div className="flex flex-col items-center gap-2">
                  <Clock className="w-6 h-6 text-gold-500" />
                  <span className="font-medium text-sm text-zinc-800">15h00</span>
                </div>
              </div>

              <div className="text-center mb-10 relative z-10 w-full">
                <p className="text-zinc-500 uppercase tracking-widest text-xs md:text-sm mb-3 font-semibold">Investimento</p>
                <div className="text-6xl md:text-[5.5rem] font-serif text-zinc-900 tracking-tighter">
                  <span className="text-3xl md:text-4xl text-gold-500 align-top mr-2 font-sans font-medium">R$</span>
                  49,90
                </div>
              </div>

              <a
                href={checkoutHref}
                className="group relative inline-flex items-center justify-center gap-3 w-full px-8 py-5 bg-gold-500 text-black font-bold text-lg rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_15px_30px_-10px_rgba(187,156,76,0.5)] relative z-10 mb-6"
              >
                <span className="relative z-10 uppercase tracking-widest">Garantir Meu Ingresso</span>
                <div className="absolute inset-0 bg-gold-400 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0"></div>
              </a>

              {/* Selo de Segurança */}
              <div className="flex items-center justify-center gap-2 text-zinc-500 relative z-10">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Compra 100% Segura</span>
              </div>
              
            </div>
          </BorderGlow>
        </div>

      </div>
    </section>
  );
}
