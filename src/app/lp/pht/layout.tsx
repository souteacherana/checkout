import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./pht.css";

// Fontes da landing declaradas AQUI (não no layout raiz): só carregam pra
// quem abre a landing, e não competem com Geist/Fraunces do checkout.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Professor High Ticket | Teacher Ana",
  description:
    "Descubra como se posicionar para atrair os alunos que pagam mais e ainda te valorizam como especialista.",
  // O endereço público é riseeducacao.com.br/pht (o proxy faz rewrite de
  // /lp/pht); o canonical evita que a rota interna seja indexada à parte.
  alternates: { canonical: "https://www.riseeducacao.com.br/pht" },
};

const ASSETS = "https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/assets";

export default function PhtLandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* As imagens da hero vêm de outro domínio: abrir a conexão desde já
          evita pagar DNS + TLS só quando o CSS revelar as URLs. */}
      <link rel="preconnect" href="https://teacherana.com.br" />
      <link rel="dns-prefetch" href="https://teacherana.com.br" />

      {/* Elemento de LCP em cada breakpoint. Sem o preload o navegador só
          descobre estas imagens depois de baixar e processar o CSS — o
          "atraso na descoberta" que o PageSpeed aponta. */}
      <link
        rel="preload"
        as="image"
        href={`${ASSETS}/ANA3.png`}
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={`${ASSETS}/fundo.jpg`}
        media="(min-width: 768px)"
        fetchPriority="high"
      />

      <div className={`lp-pht ${inter.variable} ${instrumentSerif.variable}`}>
        {children}
      </div>
    </>
  );
}
