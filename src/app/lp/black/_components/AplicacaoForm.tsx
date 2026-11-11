"use client";

import { useRef, useState } from "react";
import { PERGUNTAS, PRODUTO_SINAL } from "../_lib/aplicacao";
import { CAMPANHA } from "../_lib/evento";

const CHECKOUT = "https://checkout.riseeducacao.com.br";
const ORIGEM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

/**
 * Aplicação da Black: grava as respostas e leva pro checkout do sinal.
 *
 * Não existe evento de submit aqui, de propósito: o GTM escuta todo envio de
 * formulário da página e dispara `generate_lead` e `Lead` (GA4 e servidor GTM),
 * e quem chega aqui já virou lead na inscrição. Parar a propagação não basta,
 * o GTM ouve antes. Por isso o botão é type="button" e valida na mão; sem botão
 * de submit, Enter num campo também não envia.
 *
 * O checkout recebe só a query da visita (UTMs). Nome, e-mail e telefone NÃO
 * vão na URL: o GA4 e a Meta registram a URL inteira, e esses dados iriam
 * parar lá. A pessoa digita de novo no checkout, e o time cruza a aplicação
 * com o pagamento pelo e-mail.
 */
export default function AplicacaoForm() {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const trava = useRef(false);

  const formulario = useRef<HTMLFormElement>(null);

  async function enviar() {
    const form = formulario.current;
    if (!form || trava.current) return;
    // Mostra os avisos nativos de campo obrigatório, como o submit mostraria.
    if (!form.reportValidity()) return;
    trava.current = true;
    setEnviando(true);
    setErro("");

    const campos = new FormData(form);
    const query = new URLSearchParams(window.location.search);

    try {
      const resposta = await fetch("/api/aplicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanha: CAMPANHA,
          email: campos.get("email"),
          nome: campos.get("nome"),
          whatsapp: campos.get("whatsapp"),
          instagram: campos.get("instagram"),
          site: campos.get("site"),
          respostas: Object.fromEntries(PERGUNTAS.map((p) => [p.chave, campos.get(p.chave)])),
          ...Object.fromEntries(ORIGEM.map((p) => [p, query.get(p)])),
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não conseguimos salvar suas respostas. Tente de novo.");
        trava.current = false;
        setEnviando(false);
        return;
      }

      window.location.assign(`${CHECKOUT}/${PRODUTO_SINAL}${window.location.search}`);
    } catch {
      setErro("Sem conexão. Confira sua internet e tente de novo.");
      trava.current = false;
      setEnviando(false);
    }
  }

  return (
    <form className="aplicacao" ref={formulario} onSubmit={(e) => e.preventDefault()}>
      <label className="aplicacao-campo">
        <span>E-mail *</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="aplicacao-campo">
        <span>Qual seu nome completo? *</span>
        <input name="nome" type="text" autoComplete="name" required />
      </label>
      <label className="aplicacao-campo">
        <span>Qual é o número do seu Whatsapp com DDD? (É por ele que vamos entrar em contato) *</span>
        <input name="whatsapp" type="tel" autoComplete="tel" required />
      </label>
      <label className="aplicacao-campo">
        <span>Qual é o seu @user no Instagram? *</span>
        <input name="instagram" type="text" autoComplete="off" required />
      </label>

      {PERGUNTAS.map((pergunta) =>
        pergunta.tipo === "texto" ? (
          <label className="aplicacao-campo" key={pergunta.chave}>
            <span>{pergunta.titulo} *</span>
            <textarea name={pergunta.chave} rows={4} required />
          </label>
        ) : (
          <fieldset className="aplicacao-campo" key={pergunta.chave}>
            <legend>{pergunta.titulo} *</legend>
            {pergunta.opcoes.map((opcao) => (
              <label className="aplicacao-opcao" key={opcao}>
                <input type="radio" name={pergunta.chave} value={opcao} required />
                <span>{opcao}</span>
              </label>
            ))}
          </fieldset>
        )
      )}

      {/* Isca pra robô: gente não vê este campo e ele precisa chegar vazio. */}
      <input className="form-isca" name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <button type="button" onClick={enviar} disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar e ir para o pagamento de R$ 50"}
      </button>
      {erro && (
        <p className="form-erro" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}
