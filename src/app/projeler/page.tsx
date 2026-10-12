'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import Galaxy from '@/shared/ui/animations/Galaxy';
import HomeButton from '@/shared/ui/components/HomeButton';
import { CommunityProject } from '@/shared/api/workspaceTypes';

const DEFAULT_PROJECTS: CommunityProject[] = [
    {
        id: 'proj_hsd_site',
        title: 'HSD MTÜ Topluluk & Etkinlik Platformu',
        description: 'Next.js 16, Supabase, Viewport Freeze optimizasyonu ve etkinlik/takvim yönetim altyapısıyla geliştirilen topluluk ana portalı.',
        category: 'Web Platformu',
        github_url: 'https://github.com/mustafazahter/hsd-mtu-site',
        demo_url: 'https://hsdmtu.vercel.app',
        stars_count: 18,
        forks_count: 5,
        contributors: ['Mustafa Zahter', 'HSD Çekirdek Ekip', 'Proje Komitesi'],
        tech_stack: ['Next.js 16', 'TypeScript', 'Supabase', 'TailwindCSS', 'GSAP'],
        is_featured: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'proj_qr_tracker',
        title: 'HSD QR Bilet & Canlı Katılımcı Doğrulama',
        description: 'Etkinlik kapısında anlık QR kod tarama ve katılımcı yoklama takibi sağlayan hafif, PWA destekli öğrenci bilet sistemi.',
        category: 'Mobil & PWA',
        github_url: 'https://github.com/mustafazahter/hsd-mtu-site',
        stars_count: 12,
        forks_count: 3,
        contributors: ['Proje Komitesi', 'Ar-Ge Ekibi'],
        tech_stack: ['TypeScript', 'Supabase RLS', 'WebRTC QR Scanner', 'PWA'],
        is_featured: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'proj_huawei_cloud_starter',
        title: 'Huawei Cloud ModelArts & AI Entegrasyonu',
        description: 'Üniversite öğrencileri için Huawei Cloud servislerine ve yapay zeka modellerine kolay erişim sağlayan başlangıç SDK şablonu.',
        category: 'Yapay Zeka & Cloud',
        github_url: 'https://github.com/mustafazahter',
        stars_count: 24,
        forks_count: 8,
        contributors: ['Ar-Ge & Yapay Zeka Komitesi'],
        tech_stack: ['Python', 'Huawei ModelArts', 'FastAPI', 'Docker'],
        is_featured: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'proj_harmony_dev',
        title: 'HarmonyOS ArkUI Öğrenci Kiti',
        description: 'Huawei HarmonyOS Next ekosisteminde mobil ve giyilebilir uygulama geliştirmeye yönelik Türkçe kaynak ve örnek bileşen kütüphanesi.',
        category: 'Mobil Ekosistem',
        github_url: 'https://github.com/mustafazahter',
        stars_count: 15,
        forks_count: 4,
        contributors: ['Mobil Komitesi'],
        tech_stack: ['ArkUI', 'ArkTS', 'HarmonyOS NEXT'],
        is_featured: false,
        created_at: new Date().toISOString(),
    }
];

export default function ProjectsShowcasePage() {
    const [projects, setProjects] = useState<CommunityProject[]>(DEFAULT_PROJECTS);
    const [isEnabled, setIsEnabled] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // Fetch feature flag & projects
        Promise.all([
            fetch('/api/workspace/settings')
                .then(r => r.json())
                .catch(() => ({ settings: { showcase_projects_enabled: true } })),
            fetch('/api/workspace/projects')
                .then(r => r.json())
                .catch(() => ({ projects: [] }))
        ]).then(([settingsData, projectsData]) => {
            if (settingsData?.settings && typeof settingsData.settings.showcase_projects_enabled === 'boolean') {
                setIsEnabled(settingsData.settings.showcase_projects_enabled);
            }
            if (projectsData?.projects && projectsData.projects.length > 0) {
                setProjects(projectsData.projects);
            }
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, []);

    const categories = ['all', ...Array.from(new Set(projects.map(p => p.category).filter((c): c is string => Boolean(c))))];

    const filtered = selectedCategory === 'all'
        ? projects
        : projects.filter(p => p.category === selectedCategory);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
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
        <main className="relative min-h-screen bg-black text-white overflow-x-hidden selection:bg-rose-600 selection:text-white">
            {/* Background Animation */}
            <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
                <Galaxy
                    starSpeed={0.08}
                    density={1.1}
                    hueShift={120}
                    speed={0.18}
                    glowIntensity={0.25}
                    saturation={0}
                    mouseRepulsion
                    repulsionStrength={2}
                    twinkleIntensity={0.3}
                    rotationSpeed={0.04}
                    transparent
                />
            </div>

            <HomeButton />

            <div className="relative z-10 container mx-auto px-4 py-24 max-w-6xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-bold mb-4 backdrop-blur-md">
                        <span>🚀</span>
                        <span>Açık Kaynak & GitHub Topluluk Radarı</span>
                    </div>

                    <h1 className="text-4xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 mb-4 tracking-tighter drop-shadow-2xl">
                        TOPLULUK PROJELERİ
                    </h1>
                    <div className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-transparent via-[#FF3333] to-transparent shadow-[0_0_20px_#FF3333]" />
                    <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
                        HSD Malatya Turgut Özal Üniversitesi öğrencilerinin ürettiği açık kaynak yazılımlar, yapay zeka modelleri ve mobil uygulamalar.
                    </p>

                    {!isEnabled && (
                        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-semibold backdrop-blur-md">
                            <span>ℹ️</span>
                            <span>Bu vitrin şu anda hazırlık aşamasında. Çok yakında topluluk projeleriyle genel erişime açılacaktır!</span>
                        </div>
                    )}
                </motion.div>

                {/* Category Filters */}
                <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                selectedCategory === cat
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-950/50 scale-105'
                                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
                            }`}
                        >
                            {cat === 'all' ? 'Tüm Projeler' : cat}
                        </button>
                    ))}
                </div>

                {/* Projects Grid */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-rose-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {filtered.map((proj) => (
                            <motion.div
                                key={proj.id}
                                variants={itemVariants}
                                whileHover={{ scale: 1.015, y: -4 }}
                                className="p-6 md:p-8 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 hover:border-rose-500/40 backdrop-blur-xl shadow-2xl transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Top Bar: Category & Featured */}
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-rose-300 border border-white/10">
                                            {proj.category || 'Açık Kaynak'}
                                        </span>

                                        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                                            <span className="flex items-center gap-1 hover:text-amber-300 transition-colors">
                                                <span>⭐</span>
                                                <span>{proj.stars_count ?? 0}</span>
                                            </span>
                                            <span className="flex items-center gap-1 hover:text-blue-300 transition-colors">
                                                <span>🍴</span>
                                                <span>{proj.forks_count ?? 0}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Project Title */}
                                    <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-rose-400 transition-colors mb-2.5">
                                        {proj.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-normal">
                                        {proj.description}
                                    </p>

                                    {/* Tech Stack Tags */}
                                    {proj.tech_stack && proj.tech_stack.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-6">
                                            {proj.tech_stack.map((t, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {/* Contributors */}
                                    {proj.contributors && proj.contributors.length > 0 && (
                                        <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500 mb-5">
                                            <span>Geliştiriciler:</span>
                                            <span className="font-semibold text-zinc-300 truncate max-w-[200px]">
                                                {proj.contributors.join(', ')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Action Links */}
                                    <div className="flex items-center gap-3">
                                        {proj.github_url && (
                                            <a
                                                href={proj.github_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-center bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>🐙</span>
                                                <span>GitHub Deposu ↗</span>
                                            </a>
                                        )}

                                        {proj.demo_url && (
                                            <a
                                                href={proj.demo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-center bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>⚡</span>
                                                <span>Canlı Demo ↗</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Proje Başvuru Kutusu */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-rose-950/30 via-zinc-950 to-zinc-950 border border-rose-900/40 text-center max-w-3xl mx-auto space-y-3"
                >
                    <span className="text-3xl block">💡</span>
                    <h3 className="text-xl font-bold text-white">Sen de Projeni HSD Vitrinine Ekle!</h3>
                    <p className="text-xs md:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        Topluluğumuzda geliştirdiğin bir açık kaynak yazılım veya araştırma projesi mi var? Proje Komitemize ulaşarak GitHub reponu buraya ekleyebilir, sponsor ve ekip arkadaşı bulabilirsin.
                    </p>
                    <div className="pt-2">
                        <a
                            href="https://discord.gg/hsdmtu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50 transition-all"
                        >
                            <span>💬</span>
                            <span>Proje Komitesiyle İletişime Geç</span>
                        </a>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
