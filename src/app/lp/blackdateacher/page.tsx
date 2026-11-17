import PandaVsl from "./_components/PandaVsl";
import WhatsAppCta from "../black/_components/WhatsAppCta";

/**
 * VSL da Black: headline, vídeo e, a partir do pitch, o botão do WhatsApp.
 *
 * Versão mínima, sem copy longa por enquanto. A headline é a pergunta de
 * abertura da landing da Black, reaproveitada até chegar o texto da VSL.
 */
export default function BlackDaTeacherVsl() {
  return (
    <main className="vsl-pagina">
      <div className="vsl-coluna">
        <p className="vsl-selo">BLACK DA TEACHER</p>
        <h1 className="vsl-titulo">
          Teacher, quer formar turmas e parar de depender de aulas individuais?
        </h1>
        <PandaVsl oferta={<WhatsAppCta />} />
      </div>
    </main>
  );
}
