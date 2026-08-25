export default function Faq() {
  return (
    <section className="faq-section" id="faq">
      <div className="wrap">

        <div className="section-head">
          <h2 className="section-title display-title">
            Perguntas <em>Frequentes</em>
          </h2>
          <p className="section-subtitle">
            Confira as respostas para as principais dúvidas sobre a participação no workshop.
          </p>
        </div>

        <div className="faq-list">

          <details className="faq-item" name="faq" open>
            <summary>
              Nunca trabalhei com turmas. Esse workshop é para mim?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Sim. Na verdade, começar com estrutura é muito mais fácil do que precisar corrigir uma turma que nasceu no
              improviso. Você vai entender quais decisões precisam ser tomadas desde o início para construir uma turma
              pedagogicamente forte.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              Eu já tenho turmas. Ainda vale a pena participar?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Principalmente. Se você já tem turmas, poderá analisar o que está funcionando e identificar os pontos que
              podem estar prejudicando sua entrega, sua organização ou sua retenção. O objetivo não é apenas ensinar a
              começar: é ensinar a estruturar melhor.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              Esse workshop vai ensinar como conseguir alunos para formar uma turma?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              O foco principal deste workshop será a <b>estrutura pedagógica e o planejamento das turmas</b>. Vamos
              trabalhar o que acontece depois que você decide trabalhar com grupos: como organizar, planejar, conduzir e
              transformar sua turma em um produto forte.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              Minha turma tem alunos em níveis diferentes. O workshop vai falar sobre isso?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Sim. Essa é uma das principais dores de quem trabalha com grupos e será um dos pontos centrais abordados
              durante a imersão.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              Preciso seguir um material didático específico?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Não. Os princípios trabalhados poderão ser aplicados independentemente do livro, plataforma ou metodologia
              que você utiliza.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              O conteúdo serve para professores de outros idiomas?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Sim. O workshop foi pensado para professores particulares de idiomas e os princípios de planejamento,
              estrutura pedagógica, experiência e retenção podem ser adaptados perfeitamente para diferentes línguas.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              O workshop será ao vivo?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Sim. O <em>Turmas na Prática: Planejamento e Pedagógico</em> acontecerá no dia <b>19 de setembro, às 15h</b>
              (Horário de Brasília). Serão aproximadamente 3 horas de imersão ao vivo.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              Vai ter gravação?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Sim! A gravação ficará disponível para você rever com calma. Mesmo havendo gravação, a recomendação é
              participar ao vivo para acompanhar toda a construção do raciocínio e aproveitar o workshop como uma
              verdadeira imersão.
            </div>
          </details>

          <details className="faq-item" name="faq">
            <summary>
              Vou sair com minhas turmas completamente prontas?
              <span className="faq-icon-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="faq-answer">
              Você vai sair com muito mais clareza sobre como estruturar suas turmas e quais elementos precisa organizar.
              O objetivo do workshop é te dar direção, critérios e estrutura para parar de tomar decisões pedagógicas no
              improviso.
            </div>
          </details>

        </div>

      </div>
    </section>
  );
}
