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
 * Prova social em grade.
 *
 * Antes isto era uma galeria 3D em WebGL que só avançava arrastando — gesto
 * que a maioria não descobre, deixando os depoimentos invisíveis na prática.
 * Agora são HTML estático: aparecem todos de uma vez, sem interação e sem
 * depender de JavaScript.
 *
 * Grade (e não `columns`): os oito prints são 800x1000, mesma proporção, então
 * uma grade uniforme é mais previsível. O `aspect-[4/5]` reserva o espaço de
 * cada card antes da imagem chegar — sem isso a seção crescia ~600px enquanto
 * as fotos carregavam, empurrando o conteúdo sob o dedo de quem rolava.
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

      <div className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {depoimentos.map((nome, i) => (
          <div
            key={nome}
            className="aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/lp/pht/images/depo/${nome}.jpg`}
              alt={`Depoimento de aluna da Teacher Ana (${i + 1} de ${depoimentos.length})`}
              width={800}
              height={1000}
              // Os primeiros entram na tela junto com a seção; o resto espera
              loading={i < 2 ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
