"use client";

import { useRef } from "react";
import { track } from "@/lib/pixel";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=556791286394&text=Ol%C3%A1%2C+gostaria+de+receber+mais+informa%C3%A7%C3%B5es+sobre+a+Black+da+Teacher%21&type=phone_number&app_absent=0";

/**
 * CTA da landing: abre a conversa no WhatsApp da equipe.
 *
 * Substituiu o formulário de inscrição. Sem formulário não há Lead, então o
 * clique vira `Contact` na Meta (navegador + Conversions API, mesmo eventId,
 * via lib/pixel). Uma vez por visita: clicar de novo não conta outro contato.
 *
 * No GA4 o clique já é medido pelo GTM, que dispara `whatsapp` em todo clique
 * numa URL com "whatsapp".
 */
export default function WhatsAppCta() {
  const registrado = useRef(false);

  return (
    <a
      className="whatsapp-cta"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (registrado.current) return;
        registrado.current = true;
        track("Contact", { content_name: "Black da Teacher" });
      }}
    >
      Clique aqui para mudar sua HISTÓRIA
    </a>
  );
}
