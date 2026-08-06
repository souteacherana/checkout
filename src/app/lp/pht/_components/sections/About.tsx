
export default function About() {

  return (
    <section 
      className="relative py-16 md:py-32 px-6 bg-transparent z-10 border-t border-white/5"
    >
      <div 
        className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center"
      >
        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-ink-900 border border-white/10">
          {/* Última seção da página: só carrega quando o visitante chega perto */}
          <img
            src="https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026/ana.jpg"
            alt="Teacher Ana"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        <div className="flex flex-col justify-center">
          <h2 className="font-serif text-[2.5rem] sm:text-5xl md:text-5xl lg:text-6xl text-white mb-6 md:mb-8 leading-tight">
            Quem é a <br/>
            <span className="text-gold-500 italic">Teacher Ana?</span>
          </h2>
          
          <div className="space-y-4 md:space-y-6 text-base md:text-lg text-zinc-300 font-light leading-relaxed">
            <p>
              Ana é esposa, mãe, empresária e mentora.
            </p>
            <p>
              Começou a viver de aulas particulares para se tornar mãe e poder passar mais tempo com suas filhas. Essa mudança de vida a fez estruturar um negócio de aulas particulares que se tornou sustentável e crescente ao longo dos anos.
            </p>
            <p>
              Desde 2021 no digital, ela auxilia professores particulares a estruturarem e se organizarem para crescer como professores empreendedores e poderem viver fazendo aquilo que mais amam sendo bem pagos por isso!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
