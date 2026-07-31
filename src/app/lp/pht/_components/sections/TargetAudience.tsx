"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircle2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const items = [
  "Cobra menos do que merece por medo de perder aluno",
  "Já tentou subir o preço e travou na hora de comunicar",
  "Se sente inseguro sobre o próprio trabalho e vive se comparando",
  "Quer ser reconhecido como autoridade, não como mais um",
  "Quer faturar mais sem trabalhar o dobro",
  "Quer alunos que não somem, não choram preço e valorizam o que você entrega"
];

export default function TargetAudience() {
  const container = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: container.current,
            start: "top 80%",
          }
        }
      );

      // List items animation
      if (listRef.current) {
        const items = listRef.current.children;
        gsap.fromTo(
          items,
          { x: -30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: listRef.current,
              start: "top 75%",
            }
          }
        );
      }
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={container}
      className="relative py-16 md:py-32 px-6 bg-transparent z-10 border-t border-white/5"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          ref={titleRef}
          className="font-serif text-4xl sm:text-5xl md:text-6xl text-white mb-10 md:mb-16 opacity-0 text-center md:text-left leading-tight"
        >
          Esse workshop é pra você, <span className="text-gold-500 italic">teacher, que...</span>
        </h2>

        <ul ref={listRef} className="space-y-6">
          {items.map((item, index) => (
            <li 
              key={index} 
              className="flex items-start gap-6 group opacity-0"
            >
              <div className="mt-1 flex-shrink-0 text-gold-500">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-base sm:text-lg md:text-2xl text-zinc-300 font-light leading-snug group-hover:text-white transition-colors duration-300">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
