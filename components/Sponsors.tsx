'use client';
import React from 'react';
import { motion } from 'framer-motion';
import LogoLoop from './LogoLoop/LogoLoop';
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
        <section className="relative w-full py-48 bg-black overflow-hidden flex flex-col items-center">
            {/* Decorative Stickers - Full section area for dragging */}
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
                        initialPosition={{ x: 50, y: 50 }}
                    />
                    {/* Sticker 2 - Top Right */}
                    <StickerPeel
                        imageSrc="/assets/image/hsd-logo-white.png"
                        width={100}
                        rotate={-20}
                        peelBackHoverPct={35}
                        peelBackActivePct={55}
                        shadowIntensity={0.7}
                        lightingIntensity={0.15}
                        initialPosition={{ x: 1100, y: 80 }}
                    />
                    {/* Sticker 3 - Bottom Left */}
                    <StickerPeel
                        imageSrc="/assets/image/hsd-logo-white.png"
                        width={90}
                        rotate={25}
                        peelBackHoverPct={30}
                        peelBackActivePct={50}
                        shadowIntensity={0.6}
                        lightingIntensity={0.1}
                        initialPosition={{ x: 100, y: 550 }}
                    />
                    {/* Sticker 4 - Bottom Right */}
                    <StickerPeel
                        imageSrc="/assets/image/hsd-logo-white.png"
                        width={110}
                        rotate={-10}
                        peelBackHoverPct={45}
                        peelBackActivePct={65}
                        shadowIntensity={0.75}
                        lightingIntensity={0.2}
                        initialPosition={{ x: 1050, y: 520 }}
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
                    <LogoLoop
                        logos={techLogos}
                        speed={40}
                        direction="left"
                        logoHeight={64}
                        gap={60}
                        hoverSpeed={0}
                        scaleOnHover
                        fadeOut
                        fadeOutColor="#000000"
                        ariaLabel="Sponsorlarımız"
                    />
                </div>
            </div>
            <div className="h-24 w-full"></div>
        </section>
    );
}
