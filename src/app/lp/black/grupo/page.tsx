import type { Metadata } from "next";
import Image from "next/image";
import SeloData from "../_components/SeloData";
import { LOGO } from "../_lib/assets";
import { GRUPO_URL } from "../_lib/evento";

export const metadata: Metadata = {
  title: "Entre no grupo - BLACK - Teacher Ana",
  // Só faz sentido pra quem acabou de se inscrever: não deve aparecer em busca.
  robots: { index: false, follow: false },
  alternates: { canonical: "https://www.riseeducacao.com.br/black/grupo" },
};

/**
 * Destino de quem se inscreveu. O clique no link do grupo já é medido: o GTM
 * dispara os eventos de WhatsApp no GA4 em todo clique numa URL com "whatsapp".
 */
export default function EntrarNoGrupo() {
  return (
    <main className="hero grupo">
      <div className="hero-coluna">
        <Image
          className="hero-logo"
          src={LOGO.src}
          alt={LOGO.alt}
          width={LOGO.width}
          height={LOGO.height}
          sizes="(max-width: 700px) 335px, 550px"
          loading="eager"
          fetchPriority="high"
        />
        <SeloData />
        <h1 className="grupo-titulo">Sua inscrição está confirmada!</h1>
        <p className="hero-texto">
          Falta só um passo: entre no grupo da <strong className="realce">BLACK DA TEACHER</strong>.
        </p>
        <a className="grupo-botao" href={GRUPO_URL}>
          Entrar no grupo
        </a>
      </div>
    </main>
  );
}
