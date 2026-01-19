'use client';
import React from 'react';
import { motion } from 'framer-motion';

import Image from 'next/image';
import TiltedCard from './TiltedCard';
import CommitteeCard from './CommitteeCard';
import SeeAllButton from './SeeAllButton';
import Galaxy from './Galaxy';

interface TeamMember {
    name: string;
    role: string;
    image: string;
    isPresident?: boolean;
}

export default function Team() {
    const teamMembers: TeamMember[] = [
        {
            name: 'Mustafa Zahter',
            role: 'Başkan Yardımcısı',
            image: '/assets/image/team/mustafa-zahter.png',
        },
        {
            name: 'Sılanur Balbal',
            role: 'Topluluk Başkanı',
            image: '/assets/image/team/sila-balbal.png',
            isPresident: true,
        },
        {
            name: 'Eray Özcan',
            role: 'Başkan Yardımcısı',
            image: '/assets/image/team/eray-ozcan.png',
        },
    ];

    return (
        <section id="ekibimiz" className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col py-24">
            {/* Background - Subtle and Professional (Pure CSS, no more WebGL) */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                <Galaxy
                    starSpeed={0.5}
                    density={2}
                    hueShift={140}
                    speed={1}
                    glowIntensity={0.3}
                    saturation={0}
                    mouseRepulsion
                    repulsionStrength={2}
                    twinkleIntensity={0.3}
                    rotationSpeed={0.2}
                    transparent
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 flex-1 flex flex-col justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                        Liderlik Ekibi
                    </h2>
                    {/* Custom Red Gradient Line */}
                    <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }}></div>
                </motion.div>

                <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-8 max-w-6xl mx-auto w-full">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.8, ease: "easeOut" }}
                            className={`relative group ${member.isPresident ? 'z-20' : 'z-10'}`}
                        >
                            {/* Glow Effect Behind Card */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#FF3333]/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />

                            <TiltedCard
                                imageSrc={member.image}
                                altText={member.name}
                                captionText={member.role}
                                containerHeight={member.isPresident ? "480px" : "420px"}
                                containerWidth={member.isPresident ? "360px" : "320px"}
                                imageHeight={member.isPresident ? "480px" : "420px"}
                                imageWidth={member.isPresident ? "360px" : "320px"}
                                rotateAmplitude={10}
                                scaleOnHover={1.05}
                                showMobileWarning={false}
                                showTooltip={false}
                                displayOverlayContent={true}
                                containerClassName="bg-neutral-900/30 backdrop-blur-sm border border-white/5 rounded-[15px]"
                                overlayContent={
                                    <div className="absolute inset-0 w-full h-full flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-[15px] overflow-hidden">
                                        {/* Base Luxury Layer (Always Visible) */}
                                        <div className="absolute inset-0 border border-[#FF3333]/20 rounded-[15px] shadow-[0_0_15px_rgba(255,51,51,0.1)] pointer-events-none" />

                                        {/* Hover Luxury Border Effect */}
                                        <div className="absolute inset-0 border border-white/10 rounded-[15px] group-hover:border-[#FF3333]/40 transition-colors duration-500 pointer-events-none" />

                                        {/* Lighter Red Accent Line */}
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FF3333] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        {/* HSD Logo Watermark */}
                                        <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                                            <Image
                                                src="/assets/image/hsd-logo-white.png"
                                                alt="HSD Logo"
                                                width={40}
                                                height={40}
                                                className="w-10 h-auto drop-shadow-[0_0_10px_rgba(255,51,51,0.5)]"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight drop-shadow-md">
                                                {member.name}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <div className="h-[1px] w-8 bg-[#FF3333] shadow-[0_0_8px_#FF3333]"></div>
                                                <p className="text-xs font-semibold text-gray-300 uppercase tracking-[0.2em] group-hover:text-[#ffcccc] transition-colors">
                                                    {member.role}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Shine Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                                    </div>
                                }
                            />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Committee Chairs Section */}
            <div className="relative z-10 w-full mt-16 py-12 overflow-hidden">
                {/* Visual Separator */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {/* Animated Background for Committees - REMOVED for unified look */}
                {/* <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none transform-gpu">...</div> */}

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tighter">
                            Komite Başkanları
                        </h2>
                        {/* Custom Red/Purple Gradient Line to distinguish from Leadership */}
                        <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, #9333ea, transparent)' }}></div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        {[
                            { name: 'İsim Soyisim', role: 'Proje Komitesi', image: '/assets/image/team/mustafa-zahter.png' }, // Placeholder
                            { name: 'İsim Soyisim', role: 'Sosyal Medya Komitesi', image: '/assets/image/team/mustafa-zahter.png' }, // Placeholder
                            { name: 'İsim Soyisim', role: 'Medium Komitesi', image: '/assets/image/team/mustafa-zahter.png' }, // Placeholder
                            { name: 'İsim Soyisim', role: 'Etkinlik Komitesi', image: '/assets/image/team/mustafa-zahter.png' }, // Placeholder
                        ].map((member, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.8, ease: "easeOut" }}
                                className="relative"
                            >
                                <CommitteeCard
                                    name={member.name}
                                    role={member.role}
                                    imageSrc={member.image}
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Bottom Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="flex justify-center mt-16"
                    >
                        <SeeAllButton />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
