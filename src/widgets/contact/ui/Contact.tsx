'use client';
import React, { useRef, useState } from 'react';
import { LuMapPin, LuMail, LuInstagram, LuLinkedin, LuTwitter, LuSend, LuCircleCheck, LuCircleAlert, LuLoaderCircle } from "react-icons/lu";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    // Motion parameters for 3D Tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 100, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 100, damping: 20 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["2.5deg", "-2.5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-2.5deg", "2.5deg"]);

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;

        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (response.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', subject: '', message: '' });
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                setStatus('error');
                setErrorMessage(result.error || 'Mesaj gönderilemedi.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage('Bir bağlantı hatası oluştu.');
        }
    };

    return (
        <section id="iletisim" className="relative py-24 bg-gradient-to-b from-red-950/20 to-black overflow-hidden flex items-center justify-center min-h-screen">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[60px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10" id="contact-container">

                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-6xl font-bold mb-6 py-2 bg-gradient-to-r from-white via-rose-200 to-rose-400 bg-clip-text text-transparent tracking-tight">
                            İletişime Geçin
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Projeleriniz veya sorularınız için bize ulaşın. Sizinle tanışmak için sabırsızlanıyoruz.
                        </p>
                    </div>

                    {/* Unified Card Container Wrapper for Perspective */}
                    <div className="perspective-[1000px] w-full min-h-[600px] flex justify-center">
                        <motion.div
                            ref={ref}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                rotateX,
                                rotateY,
                                transformStyle: "preserve-3d",
                            }}
                            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full transform-gpu"
                        >

                            {/* Left Side: Info Panel */}
                            <div className="w-full md:w-2/5 bg-gradient-to-br from-rose-950/50 to-black/50 p-12 flex flex-col justify-between relative overflow-hidden">
                                {/* Decorative Circle */}
                                <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/20 rounded-full blur-[60px] pointer-events-none" />

                                <div>
                                    <h3 className="text-3xl font-bold text-white mb-8">İletişim Bilgileri</h3>
                                    <p className="text-gray-400 mb-12 leading-relaxed">
                                        Size yardımcı olmaktan mutluluk duyarız. Aşağıdaki bilgilerden bize ulaşabilir veya formu doldurabilirsiniz.
                                    </p>

                                    <div className="space-y-8">
                                        <div className="flex items-start gap-4 group">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/10 transition-all duration-300">
                                                <LuMapPin size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold mb-1">Adres</h4>
                                                <p className="text-gray-400 text-sm">
                                                    Malatya Turgut Özal Üniversitesi,<br />
                                                    Yeşilyurt Yerleşkesi
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 group">
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-rose-400 group-hover:scale-110 group-hover:bg-rose-500/10 transition-all duration-300">
                                                <LuMail size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold mb-1">Email</h4>
                                                <a href="mailto:huaweidevgroups44@gmail.com" className="text-gray-400 text-sm hover:text-white transition-colors">
                                                    huaweidevgroups44@gmail.com
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Social Media - Bottom */}
                                <div className="mt-12">
                                    <h4 className="text-white font-semibold mb-4">Takip Edin</h4>
                                    <div className="flex gap-4">
                                        {[
                                            { icon: <LuInstagram size={20} />, href: "https://www.instagram.com/hsdmtu/" },
                                            { icon: <LuLinkedin size={20} />, href: "https://www.linkedin.com/in/hsd-malatya-turgut-ozal-university-2a997a385" }
                                        ].map((social, index) => (
                                            <a
                                                key={index}
                                                href={social.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white/5 rounded-full border border-white/10 text-gray-400 hover:text-rose-400 hover:bg-white/10 hover:scale-110 transition-all duration-300"
                                            >
                                                {social.icon}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Form Panel */}
                            <div className="w-full md:w-3/5 p-12 bg-black/20 relative">
                                <AnimatePresence>
                                    {status === 'success' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-8 text-center"
                                        >
                                            <LuCircleCheck className="text-green-500 mb-4" size={64} />
                                            <h4 className="text-2xl font-bold text-white mb-2">Mesajınız Alındı!</h4>
                                            <p className="text-gray-400">En kısa sürede size geri dönüş yapacağız.</p>
                                            <button
                                                onClick={() => setStatus('idle')}
                                                className="mt-8 px-6 py-2 border border-white/20 rounded-full text-white text-sm hover:bg-white/10 transition-colors"
                                            >
                                                Yeni Mesaj
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="group/input">
                                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">Ad Soyad</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:bg-white/10 text-white placeholder-gray-600 transition-all duration-300"
                                                placeholder="Adınız Soyadınız"
                                            />
                                        </div>
                                        <div className="group/input">
                                            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">E-posta</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:bg-white/10 text-white placeholder-gray-600 transition-all duration-300"
                                                placeholder="ornek@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="group/input">
                                        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">Konu</label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:bg-white/10 text-white placeholder-gray-600 transition-all duration-300"
                                            placeholder="Mesajınızın konusu"
                                        />
                                    </div>

                                    <div className="group/input">
                                        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1 group-focus-within/input:text-rose-400 transition-colors">Mesajınız</label>
                                        <textarea
                                            rows={5}
                                            required
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-rose-500/50 focus:bg-white/10 text-white placeholder-gray-600 transition-all duration-300 resize-none"
                                            placeholder="Bize iletmek istediklerinizi buraya yazın..."
                                        />
                                    </div>

                                    {status === 'error' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 text-red-500 p-4 bg-red-500/10 rounded-xl border border-red-500/20"
                                        >
                                            <LuCircleAlert size={20} />
                                            <span className="text-sm">{errorMessage}</span>
                                        </motion.div>
                                    )}

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={status === 'loading'}
                                            className="w-full bg-gradient-to-r from-rose-700 to-pink-800 text-white font-semibold py-4 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-rose-900/20 hover:shadow-rose-600/40 hover:-translate-y-1 flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                                        >
                                            {status === 'loading' ? (
                                                <>
                                                    <span>Gönderiliyor...</span>
                                                    <LuLoaderCircle className="animate-spin" size={20} />
                                                </>
                                            ) : (
                                                <>
                                                    <span>Mesajı Gönder</span>
                                                    <LuSend className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform duration-300" size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </motion.div>

                    </div>
                </div>
            </div>
        </section>
    );
}
