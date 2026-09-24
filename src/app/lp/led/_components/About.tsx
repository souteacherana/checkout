import Image from "next/image";
import { HERO } from "../_lib/assets";

/**
 * "Quem é a Ana". Reusa a MESMA imagem do hero — era assim no HTML original
 * (os dois <img> apontavam pro mesmo arquivo). Aqui ela fica com o lazy-load
 * padrão: está bem abaixo da dobra, e o hero já aqueceu o cache.
 */
export default function About() {
  return (
    <section className="about" id="sobre">
      <div className="wrap about-grid">
        <div className="about-photo">
          <Image
            src={HERO.src}
            alt={HERO.alt}
            width={HERO.width}
            height={HERO.height}
            sizes="(max-width: 960px) 100vw, 480px"
          />
          <div className="ring" aria-hidden="true" />
        </div>
        <div>
          <div className="sec-num">06 — QUEM É A ANA?</div>
          <h2>
            Oi, eu sou a <em>Ana</em>.
            <br />
            Vivo de ensinar há mais de 10 anos e hoje ensino professores a viverem disso também.
          </h2>
          <p>
            Ana é mãe, esposa, empresária — e foi professora particular antes de ser qualquer outra
            coisa nessa lista. Começou dando aula em casa pra estar perto das filhas. O que era pra
            ser “um jeito de ganhar um extra” virou um negócio que cresceu, sustentou a família e
            mostrou uma verdade incômoda: dar aula boa não era suficiente. Faltava método, estrutura
            e coragem de cobrar o que valia.
          </p>
          <p>
            Desde 2021, ela ajuda professoras particulares a fazerem o mesmo caminho — sair da
            agenda lotada e mal paga pra construir um negócio que cresce mesmo quando elas não estão
            na frente da câmera.
          </p>
        </div>
      </div>
    </section>
  );
}
