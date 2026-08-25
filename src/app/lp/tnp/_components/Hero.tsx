import CheckoutLink from "./CheckoutLink";
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
              Sua turma não precisa apenas encher. <span className="highlight-accent">Ela precisa funcionar.</span>
            </h1>

            <p className="hero-subheadline">
              Aprenda a estruturar turmas lucrativas, organizadas e pedagogicamente fortes, capazes de entregar resultado
              para o aluno e retenção para o seu negócio.
            </p>

            <div className="hero-event-immersion">
              No dia <b>19 de setembro, às 15h</b>, você vai participar de uma <b>imersão prática de 3 horas</b> para
              aprender a estruturar suas turmas de forma completa: do planejamento pedagógico à organização das aulas, da
              experiência do aluno à construção de uma entrega que faça a turma permanecer, evoluir e gerar lucro.
            </div>

            <div className="cta-action-wrap">
              <CheckoutLink className="btn-cta-primary" id="hero-main-cta" location="hero">
                Quero Participar do Workshop <span className="btn-arrow" aria-hidden="true">→</span>
              </CheckoutLink>
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
