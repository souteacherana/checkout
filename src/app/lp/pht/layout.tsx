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
};

export default function PhtLandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`lp-pht ${inter.variable} ${instrumentSerif.variable}`}>
      {children}
    </div>
  );
}
