'use client';
import React from 'react';
import { motion } from 'framer-motion';
import SimpleMarquee from './SimpleMarquee';
import { SiGoogle, SiReact, SiGithub, SiVercel, SiSpotify, SiNetflix, SiAmazon, SiMeta } from 'react-icons/si';
import StickerPeel from './StickerPeel/StickerPeel';

const techLogos = [
    { node: <SiGoogle className="text-white w-12 h-12" />, title: "Google" },
    { node: <SiReact className="text-white w-12 h-12" />, title: "React" },
    { node: <SiGithub className="text-white w-12 h-12" />, title: "GitHub" },
    { node: <SiVercel className="text-white w-12 h-12" />, title: "Vercel" },
    { node: <SiSpotify className="text-white w-12 h-12" />, title: "Spotify" },
    { node: <SiNetflix className="text-white w-12 h-12" />, title: "Netflix" },
    { node: <SiAmazon className="text-white w-12 h-12" />, title: "Amazon" },
    { node: <SiMeta className="text-white w-12 h-12" />, title: "Meta" },
];

export default function Sponsors() {
    return (
        <section className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col justify-center items-center py-24">
            {/* Decorative Stickers - Reduced to 2 instances */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">
                    {/* Sticker 1 - Top Left */}
                    <StickerPeel
                        imageSrc="/assets/image/hsd-logo-white.png"
                        width={120}
                        rotate={15}
                        peelBackHoverPct={40}
                        peelBackActivePct={60}
                        shadowIntensity={0.8}
                        lightingIntensity={0.2}
                        initialPosition={{ x: 200, y: 150 }}
                    />
                    {/* Sticker 4 - Bottom Right -> Now Sticker 2 */}
                    <StickerPeel
                        imageSrc="/assets/image/hsd-logo-white.png"
                        width={110}
                        rotate={-10}
                        peelBackHoverPct={45}
                        peelBackActivePct={65}
                        shadowIntensity={0.75}
                        lightingIntensity={0.2}
                        initialPosition={{ x: 1100, y: 700 }}
                    />
                </div>
            </div>

            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tighter">
                        Sponsorlarımız
                    </h2>
                    <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }}></div>
                </motion.div>

                <div className="w-full relative">
                    <SimpleMarquee speed={40}>
                        <div className="flex gap-16 px-8 items-center">
                            {techLogos.map((logo, index) => (
                                <div key={index} className="flex flex-col items-center gap-4 group cursor-pointer transition-transform hover:scale-110">
                                    {logo.node}
                                    <span className="text-gray-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        {logo.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SimpleMarquee>
                </div>
            </div>
            {/* <div className="h-24 w-full"></div> */}
        </section>
    );
}
