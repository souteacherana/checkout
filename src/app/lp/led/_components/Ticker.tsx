/**
 * Faixa rolante no pé do hero. Puramente decorativa (aria-hidden), e a
 * animação já respeita prefers-reduced-motion pelo CSS.
 *
 * A lista é duplicada de propósito: a animação desloca a trilha em -50%, então
 * a segunda metade entra em cena exatamente quando a primeira sai, e o laço
 * fecha sem salto. Vem assim do HTML original — a segunda metade não é cópia
 * literal da primeira, tem frases próprias.
 */
const ITENS = [
  "★ Sem agenda lotada",
  "✎ Escola que escala",
  "◉ Método que se replica",
  "✉ Crescer sem dar mais aula",
  "◇ Aluno fiel à marca",
  "▲ Liberdade de horário",
  "⚑ Faturamento sem teto",
  "★ Sem agenda lotada",
  "✎ Escola que funciona sem você",
  "◉ Time que entrega",
  "✉ Faturamento que escala",
  "◇ Cobrar o que vale",
  "▲ Liberdade de horário",
  "⚑ Faturamento sem teto",
];

export default function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {ITENS.map((item, i) => (
          <span className="ticker-item" key={`${item}-${i}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
