"use client";

import { CircularGallery, type GalleryItem } from "../ui/circular-gallery-2";

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

      {/* Galeria 3D Circular WebGL */}
      <div className="relative h-[420px] md:h-[680px] w-full">
        <CircularGallery
          items={galleryItems}
          bend={3}
          borderRadius={0.05}
          scrollSpeed={2}
          scrollEase={0.05}
        />
      </div>
    </section>
  );
}
