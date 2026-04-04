import Hero from "@/components/hero/Hero";
import AboutUs from "@/components/AboutUs";
import Announcements from "@/components/Announcements";
import Events from "@/components/Events";
import Articles from "@/components/Articles";
import Team from "@/components/Team";
import Sponsors from "@/components/Sponsors";
import Gallery from "@/components/Gallery";
import Contact from "@/components/Contact";
import ScrollBasedBlur from "@/components/ScrollBasedBlur";
import FrozenSection from "@/components/FrozenSection";
import SitePopup from "@/components/SitePopup";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <FrozenSection id="hero" className="min-h-screen">
        <Hero />
      </FrozenSection>

      <FrozenSection id="hakkimizda">
        <AboutUs />
      </FrozenSection>

      <FrozenSection id="duyurular">
        <Announcements />
      </FrozenSection>

      <FrozenSection id="etkinlikler">
        <Events />
      </FrozenSection>

      <FrozenSection id="yazilar">
        <Articles />
      </FrozenSection>

      <FrozenSection id="ekip">
        <Team />
      </FrozenSection>

      <FrozenSection id="sponsorlar">
        <Sponsors />
      </FrozenSection>

      <FrozenSection id="galeri">
        <Gallery />
      </FrozenSection>

      <FrozenSection id="iletisim">
        <Contact />
      </FrozenSection>

      {/* Footer is small, can stay */}
      <footer className="bg-black border-t border-rose-900/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 HSD Malatya Turgut Özal Topluluğu. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>

      {/* Scroll Based Blur Effect - Global effect, maybe keep outside or wrap? It listens to scroll anyway. */}
      {/* It's lightweight now, so acceptable to keep global */}
      <ScrollBasedBlur />

      {/* Site Popup - Supabase'den ayarları çeker */}
      <SitePopup />
    </main>
  );
}
