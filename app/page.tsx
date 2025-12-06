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

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero Section */}
      <Hero />

      {/* About Section */}
      <AboutUs />

      {/* Announcements Section */}
      <Announcements />

      {/* Events Section */}
      <Events />

      {/* Articles Section */}
      <Articles />

      {/* Team Section */}
      <Team />

      {/* Sponsors Section */}
      <Sponsors />

      {/* Gallery Section */}
      <Gallery />

      {/* Contact Section */}
      <Contact />

      {/* Footer */}
      <footer className="bg-black border-t border-rose-900/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 HSD Malatya Turgut Özal Topluluğu. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
      {/* Scroll Based Blur Effect */}
      <ScrollBasedBlur />
    </main>
  );
}
