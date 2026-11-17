import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { PLAYER_ORIGIN } from "./_lib/vsl";
import "./vsl.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Black da Teacher",
  description: "Teacher, quer formar turmas e parar de depender de aulas individuais?",
  // Público em riseeducacao.com.br/blackdateacher (rewrite do proxy).
  alternates: { canonical: "https://www.riseeducacao.com.br/blackdateacher" },
};

/**
 * Layout da VSL. Sem <html>/<body>, que são do layout raiz; todo o CSS fica
 * em .lp-vsl.
 *
 * Pixel da Meta, GTM e Contentsquare já vêm do layout raiz, então não entram
 * aqui. Os eventos de porcentagem assistida são configurados no painel do
 * Panda, não na página.
 */
export default function VslLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* O player é o elemento principal da dobra: abre a conexão já. */}
      <link rel="preconnect" href={PLAYER_ORIGIN} />
      <link rel="preconnect" href="https://player.pandavideo.com.br" />
      <div className={`lp-vsl ${montserrat.variable}`}>{children}</div>
    </>
  );
}
