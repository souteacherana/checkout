import type { Metadata } from "next";
import Image from "next/image";
import SeloData from "../_components/SeloData";
import { LOGO } from "../_lib/assets";
import { CAMPANHA, GRUPO_URL } from "../_lib/evento";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Trocar o link no painel chega aqui em até um minuto, sem deploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Entre no grupo - BLACK - Teacher Ana",
  // Só faz sentido pra quem acabou de se inscrever: não deve aparecer em busca.
  robots: { index: false, follow: false },
  alternates: { canonical: "https://www.riseeducacao.com.br/black/grupo" },
};

/**
 * Destino de quem se inscreveu. O clique no link do grupo já é medido: o GTM
 * dispara os eventos de WhatsApp no GA4 em todo clique numa URL com "whatsapp".
 *
 * O link vem do produto no painel. Se o banco falhar, usa o da config: a pessoa
 * acabou de se inscrever e não pode ficar sem caminho pro grupo.
 */
export default async function EntrarNoGrupo() {
  const { data: produto } = await supabaseAdmin
    .from("products")
    .select("grupo_url")
    .eq("slug", CAMPANHA)
    .maybeSingle();

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
        <a className="grupo-botao" href={produto?.grupo_url || GRUPO_URL}>
          Entrar no grupo
        </a>
      </div>
    </main>
  );
}
