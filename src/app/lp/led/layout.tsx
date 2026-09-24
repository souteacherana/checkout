import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./led.css";

// Fontes declaradas AQUI (não no layout raiz): só carregam pra quem abre a
// landing, e não competem com Geist/Fraunces do checkout.
//
// As mesmas três do LED7.html, que as puxava do Google Fonts por <link>. Pelo
// next/font elas viram arquivos servidos da própria origem — some a conexão
// com fonts.googleapis.com + fonts.gstatic.com no caminho crítico, e some o
// layout shift, porque o Next reserva as métricas antes de baixar.
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

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lucrando com Escola Digital · Teacher Ana de Araújo",
  description:
    "Aprenda a faturar 30k por mês sem ocupar sua agenda de aulas, estruturando sua escola digital.",
  // O endereço público é riseeducacao.com.br/led (o proxy faz rewrite de
  // /lp/led — ver src/proxy.ts); o canonical evita que a rota interna seja
  // indexada à parte.
  alternates: { canonical: "https://www.riseeducacao.com.br/led" },
};

/**
 * Layout da landing do LED.
 *
 * Não tem <html>/<body>: quem serve isso é o layout raiz, que também serve o
 * checkout e o admin. Daí o wrapper .lp-led — todo o CSS da landing está
 * escopado nele (ver led.css), pro tema dela não repintar o resto.
 *
 * O que NÃO veio do LED7.html, de propósito:
 *
 * - Meta Pixel: o layout raiz já carrega o mesmo pixel (1084815880338708) e
 *   já dispara o PageView. Trazer o snippet duplicaria o init e o evento.
 *
 * - Google Tag Manager (GTM-MPNW6FZ9): o projeto usa gtag.js direto, montado
 *   em src/app/google-tag.tsx, e não GTM. Subir um container do GTM junto
 *   criaria uma segunda camada de tags fora do controle do código — e, se o
 *   container tiver a tag do GA4 dentro, cada pageview seria contado duas
 *   vezes. Se esse container precisar voltar, é decisão de quem cuida da
 *   conta, não da migração.
 *
 * - Script anti-lazy-load: gambiarra pra conviver com plugin de WordPress,
 *   sem função aqui.
 *
 * - Script que colava a query nos links externos: virou o CheckoutLink, que
 *   já nasce com o href certo em vez de reescrever o DOM depois do load.
 */
export default function LedLandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`lp-led ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      {children}
    </div>
  );
}
