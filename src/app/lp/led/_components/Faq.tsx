const PERGUNTAS = [
  {
    p: "Esse workshop é para mim mesmo se eu ainda dou todas as minhas aulas sozinho?",
    r: "Sim. Na verdade, esse é exatamente o ponto! Se hoje tudo depende de você, você já está no limite do modelo. O workshop vai te mostrar como sair disso com estrutura, sem dar um passo maior que a perna.",
  },
  {
    p: "Eu preciso já ter uma escola ou equipe para participar?",
    r: "Não. Você pode começar do zero. O que você precisa é ter alunos e sentir que sua agenda já está ficando cheia ou desorganizada.",
  },
  {
    p: "Eu vou precisar parar de dar aula para abrir uma escola?",
    r: "Não. Você não precisa parar. Mas precisa parar de depender só disso. A ideia é começar a construir um modelo que cresce além da sua agenda, não abandonar o que você já tem. E é exatamente isso que você precisa aprender antes de crescer.",
  },
  {
    p: "Eu preciso investir muito dinheiro para começar uma escola digital?",
    r: "Não. Você não precisa de estrutura complexa para começar. Mas precisa de clareza de modelo. A maioria erra tentando “gastar para crescer”, quando o certo é “estruturar para crescer”.",
  },
  {
    p: "O Workshop fica gravado?",
    r: "Sim. Você tem acesso à gravação por 15 dias após o encontro, para rever e aplicar com calma.",
  },
];

/**
 * FAQ em <details> nativo, sem JS — já era assim no LED7 e é o padrão da casa
 * (o TNP faz igual). O primeiro vem aberto, como no original.
 *
 * UMA DIFERENÇA em relação ao LED7: o `name` compartilhado, que faz abrir um
 * fechar o outro. O LED7 trazia <details> soltos, que abrem todos ao mesmo
 * tempo — mas a versão de abril da mesma landing tinha um acordeão exclusivo
 * feito em JS, então o comportamento exclusivo é o que a página quis desde o
 * começo; o LED7 só perdeu o JS e não ganhou o atributo, que é mais novo que
 * a página. Para voltar ao comportamento do LED7, basta remover o `name`.
 */
export default function Faq() {
  return (
    <section className="faq" id="faq">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="sec-num">05 — FAQ</div>
            <h2 className="sec-title">
              FAQ — O que você <em>precisa saber</em>.
            </h2>
          </div>
        </div>
        <div className="faq-list">
          {PERGUNTAS.map(({ p, r }, i) => (
            <details key={p} name="faq-led" open={i === 0}>
              <summary>
                {p}
                <span className="faq-toggle" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="a">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
