'use client';

import React, { useState, useEffect } from 'react';
import SafeImage from '@/shared/ui/components/SafeImage';
import { motion } from 'framer-motion';
import StickerPeel from '@/shared/ui/animations/StickerPeel/StickerPeel';
import { createClient } from '@/shared/api/supabase';

interface Sponsor {
    id: string;
    name: string;
    logo_url: string;
    website_url?: string;
}

/* ── Sponsor Panel — Orbiting Light ── */
function SponsorPanel({ sponsor, index }: { sponsor: Sponsor; index: number }) {
    const [hovered, setHovered] = useState(false);

    const handleClick = () => {
        if (sponsor.website_url) window.open(sponsor.website_url, '_blank', 'noopener,noreferrer');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ delay: index * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative group"
        >
            {/* Orbiting border — dönen neon ışık */}
            <div
                className="absolute -inset-[2px] rounded-xl overflow-hidden transition-opacity duration-500"
                style={{ opacity: hovered ? 1 : 0 }}
            >
                <div
                    className="absolute inset-[-100%] z-0"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, transparent 60%, #FF0000 85%, #FF3333 90%, #FF0000 95%, transparent 100%)',
                        animation: hovered ? 'orbit 3s linear infinite' : 'none',
                        filter: 'blur(4px)',
                    }}
                />
                <div
                    className="absolute inset-[-100%] z-0"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, transparent 60%, #FF3333 85%, #ffffff 90%, #FF3333 95%, transparent 100%)',
                        animation: hovered ? 'orbit 3s linear infinite' : 'none',
                    }}
                />
                {/* İç mask */}
                <div className="absolute inset-[2px] rounded-[10px] bg-[#080808]" />
            </div>

            {/* Güçlü Glow arkada */}
            <div
                className="absolute -inset-8 rounded-full pointer-events-none transition-opacity duration-500"
                style={{
                    background: 'radial-gradient(circle at center, rgba(255,0,0,0.12) 0%, transparent 75%)',
                    opacity: hovered ? 1 : 0,
                    filter: 'blur(20px)',
                }}
            />

            {/* Ana panel */}
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onTouchStart={() => setHovered(true)}
                onTouchEnd={() => setTimeout(() => setHovered(false), 800)}
                onClick={handleClick}
                className="relative w-[210px] sm:w-[260px] md:w-[320px] h-[130px] sm:h-[160px] md:h-[190px] rounded-xl overflow-hidden box-border"
                style={{
                    cursor: sponsor.website_url ? 'pointer' : 'default',
                    background: 'linear-gradient(160deg, rgba(18,18,18,0.7), rgba(8,8,8,0.9))',
                    border: '1px solid',
                    borderColor: hovered ? 'transparent' : 'rgba(255,255,255,0.04)',
                    transform: hovered ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease',
                }}
            >
                {/* Hafif cam parılsma üstte */}
                <div
                    className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
                    style={{
                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,${hovered ? 0.15 : 0.04}), transparent)`,
                        transition: 'all 0.4s ease',
                    }}
                />

                {/* Logo */}
                <div
                    className="absolute inset-0 flex items-center justify-center p-5 md:p-7"
                    style={{
                        transform: hovered ? 'translateY(-10px) scale(0.8)' : 'translateY(0) scale(1)',
                        transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
                    }}
                >
                    <div className="relative w-full h-full">
                        <SafeImage
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            fill
                            sizes="(max-width: 768px) 210px, 320px"
                            style={{
                                objectFit: 'contain',
                                filter: hovered
                                    ? 'brightness(2) drop-shadow(0 0 20px rgba(255,51,51,0.25))'
                                    : 'brightness(1.8)',
                                opacity: hovered ? 1 : 0.85,
                                transition: 'filter 0.5s ease, opacity 0.5s ease',
                            }}
                        />
                    </div>
                </div>

                {/* Hover reveal — isim + link */}
                <div
                    className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-3 pointer-events-none"
                    style={{
                        opacity: hovered ? 1 : 0,
                        transform: hovered ? 'translateY(0)' : 'translateY(8px)',
                        filter: hovered ? 'blur(0px)' : 'blur(4px)',
                        transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1) 0.08s',
                    }}
                >
                    <span className="text-[11px] md:text-xs font-semibold text-white/85 tracking-[0.15em] uppercase">
                        {sponsor.name}
                    </span>
                    {sponsor.website_url && (
                        <span className="flex items-center gap-1.5 mt-1 text-[9px] text-[#FF3333]/70 tracking-[0.2em] uppercase font-mono">
                            <span className="inline-block w-3 h-px bg-[#FF3333]/40" />
                            ziyaret et
                            <span className="inline-block w-3 h-px bg-[#FF3333]/40" />
                        </span>
                    )}
                </div>

                {/* Işık süpürmesi */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '200%',
                            height: '100%',
                            background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.03) 48%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 52%, transparent 58%)',
                            transform: hovered ? 'translateX(60%)' : 'translateX(-100%)',
                            transition: hovered ? 'transform 0.7s ease-out 0.1s' : 'none',
                        }}
                    />
                </div>
            </div>

            {/* Alt glow */}
            <div
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-10 rounded-full pointer-events-none transition-opacity duration-300"
                style={{
                    background: 'radial-gradient(ellipse, rgba(255,0,0,0.5) 0%, transparent 70%)',
                    filter: 'blur(12px)',
                    opacity: hovered ? 0.8 : 0,
                }}
            />
        </motion.div>
    );
}

/* ── Ana Bileşen ── */
export default function Sponsors() {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('sponsors')
            .select('id, name, logo_url, website_url')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .then(({ data }: { data: any }) => {
                if (data && data.length > 0) setSponsors(data);
            });
    }, []);

    return (
        <section id="sponsorlar" className="relative w-full min-h-screen bg-black flex flex-col justify-center py-24 overflow-hidden">
            {/* Arka Plan Işıma Efekti (Radiation) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Üst süzülme */}
                <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-[#FF0000]/10 to-transparent opacity-60" />
                {/* Alt süzülme */}
                <div className="absolute bottom-0 inset-x-0 h-[40vh] bg-gradient-to-t from-[#FF0000]/10 to-transparent opacity-60" />
                {/* Sol süzülme */}
                <div className="absolute left-0 inset-y-0 w-[30vw] bg-gradient-to-r from-[#FF0000]/10 to-transparent opacity-40" />
                {/* Sağ süzülme */}
                <div className="absolute right-0 inset-y-0 w-[30vw] bg-gradient-to-l from-[#FF0000]/10 to-transparent opacity-40" />

                {/* Dinamik parlamalar (radyal) */}
                <div
                    className="absolute top-1/4 -left-1/4 w-[60vw] h-[60vw] blur-[120px] rounded-full animate-pulse opacity-30"
                    style={{
                        animationDuration: '8s',
                        background: 'radial-gradient(circle, rgba(255,0,0,0.05) 0%, transparent 70%)'
                    }}
                />
                <div
                    className="absolute bottom-1/4 -right-1/4 w-[60vw] h-[60vw] blur-[120px] rounded-full animate-pulse opacity-30"
                    style={{
                        animationDuration: '10s',
                        background: 'radial-gradient(circle, rgba(255,0,0,0.05) 0%, transparent 70%)'
                    }}
                />
            </div>

            {/* Orbit animasyonu */}
            <style>{`
                @keyframes orbit {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>

            {/* Top Separator */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Dekoratif Stickerlar Şimdilik Yorumda 
            <div className="absolute inset-0 z-40 pointer-events-none">
                <div className="relative w-full h-full pointer-events-none">
                    <StickerPeel imageSrc="/images/hsd-logo-white-1.png" width={240} rotate={15} peelBackHoverPct={40} peelBackActivePct={60} shadowIntensity={0.8} lightingIntensity={0.2} initialPosition={{ x: 50, y: 60 }} />
                    <StickerPeel imageSrc="/images/hsd-logo.png" width={215} rotate={-20} peelBackHoverPct={35} peelBackActivePct={55} shadowIntensity={0.7} lightingIntensity={0.15} initialPosition={{ x: 1200, y: 50 }} className="hidden md:block" />
                    <StickerPeel imageSrc="/images/hsd-logo.png" width={190} rotate={25} peelBackHoverPct={30} peelBackActivePct={50} shadowIntensity={0.6} lightingIntensity={0.1} initialPosition={{ x: 100, y: 680 }} />
                    <StickerPeel imageSrc="/images/hsd-logo-white-1.png" width={205} rotate={-10} peelBackHoverPct={45} peelBackActivePct={65} shadowIntensity={0.75} lightingIntensity={0.2} initialPosition={{ x: 1180, y: 660 }} className="hidden md:block" />
                </div>
            </div>
            */}

            {/* Başlık */}
            <motion.div
                className="text-center mb-20 px-4 relative z-30"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                    Sponsorlarımız
                </h2>
                <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }} />
            </motion.div>

            {/* Kartlar */}
            {sponsors.length > 0 ? (
                <div className="relative z-30 w-full px-4">
                    <div className="flex flex-wrap gap-6 md:gap-10 lg:gap-12 items-center justify-center max-w-[1100px] mx-auto">
                        {sponsors.map((sponsor, index) => (
                            <SponsorPanel key={sponsor.id} sponsor={sponsor} index={index} />
                        ))}
                    </div>
                </div>
            ) : (
                <motion.div
                    className="flex flex-col items-center justify-center py-12 text-center relative z-30"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <p className="text-gray-400 text-lg">Henüz sponsor eklenmemiştir.</p>
                    <p className="text-gray-600 text-sm mt-2">Sponsorlar eklendiğinde burada görünecek.</p>
                </motion.div>
            )}
        </section>
    );
}
