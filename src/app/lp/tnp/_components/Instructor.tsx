import Image from "next/image";
import { ANA_INSTRUTORA } from "../_lib/assets";

export default function Instructor() {
  return (
    <section className="instructor-section" id="sobre-ana">
      <div className="wrap">

        <div className="instructor-grid">

          <div className="instructor-photo-card">
            <Image
              src={ANA_INSTRUTORA.src}
              alt={ANA_INSTRUTORA.alt}
              fill
              loading="lazy"
              sizes="(max-width: 767px) 100vw, 380px"
            />
            <div className="instructor-photo-badge">
              <div className="badge-name">Ana Paula de Araújo</div>
              <div className="badge-role">Fundadora da Rise Educação</div>
            </div>
          </div>

          <div className="instructor-bio">
            <h2 className="display-title">Quem vai te <em>ensinar</em></h2>

            <p>
              Professora de inglês desde 2012, Ana construiu seu próprio negócio de aulas particulares e chegou a faturar
              mais de <b>R$ 12 mil por mês apenas como professora</b>.
            </p>

            <p>
              A experiência de precisar aumentar o faturamento sem continuar lotando a própria agenda foi o que a levou a
              desenvolver modelos mais escaláveis de ensino e, posteriormente, a transformar esse conhecimento em método.
            </p>

            <p>
              Hoje, é fundadora da <b>Rise Educação</b> e mentora de professores particulares de idiomas, ajudando
              profissionais em diferentes estágios a estruturarem negócios mais <b>lucrativos, organizados e
                escaláveis</b>.
            </p>

            <p>
              Com uma comunidade de mais de <b>100 mil professores</b>, Ana já desenvolveu mentorias, workshops, produtos
              educacionais e eventos presenciais voltados exclusivamente para transformar bons professores em bons
              empreendedores da educação.
            </p>

            <div className="instructor-highlights-list">
              <div className="inst-highlight-item">
                <span className="hi-icon">✦</span>
                <span>+100 mil professores impactados</span>
              </div>
              <div className="inst-highlight-item">
                <span className="hi-icon">✦</span>
                <span>Mais de 12 anos de experiência</span>
              </div>
              <div className="inst-highlight-item">
                <span className="hi-icon">✦</span>
                <span>Criadora do método de turmas escaláveis</span>
              </div>
              <div className="inst-highlight-item">
                <span className="hi-icon">✦</span>
                <span>Foco em pedagogia & rentabilidade</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
