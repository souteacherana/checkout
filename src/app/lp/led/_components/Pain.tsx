const DORES = [
  {
    n: "01",
    titulo: "“Os alunos só querem fazer aula comigo”",
    texto:
      "Parece elogio, mas é armadilha: você virou refém da própria agenda. Crescer assim significa trabalhar mais e nunca escalar.",
  },
  {
    n: "02",
    titulo: "“Se eu sair de sala de aula, meus alunos irão parar de fazer aula.”",
    texto:
      "O medo é real, mas revela um problema de modelo, não de aluno. Escola que depende de uma pessoa não é escola, é freelance com CNPJ.",
  },
  {
    n: "03",
    titulo:
      "“Como garantir que outros professores farão a mesma entrega de qualidade que eu faço hoje?”",
    texto:
      "Spoiler: ele não vai entregar igual a você. Vai entregar o método da escola — e é exatamente isso que transforma talento individual em negócio.",
  },
];

export default function Pain() {
  return (
    <section className="pain" id="para-quem">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="sec-num">01 — PARA QUEM É</div>
            <h2 className="sec-title">
              Se você é teacher e sente que o seu negócio estagnou por conta da sua própria agenda
              lotada e você não sabe mais como crescer, <em>chegou a hora de mudar isso!</em>
            </h2>
          </div>
        </div>

        <div className="pain-grid">
          {DORES.map(({ n, titulo, texto }) => (
            <div className="pain-cell" key={n}>
              <div className="ic">{n}</div>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}

          <div className="pain-cell feature">
            <div>
              <h3>
                Quanto mais você ensina, mais presa fica. Escola digital existe pra quebrar essa
                conta.
              </h3>
              <p>
                No workshop <b>Lucrando com Escola Digital</b>, você vai aprender uma maneira fácil
                de criar, gerir e faturar muito mais estruturando sua escola digital!
              </p>
            </div>
            <div className="quote-mark" aria-hidden="true">
              ”
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
