'use client';

import React, { useState, useEffect } from 'react';
import SimpleMarquee from './SimpleMarquee';
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
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setSponsors(data);
                }
            });
    }, []);

    if (sponsors.length === 0) return null;

    return (
        <section id="sponsorlar" className="relative w-full bg-black py-24 overflow-hidden">
            {/* Top Separator */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            {/* Title */}
            <div className="text-center mb-16 px-4">
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                    Sponsorlarımız
                </h2>
                <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }}></div>
            </div>

            {/* Marquee */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10"></div>
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10"></div>
                <SimpleMarquee speed={40}>
                    <div className="flex gap-16 px-8 items-center">
                        {sponsors.map((sponsor) => (
                            <a
                                key={sponsor.id}
                                href={sponsor.website_url || '#'}
                                target={sponsor.website_url ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-4 group cursor-pointer transition-transform hover:scale-110"
                            >
                                <img
                                    src={sponsor.logo_url}
                                    alt={sponsor.name}
                                    className="w-12 h-12 object-contain filter brightness-0 invert opacity-70 group-hover:opacity-100 transition-opacity"
                                />
                                <span className="text-gray-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    {sponsor.name}
                                </span>
                            </a>
                        ))}
                    </div>
                </SimpleMarquee>
            </div>
        </section>
    );
}
