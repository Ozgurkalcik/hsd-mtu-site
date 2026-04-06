'use client';

import React, { useState, useEffect } from 'react';
import StickerPeel from './StickerPeel/StickerPeel';
import { createClient } from '@/shared/api/supabase';

interface Sponsor {
    id: string;
    name: string;
    logo_url: string;
    website_url?: string;
}

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
                if (data && data.length > 0) {
                    setSponsors(data);
                }
            });
    }, []);

    return (
        <section id="sponsorlar" className="relative w-full min-h-screen bg-black flex flex-col justify-center overflow-hidden">
            {/* Top Separator */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* Decorative Stickers */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">
                    {/* Sol üst */}
                    <StickerPeel
                        imageSrc="/images/hsd-logo-white-1.png"
                        width={240}
                        rotate={15}
                        peelBackHoverPct={40}
                        peelBackActivePct={60}
                        shadowIntensity={0.8}
                        lightingIntensity={0.2}
                        initialPosition={{ x: 50, y: 60 }}
                    />
                    {/* Sağ üst */}
                    <StickerPeel
                        imageSrc="/images/hsd-logo.png"
                        width={215}
                        rotate={-20}
                        peelBackHoverPct={35}
                        peelBackActivePct={55}
                        shadowIntensity={0.7}
                        lightingIntensity={0.15}
                        initialPosition={{ x: 1200, y: 50 }}
                    />
                    {/* Sol alt */}
                    <StickerPeel
                        imageSrc="/images/hsd-logo.png"
                        width={190}
                        rotate={25}
                        peelBackHoverPct={30}
                        peelBackActivePct={50}
                        shadowIntensity={0.6}
                        lightingIntensity={0.1}
                        initialPosition={{ x: 100, y: 680 }}
                    />
                    {/* Sağ alt */}
                    <StickerPeel
                        imageSrc="/images/hsd-logo-white-1.png"
                        width={205}
                        rotate={-10}
                        peelBackHoverPct={45}
                        peelBackActivePct={65}
                        shadowIntensity={0.75}
                        lightingIntensity={0.2}
                        initialPosition={{ x: 1180, y: 660 }}
                    />
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-16 px-4 relative z-10">
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                    Sponsorlarımız
                </h2>
                <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }}></div>
            </div>

            {sponsors.length > 0 ? (
                /* Scrollable Sponsor List */
                <div className="relative w-full z-10 max-w-[1400px] mx-auto">
                    {/* CSS for hiding scrollbar */}
                    <style dangerouslySetInnerHTML={{__html: `
                        .hide-scrollbar::-webkit-scrollbar { display: none; }
                        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}} />

                    <div className="absolute inset-y-0 left-0 w-16 md:w-40 bg-gradient-to-r from-black via-black/80 to-transparent z-20 pointer-events-none"></div>
                    <div className="absolute inset-y-0 right-0 w-16 md:w-40 bg-gradient-to-l from-black via-black/80 to-transparent z-20 pointer-events-none"></div>
                    
                    <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory py-12 px-16 md:px-44 items-center">
                        <div className="flex gap-16 md:gap-32 items-center justify-center min-w-full w-max mx-auto">
                            {sponsors.map((sponsor) => (
                                <a
                                    key={sponsor.id}
                                    href={sponsor.website_url || '#'}
                                    target={sponsor.website_url ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-6 group cursor-pointer transition-transform hover:scale-105 shrink-0 snap-center"
                                >
                                    <img
                                        src={sponsor.logo_url}
                                        alt={sponsor.name}
                                        className="h-20 md:h-32 w-auto max-w-[200px] md:max-w-[280px] object-contain opacity-50 group-hover:opacity-100 transition-all duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] filter grayscale hover:grayscale-0"
                                    />
                                    <span className="text-gray-400 text-sm md:text-xl font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-widest uppercase">
                                        {sponsor.name}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                    <p className="text-gray-400 text-lg">Henüz sponsor eklenmemiştir.</p>
                    <p className="text-gray-600 text-sm mt-2">Sponsorlar eklendiğinde burada görünecek.</p>
                </div>
            )}
        </section>
    );
}
