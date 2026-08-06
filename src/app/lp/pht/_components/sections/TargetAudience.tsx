import { CheckCircle2 } from "lucide-react";

const items = [
  "Cobra menos do que merece por medo de perder aluno",
  "Já tentou subir o preço e travou na hora de comunicar",
  "Se sente inseguro sobre o próprio trabalho e vive se comparando",
  "Quer ser reconhecido como autoridade, não como mais um",
  "Quer faturar mais sem trabalhar o dobro",
  "Quer alunos que não somem, não choram preço e valorizam o que você entrega"
];

export default function TargetAudience() {

  return (
    <section 
      className="relative py-16 md:py-32 px-6 bg-transparent z-10 border-t border-white/5"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          className="font-serif text-4xl sm:text-5xl md:text-6xl text-white mb-10 md:mb-16 text-center md:text-left leading-tight"
        >
          Esse workshop é pra você, <span className="text-gold-500 italic">teacher, que...</span>
        </h2>

        <ul className="space-y-6">
          {items.map((item, index) => (
            <li 
              key={index} 
              className="flex items-start gap-6 group"
            >
              <div className="mt-1 flex-shrink-0 text-gold-500">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-base sm:text-lg md:text-2xl text-zinc-300 font-light leading-snug group-hover:text-white transition-colors duration-300">
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
