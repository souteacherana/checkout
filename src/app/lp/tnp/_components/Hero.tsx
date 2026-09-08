import UrgencyClock from "./UrgencyClock";
import { ZOOM_SVG } from "../_lib/assets";

export default function Hero() {
  return (
    <>
      <div className="urgency-bar" role="region" aria-label="Aviso de urgência">
        <div className="urgency-inner">
          <span className="urgency-flag">
            <span className="pulse-live" aria-hidden="true"></span>
            <b>19 DE SETEMBRO</b>
          </span>
          <span className="urgency-text">
            WORKSHOP AO VIVO NO ZOOM · VAGAS LIMITADAS
          </span>
          <UrgencyClock />
        </div>
        <div className="urgency-progress" aria-hidden="true">
          <div className="urgency-progress-fill"></div>
        </div>
      </div>
      
      <section className="hero" id="topo">
        <div className="wrap hero-inner">
          <div className="hero-content">

            <div className="hero-pretitle">
              <span className="eyebrow-tag">
                <span className="pulse-dot"></span>
                19 de Setembro · 15h · Ao Vivo no Zoom
              </span>
            </div>

            <h1 className="hero-headline display-title">
              Aprenda faturar acima de <span className="highlight-accent">R$15k e menos de 15h/semana</span>
              com turmas que funcionam de verdade!
            </h1>

            <div className="hero-event-immersion">
              Em uma imersão prática de 3 horas, você, teacher, vai aprender a estruturar turmas pedagogicamente fortes,
              que entreguem resultados de verdade para você e o seu aluno, aumentando sua RETENÇÃO e te fazendo faturar
              acima de R$ 15k com uma carga horária menor que 15h/semana.
            </div>

            <div className="cta-action-wrap">
              {/* Leva pra dobra de oferta, não direto pro checkout: quem está
                  no topo ainda não viu preço nem o que está incluso.
                  De propósito NÃO é o CheckoutLink: rolar a página não é
                  iniciar compra, e disparar InitiateCheckout aqui encheria o
                  evento de quem nunca chegou no ticket — o número que o
                  tráfego usa pra medir intenção real perderia o sentido.
                  A rolagem suave e a folga da navbar já vêm do tnp.css
                  (scroll-behavior e scroll-padding-top no html). */}
              <a className="btn-cta-primary" id="hero-main-cta" href="#oferta">
                Quero Participar do Workshop <span className="btn-arrow" aria-hidden="true">→</span>
              </a>
            </div>

            <div className="hero-meta-grid">
              <div className="hero-meta-item">
                <div className="hero-meta-label">Data</div>
                <div className="hero-meta-value">19 de Setembro</div>
              </div>
              <div className="hero-meta-item">
                <div className="hero-meta-label">Horário</div>
                <div className="hero-meta-value">15h (Brasília)</div>
              </div>
              <div className="hero-meta-item">
                <div className="hero-meta-label">Duração</div>
                <div className="hero-meta-value">3h Práticas</div>
              </div>
              <div className="hero-meta-item">
                <div className="hero-meta-label">Formato</div>
                <div className="hero-meta-value">
                  {/* O alt preserva o texto que a logo substituiu. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="zoom-logo" src={ZOOM_SVG} alt="Ao Vivo no Zoom" /></div>
              </div>
            </div>

          </div>

        </div>
      </section>
    </>
  );
}
