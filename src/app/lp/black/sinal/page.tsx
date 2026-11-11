import type { Metadata } from "next";
import AplicacaoForm from "../_components/AplicacaoForm";

export const metadata: Metadata = {
  title: "Aplicação - Mentoria Partiu 10k · Black da Teacher",
  // Link do grupo e da live, não de anúncio: fora da busca.
  robots: { index: false, follow: false },
  alternates: { canonical: "https://www.riseeducacao.com.br/black/sinal" },
};

/**
 * Aplicação da mentoria + sinal de R$ 50.
 *
 * Visual claro de propósito, diferente do resto da landing: da Black ficam só
 * o vermelho e o quadriculado, bem apagado. É uma página de preencher, não de
 * convencer.
 *
 * O texto é o do Google Forms, exceto o bloco do Pix: a chave do CNPJ e o envio
 * de comprovante pelo WhatsApp foram trocados pelo checkout, que é a próxima
 * tela.
 */
export default function Aplicacao() {
  return (
    <main className="aplicacao-pagina">
      <div className="aplicacao-coluna">
        <p className="aplicacao-selo">BLACK DA TEACHER</p>
        <h1 className="aplicacao-titulo">Aplicação - Mentoria Partiu 10k</h1>
        <div className="aplicacao-intro">
          <p>Olá teacher! 😊</p>
          <p>
            Primeiramente, parabéns pela sua decisão!!! É um grande passo rumo à sua próxima fase, e a
            gente tá aqui pra caminhar com você até o fim. 👏🏻👏🏻👏🏻
          </p>
          <p>🟢 Agora é simples, rápido e direto:</p>
          <p>
            ✔ Primeiro: preencha seus dados e em alguns minutos alguém da nossa equipe já entrará em
            contato com você!
          </p>
          <p>
            ✔ Segundo: para garantir sua vaga entre os primeiros, pague agora mesmo o sinal de{" "}
            <strong>R$ 50</strong>, no Pix ou no cartão, na próxima tela. Esse valor será abatido da sua
            entrada na mentoria Partiu 10k – Especial Black November.
          </p>
          <p>🟣 Importante: esse passo é a confirmação do seu comprometimento, e te dá acesso a:</p>
          <p>
            <strong>Condição exclusiva de Black November</strong>
          </p>
          <ul>
            <li>5 primeiros terão consultoria individual comigo</li>
            <li>
              Compradores na primeira hora vão ganhar uma análise de perfil, aula de edição de vídeo por
              IA para reduzir o seu tempo de produção e aula de tráfego no Meta.
            </li>
          </ul>
          <p>
            🚀 Estamos prontos pra te ajudar a romper a barreira dos 10k com leveza, consistência e
            método validado.
          </p>
        </div>
        <AplicacaoForm />
      </div>
    </main>
  );
}
