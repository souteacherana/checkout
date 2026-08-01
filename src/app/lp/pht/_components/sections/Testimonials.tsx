"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GalleryItem } from "../ui/circular-gallery-2";

// A galeria é WebGL (ogl): monta 8 texturas, compila shaders e roda um
// requestAnimationFrame contínuo. Carregando junto com a página, isso
// bloqueava a thread principal por vários segundos num celular modesto —
// mesmo estando lá embaixo, fora da tela. Agora o código só é baixado
// quando o visitante se aproxima da seção.
const CircularGallery = dynamic(
  () => import("../ui/circular-gallery-2").then((m) => m.CircularGallery),
  { ssr: false },
);

const testimonialImages = [
  "/lp/pht/images/depo/didio.jpg",
  "/lp/pht/images/depo/junara.jpg",
  "/lp/pht/images/depo/matlima.jpg",
  "/lp/pht/images/depo/miura.jpg",
  "/lp/pht/images/depo/natfranco.jpg",
  "/lp/pht/images/depo/paula.jpg",
  "/lp/pht/images/depo/tereza.jpg",
  "/lp/pht/images/depo/youshine.jpg",
];

const galleryItems: GalleryItem[] = testimonialImages.map((imageUrl) => ({
  image: imageUrl,
  text: "",
}));

export default function Testimonials() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [montar, setMontar] = useState(false);

  useEffect(() => {
    const alvo = areaRef.current;
    if (!alvo || montar) return;

    // rootMargin generoso: começa a carregar uma tela antes de aparecer,
    // então a galeria já está pronta quando o visitante chega nela.
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMontar(true);
          obs.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    obs.observe(alvo);
    return () => obs.disconnect();
  }, [montar]);

  return (
    <section id="depoimentos" className="relative py-16 md:py-24 bg-transparent z-10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 text-center mb-8">
        <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl text-white leading-tight">
          Depoimentos de teachers que <br className="hidden md:block" /> já <span className="text-gold-500 italic">transformaram seus negócios!</span>
        </h2>
        <p className="mt-4 text-zinc-400 text-base md:text-lg font-light max-w-2xl mx-auto">
          Arraste a galeria 3D para navegar pelas histórias reais de quem aplicou o método PHT.
        </p>
      </div>

      {/* Galeria 3D Circular WebGL — a altura fica reservada desde o início,
          então montar depois não empurra o conteúdo (mantém o CLS em zero) */}
      <div ref={areaRef} className="relative h-[420px] md:h-[680px] w-full">
        {montar && (
          <CircularGallery
            items={galleryItems}
            bend={3}
            borderRadius={0.05}
            scrollSpeed={2}
            scrollEase={0.05}
          />
        )}
      </div>
    </section>
  );
}
