import Link from "next/link";
import CheckoutLink from "./CheckoutLink";

export default function Header() {
  return (
    <header className="nav-header">
      <div className="wrap nav-inner">
        <Link href="#" className="brand-wrap" aria-label="Início">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="brand-logo-img" 
            src="/lp/tnp/logo.svg" 
            alt="Logo Rise Educação" 
            width={36}
            height={36}
          />
          <span className="brand-text">Turmas na Prática</span>
        </Link>

        <nav className="nav-links" aria-label="Navegação do site">
          {/* Na ordem em que as seções aparecem na página. */}
          <Link href="#faq">Dúvidas</Link>
          <Link href="#oferta">Inscrição</Link>
          <Link href="#depoimentos">Resultados</Link>
          <Link href="#problema">O Desafio</Link>
          <Link href="#conteudo">O Que Vai Aprender</Link>
          <Link href="#sobre-ana">Sobre a Ana</Link>
        </nav>

        <CheckoutLink className="nav-cta-btn" location="header">
          Garantir vaga
        </CheckoutLink>
      </div>
    </header>
  );
}
