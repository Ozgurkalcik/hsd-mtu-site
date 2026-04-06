'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { LuCalendarDays, LuMapPin } from 'react-icons/lu';
import HomeButton from '@/components/HomeButton';

interface CustomPageData {
    title: string;
    description: string | null;
    image: string | null;
    event_date: string | null;
    location: string | null;
    action_url: string | null;
    action_text: string | null;
}

const MotionImg = motion.img;

export default function CustomPageView({ data }: { data: CustomPageData }) {
    const hasImage = !!data.image;
    const containerRef = useRef<HTMLDivElement>(null);
    const descRef = useRef<HTMLDivElement>(null);
    const descInView = useInView(descRef, { once: true, margin: '-100px' });

    const { scrollY } = useScroll();
    // Resim parallax — 0px'den 400px scroll'a kadar resim 120px yukarı kayar
    const imageY = useTransform(scrollY, [0, 600], [0, 120]);
    const imageScale = useTransform(scrollY, [0, 600], [1, 1.08]);
    const overlayOpacity = useTransform(scrollY, [0, 400], [0.45, 0.85]);
    const springImageY = useSpring(imageY, { stiffness: 60, damping: 20 });
    const springImageScale = useSpring(imageScale, { stiffness: 60, damping: 20 });

    const formattedDate = data.event_date
        ? new Date(data.event_date).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'long',
          })
        : null;

    const formattedTime = data.event_date
        ? new Date(data.event_date).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

    // Harf-harf animasyon için kelimeler
    const words = data.title.split(' ');

    return (
        <div ref={containerRef} className="relative bg-[#030303] min-h-screen overflow-x-hidden">
            <HomeButton />
            {/* ─── HERO: TAM EKRAN GÖRSEL ─── */}
            <div className="sticky top-0 w-full h-screen overflow-hidden z-0">
                {hasImage ? (
                    <>
                        {/* Ana Görsel */}
                        <MotionImg
                            src={data.image!}
                            alt={data.title}
                            style={{ y: springImageY, scale: springImageScale }}
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={{ scale: 1.15, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />

                        {/* Renk gradyan overlay'leri — sinematik katmanlama */}
                        <motion.div
                            style={{ opacity: overlayOpacity }}
                            className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/30 to-transparent"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#030303]/70 via-transparent to-[#030303]/20" />

                        {/* Film tahıl dokusu efekti */}
                        <div
                            className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                backgroundSize: '256px 256px',
                            }}
                        />

                        {/* Köşe atmosfer ışıkları */}
                        <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-rose-950/30 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-gradient-to-bl from-sky-950/20 via-transparent to-transparent pointer-events-none" />
                    </>
                ) : (
                    /* Resim yoksa: performanslı ve titremeyen hareket eden renk atmosferi */
                    <div className="absolute inset-0 overflow-hidden blur-[120px] opacity-40 translate-z-0" style={{ transform: 'translate3d(0,0,0)' }}>
                        <div className="absolute inset-0 bg-[#030303]" />
                        <motion.div
                            animate={{ rotate: 360, x: [0, 60, 0], y: [0, -40, 0] }}
                            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                            className="absolute -top-[20%] right-[10%] w-[70vw] h-[70vw] rounded-full bg-rose-900/60"
                        />
                        <motion.div
                            animate={{ rotate: -360, x: [0, -80, 0], y: [0, 60, 0] }}
                            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
                            className="absolute bottom-0 -left-[10%] w-[60vw] h-[60vw] rounded-full bg-indigo-900/50"
                        />
                    </div>
                )}

                {/* Hero İçerik — Ekranın alt 1/3'ünde konumlandırılmış */}
                <motion.div
                    className="absolute bottom-0 left-0 right-0 px-8 md:px-20 pb-20 md:pb-28 z-10"
                >
                    {/* Üst çizgi detayı */}
                    <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="w-16 h-[2px] bg-rose-400 mb-8 md:mb-12 origin-left"
                    />

                    {/* Metadata rozetleri */}
                    {(formattedDate || data.location) && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 md:mb-8"
                        >
                            {formattedDate && (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/15 border border-white/20 shadow-xl text-white font-medium tracking-wide text-sm md:text-base transition-all transform-gpu"
                                    style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                                >
                                    <LuCalendarDays className="text-rose-400" size={18} />
                                    <span>{formattedDate}</span>
                                    {formattedTime && (
                                        <span className="text-white/50 pl-2 ml-2 border-l border-white/20">{formattedTime}</span>
                                    )}
                                </motion.div>
                            )}
                            {data.location && (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/15 border border-white/20 shadow-xl text-white font-medium tracking-wide text-sm md:text-base transition-all transform-gpu"
                                    style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                                >
                                    <LuMapPin className="text-rose-400" size={18} />
                                    <span>{data.location}</span>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Dev başlık — kelime kelime stagger animasyonu */}
                    <h1
                        aria-label={data.title}
                        className="flex flex-wrap gap-x-5 gap-y-1 overflow-hidden"
                    >
                        {words.map((word, i) => (
                            <span key={i} className="overflow-hidden inline-block">
                                <motion.span
                                    initial={{ y: '110%', opacity: 0 }}
                                    animate={{ y: '0%', opacity: 1 }}
                                    transition={{
                                        duration: 0.9,
                                        delay: 0.9 + i * 0.12,
                                        ease: [0.16, 1, 0.3, 1],
                                    }}
                                    className="inline-block text-[3.2rem] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] font-medium tracking-[-0.03em] leading-[0.9] text-white"
                                    style={{ textShadow: '0 2px 60px rgba(0,0,0,0.8)' }}
                                >
                                    {word}
                                </motion.span>
                            </span>
                        ))}
                    </h1>
                </motion.div>

                {/* Aşağı kaydır hint animasyonu */}
                {data.description && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.2, duration: 1 }}
                        className="absolute bottom-8 right-8 md:right-20 z-10 flex flex-col items-center gap-2"
                    >
                        <span className="text-white/25 text-[10px] tracking-[0.25em] uppercase font-light mb-1">Kaydır</span>
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent"
                        />
                    </motion.div>
                )}
            </div>

            {/* ─── AÇIKLAMA PANELİ ─── */}
            {data.description && (
                <div className="relative z-20 bg-[#030303]">
                    {/* Üstten geçiş şeridi */}
                    <div className="absolute -top-1 left-0 right-0 h-px bg-white/5" />

                    <div ref={descRef} className="max-w-[900px] mx-auto px-8 md:px-20 py-28 md:py-40">
                        {/* Bölüm etiketi */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={descInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center gap-4 mb-10 md:mb-14"
                        >
                            <div className="w-12 h-px bg-rose-500/50" />
                            <h2 className="text-sm md:text-base tracking-[0.5em] uppercase font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-rose-100 to-white">
                                Açıklama
                            </h2>
                        </motion.div>

                        {/* Açıklama metni — her paragraf ayrı ayrı gelsin */}
                        {data.description.split('\n').filter(Boolean).map((paragraph, i) => (
                            <motion.p
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                animate={descInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.9, delay: 0.1 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                                className="text-white/55 text-xl md:text-2xl font-light leading-[1.8] tracking-wide mb-8"
                            >
                                {paragraph}
                            </motion.p>
                        ))}

                        {/* Alt dekoratif çizgi */}
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={descInView ? { scaleX: 1 } : {}}
                            transition={{ duration: 1.2, delay: 0.5 }}
                            className="w-full h-px bg-gradient-to-r from-rose-500/20 via-white/5 to-transparent mt-16 md:mt-24 origin-left"
                        />

                        {/* Aksiyon Butonu (Link Eklenmişse) */}
                        {data.action_url && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={descInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 1, delay: 0.8 }}
                                className="mt-16 text-center md:text-left"
                            >
                                <a
                                    href={data.action_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-4 px-10 py-5 rounded-full bg-white text-black font-semibold tracking-wide hover:scale-105 active:scale-95 transition-transform"
                                >
                                    {data.action_text || 'Detaylara Git'}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </a>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
