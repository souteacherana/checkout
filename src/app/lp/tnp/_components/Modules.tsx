import CheckoutLink from "./CheckoutLink";

export default function Modules() {
  return (
    <section className="learn-section" id="conteudo">
      <div className="wrap">

        <div className="section-head">
          <h2 className="section-title display-title">
            O que você vai aprender no <em>Turmas na Prática</em>
          </h2>
          <p className="section-subtitle">
            Em 3 horas de imersão, vamos trabalhar os principais pilares para você construir turmas que funcionem
            pedagogicamente para os alunos e financeiramente para o seu negócio.
          </p>
        </div>

        <div className="modules-grid">

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 01</span>
              <span className="module-tag">Estrutura</span>
            </div>
            <h3 className="module-title display-title">Estruturação Pedagógica Completa</h3>
            <p className="module-desc">
              Como estruturar pedagogicamente sua turma, definindo objetivos claros, progressão lógica e organização
              consistente do conteúdo.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 02</span>
              <span className="module-tag">Planejamento</span>
            </div>
            <h3 className="module-title display-title">Planejamento Semanal Eficiente</h3>
            <p className="module-desc">
              Como planejar suas aulas sem precisar reinventar a roda toda semana, independentemente do material didático
              ou plataforma que você utiliza.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 03</span>
              <span className="module-tag">Nivelamento</span>
            </div>
            <h3 className="module-title display-title">Gestão de Níveis Diferentes</h3>
            <p className="module-desc">
              Como trabalhar com diferenças de nível sem sobrecarregar a sua condução e sem dividir o tempo da aula de
              forma fragmentada.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 04</span>
              <span className="module-tag">Dinâmica</span>
            </div>
            <h3 className="module-title display-title">Aulas que Funcionam em Grupo</h3>
            <p className="module-desc">
              Como criar aulas verdadeiramente dinâmicas, aproveitando a interação e a troca entre os alunos como um
              catalisador de aprendizagem.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 05</span>
              <span className="module-tag">Progresso</span>
            </div>
            <h3 className="module-title display-title">Percepção de Evolução Real</h3>
            <p className="module-desc">
              Como estruturar pontos de validação para que seus alunos reconheçam o próprio progresso contínuo e celebrem
              os resultados.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 06</span>
              <span className="module-tag">Engajamento</span>
            </div>
            <h3 className="module-title display-title">Engajamento e Participação</h3>
            <p className="module-desc">
              Estratégias práticas para gerar participação ativa de todos, sem deixar nenhum aluno tímido apenas como
              espectador passivo.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 07</span>
              <span className="module-tag">Retenção</span>
            </div>
            <h3 className="module-title display-title">Pedagógico para Alta Retenção</h3>
            <p className="module-desc">
              Como usar o alinhamento pedagógico como sua principal ferramenta de fidelização, reduzindo cancelamentos e
              fortalecendo a permanência.
            </p>
          </div>

          <div className="module-item glass-panel">
            <div className="module-header">
              <span className="module-index">PILAR 08</span>
              <span className="module-tag">Negócio</span>
            </div>
            <h3 className="module-title display-title">Transformação em Produto Lucrativo</h3>
            <p className="module-desc">
              Como unir excelência de entrega, sustentabilidade de agenda e alta rentabilidade para consolidar um negócio
              educacional sólido.
            </p>
          </div>

        </div>

        <div className="learn-impact-box glass-panel-static">
          <h3 className="display-title">
            Porque uma turma bem estruturada <b>não é apenas melhor para o aluno</b>. É melhor para o seu negócio.
          </h3>
          <CheckoutLink className="btn-cta-primary" location="conteudo">
            Quero Estruturar Minhas Turmas <span className="btn-arrow" aria-hidden="true">→</span>
          </CheckoutLink>
        </div>

      </div>
    </section>
  );
}
