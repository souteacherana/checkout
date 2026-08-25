import CheckoutLink from "./CheckoutLink";

export default function ProblemSolution() {
  return (
    <section className="problem-section" id="problema">
      <div className="wrap">

        <div className="section-head">
          <h2 className="section-title display-title">
            O problema não é formar uma turma. <em>É reter os alunos na turma.</em>
          </h2>
          <p className="section-subtitle">
            Muitos professores conseguem juntar alunos em turmas. O desafio real começa logo em seguida, no pedagógico!
            Surgem as dúvidas que tiram o seu sono:
          </p>
        </div>

        <div className="problem-grid">

          <div className="problem-card glass-panel">
            <div className="problem-num">01</div>
            <h3>Alunos em Níveis Diferentes</h3>
            <p>Como organizar pessoas com ritmos distintos sem nivelar por baixo e sem transformar a turma em várias aulas
              individuais acontecendo ao mesmo tempo?</p>
          </div>

          <div className="problem-card glass-panel">
            <div className="problem-num">02</div>
            <h3>Estrutura e Planejamento Exaustivo</h3>
            <p>Como planejar as aulas semanais com clareza sem transformar cada domingo em uma corrida exaustiva contra o
              relógio para reinventar tudo do zero?</p>
          </div>

          <div className="problem-card glass-panel">
            <div className="problem-num">03</div>
            <h3>Percepção de Evolução do Aluno</h3>
            <p>Como desenhar uma jornada de aprendizagem onde o aluno reconheça o próprio progresso a cada semana e sinta
              orgulho de continuar investindo?</p>
          </div>

          <div className="problem-card glass-panel">
            <div className="problem-num">04</div>
            <h3>Engajamento e Prevenção de Evasão</h3>
            <p>Como manter a sala engajada e participativa, garantindo que ninguém fique tímido ou passivo, e blindando
              seu faturamento contra desistências?</p>
          </div>

        </div>

        <div className="pivot-feature-card">
          <span className="pivot-tag">A Pergunta Decisiva</span>
          <h3 className="display-title">
            Como transformar uma turma em um <em>produto pedagógico forte e lucrativo</em>, e não apenas em várias aulas
            individuais acontecendo ao mesmo tempo?
          </h3>
          <p>
            É exatamente para responder essas perguntas com direção, método e critérios práticos que nasceu o <b>Turmas na
              Prática: Planejamento e Pedagógico</b>.
          </p>
          <div>
            <CheckoutLink className="btn-cta-primary" location="problema">
              Quero Aprender Isso! <span className="btn-arrow" aria-hidden="true">→</span>
            </CheckoutLink>
          </div>
        </div>

      </div>
    </section>
  );
}
