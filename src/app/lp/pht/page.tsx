import Hero from "./_components/sections/Hero";
import TargetAudience from "./_components/sections/TargetAudience";
import Testimonials from "./_components/sections/Testimonials";
import Offer from "./_components/sections/Offer";
import PainAndFlip from "./_components/sections/PainAndFlip";
import Presentation from "./_components/sections/Presentation";
import FAQ from "./_components/sections/FAQ";
import About from "./_components/sections/About";

// Componente para a textura de anéis (SVG) global
const GlobalPatternTexture = () => (
  <div className="fixed inset-0 z-[1] pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.05]">
    <svg 
      viewBox="0 0 1000 500" 
      preserveAspectRatio="xMidYMid slice" 
      className="w-[300%] md:w-full h-full"
    >
      <g stroke="#ffffff" strokeWidth="1" fill="none">
        <line x1="500" y1="0" x2="500" y2="500" strokeWidth="0.5" />
        <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="0.5" />
        <circle cx="500" cy="250" r="150" />
        <circle cx="380" cy="250" r="150" />
        <circle cx="260" cy="250" r="150" />
        <circle cx="620" cy="250" r="150" />
        <circle cx="740" cy="250" r="150" />
      </g>
    </svg>
  </div>
);

export default function Home() {
  return (
    <main className="relative bg-black min-h-screen selection:bg-gold-500 selection:text-black">
      <GlobalPatternTexture />
      
      {/* Page Content Layers */}
      <div className="relative z-10">
        <Hero />
        <TargetAudience />
        <Testimonials />
        <Offer />
        <PainAndFlip />
        <Presentation />
        <Offer />
        <FAQ />
        <About />
      </div>
      
      <footer className="relative z-10 py-8 text-center text-zinc-600 text-xs md:text-sm border-t border-white/5 bg-black">
        <p>© {new Date().getFullYear()} Teacher Ana. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
