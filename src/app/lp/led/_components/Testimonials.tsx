"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEPOIMENTOS } from "../_lib/assets";

/**
 * Carrossel de depoimentos.
 *
 * Porte direto do script inline do LED7.html, com o mesmo comportamento:
 * setas, dots, barra de progresso, teclado (← →) e re-sincronização quando a
 * pessoa arrasta com o dedo. O deslocamento continua sendo scroll real do
 * container (scroll-snap no CSS), não transform — assim o arrasto nativo
 * segue funcionando e o teclado é um extra, não a única forma de navegar.
 *
 * O total vem do array, e não de uma constante escrita à mão: no HTML
 * original o rótulo estava fixo em "/ 2" enquanto havia 3 cards no ar.
 */
export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const total = DEPOIMENTOS.length;

  const irPara = useCallback(
    (indice: number) => {
      const track = trackRef.current;
      if (!track) return;

      const alvo = Math.max(0, Math.min(total - 1, indice));
      const card = track.children[alvo] as HTMLElement | undefined;
      if (!card) return;

      // Posição do card DENTRO do track. O script original usava
      // card.offsetLeft, que mede a partir do offsetParent — e como o track é
      // position: static, o offsetParent acaba sendo o <main>, não ele. A
      // conta saía 121px adiantada (a margem do .wrap), o bastante pra cada
      // salto parar com o card torto e o scroll-snap ter que consertar.
      const posicaoNoTrack =
        card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;

      // Centraliza o card na janela do track, como fazia o script original.
      track.scrollTo({
        left: posicaoNoTrack - (track.clientWidth - card.clientWidth) / 2,
        behavior: "smooth",
      });
      setAtual(alvo);
    },
    [total]
  );

  // Quem arrasta com o dedo não passa por irPara: sem isto os dots e a barra
  // ficariam parados no card anterior.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let timer: ReturnType<typeof setTimeout>;
    const aoRolar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const caixa = track.getBoundingClientRect();
        const centro = caixa.left + caixa.width / 2;

        let maisPerto = 0;
        let menorDistancia = Infinity;
        Array.from(track.children).forEach((filho, i) => {
          const r = (filho as HTMLElement).getBoundingClientRect();
          const distancia = Math.abs(r.left + r.width / 2 - centro);
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            maisPerto = i;
          }
        });
        setAtual(maisPerto);
      }, 120);
    };

    track.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      clearTimeout(timer);
      track.removeEventListener("scroll", aoRolar);
    };
  }, []);

  return (
    <section className="depoimentos" id="depoimentos">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="sec-num">02 — DEPOIMENTOS</div>
            <h2 className="sec-title">
              Depoimentos de teachers que já <em>transformaram seus negócios</em>!
            </h2>
          </div>
          <div className="carousel-controls">
            <button
              type="button"
              className="carousel-btn"
              onClick={() => irPara(atual - 1)}
              disabled={atual === 0}
              aria-label="Depoimento anterior"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M10 3 5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="carousel-dots" id="carousel-dots">
              {DEPOIMENTOS.map((d, i) => (
                <button
                  type="button"
                  key={d.nome}
                  className={`carousel-dot${i === atual ? " active" : ""}`}
                  onClick={() => irPara(i)}
                  aria-label={`Depoimento ${i + 1}`}
                  aria-current={i === atual}
                />
              ))}
            </div>
            <button
              type="button"
              className="carousel-btn"
              onClick={() => irPara(atual + 1)}
              disabled={atual === total - 1}
              aria-label="Próximo depoimento"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="carousel-track-wrap">
          <div
            className="carousel-track"
            id="carousel-track"
            ref={trackRef}
            tabIndex={0}
            role="group"
            aria-label="Depoimentos"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                irPara(atual - 1);
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                irPara(atual + 1);
              }
            }}
          >
            {DEPOIMENTOS.map((d) => (
              <article className="testimonial" key={d.nome}>
                <div className="t-photo">
                  <Image
                    src={d.foto.src}
                    alt={d.foto.alt}
                    width={d.foto.width}
                    height={d.foto.height}
                    sizes="(max-width: 960px) 100vw, 320px"
                  />
                </div>
                <div className="t-body">
                  <div className="t-highlight">
                    <span className="t-highlight-mark">{d.destaque}</span>
                  </div>
                  <div className="t-journey">
                    <div className="t-stage">
                      <div className="t-stage-label">Antes</div>
                      <p>{d.antes}</p>
                    </div>
                    <div className="t-stage">
                      <div className="t-stage-label t-stage-label-gold">Depois</div>
                      <p>{d.depois}</p>
                    </div>
                  </div>
                  <footer className="t-foot">
                    <div className="t-name">{d.nome}</div>
                    <div className="t-meta">{d.papel}</div>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="carousel-progress" aria-hidden="true">
          <div
            className="carousel-progress-bar"
            id="carousel-progress-bar"
            style={{ width: `${((atual + 1) / total) * 100}%` }}
          />
          <div className="carousel-progress-label">
            <span id="carousel-idx-label">{atual + 1}</span>{" "}
            <span id="carousel-total-label">/ {total}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
