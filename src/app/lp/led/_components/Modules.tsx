const MODULOS = [
  {
    n: "M · 01",
    titulo: "Da agenda lotada para escola digital.",
    texto:
      "O primeiro passo concreto pra sair do modo “professor refém do próprio sucesso” e começar a construir um negócio que cresce sem te consumir.",
  },
  {
    n: "M · 02",
    titulo: "A diferença entre dar aula & ser dono de uma escola.",
    texto:
      "Professor vende hora. Escola vende método. Entender essa diferença é o que separa quem trabalha mais de quem cresce.",
  },
  {
    n: "M · 03",
    titulo: "Como montar um modelo simples e escalável com professores parceiros.",
    texto: "Como montar uma operação simples mesmo sem nunca ter contratado ninguém.",
  },
  {
    n: "M · 04",
    titulo: "Qualidade que não depende de você.",
    texto:
      "Como manter padrão, organização e aluno satisfeito mesmo quando outro professor está na frente da câmera.",
  },
  {
    n: "M · 05",
    titulo: "As principais travas de professores que impedem de crescer.",
    texto:
      "“E se levarem meus alunos?”, “ninguém ensina como eu”, “vão me trocar por mais barato” — e a estratégia pra superar cada uma.",
  },
  {
    n: "M · 06",
    titulo: "A rotina de um professor que virou CEO.",
    texto:
      "O que fazer, quando fazer e, mais importante, o que parar de fazer. A semana real de quem trocou sala de aula por escola digital.",
  },
];

export default function Modules() {
  return (
    <section className="modules" id="aprender">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="sec-num">04 — SOBRE O WORKSHOP</div>
            <h2 className="sec-title">
              O que você vai aprender no <em>“Lucrando com Escola Digital”</em>.
            </h2>
          </div>
        </div>

        <div className="mod-list">
          {MODULOS.map(({ n, titulo, texto }) => (
            <div className="mod" key={n}>
              <div className="mod-n">{n}</div>
              <div className="mod-t">{titulo}</div>
              <div className="mod-d">{texto}</div>
              <div className="mod-tag">CONTEÚDO</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
