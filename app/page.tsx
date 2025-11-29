import Hero from "@/components/hero/Hero";
import AboutUs from "@/components/AboutUs";
import Announcements from "@/components/Announcements";
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

      {/* Activities Section */}
      <section id="etkinlikler" className="relative py-20 bg-gradient-to-b from-black to-red-950">
        <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-white to-pink-400 bg-clip-text text-transparent">
          Etkinliklerimiz
        </h2>
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-red-950/50 to-rose-950/50 backdrop-blur-xl rounded-2xl p-6 border border-rose-900/30 shadow-xl hover:shadow-2xl hover:border-rose-800/50 transition-all duration-300 hover:-translate-y-2">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-pink-400 mb-3">Workshop</h3>
              <p className="text-gray-300">
                En son teknoloji trendleri hakkında pratik workshoplar
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-950/50 to-rose-950/50 backdrop-blur-xl rounded-2xl p-6 border border-rose-900/30 shadow-xl hover:shadow-2xl hover:border-rose-800/50 transition-all duration-300 hover:-translate-y-2">
              <div className="text-5xl mb-4">💻</div>
              <h3 className="text-2xl font-bold text-pink-400 mb-3">Hackathon</h3>
              <p className="text-gray-300">
                Takım çalışması ve inovasyon odaklı yarışmalar
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-950/50 to-rose-950/50 backdrop-blur-xl rounded-2xl p-6 border border-rose-900/30 shadow-xl hover:shadow-2xl hover:border-rose-800/50 transition-all duration-300 hover:-translate-y-2">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-2xl font-bold text-pink-400 mb-3">Tech Talks</h3>
              <p className="text-gray-300">
                Alanında uzman konuşmacılardan ilham verici konuşmalar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="iletisim" className="relative py-20 bg-gradient-to-b from-red-950 to-black">
        <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-white to-pink-400 bg-clip-text text-transparent">
          İletişim
        </h2>
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-gradient-to-br from-red-950/50 to-rose-950/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-rose-900/30">
            <form className="space-y-6">
              <div>
                <label className="block text-pink-400 mb-2 font-semibold">Ad Soyad</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-black/50 border border-rose-900/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder-gray-500 transition-all"
                  placeholder="Adınız ve soyadınız"
                />
              </div>
              <div>
                <label className="block text-pink-400 mb-2 font-semibold">E-posta</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-black/50 border border-rose-900/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder-gray-500 transition-all"
                  placeholder="ornek@email.com"
                />
              </div>
              <div>
                <label className="block text-pink-400 mb-2 font-semibold">Mesajınız</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-black/50 border border-rose-900/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder-gray-500 transition-all resize-none"
                  placeholder="Mesajınızı buraya yazın..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-600 to-red-700 text-white py-3 rounded-lg font-semibold hover:from-rose-500 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-rose-500/50"
              >
                Gönder
              </button>
            </form>
          </div>
        </div>
      </section>

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
