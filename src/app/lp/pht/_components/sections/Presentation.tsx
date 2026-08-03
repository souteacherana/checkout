"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGsapAoAproximar } from "../useGsapAoAproximar";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const discoveries = [
  "Por que você ainda cobra menos do que vale (e como parar com isso urgente)",
  "Como sair do ciclo de “aula barata e agenda cheia” e virar referência",
  "A fórmula simples pra cobrar R$100, R$150 ou mais por aula sem culpa",
  "Como mostrar valor antes mesmo do aluno perguntar o preço",
  "O que muda na sua comunicação, posicionamento e atendimento pra ser visto como premium",
  "Como deixar de ser o plano B de quem não pode pagar escola e virar o plano A de quem quer resultado",
  "Como montar um serviço que te valorize e que o aluno sinta orgulho de pagar"
];

export default function Presentation() {
  const container = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGsapAoAproximar(container, () => {
      gsap.fromTo(
        titleRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: container.current,
            start: "top 90%",
          }
        }
      );

      if (gridRef.current) {
        const cards = gridRef.current.children;
        gsap.fromTo(
          cards,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.05,
            ease: "power2.out",
            scrollTrigger: {
              trigger: gridRef.current,
              start: "top 85%",
            }
          }
        );
      }
  });

  return (
    <section 
      ref={container}
      className="relative py-16 md:py-32 px-6 bg-transparent z-10"
    >
      <div className="max-w-6xl mx-auto">
        <h2 
          ref={titleRef}
          className="font-serif text-4xl sm:text-5xl md:text-6xl text-white mb-10 md:mb-20 opacity-0 text-center leading-tight text-balance"
        >
          O que você vai <span className="text-gold-500 italic">descobrir</span> <br/>
          nesse workshop
        </h2>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {discoveries.map((text, index) => (
            <div 
              key={index} 
              className="group p-6 md:p-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold-500/30 transition-all duration-500 opacity-0 flex flex-col justify-between"
            >
              <div className="text-gold-500/50 font-serif text-4xl md:text-5xl mb-4 md:mb-6 group-hover:text-gold-400 transition-colors">
                {String(index + 1).padStart(2, '0')}
              </div>
              <p className="text-base md:text-xl text-zinc-300 font-light leading-relaxed group-hover:text-white transition-colors">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
