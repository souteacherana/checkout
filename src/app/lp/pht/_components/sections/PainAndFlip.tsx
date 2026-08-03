"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGsapAoAproximar } from "../useGsapAoAproximar";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function PainAndFlip() {
  const container = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useGsapAoAproximar(container, () => {
      gsap.fromTo(
        textRef.current,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: container.current,
            start: "top 60%",
            end: "bottom 80%",
            scrub: 1,
          }
        }
      );
  });

  return (
    <section 
      ref={container}
      className="relative py-20 md:py-40 px-6 z-10 flex flex-col items-center justify-center min-h-[50vh] md:min-h-[70vh]"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black via-ink-900 to-black z-0 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 
          ref={textRef}
          className="font-serif text-[2.5rem] md:text-7xl lg:text-8xl text-white leading-[1.1] mb-10 md:mb-12"
        >
          Chega de ser o <br/>
          <span className="text-zinc-500 italic line-through decoration-gold-500 decoration-4 md:decoration-8">professor baratinho</span> <br/>
          <span className="text-gold-500">da internet.</span>
        </h2>
        
        <p className="text-lg md:text-2xl text-zinc-400 font-light mb-12">
          Bora mudar essa história de vez?
        </p>
      </div>
    </section>
  );
}
