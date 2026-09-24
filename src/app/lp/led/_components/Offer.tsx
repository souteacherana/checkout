import CheckoutLink from "./CheckoutLink";
import { DATA } from "../_lib/workshop";

const ETAPAS = [
  {
    num: "i.",
    rotulo: "CLAREZA",
    destaque: `${DATA.extenso} · ${DATA.hora}`,
    texto:
      "— Em três horas ao vivo, o mapa inteiro do que separa uma teacher autônoma de uma escola que sustenta sozinha.",
  },
  {
    num: "ii.",
    rotulo: "TEMPO",
    destaque: "Gravação liberada por 15 dias",
    texto: "— depois do evento, pra você revisitar nas próximas decisões.",
  },
  {
    num: "iii.",
    rotulo: "Q&A",
    destaque: "Bloco de perguntas ao vivo",
    texto: "— você sai com as dúvidas respondidas, não com mais 50 abas abertas.",
  },
];

export default function Offer() {
  return (
    <section className="oferta" id="oferta">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <div className="sec-num">03 — O WORKSHOP</div>
            <h2 className="sec-title">
              Lucrando com
              <br />
              <em>Escola Digital</em>.
            </h2>
          </div>
          <div className="oferta-head-meta">
            <div>
              <b>{DATA.extenso}</b> · {DATA.hora} · Online
            </div>
            <div>Ao vivo, pelo Zoom</div>
          </div>
        </div>

        <div className="oferta-shell">
          <div className="oferta-left">
            <span className="t-highlight-mark">3 horas, ao vivo, comigo</span>

            <p className="oferta-pitch">
              Pare de <em>ser</em> a escola, comece a <em>ter</em> uma escola.
            </p>

            <p className="oferta-desc">
              Em três horas você vai trocar a agenda lotada por uma escola que roda sem você dentro
              de toda aula. Método, equipe, precificação e conteúdo — o que muda quando o negócio
              para de depender só das suas horas.
            </p>

            <div className="oferta-stages">
              {ETAPAS.map(({ num, rotulo, destaque, texto }) => (
                <div className="oferta-stage" key={num}>
                  <div className="oferta-stage-label">
                    <span className="oferta-stage-num">{num}</span>
                    <span>{rotulo}</span>
                  </div>
                  <p>
                    <b>{destaque}</b> {texto}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="oferta-price" aria-label="Investimento">
            <div className="price-tag">Investimento</div>

            {/*
              Preço escrito à mão, como na copy da expert. Se ele mudar, mude
              TAMBÉM o produto `led` no painel — ver a nota em _lib/workshop.ts.
            */}
            <div className="price-main">
              <span className="price-currency">R$</span>
              <span className="price-value">49</span>
              <span className="price-cents">,90</span>
            </div>

            <div className="price-installments">
              ou <b>12x de R$ 5,16</b>
            </div>

            <div className="price-divider" aria-hidden="true" />

            <div className="price-compare">
              <span>Um workshop que vai te ajudar</span>
              <span>a faturar mais sem ocupar sua agenda!</span>
            </div>

            <CheckoutLink className="price-cta" location="oferta">
              Quero minha vaga →
            </CheckoutLink>

            <div className="price-fine">Pagamento seguro</div>

            <div className="sold-bar">
              <div className="sold-bar-head">
                <span>Vagas quase esgotadas</span>
                <b>Encerra {DATA.barraZeroEsquerda}</b>
              </div>
              <div className="sold-bar-track">
                <div className="sold-bar-fill" style={{ width: "90%" }} />
              </div>
              <div className="sold-bar-note">
                <b>ÚLTIMAS VAGAS</b>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
