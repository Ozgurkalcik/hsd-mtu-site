'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'motion/react'

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/duyurular', label: 'Duyurular', icon: 'megaphone' },
    { href: '/admin/etkinlikler', label: 'Etkinlikler', icon: 'calendar' },
    { href: '/admin/yazilar', label: 'Yazılar', icon: 'article' },
    { href: '/admin/ekip', label: 'Ekip', icon: 'team' },
    { href: '/admin/sponsorlar', label: 'Sponsorlar', icon: 'sponsor' },
    { href: '/admin/galeri', label: 'Galeri', icon: 'gallery' },
    { href: '/admin/popup', label: 'Popup', icon: 'popup' },
]

function NavIcon({ icon, size = 20 }: { icon: string; size?: number }) {
    const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

    switch (icon) {
        case 'dashboard':
            return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
        case 'megaphone':
            return <svg {...props}><path d="m3 11 18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
        case 'calendar':
            return <svg {...props}><rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
        case 'article':
            return <svg {...props}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" /></svg>
        case 'team':
            return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        case 'sponsor':
            return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 8 12 8s5-4 7.5-4a2.5 2.5 0 0 1 0 5H18" /><path d="M18 11v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7" /><path d="M6 9h12v2H6z" /></svg>
        case 'gallery':
            return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
        case 'popup':
            return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M9 9h6" /><path d="M9 12h4" /><path d="M17 15l3 3" /></svg>
        default:
            return null
    }
}

export default function AdminSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        await supabase.auth.signOut()
        router.replace('/admin/login')
    }

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin'
        return pathname.startsWith(href)
    }

    return (
        <motion.aside
            className={`admin-sidebar ${isCollapsed ? 'admin-sidebar--collapsed' : ''}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Header */}
            <div className="admin-sidebar-header">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            className="admin-sidebar-brand"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="admin-sidebar-logo">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <p className="admin-sidebar-title">HSDMTU</p>
                                <p className="admin-sidebar-subtitle">Admin Panel</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    className="admin-sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? 'Genişlet' : 'Daralt'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        {isCollapsed ? (
                            <><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="18" y2="18" /></>
                        ) : (
                            <><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></>
                        )}
                    </svg>
                </button>
            </div>

            {/* Navigation */}
            <nav className="admin-sidebar-nav">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.href}
                        className={`admin-sidebar-link ${isActive(item.href) ? 'admin-sidebar-link--active' : ''}`}
                        onClick={() => router.push(item.href)}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <NavIcon icon={item.icon} />
                        <AnimatePresence mode="wait">
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                        {isActive(item.href) && (
                            <motion.div
                                className="admin-sidebar-indicator"
                                layoutId="sidebar-indicator"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </nav>

            {/* Logout */}
            <div className="admin-sidebar-footer">
                <button
                    className="admin-sidebar-logout"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    title={isCollapsed ? 'Çıkış Yap' : undefined}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    {!isCollapsed && <span>{isLoggingOut ? 'Çıkılıyor...' : 'Çıkış Yap'}</span>}
                </button>
            </div>
        </motion.aside>
    )
}
