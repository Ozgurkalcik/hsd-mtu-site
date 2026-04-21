'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import Image from 'next/image';
import SafeImage from '@/shared/ui/components/SafeImage';
import Link from 'next/link';
import TiltedCard from '@/shared/ui/components/TiltedCard';
import CommitteeCard from '@/entities/committee';
import SeeAllButton from '@/shared/ui/components/SeeAllButton';
import LineWaves from '@/shared/ui/animations/LineWaves';
import { createClient } from '@/shared/api/supabase';

interface TeamMember {
    id: string;
    full_name: string;
    role_title: string;
    department?: string;
    bio?: string;
    image_url?: string;
    display_order: number;
    // mapped
    name: string;
    role: string;
    image: string;
    isPresident?: boolean;
}

export default function Team() {
    const [leaders, setLeaders] = useState<TeamMember[]>([]);
    const [committee, setCommittee] = useState<TeamMember[]>([]);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('team_members')
            .select('id, full_name, role_title, department, bio, image_url, display_order, is_leadership, is_showcase')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .then(({ data }: { data: any }) => {
                if (data && data.length > 0) {
                    const mapped = data.map((m: any) => ({
                        ...m,
                        name: m.full_name,
                        role: m.role_title,
                        image: m.image_url || '/assets/image/hsd-logo-white.png',
                        isPresident: m.role_title?.toLowerCase().includes('başkan') && !m.role_title?.toLowerCase().includes('yardımcı') && !m.role_title?.toLowerCase().includes('komite'),
                    }));

                    // Filter based on database flag AND showcase flag for homepage
                    // Only show members with is_showcase = true on the homepage
                    const showcaseMembers = mapped.filter((m: any) => m.is_showcase);

                    const leaderList = showcaseMembers.filter((m: any) => m.is_leadership);
                    const committeeList = showcaseMembers.filter((m: any) => !m.is_leadership);

                    setLeaders(leaderList);
                    setCommittee(committeeList);
                }
            });
    }, []);

    return (
        <section id="ekibimiz" className="relative w-full min-h-screen bg-black flex flex-col py-24">
            {/* Background - WebGL Line Waves with Interaction */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-auto">
                <LineWaves
                    speed={0.1}
                    innerLineCount={2}
                    outerLineCount={8}
                    warpIntensity={1}
                    rotation={0}
                    edgeFadeWidth={0.3}
                    colorCycleSpeed={0.1}
                    brightness={0.12}
                    color1="#4c00ff"
                    color2="#ff0000"
                    color3="#ffffff"
                    enableMouseInteraction={true}
                    mouseInfluence={2}
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
                    {leaders.length > 0 ? leaders.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.8, ease: "easeOut" }}
                            className={`relative group ${member.isPresident ? 'z-20 w-[320px] h-[420px] md:w-[360px] md:h-[480px]' : 'z-10 w-[320px] h-[420px]'}`}
                        >
                            {/* Glow Effect Behind Card */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#FF3333]/20 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />

                            <TiltedCard
                                imageSrc={member.image}
                                altText={member.name}
                                captionText={member.role}
                                containerHeight="100%"
                                containerWidth="100%"
                                imageHeight="100%"
                                imageWidth="100%"
                                rotateAmplitude={10}
                                scaleOnHover={1.05}
                                showMobileWarning={false}
                                showTooltip={false}
                                displayOverlayContent={true}
                                priority={index < 2}
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
                                            <SafeImage
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
                    )) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <p className="text-gray-400 text-lg">Henüz liderlik ekibi eklenmemiştir.</p>
                            <p className="text-gray-600 text-sm mt-2">Ekip üyeleri eklendiğinde burada görünecek.</p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Committee Chairs Section */}
            <div className="relative z-10 w-full mt-16 py-12">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {committee.length > 0 ? committee.map((member, index) => (
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
                        )) : (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                                <p className="text-gray-400 text-lg">Henüz komite başkanı eklenmemiştir.</p>
                                <p className="text-gray-600 text-sm mt-2">Komite başkanları eklendiğinde burada görünecek.</p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="flex justify-center mt-16 pb-4"
                    >
                        <Link href="/ekip">
                            <SeeAllButton />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section >
    );
}
