import CheckoutLink from "./CheckoutLink";
import CountdownGrid from "./CountdownGrid";
import { DATA } from "../_lib/workshop";

export default function FinalCta() {
  return (
    <section className="final" id="inscricao">
      <div className="wrap">
        <span className="hero-tag is-urgent">
          <span className="dot" aria-hidden="true" />
          ÚLTIMA SEMANA · ENCERRA {DATA.extensoCaixaAlta}
        </span>
        <h2>
          Sua agenda cheia <em>já é possível</em>!
          <br />a gente começa dia {DATA.dia}
        </h2>
        <p>
          <b>3 horas ao vivo.</b> E a certeza que pode te fazer faturar muito mais do que você
          imagina!
        </p>

        <CountdownGrid />

        <CheckoutLink className="led-cta" style={{ marginTop: 18 }} location="fechamento">
          Quero minha vaga agora <span className="arrow" aria-hidden="true">→</span>
        </CheckoutLink>

        <div className="final-fine">AO VIVO PELO ZOOM · Gravação Disponível por 15 dias</div>
      </div>
    </section>
  );
}
