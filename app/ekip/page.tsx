'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import TiltedCard from '@/components/TiltedCard';
import Galaxy from '@/components/Galaxy';
import { createClient } from '@/shared/api/supabase';

interface TeamMember {
    id: string;
    full_name: string;
    role_title: string;
    committee?: string;
    image_url?: string;
    display_order: number;
    is_leadership: boolean;
    // mapped props
    name: string;
    role: string;
    image: string;
}

interface GroupedMembers {
    [key: string]: TeamMember[];
}

export default function AllTeamPage() {
    const [leaders, setLeaders] = useState<TeamMember[]>([]);
    const [committeeGroups, setCommitteeGroups] = useState<GroupedMembers>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('team_members')
            .select('id, full_name, role_title, committee, image_url, display_order, is_leadership')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .then(({ data }) => {
                if (data) {
                    const mappedData = data.map(m => ({
                        ...m,
                        name: m.full_name,
                        role: m.role_title,
                        image: m.image_url || '/assets/image/hsd-logo-white.png',
                    }));

                    // Separate Leaders
                    const leaderList = mappedData.filter(m => m.is_leadership);
                    setLeaders(leaderList);

                    // Group Non-Leaders by Committee
                    const nonLeaders = mappedData.filter(m => !m.is_leadership);
                    const groups: GroupedMembers = {};

                    nonLeaders.forEach(member => {
                        // Normalize committee name or use 'Genel'
                        let committeeName = member.committee ? member.committee.trim() : 'Komite Üyeleri';
                        if (!committeeName) committeeName = 'Komite Üyeleri';

                        if (!groups[committeeName]) {
                            groups[committeeName] = [];
                        }
                        groups[committeeName].push(member);
                    });

                    setCommitteeGroups(groups);
                }
                setLoading(false);
            });
    }, []);

    // Animation variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    return (
        <main className="relative min-h-screen bg-black overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
                <Galaxy
                    starSpeed={0.2}
                    density={1.5}
                    hueShift={280} // Different hue for this page (Purple/Pink vibe)
                    speed={0.5}
                    glowIntensity={0.2}
                    mouseRepulsion
                    repulsionStrength={1}
                    twinkleIntensity={0.2}
                    transparent
                />
            </div>

            {/* Navigation / Back Button */}
            <div className="fixed top-6 left-6 z-50">
                <Link href="/" className="group flex items-center gap-2 px-5 py-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="text-white font-medium">Ana Sayfa</span>
                </Link>
            </div>

            <div className="relative z-10 container mx-auto px-4 py-24">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <h1 className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 mb-6 tracking-tighter drop-shadow-2xl">
                        TÜM EKİBİMİZ
                    </h1>
                    <div className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-transparent via-[#FF3333] to-transparent shadow-[0_0_20px_#FF3333]" />
                    <p className="mt-6 text-gray-400 max-w-2xl mx-auto text-lg">
                        Geleceği şekillendiren tutkulu, yenilikçi ve dinamik ekibimizle tanışın.
                    </p>
                </motion.div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-[#FF3333] rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-32">
                        {/* 1. Leadership Section */}
                        {leaders.length > 0 && (
                            <section>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    className="flex items-center gap-4 mb-12"
                                >
                                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                        Liderlik Ekibi
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-[#FF3333]/50 to-transparent" />
                                </motion.div>

                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center"
                                >
                                    {leaders.map((member) => (
                                        <motion.div key={member.id} variants={itemVariants} className="w-[300px] h-[400px]">
                                            <TiltedCard
                                                imageSrc={member.image}
                                                altText={member.name}
                                                captionText={member.role}
                                                containerHeight="100%"
                                                containerWidth="100%"
                                                imageHeight="100%"
                                                imageWidth="100%"
                                                rotateAmplitude={8}
                                                scaleOnHover={1.05}
                                                showMobileWarning={false}
                                                showTooltip={false}
                                                displayOverlayContent={true}
                                                containerClassName="bg-neutral-900/30 backdrop-blur-sm border border-white/5 rounded-[20px]"
                                                overlayContent={
                                                    <div className="absolute inset-0 w-full h-full flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/20 to-transparent rounded-[20px] overflow-hidden group">
                                                        <div className="absolute inset-0 border border-white/5 rounded-[20px] group-hover:border-[#FF3333]/30 transition-colors duration-500 pointer-events-none" />
                                                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                            <h3 className="text-xl font-bold text-white mb-1 drop-shadow-md">{member.name}</h3>
                                                            <p className="text-xs font-semibold text-[#FF3333] uppercase tracking-wider">{member.role}</p>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </section>
                        )}

                        {/* 2. Committee Sections */}
                        {Object.entries(committeeGroups).map(([groupName, members], groupIndex) => (
                            <section key={groupName}>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    className="flex items-center gap-4 mb-12"
                                >
                                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                        {groupName}
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-purple-500/50 to-transparent" />
                                </motion.div>

                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-50px" }}
                                    className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center"
                                >
                                    {members.map((member) => (
                                        <motion.div key={member.id} variants={itemVariants} className="w-[240px] h-[320px]">
                                            <TiltedCard
                                                imageSrc={member.image}
                                                altText={member.name}
                                                captionText={member.role}
                                                containerHeight="100%"
                                                containerWidth="100%"
                                                imageHeight="100%"
                                                imageWidth="100%"
                                                rotateAmplitude={5}
                                                scaleOnHover={1.05}
                                                showMobileWarning={false}
                                                showTooltip={false}
                                                displayOverlayContent={true}
                                                containerClassName="bg-neutral-900/20 backdrop-blur-sm border border-white/5 rounded-[15px]"
                                                overlayContent={
                                                    <div className="absolute inset-0 w-full h-full flex flex-col justify-end p-4 bg-gradient-to-t from-black/90 via-transparent to-transparent rounded-[15px] group">
                                                        <div className="absolute inset-0 border border-white/5 rounded-[15px] group-hover:border-purple-500/30 transition-colors duration-500 pointer-events-none" />
                                                        <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                            <h3 className="text-lg font-bold text-white mb-0.5">{member.name}</h3>
                                                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest group-hover:text-purple-400 transition-colors">{member.role}</p>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
