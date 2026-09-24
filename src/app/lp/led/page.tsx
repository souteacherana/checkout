import UrgencyBar from "./_components/UrgencyBar";
import Nav from "./_components/Nav";
import Hero from "./_components/Hero";
import Pain from "./_components/Pain";
import Testimonials from "./_components/Testimonials";
import Offer from "./_components/Offer";
import Modules from "./_components/Modules";
import Faq from "./_components/Faq";
import About from "./_components/About";
import FinalCta from "./_components/FinalCta";
import Footer from "./_components/Footer";

/** Ordem das seções conforme o LED7.html — a numeração "01 —", "02 —" … que
 *  aparece nos títulos vem da copy e depende dela. */
export default function Home() {
  return (
    <>
      <UrgencyBar />
      <Nav />
      <main className="relative w-full">
        <Hero />
        <Pain />
        <Testimonials />
        <Offer />
        <Modules />
        <Faq />
        <About />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
