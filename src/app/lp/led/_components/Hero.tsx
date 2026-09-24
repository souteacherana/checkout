import Image from "next/image";
import Ticker from "./Ticker";
import { HERO, HERO_MOBILE } from "../_lib/assets";
import { DATA } from "../_lib/workshop";

export default function Hero() {
  return (
    <header className="hero" id="topo">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="wrap hero-inner">
        <div>
{/*
          <span className="hero-tag is-urgent">
            <span className="dot" aria-hidden="true" />
            ÚLTIMOS DIAS · Encerra {DATA.extenso}
          </span> */}

          <h1 className="hero-h" id="headline">
            Aprenda a faturar{" "}
            <span className="accent">30k por mês sem ocupar sua agenda</span> de aulas com escola
            digital
          </h1>

          <p className="hero-sub">
            Em uma imersão de três horas, você, professor, vai aprender como lucrar mais com suas
            aulas particulares sem depender de vender suas horas.
          </p>

          <div className="cta-row">
            {/*
              No HTML original este botão apontava pra âncora #oferta, e só o
              da seção de oferta ia pro checkout. Mantido: é a escolha de
              conversão de quem escreveu a página — o visitante lê a oferta
              antes de comprar —, não um link quebrado.
            */}
            <a href="#oferta" className="led-cta">
              Quero minha vaga <span className="arrow" aria-hidden="true">→</span>
            </a>
          </div>

          <div className="hero-meta">
            <div>
              <div className="meta-k">Data</div>
              <div className="meta-v">{DATA.extenso}</div>
            </div>
            <div>
              <div className="meta-k">Horário</div>
              <div className="meta-v">{DATA.hora}</div>
            </div>
            <div>
              <div className="meta-k">Formato</div>
              <div className="meta-v">Ao vivo</div>
            </div>
          </div>
        </div>

        <div className="hero-art">
          <div className="hero-art-badge">
            <span className="live-dot" aria-hidden="true" />
            AO VIVO · {DATA.curta}
          </div>
          {/*
            Elemento de LCP.

            `loading="eager"` + `fetchPriority="high"`, e NÃO `priority` nem
            `preload`. Três motivos, nessa ordem:

            - `priority` foi DEPRECIADO no Next 16 (ver a doc empacotada em
              node_modules/next/dist/docs/.../components/image.md). Ele não
              avisa: simplesmente não sai atributo nenhum no <img> e a imagem
              volta a carregar como qualquer outra. Foi o que aconteceu aqui
              antes desta correção — o próprio Next apontou no console.

            - `preload` é o substituto oficial, mas a doc desaconselha
              justamente no nosso caso: "quando você tem várias imagens que
              podem ser o LCP dependendo do viewport". O <picture> abaixo tem
              duas, e o preload apostaria na de desktop também no celular.

            - `loading="eager"` + `fetchPriority="high"` deixa a escolha com o
              navegador, que já sabe qual <source> casou, e é o que a própria
              doc recomenda "na maioria dos casos".

            `sizes` conta ao next/image a largura real em tela (a coluna do
            hero não passa de 600px), pra ele não servir o arquivo inteiro.

            O <picture> do original virou um <source> só: abaixo de 640px a
            moldura muda de 4/5 pra 16/11 e o recorte retrato cortaria o rosto.
          */}
          <picture>
            <source media="(max-width: 640px)" srcSet={HERO_MOBILE.src} />
            <Image
              src={HERO.src}
              alt={HERO.alt}
              width={HERO.width}
              height={HERO.height}
              sizes="(max-width: 960px) 100vw, 600px"
              loading="eager"
              fetchPriority="high"
            />
          </picture>
          <div className="hero-art-caption">
            <div>
              <div className="who">
                Teacher
                <br />
                <em>Ana de Araújo</em>
              </div>
              <div className="role">Sua mentora</div>
            </div>
            <div className="hero-art-stats">
              <div className="stat">
                <div className="n">15 dias</div>
                <div className="l">disponível</div>
              </div>
              <div className="stat">
                <div className="n">3h</div>
                <div className="l">ao vivo</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Ticker />
    </header>
  );
}
