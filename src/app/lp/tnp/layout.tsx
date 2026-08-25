import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./tnp.css";

// Fontes declaradas AQUI (não no layout raiz): só carregam pra quem abre a
// landing, e não competem com Geist/Fraunces do checkout.
//
// As mesmas três do projeto original, com os mesmos nomes de variável — o
// arranjo é reproduzido de propósito, pra landing renderizar exatamente como
// renderizava lá.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turmas na Prática: Planejamento e Pedagógico · Ana Paula de Araújo",
  description:
    "Aprenda a estruturar turmas lucrativas, organizadas e pedagogicamente fortes.",
  // O endereço público é riseeducacao.com.br/tnp (o proxy faz rewrite de
  // /lp/tnp); o canonical evita que a rota interna seja indexada à parte.
  alternates: { canonical: "https://www.riseeducacao.com.br/tnp" },
};

/**
 * Layout da landing do TNP.
 *
 * Não tem <html>/<body>: quem serve isso é o layout raiz, que também serve o
 * checkout e o admin. Daí o wrapper .lp-tnp — todo o CSS da landing está
 * escopado nele (ver tnp.css), pro tema claro dela não repintar o resto.
 *
 * O Meta Pixel do projeto original NÃO veio junto: o layout raiz já carrega o
 * mesmo pixel (1084815880338708) e já dispara o PageView. Trazer o componente
 * dele duplicaria o init e o evento.
 */
export default function TnpLandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`lp-tnp ${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <div className="ambient-glow-mesh" aria-hidden="true" />
      {children}
    </div>
  );
}
