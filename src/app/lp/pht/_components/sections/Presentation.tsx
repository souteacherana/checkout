
const discoveries = [
  "Como precificar e organizar seus valores de forma a te valorizar e sendo vendável",
  "Como nunca mais dar desconto",
  "Como divulgar sua aula atraindo alunos que pagam bem",
  "O que mudar na sua comunicação e posicionamento para ser visto como premium",
  "Como sair do ciclo de “aula barata e agenda cheia” e virar referência",
  "A fórmula simples pra cobrar R$100, R$150 ou mais por aula sem culpa",
  "Como mostrar valor antes mesmo do aluno perguntar o preço"
];

export default function Presentation() {

  return (
    <section 
      className="relative py-16 md:py-32 px-6 bg-transparent z-10"
    >
      <div className="max-w-6xl mx-auto">
        <h2 
          className="font-serif text-4xl sm:text-5xl md:text-6xl text-white mb-10 md:mb-20 text-center leading-tight text-balance"
        >
          O que você vai <span className="text-gold-500 italic">descobrir</span> <br/>
          nesse workshop
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {discoveries.map((text, index) => (
            <div 
              key={index} 
              className="group p-6 md:p-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-gold-500/30 transition-all duration-500 flex flex-col justify-between"
            >
              <div className="text-gold-500/50 font-serif text-4xl md:text-5xl mb-4 md:mb-6 group-hover:text-gold-400 transition-colors">
                {String(index + 1).padStart(2, '0')}
              </div>
              <p className="text-base md:text-xl text-zinc-300 font-light leading-relaxed group-hover:text-white transition-colors">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
