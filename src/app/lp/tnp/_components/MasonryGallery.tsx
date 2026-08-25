import Image from "next/image";
import { DEPOIMENTOS } from "../_lib/assets";

export default function MasonryGallery() {
  return (
    <section className="testimonials-section" id="depoimentos">
      <div className="wrap">

        <div className="section-head">
          <h2 className="section-title display-title">
            Professores que pararam de improvisar e <em>tratam suas aulas como um negócio</em>
          </h2>
          <p className="section-subtitle">
            Veja os resultados de quem implementou método, organizou o pedagógico e transformou turmas em produtos
            escaláveis e lucrativos.
          </p>
        </div>

        <div className="masonry-gallery">
          {DEPOIMENTOS.map((img) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              width={img.width}
              height={img.height}
              loading="lazy"
              /* 3 colunas em ≥1024, 2 até 1023, 1 até 639 */
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 373px"
            />
          ))}
        </div>

      </div>
    </section>
  );
}
