const depoimentos = [
  "didio",
  "junara",
  "matlima",
  "miura",
  "natfranco",
  "paula",
  "tereza",
  "youshine",
];

/**
 * Prova social em grade masonry (CSS `columns`).
 *
 * Antes isto era uma galeria 3D em WebGL que só avançava arrastando — gesto
 * que a maioria não descobre, deixando os depoimentos invisíveis na prática.
 * A grade mostra todos de uma vez, sem interação nenhuma, e é HTML estático:
 * nada aqui depende de JavaScript pra aparecer.
 */
export default function Testimonials() {
  return (
    <section id="depoimentos" className="relative py-16 md:py-24 bg-transparent z-10">
      <div className="max-w-6xl mx-auto px-6 text-center mb-10 md:mb-14">
        <h2 className="font-serif text-4xl sm:text-5xl md:text-5xl lg:text-6xl text-white leading-tight">
          Depoimentos de teachers que <br className="hidden md:block" /> já{" "}
          <span className="text-gold-500 italic">transformaram seus negócios!</span>
        </h2>
        <p className="mt-4 text-zinc-400 text-base md:text-lg font-light max-w-2xl mx-auto">
          Histórias reais de quem aplicou o método e mudou o próprio patamar.
        </p>
      </div>

      {/* `columns` faz o masonry nativo do navegador: as colunas se equilibram
          sozinhas e cada print mantém sua altura original, sem corte. */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 columns-2 lg:columns-3 gap-3 md:gap-4">
        {depoimentos.map((nome, i) => (
          <div
            key={nome}
            className="mb-3 md:mb-4 break-inside-avoid overflow-hidden rounded-xl border border-white/10 bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/lp/pht/images/depo/${nome}.jpg`}
              alt={`Depoimento de aluna da Teacher Ana (${i + 1} de ${depoimentos.length})`}
              // Os dois primeiros costumam entrar na tela junto com a seção;
              // o resto só carrega conforme a pessoa rola.
              loading={i < 2 ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-auto block"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
