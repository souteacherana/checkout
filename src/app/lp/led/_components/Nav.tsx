/* eslint-disable @next/next/no-img-element */
import CheckoutLink from "./CheckoutLink";
import { LOGO } from "../_lib/assets";

/**
 * Barra de navegação, grudada abaixo da faixa de urgência.
 *
 * O HTML original tinha um script que trocava a classe da nav no scroll
 * (.nav-scrolled), mas essa regra não existe no CSS do LED7 — sobrou do
 * arquivo de abril. Não foi portado porque não pinta nada.
 *
 * A logo é <img> e não next/image: é SVG, e o otimizador do Next só aceita
 * SVG com dangerouslyAllowSVG ligado no projeto inteiro.
 */
export default function Nav() {
  return (
    <nav className="nav" aria-label="Navegação principal">
      <div className="wrap nav-inner">
        <a href="#topo" className="brand" aria-label="Lucrando com Escola Digital — Início">
          <span className="brand-mark">
            <img src={LOGO} alt="Rise Educação" width={46} height={46} />
          </span>
          <span className="brand-name">Lucrando com Escola Digital</span>
        </a>
        <div className="nav-links">
          <a href="#para-quem">Para quem é</a>
          <a href="#aprender">Sobre o Workshop</a>
          <a href="#sobre">Quem é a Ana?</a>
          <a href="#faq">FAQ</a>
        </div>
        <CheckoutLink className="nav-cta" location="nav">
          Garantir vaga →
        </CheckoutLink>
      </div>
    </nav>
  );
}
