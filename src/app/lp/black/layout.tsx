import type { Metadata } from "next";
import { Cinzel, Forum, Inter, Montserrat } from "next/font/google";
import { HERO_DESKTOP, HERO_MOBILE } from "./_lib/assets";
import "./black.css";

// Fontes declaradas AQUI (não no layout raiz): só carregam pra quem abre a
// landing, e não competem com Geist/Fraunces do checkout.
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: "700" });
const forum = Forum({ variable: "--font-forum", subsets: ["latin"], weight: "400" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BLACK - Teacher Ana",
  description:
    "Teacher, quer formar turmas e parar de depender de aulas individuais? Participe da Black da Teacher.",
  // O endereço público é riseeducacao.com.br/black (o proxy faz rewrite de
  // /lp/black); o canonical evita que a rota interna seja indexada à parte.
  alternates: { canonical: "https://www.riseeducacao.com.br/black" },
};

/**
 * Layout da landing da Black.
 *
 * Não tem <html>/<body>: quem serve isso é o layout raiz, que também serve o
 * checkout e o admin. Daí o wrapper .lp-black, onde todo o CSS está escopado.
 *
 * Os rastreadores do WordPress NÃO vieram junto, porque o layout raiz já
 * carrega os mesmos: Meta Pixel 1084815880338708, GTM-MPNW6FZ9 e Contentsquare
 * (que roda aqui porque, depois do rewrite, o navegador vê /black e não /lp).
 * Trazer qualquer um deles duplicaria eventos.
 *
 * Também ficaram de fora os scripts que reescreviam links com UTM, sck e src: a
 * página não tem nenhum link. As UTMs vão no envio do formulário.
 */
export default function BlackLandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* O fundo do hero é o LCP, e sem o preload o navegador só o descobre
          depois de processar o CSS. */}
      <link rel="preload" as="image" href={HERO_MOBILE} media="(max-width: 700px)" fetchPriority="high" />
      <link rel="preload" as="image" href={HERO_DESKTOP} media="(min-width: 701px)" fetchPriority="high" />

      <div
        className={`lp-black ${cinzel.variable} ${forum.variable} ${inter.variable} ${montserrat.variable}`}
      >
        {children}
      </div>
    </>
  );
}
