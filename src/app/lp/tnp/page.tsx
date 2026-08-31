import Header from "./_components/Header";
import Hero from "./_components/Hero";
import Marquee from "./_components/Marquee";
import Faq from "./_components/Faq";
import OfferTicket from "./_components/OfferTicket";
import MasonryGallery from "./_components/MasonryGallery";
import ProblemSolution from "./_components/ProblemSolution";
import Modules from "./_components/Modules";
import Instructor from "./_components/Instructor";
import FinalCta from "./_components/FinalCta";
import Footer from "./_components/Footer";

export default function Home() {
  return (
    <main className="relative w-full">
      <Header />
      <Hero />
      <Marquee />
      <Faq />
      <OfferTicket />
      <MasonryGallery />
      <ProblemSolution />
      <Modules />
      <Instructor />
      <FinalCta />
      <Footer />
    </main>
  );
}
