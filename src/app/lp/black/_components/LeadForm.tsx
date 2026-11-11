"use client";

import { useRef, useState, type FormEvent } from "react";
import { newEventId } from "@/lib/pixel";
import { CAMPANHA } from "../_lib/evento";

/** O que o formulário do WordPress capturava, mais os dois IDs de clique. */
const PARAMETROS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
];

type Estado = "livre" | "enviando" | "ok" | "erro";

/**
 * Formulário de inscrição: a única conversão da página.
 *
 * O id e o name são os mesmos do WordPress (formbqpq / form_black_pq), e o
 * envio continua sendo um submit nativo antes do fetch: é o evento que o GTM
 * escuta pra disparar `generate_lead` e `Lead` no GA4.
 *
 * O Lead da Meta só sai depois de o servidor confirmar a gravação, com o mesmo
 * eventId que a rota usa na Conversions API, pra Meta contar uma vez só. Depois
 * disso, a pessoa segue pra página com o link do grupo.
 */
export default function LeadForm() {
  const [estado, setEstado] = useState<Estado>("livre");
  const [mensagem, setMensagem] = useState("");
  // Trava síncrona. O estado "enviando" só vale depois da próxima renderização,
  // e um duplo clique rápido passava antes disso: cada clique virava um envio e
  // um Lead com ID próprio, que a Meta contava separado.
  const enviando = useRef(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando.current) return;
    enviando.current = true;

    setEstado("enviando");
    setMensagem("");

    const campos = new FormData(evento.currentTarget);
    const query = new URLSearchParams(window.location.search);
    const eventId = newEventId();

    try {
      const resposta = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanha: CAMPANHA,
          nome: campos.get("nome"),
          email: campos.get("email"),
          telefone: campos.get("telefone"),
          site: campos.get("site"),
          eventId,
          eventSourceUrl: window.location.href,
          ...Object.fromEntries(PARAMETROS.map((p) => [p, query.get(p)])),
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setEstado("erro");
        setMensagem(corpo?.erro ?? "Não conseguimos salvar sua inscrição. Tente de novo.");
        enviando.current = false;
        return;
      }

      // Reinscrição do mesmo e-mail não conta como lead novo, nem aqui nem na
      // Conversions API (a rota decide e avisa em `novo`).
      const corpo = await resposta.json().catch(() => null);
      if (corpo?.novo !== false) {
        window.fbq?.("track", "Lead", { content_name: "Black da Teacher" }, { eventID: eventId });
      }
      setEstado("ok");

      // Só chega aqui com a inscrição gravada. O caminho é relativo porque a
      // página vive em /black no ar e em /lp/black no ambiente local. A folga
      // deixa o Pixel enviar o Lead antes de o navegador sair da página.
      const destino = `${window.location.pathname.replace(/\/$/, "")}/grupo${window.location.search}`;
      setTimeout(() => window.location.assign(destino), 300);
    } catch {
      setEstado("erro");
      setMensagem("Sem conexão. Confira sua internet e tente de novo.");
      enviando.current = false;
    }
  }

  if (estado === "ok") {
    return (
      <p className="form-sucesso" role="status">
        Inscrição confirmada! Levando você para o grupo...
      </p>
    );
  }

  return (
    <form className="form-lead" id="formbqpq" name="form_black_pq" onSubmit={enviar}>
      <label className="sr-only" htmlFor="form-field-name">
        Nome
      </label>
      <input
        id="form-field-name"
        name="nome"
        type="text"
        placeholder="Seu nome"
        autoComplete="name"
        required
      />

      <label className="sr-only" htmlFor="form-field-email">
        Email
      </label>
      <input
        id="form-field-email"
        name="email"
        type="email"
        placeholder="Insira seu melhor e-mail"
        autoComplete="email"
        required
      />

      <label className="sr-only" htmlFor="form-field-phone">
        Telefone
      </label>
      <input
        id="form-field-phone"
        name="telefone"
        type="tel"
        placeholder="Seu telefone de contato"
        autoComplete="tel"
        required
      />

      {/* Isca pra robô: gente não vê este campo e ele precisa chegar vazio. */}
      <input className="form-isca" name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <button type="submit" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Enviando..." : "Clique aqui para mudar sua HISTÓRIA"}
      </button>

      {estado === "erro" && (
        <p className="form-erro" role="alert">
          {mensagem}
        </p>
      )}
    </form>
  );
}
