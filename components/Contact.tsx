import React from 'react';
import TargetCursor from './TargetCursor/TargetCursor';

export default function Contact() {
    return (
        <section id="iletisim" className="relative py-24 bg-gradient-to-b from-red-950/20 to-black overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] animate-pulse delay-1000" />
            </div>

            <div className="container mx-auto px-4 relative z-10" id="contact-container">
                {/* Scoped TargetCursor - only active for user interactions within #contact-container */}
                <TargetCursor
                    containerSelector="#contact-container"
                    targetSelector=".cursor-target"
                    spinDuration={4}
                    hideDefaultCursor={true}
                    parallaxOn={true}
                />

                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-rose-200 to-rose-400 bg-clip-text text-transparent tracking-tight">
                            İletişime Geçin
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Projeleriniz veya sorularınız için bize ulaşın. Sizinle tanışmak için sabırsızlanıyoruz.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-5 gap-8 items-start">

                        {/* Contact Info Side */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors duration-300 group cursor-target">
                                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-rose-400 transition-colors">Adres</h3>
                                <p className="text-gray-400">
                                    Malatya Turgut Özal Üniversitesi,<br />
                                    Battalgazi Kampüsü
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors duration-300 group cursor-target">
                                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-rose-400 transition-colors">Email</h3>
                                <a href="mailto:info@hsdmtu.com" className="text-gray-400 hover:text-white transition-colors">
                                    info@hsdmtu.com
                                </a>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors duration-300 group cursor-target">
                                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-rose-400 transition-colors">Sosyal Medya</h3>
                                <div className="flex gap-4">
                                    {/* Social Icons would go here */}
                                    <span className="text-gray-400">Instagram</span>
                                    <span className="text-gray-400">LinkedIn</span>
                                    <span className="text-gray-400">Twitter</span>
                                </div>
                            </div>
                        </div>

                        {/* Form Side */}
                        <div className="md:col-span-3">
                            <form className="space-y-6 bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">

                                {/* Form gradient glow */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-rose-500/30 transition-all duration-500" />

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="relative group/input">
                                        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">Ad Soyad</label>
                                        <input
                                            type="text"
                                            className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 text-white placeholder-gray-600 transition-all cursor-target"
                                            placeholder="Adınız Soyadınız"
                                        />
                                    </div>
                                    <div className="relative group/input">
                                        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">E-posta</label>
                                        <input
                                            type="email"
                                            className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 text-white placeholder-gray-600 transition-all cursor-target"
                                            placeholder="ornek@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="relative group/input">
                                    <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">Konu</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 text-white placeholder-gray-600 transition-all cursor-target"
                                        placeholder="Mesajınızın konusu"
                                    />
                                </div>

                                <div className="relative group/input">
                                    <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">Mesajınız</label>
                                    <textarea
                                        rows={5}
                                        className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 text-white placeholder-gray-600 transition-all resize-none cursor-target"
                                        placeholder="Bize iletmek istediklerinizi buraya yazın..."
                                    />
                                </div>

                                <button
                                    type="button" // changed to button to prevent refresh for demo
                                    className="w-full bg-gradient-to-r from-rose-700 to-pink-800 text-white font-semibold py-4 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-rose-900/20 hover:shadow-rose-600/40 hover:-translate-y-1 cursor-target flex items-center justify-center gap-2 group/btn"
                                >
                                    <span>Mesajı Gönder</span>
                                    <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
