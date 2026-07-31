"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Calendar, Clock, Video } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Componente para a textura de anéis (SVG)
const PatternTexture = () => (
  <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.05]">
    <svg
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid slice"
      className="w-[300%] md:w-full h-full"
    >
      <g stroke="#ffffff" strokeWidth="1" fill="none">
        {/* Linhas guias centrais */}
        <line x1="500" y1="0" x2="500" y2="500" strokeWidth="0.5" />
        <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="0.5" />

        {/* Círculos concêntricos entrelaçados */}
        <circle cx="500" cy="250" r="150" />
        <circle cx="380" cy="250" r="150" />
        <circle cx="260" cy="250" r="150" />
        <circle cx="620" cy="250" r="150" />
        <circle cx="740" cy="250" r="150" />
      </g>
    </svg>
  </div>
);

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const blurBoxRef = useRef<HTMLDivElement>(null);

  // Refs para Imagens
  const anaMobileRef = useRef<HTMLImageElement>(null);
  const anaDesktopLeftRef = useRef<HTMLImageElement>(null);
  const anaDesktopRightRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add({
      isDesktop: "(min-width: 768px)",
      isMobile: "(max-width: 767px)"
    }, (context) => {
      const { isDesktop } = context.conditions as { isDesktop: boolean, isMobile: boolean };

      // Animações comuns a ambos
      gsap.fromTo(bgRef.current, { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 0.5, duration: 2, ease: "power2.out" });
      gsap.fromTo(blurBoxRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, ease: "power3.out", delay: 0.5 });

      if (isDesktop) {
        // Animação inicial desktop
        gsap.fromTo([anaDesktopLeftRef.current, anaDesktopRightRef.current],
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.5, stagger: 0.2, ease: "power3.out", delay: 0.2 }
        );

        // Parallax scroll desktop
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container.current,
            start: "top top",
            end: "+=100%",
            scrub: 1,
          },
        });
        tl.to(bgRef.current, { y: 100, opacity: 0.2, duration: 1 }, 0)
          .to(blurBoxRef.current, { y: -40, opacity: 0, duration: 1 }, 0)
          .to(anaDesktopLeftRef.current, { x: -50, y: -80, opacity: 0, duration: 1 }, 0)
          .to(anaDesktopRightRef.current, { x: 50, y: -80, opacity: 0, duration: 1 }, 0);
      } else {
        // Animação inicial mobile
        gsap.fromTo(anaMobileRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5, ease: "power3.out", delay: 0.2 });

        // Parallax scroll mobile
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container.current,
            start: "top top",
            end: "+=100%",
            scrub: 1,
          },
        });
        tl.to(bgRef.current, { y: 100, opacity: 0.2, duration: 1 }, 0)
          .to(anaMobileRef.current, { y: -80, opacity: 0, duration: 1 }, 0)
          .to(blurBoxRef.current, { y: -40, opacity: 0, duration: 1 }, 0);
      }
    });

    return () => mm.revert();
  }, []);

  return (
    // min-h-dvh (não min-h-screen/100vh): no celular o 100vh ignora a barra do
    // navegador, então a hero ficava mais alta que a tela e empurrava o CTA
    // pra baixo da dobra. O dvh acompanha a área realmente visível.
    <section
      ref={container}
      className="relative min-h-dvh w-full overflow-hidden bg-black flex flex-col justify-center items-center z-10 py-6 md:py-0"
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          ref={bgRef}
          src="https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/FUNDO.png"
          alt="Theatre Background"
          className="w-full h-full object-cover opacity-0"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Textura fixa no fundo */}
      <PatternTexture />

      {/* ============================================================== */}
      {/* IMAGEM DA ANA */}
      {/* ============================================================== */}

      {/* DESKTOP: ANA1 na esquerda, ANA2 na direita */}
      <div className="hidden md:block absolute inset-0 w-full h-full z-20 pointer-events-none">
        <img
          ref={anaDesktopLeftRef}
          src="https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/ANA1.png"
          alt="Teacher Ana"
          className="absolute bottom-0 left-0 h-[85%] lg:h-[95%] w-auto object-contain translate-x-[5%] opacity-0 drop-shadow-2xl"
        />
        <img
          ref={anaDesktopRightRef}
          src="https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/ANA2.png"
          alt="Teacher Ana"
          className="absolute bottom-0 right-0 h-[80%] lg:h-[90%] w-auto object-contain -translate-x-[5%] opacity-0 drop-shadow-2xl"
        />
      </div>

      {/* MOBILE: ANA3 unificada no topo */}
      <div className="md:hidden relative w-full flex justify-center z-20 pointer-events-none mt-1">
        <div className="relative">
          <img
            ref={anaMobileRef}
            src="https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/ANA3.png"
            alt="Teacher Ana"
            className="w-[118vw] max-w-[550px] h-auto object-contain opacity-0 drop-shadow-2xl -mt-10"
          />
          {/* Sombra base da Ana no Mobile para fundir com a caixa de blur */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* CAIXA DE CONTEÚDO (Blur Box) */}
      {/* ============================================================== */}
      <div
        ref={blurBoxRef}
        className="relative z-30 w-[94%] md:w-[85%] max-w-2xl mx-auto backdrop-blur-md bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[3rem] px-4 py-6 md:px-10 md:py-12 text-center shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col items-center opacity-0 -mt-20 md:mt-0"
      >
        {/* Glow interno superior para dar volume na caixa */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-white/20 blur-xl rounded-full"></div>

        {/* Logo do Workshop */}
        <img
          src="https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/PHT.svg"
          alt="PHT Workshop Logo"
          className="h-20 md:h-64 w-auto object-contain mb-4 md:mb-1 drop-shadow-lg"
        />

        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-[4.5rem] leading-[1.05] tracking-tight mb-3 md:mb-8 drop-shadow-2xl">
          <span className="block text-white">COMO COBRAR MAIS</span>
          <span className="block font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-600 italic pr-2 md:pr-4 pb-1">
            SEM PERDER ALUNOS
          </span>
        </h1>

        <p className="text-zinc-300 text-sm sm:text-base md:text-xl font-light max-w-2xl mb-5 md:mb-10 text-balance leading-relaxed">
          Aprenda a se posicionar como um professor premium, atrair alunos que valorizam o seu trabalho e cobrar R$100, R$150 ou mais por aula sem medo de perder alunos.
        </p>

        {/* Informações do Evento */}
        <div className="flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-8 mb-5 md:mb-12">
          <div className="flex items-center gap-1.5 md:gap-2 text-gold-400 font-medium text-[11px] sm:text-xs md:text-sm tracking-widest uppercase">
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            <span>22/08</span>
          </div>
          <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/20 hidden sm:block"></div>
          <div className="flex items-center gap-1.5 md:gap-2 text-gold-400 font-medium text-[11px] sm:text-xs md:text-sm tracking-widest uppercase">
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
            <span>15h</span>
          </div>
          <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white/20 hidden sm:block"></div>
          <div className="flex items-center gap-1.5 md:gap-2 text-gold-400 font-medium text-[11px] sm:text-xs md:text-sm tracking-widest uppercase">
            <Video className="w-4 h-4 md:w-5 md:h-5" />
            <span>100% Online e Ao Vivo</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <a
            href="#oferta"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#oferta')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group relative inline-flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto px-6 md:px-12 py-3.5 md:py-5 bg-gold-500 text-black font-bold text-sm md:text-base lg:text-lg rounded-full overflow-hidden transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_40px_rgba(187,156,76,0.2)]"
          >
            <span className="relative z-10 uppercase tracking-widest">Garantir Meu Ingresso</span>
            <div className="absolute inset-0 bg-white translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
            <span className="relative z-10 group-hover:text-black transition-colors duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </span>
          </a>
          <div className="flex items-center gap-2 text-zinc-400 text-xs md:text-sm">
            <Video className="w-4 h-4 text-gold-500" />
            <span>Gravação disponível por 15 dias</span>
          </div>
        </div>
      </div>
    </section>
  );
}
