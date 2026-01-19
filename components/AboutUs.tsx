
"use client";

import { motion } from "motion/react";
import FloatingLines from "@/components/FloatingLines/FloatingLines";
import { LuCode, LuTarget, LuEye, LuGem } from "react-icons/lu";

export default function AboutUs() {
    const cards = [
        {
            title: "Biz Kimiz?",
            icon: <LuCode />,
            content: "HSD (High School Developers) Malatya Turgut Özal Topluluğu, teknolojinin sınırlarını zorlayan ve geleceği kodlayan lise öğrencilerinin buluşma noktasıdır. Sadece kod yazmuyoruz; fikirleri gerçeğe, hayalleri projelere dönüştürüyoruz.",
            delay: 0.2
        },
        {
            title: "Misyonumuz",
            icon: <LuTarget />,
            content: "Genç geliştiricilere ilham vermek, onlara modern teknolojileri öğretmek ve birlikte büyüyecekleri bir ekosistem sunmak. İnovasyon tutkusuyla bir araya gelen ekibimiz, yazılım dünyasında iz bırakmayı hedefliyor.",
            delay: 0.4
        },
        {
            title: "Vizyonumuz",
            icon: <LuEye />,
            content: "Türkiye'nin en aktif ve üretken lise yazılım topluluğu olmak. Teknolojiyi sadece tüketen değil, üreten bir nesil yetiştirmek ve global ölçekte projeler geliştirmek.",
            delay: 0.6
        },
        {
            title: "Değerlerimiz",
            icon: <LuGem />,
            content: "Sürekli öğrenme, paylaşım kültürü, takım çalışması ve inovasyon. Her bir üyemizin gelişimine değer veriyor, 'birlikte daha güçlüyüz' ilkesiyle hareket ediyoruz.",
            delay: 0.8
        }
    ];

    return (
        <section id="hakkimizda" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black py-24">
            {/* Background: Floating Lines */}
            <div className="absolute inset-0 z-0 opacity-60">
                <FloatingLines
                    enabledWaves={['top', 'middle', 'bottom']}
                    lineCount={[6, 8, 10]}
                    lineDistance={[10, 8, 6]}
                    bendRadius={5.0}
                    bendStrength={-0.5}
                    interactive={true}
                    parallax={true}
                    linesGradient={['#dc143c', '#800080', '#dc143c']} /* Rose to Purple to Rose gradient */
                />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-rose-200 to-rose-400 bg-clip-text text-transparent tracking-tight mb-6">
                        Hakkımızda
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Geleceği kodlayan, inovasyonla büyüyen ve teknolojiyi tutkuyla takip eden bir topluluğuz.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {cards.map((card, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                                delay: card.delay,
                                duration: 0.5,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                            }}
                            className="group relative"
                        >
                            {/* Animated Gradient Border Background - Neon Effect Restored */}
                            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />

                            {/* Card Content - Optimized (Reduced backdrop blur) */}
                            <div className="relative h-full bg-black/70 backdrop-blur-sm rounded-2xl border border-white/10 p-8 transition-all duration-300 group-hover:-translate-y-1">

                                {/* Icon with Glow */}
                                <div className="relative w-16 h-16 mb-6">
                                    <div className="absolute inset-0 bg-rose-500/20 rounded-xl blur-xl group-hover:bg-rose-500/40 transition-colors duration-300" />
                                    <div className="relative h-full w-full bg-gradient-to-br from-white/10 to-transparent border border-white/20 rounded-xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                                        {card.icon}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-rose-400 group-hover:to-purple-400 transition-all duration-300">
                                    {card.title}
                                </h3>

                                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                    {card.content}
                                </p>

                                {/* Decorative Corner Line */}
                                <div className="absolute bottom-0 right-0 w-0 h-0.5 bg-gradient-to-l from-rose-500 to-transparent group-hover:w-1/2 transition-all duration-500" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
