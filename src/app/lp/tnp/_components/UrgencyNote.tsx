"use client";

import { useEffect, useState } from "react";
import { EVENT_DATE_ISO } from "../_lib/workshop";

/**
 * Dia do calendário em Brasília, no formato "2026-09-19".
 *
 * A comparação precisa ser por DIA, e em Brasília: "amanhã" não é "faltam 24
 * horas". Às 23h da véspera faltam 16 horas e ainda é amanhã; às 8h do dia
 * faltam 7 e já é hoje. E o horário é anunciado em Brasília, então quem abre
 * a página de outro fuso tem que ler a mesma coisa que quem abre daqui.
 */
const diaEmBrasilia = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);

const INICIO = new Date(EVENT_DATE_ISO).getTime();
const DIA_DO_EVENTO = diaEmBrasilia(new Date(EVENT_DATE_ISO));
const UM_DIA = 86_400_000;
/** A imersão é anunciada como 3 horas; depois disso não há mais "ao vivo". */
const FIM = INICIO + 3 * 60 * 60 * 1000;

/** Sem JS, ou antes de o cliente saber que horas são: a parte sempre válida. */
const PADRAO = "Últimas vagas";

/** null = não mostrar nada (a aula já acabou). */
function textoDaVez(agora: number): string | null {
  if (agora >= FIM) return null;
  if (agora >= INICIO) return "Ao vivo agora";
  if (diaEmBrasilia(new Date(agora)) === DIA_DO_EVENTO) return "Últimas vagas · É hoje";
  if (diaEmBrasilia(new Date(agora + UM_DIA)) === DIA_DO_EVENTO) return "Últimas vagas · É amanhã";
  return PADRAO;
}

/**
 * Aviso de reta final abaixo do CTA do hero.
 *
 * O texto se ajusta sozinho conforme o dia vira, em vez de ficar fixo em "é
 * amanhã": no dia do workshop isso estaria errado justamente quando a página
 * recebe mais gente, e depois do início estaria vendendo uma aula que já
 * começou.
 *
 * Começa no texto padrão para o HTML do servidor bater com a primeira
 * renderização do cliente — mesma razão do placeholder em useCountdown.
 */
export default function UrgencyNote() {
  const [texto, setTexto] = useState<string | null>(PADRAO);

  useEffect(() => {
    const atualizar = () => setTexto(textoDaVez(Date.now()));

    atualizar();
    // De minuto em minuto: a virada que importa é de dia, não de segundo.
    const id = setInterval(atualizar, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!texto) return null;

  return (
    <div className="hero-urgency-note">
      <span className="pulse-dot" aria-hidden="true"></span>
      {texto}
    </div>
  );
}
