import CheckoutLink from "./CheckoutLink";
import CountdownGrid from "./CountdownGrid";

export default function FinalCta() {
  return (
    <section className="final-cta-section" id="inscricao-final">
      <div className="wrap">

        <div className="final-cta-inner">
          <span className="eyebrow-tag">
            <span className="pulse-dot"></span>
            Dia 19 de Setembro às 15h
          </span>

          <h2 className="display-title">
            Chegou a hora de transformar sua turma em um <em>produto pedagógico forte e lucrativo</em>.
          </h2>

          <p>
            Pare de tomar decisões no improviso. Garanta sua vaga no workshop ao vivo e comece a estruturar turmas que
            entregam resultado para o aluno e lucro para você.
          </p>

          <CountdownGrid />

          <CheckoutLink
            className="btn-cta-primary"
            style={{ fontSize: '16px', padding: '20px 40px' }}
            location="cta-final"
          >
            Quero Participar do Turmas na Prática <span className="btn-arrow" aria-hidden="true">→</span>
          </CheckoutLink>

          <div className="final-subtext">
            AO VIVO NO ZOOM &bull; GRAVAÇÃO LIBERADA &bull; MATERIAL DE APOIO
          </div>

        </div>

      </div>
    </section>
  );
}
