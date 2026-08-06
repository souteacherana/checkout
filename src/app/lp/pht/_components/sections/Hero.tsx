import { Calendar, Clock, Monitor, Timer, Video } from "lucide-react";

const ASSETS = "https://teacherana.com.br/wp-content/uploads/Rise/workshops/PHT2026";

// GIF transparente de 1px. Serve de `src` nas imagens que só existem em um
// breakpoint: o <source media> abaixo entrega a imagem real quando a tela
// casa, e quando não casa o navegador baixa só estes 43 bytes. `display:none`
// no CSS não evitaria o download — o celular baixava as fotos de desktop e o
// desktop baixava a do celular.
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Componente para a textura de anéis (SVG)
const PatternTexture = () => (
  <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.05]">
    <svg
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid slice"
      className="w-[300%] md:w-full h-full"
    >
      <g stroke="#ffffff" strokeWidth="1" fill="none">
        {/* Linhas guias centrais */}
        <line x1="500" y1="0" x2="500" y2="500" strokeWidth="0.5" />
        <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="0.5" />

        {/* Círculos concêntricos entrelaçados */}
        <circle cx="500" cy="250" r="150" />
        <circle cx="380" cy="250" r="150" />
        <circle cx="260" cy="250" r="150" />
        <circle cx="620" cy="250" r="150" />
        <circle cx="740" cy="250" r="150" />
      </g>
    </svg>
  </div>
);

export default function Hero() {
  return (
    // min-h-dvh (não min-h-screen/100vh): no celular o 100vh ignora a barra do
    // navegador, então a hero ficava mais alta que a tela e empurrava o CTA
    // pra baixo da dobra. O dvh acompanha a área realmente visível.
    <section
      className="relative min-h-dvh w-full overflow-hidden bg-black flex flex-col justify-center items-center z-10 py-6 md:py-0"
    >
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src={`${ASSETS}/assets/fundo.jpg`}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Textura fixa no fundo */}
      <PatternTexture />

      {/* ============================================================== */}
      {/* IMAGEM DA ANA */}
      {/* ============================================================== */}

      {/* DESKTOP: ANA1 na esquerda, ANA2 na direita (não baixam no celular) */}
      <div className="hidden md:block absolute inset-0 w-full h-full z-20 pointer-events-none">
        <picture className="contents">
          <source media="(min-width: 768px)" srcSet={`${ASSETS}/assets/ANA1.webp`} />
          <img
            src={PIXEL}
            alt="Teacher Ana"
            width={1920}
            height={1080}
            className="absolute bottom-0 left-0 h-[85%] lg:h-[95%] w-auto object-contain translate-x-[5%] drop-shadow-2xl"
          />
        </picture>
        <picture className="contents">
          <source media="(min-width: 768px)" srcSet={`${ASSETS}/assets/ANA2.webp`} />
          <img
            src={PIXEL}
            alt="Teacher Ana"
            width={1920}
            height={1080}
            className="absolute bottom-0 right-0 h-[80%] lg:h-[90%] w-auto object-contain -translate-x-[5%] drop-shadow-2xl"
          />
        </picture>
      </div>

      {/* MOBILE: ANA3 unificada no topo (não baixa no desktop) */}
      <div className="md:hidden relative w-full flex justify-center z-20 pointer-events-none mt-1">
        <div className="relative">
          <picture className="contents">
            <source media="(max-width: 767px)" srcSet={`${ASSETS}/assets/ANA3.png`} />
            <img
              src={PIXEL}
              alt="Teacher Ana"
              width={460}
              height={259}
              className="hero-ana w-[118vw] max-w-[550px] h-auto object-contain drop-shadow-2xl -mt-10"
            />
          </picture>
          {/* Sombra base da Ana no Mobile para fundir com a caixa de blur */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* CAIXA DE CONTEÚDO (Blur Box) */}
      {/* ============================================================== */}
      <div
        className="hero-card relative z-30 w-[94%] md:w-[85%] max-w-2xl mx-auto backdrop-blur-md bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[3rem] px-4 py-6 md:px-10 md:py-12 text-center shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col items-center -mt-20 md:mt-0"
      >
        {/* Glow interno superior para dar volume na caixa */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-white/20 blur-xl rounded-full"></div>

        {/* Logo do Workshop */}
        <img
          src={`${ASSETS}/PHT.svg`}
          alt="PHT Workshop Logo"
          width={300}
          height={117}
          className="hero-logo h-20 md:h-64 w-auto object-contain mb-4 md:mb-1 drop-shadow-lg"
        />

        <h1 className="hero-title font-serif text-4xl sm:text-5xl md:text-7xl lg:text-[4.5rem] leading-[1.05] tracking-tight mb-3 md:mb-8 drop-shadow-2xl">
          <span className="block text-white">COBRE ATÉ R$200 A HORA-AULA</span>
          <span className="block font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-600 italic pr-2 md:pr-4 pb-1">
            SEM PERDER OS ALUNOS QUE VOCÊ JÁ TEM
          </span>
        </h1>

        <p className="hero-sub text-zinc-300 text-sm sm:text-base md:text-xl font-light max-w-2xl mb-3 md:mb-5 text-balance leading-relaxed">
          O que define o seu preço não é o quanto você ensina bem — é o quanto você sabe comunicar valor.
        </p>

        <p className="text-zinc-400 text-xs sm:text-sm md:text-lg font-light max-w-2xl mb-5 md:mb-10 text-balance leading-relaxed">
          No dia 22/08, um workshop de 3 horas sobre posicionamento, nicho, precificação e as respostas certas para &ldquo;achei caro&rdquo; — sem dar desconto.
        </p>

        {/* Informações do Evento */}
        <div className="flex flex-row flex-wrap items-center justify-center gap-x-3 md:gap-x-5 gap-y-2 mb-5 md:mb-12">
          {[
            { Icone: Calendar, texto: "22/08" },
            { Icone: Clock, texto: "15h" },
            { Icone: Monitor, texto: "Ao vivo no Zoom" },
            { Icone: Timer, texto: "3 horas" },
          ].map(({ Icone, texto }, i) => (
            <div key={texto} className="flex items-center gap-1.5 md:gap-2">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20 mr-2 hidden sm:block" />}
              <Icone className="w-4 h-4 md:w-5 md:h-5 text-gold-400" />
              <span className="text-gold-400 font-medium text-[11px] sm:text-xs md:text-sm tracking-widest uppercase">
                {texto}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <a
            href="#oferta"
            className="group relative inline-flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto px-6 md:px-12 py-3.5 md:py-5 bg-gold-500 text-black font-bold text-sm md:text-base lg:text-lg rounded-full overflow-hidden transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_40px_rgba(187,156,76,0.2)]"
          >
            <span className="relative z-10 uppercase tracking-widest">Quero cobrar o que eu valho — R$49,90</span>
            <div className="absolute inset-0 bg-white translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
            <span className="relative z-10 group-hover:text-black transition-colors duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </span>
          </a>
          <div className="flex items-center gap-2 text-zinc-400 text-xs md:text-sm">
            <Video className="w-4 h-4 text-gold-500" />
            <span>Gravação disponível por 15 dias</span>
          </div>
        </div>
      </div>
    </section>
  );
}
