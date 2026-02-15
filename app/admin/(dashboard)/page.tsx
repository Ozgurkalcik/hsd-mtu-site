'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'motion/react'

interface Stats {
    announcements: number
    events: number
    articles: number
    teamMembers: number
    sponsors: number
    galleryImages: number
}

const STAT_CARDS = [
    { key: 'announcements', label: 'Duyuru', icon: 'megaphone', color: '#dc2626' },
    { key: 'events', label: 'Etkinlik', icon: 'calendar', color: '#f59e0b' },
    { key: 'articles', label: 'Yazı', icon: 'article', color: '#3b82f6' },
    { key: 'teamMembers', label: 'Ekip Üyesi', icon: 'team', color: '#8b5cf6' },
    { key: 'sponsors', label: 'Sponsor', icon: 'sponsor', color: '#10b981' },
    { key: 'galleryImages', label: 'Galeri Görseli', icon: 'gallery', color: '#ec4899' },
]

function StatIcon({ icon, color }: { icon: string; color: string }) {
    const props = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    switch (icon) {
        case 'megaphone': return <svg {...props}><path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
        case 'calendar': return <svg {...props}><rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
        case 'article': return <svg {...props}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>
        case 'team': return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        case 'sponsor': return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 8 12 8s5-4 7.5-4a2.5 2.5 0 0 1 0 5H18" /><path d="M18 11v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7" /><path d="M6 9h12v2H6z" /></svg>
        case 'gallery': return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
        default: return null
    }
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({
        announcements: 0, events: 0, articles: 0,
        teamMembers: 0, sponsors: 0, galleryImages: 0,
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            // Fetch local stats
            const [announcements, events, teamMembers, sponsors, galleryImages] = await Promise.all([
                supabase.from('announcements').select('id', { count: 'exact', head: true }),
                supabase.from('events').select('id', { count: 'exact', head: true }),
                supabase.from('team_members').select('id', { count: 'exact', head: true }),
                supabase.from('sponsors').select('id', { count: 'exact', head: true }),
                supabase.from('gallery_images').select('id', { count: 'exact', head: true }),
            ])

            // Fetch Medium stats
            let mediumCount = 0;
            try {
                const { data: settingsData } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'medium_rss_url')
                    .single();

                const rssUrl = settingsData?.value || 'https://medium.com/feed/@huaweidevgroups44';
                const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

                const response = await fetch(apiUrl);
                const data = await response.json();
                if (data.status === 'ok') {
                    mediumCount = data.items.length;
                }
            } catch (error) {
                console.error('Medium stats error:', error);
            }

            setStats({
                announcements: announcements.count ?? 0,
                events: events.count ?? 0,
                articles: mediumCount,
                teamMembers: teamMembers.count ?? 0,
                sponsors: sponsors.count ?? 0,
                galleryImages: galleryImages.count ?? 0,
            })
            setIsLoading(false)
        }

        fetchStats()
    }, [])

    return (
        <div>
            <div className="admin-page-header">
                <motion.h1
                    className="admin-page-title"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    Dashboard
                </motion.h1>
                <p className="admin-page-desc">HSDMTU yönetim paneline hoş geldiniz.</p>
            </div>

            <div className="admin-stats-grid">
                {STAT_CARDS.map((card, i) => (
                    <motion.div
                        key={card.key}
                        className="admin-stat-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="admin-stat-card-header">
                            <div className="admin-stat-card-icon" style={{ background: `${card.color}12` }}>
                                <StatIcon icon={card.icon} color={card.color} />
                            </div>
                        </div>
                        <p className="admin-stat-card-value">
                            {isLoading ? '—' : stats[card.key as keyof Stats]}
                        </p>
                        <p className="admin-stat-card-label">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Hızlı Erişim */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f5f5f5', marginBottom: '1rem' }}>
                    Hızlı İşlemler
                </h2>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <a href="/admin/duyurular" className="admin-btn admin-btn--primary">
                        + Yeni Duyuru
                    </a>
                    <a href="/admin/etkinlikler" className="admin-btn admin-btn--primary">
                        + Yeni Etkinlik
                    </a>
                </div>
            </motion.div>
        </div>
    )
}
