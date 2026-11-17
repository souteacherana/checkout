"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IFRAME_ID, PLAYER_SRC, SEGUNDO_DO_PITCH } from "../_lib/vsl";

const API_PANDA = "https://player.pandavideo.com.br/api.v2.js";
const CHAVE_JA_VIU = `vsl_pitch_visto_${IFRAME_ID}`;

type EventoPanda = { message?: string; currentTime?: number; isMutedIndicator?: boolean };
type PandaPlayerInstancia = { onEvent: (cb: (e: EventoPanda) => void) => void };

declare global {
  interface Window {
    PandaPlayer?: new (id: string, opcoes: { onReady?: () => void }) => PandaPlayerInstancia;
    pandascripttag?: Array<() => void>;
  }
}

/**
 * Player da VSL + o bloco que só aparece no pitch.
 *
 * Segue o script oficial do Panda ("Showing and Hiding Elements on the Page"):
 * a API do player (api.v2.js) avisa o tempo REAL do vídeo em `panda_timeupdate`.
 * Timer da página (setTimeout) não serve: continuaria contando com o vídeo
 * pausado e ignoraria quem avança.
 *
 * Duas escolhas em cima do script oficial:
 * - Enquanto o vídeo roda mudo no autoplay, o evento vem com
 *   `isMutedIndicator` e é ignorado. Sem isso o botão apareceria pra quem
 *   nem clicou pra assistir.
 * - Uma vez revelado, não esconde mais, e a revelação fica salva no
 *   navegador: quem volta à página ou retrocede o vídeo encontra o botão.
 */
export default function PandaVsl({ oferta }: { oferta: ReactNode }) {
  const [revelado, setRevelado] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(CHAVE_JA_VIU)) setRevelado(true);
    } catch {
      // Navegação privada sem localStorage: só não lembra entre visitas.
    }

    if (!document.querySelector(`script[src='${API_PANDA}']`)) {
      const script = document.createElement("script");
      script.src = API_PANDA;
      script.async = true;
      document.head.appendChild(script);
    }

    let ativo = true;
    window.pandascripttag = window.pandascripttag || [];
    window.pandascripttag.push(() => {
      if (!window.PandaPlayer) return;
      const player = new window.PandaPlayer(IFRAME_ID, {
        onReady() {
          player.onEvent((e) => {
            if (!ativo || e.message !== "panda_timeupdate" || e.isMutedIndicator) return;
            if ((e.currentTime ?? 0) >= SEGUNDO_DO_PITCH) {
              setRevelado(true);
              try {
                localStorage.setItem(CHAVE_JA_VIU, "1");
              } catch {}
            }
          });
        },
      });
    });

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <>
      <div className="vsl-player">
        <iframe
          id={IFRAME_ID}
          src={PLAYER_SRC}
          title="Vídeo da Black da Teacher"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
          allowFullScreen
          // O React sabe renderizar fetchPriority, mas o tipo dele não prevê o
          // atributo em iframe.
          {...({ fetchPriority: "high" } as object)}
        />
      </div>
      {revelado ? (
        <div className="vsl-oferta">{oferta}</div>
      ) : (
        <p className="vsl-apoio">Assista até o final.</p>
      )}
    </>
  );
}
