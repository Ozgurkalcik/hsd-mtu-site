import dynamic from 'next/dynamic';
import Hero from "@/components/hero/Hero";
import FrozenSection from "@/components/FrozenSection";
import ScrollBasedBlur from "@/components/ScrollBasedBlur";
import SitePopup from "@/components/SitePopup";

const AboutUs = dynamic(() => import("@/components/AboutUs"), { ssr: true });
const Announcements = dynamic(() => import("@/components/Announcements"), { ssr: true });
const Events = dynamic(() => import("@/components/Events"), { ssr: true });
const Articles = dynamic(() => import("@/components/Articles"), { ssr: true });
const Team = dynamic(() => import("@/components/Team"), { ssr: true });
const Sponsors = dynamic(() => import("@/components/Sponsors"), { ssr: true });
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: true });
const Contact = dynamic(() => import("@/components/Contact"), { ssr: true });

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

      <FrozenSection id="sponsorlar" className="min-h-screen">
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
            © 2026 HSD Malatya Turgut Özal Topluluğu. Tüm hakları saklıdır. - MZ
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
