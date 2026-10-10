'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'motion/react'

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/workspace', label: 'Topluluk Takvimi & Workspace', icon: 'workspace' },
    { href: '/admin/duyurular', label: 'Duyurular', icon: 'megaphone' },
    { href: '/admin/etkinlikler', label: 'Etkinlikler', icon: 'calendar' },
    { href: '/admin/yazilar', label: 'Yazılar', icon: 'article' },
    { href: '/admin/ekip', label: 'Ekip', icon: 'team' },
    { href: '/admin/sponsorlar', label: 'Sponsorlar', icon: 'sponsor' },
    { href: '/admin/galeri', label: 'Galeri', icon: 'gallery' },
    { href: '/admin/popup', label: 'Popup', icon: 'popup' },
    { href: '/admin/mailler', label: 'İletişim Mailleri', icon: 'mail_list' },
    { href: '/admin/sayfalar', label: 'Özel Sayfalar', icon: 'custom_page' },
]

function NavIcon({ icon, size = 18 }: { icon: string; size?: number }) {
    const props = {
        width: size, height: size, viewBox: "0 0 24 24",
        fill: "none", stroke: "currentColor", strokeWidth: 1.6,
        strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    }
    switch (icon) {
        case 'dashboard':
            return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
        case 'workspace':
            return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M2 10h20" /><path d="m9 15 2 2 4-4" /></svg>
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
            return <svg {...props}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><circle cx="7" cy="6" r="1" /><circle cx="11" cy="6" r="1" /></svg>
        case 'mail_list':
            return <svg {...props}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><path d="M7 16h10" /><path d="M7 19h5" /></svg>
        case 'custom_page':
            return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8" /></svg>
        default:
            return null
    }
}

export default function AdminSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [isNavigating, setIsNavigating] = useState(false)
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

    // Sayfa değişince yükleme durumunu sıfırla
    useEffect(() => {
        setIsMobileOpen(false)
        setIsNavigating(false)
        setNavigatingTo(null)
        document.body.style.cursor = ''
    }, [pathname])

    // Navigasyon sırasında cursor'u progress olarak değiştir
    useEffect(() => {
        document.body.style.cursor = isNavigating ? 'progress' : ''
        return () => { document.body.style.cursor = '' }
    }, [isNavigating])

    const handleLogout = async () => {
        setIsLoggingOut(true)
        document.body.style.cursor = 'progress'
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (url && key) {
            const supabase = createBrowserClient(url, key)
            await supabase.auth.signOut()
        }
        router.replace('/admin/login')
    }

    const handleNavigation = (href: string) => {
        if (pathname === href) return
        setIsNavigating(true)
        setNavigatingTo(href)
        router.push(href)
    }

    const isActive = (href: string) => {
        if (!pathname) return false
        if (href === '/admin') return pathname === '/admin'
        return pathname.startsWith(href)
    }

    return (
        <>
            {/* ── Navigasyon Progress Bar ── */}
            <AnimatePresence>
                {isNavigating && (
                    <motion.div
                        initial={{ scaleX: 0, opacity: 1 }}
                        animate={{ scaleX: 0.85 }}
                        exit={{ scaleX: 1, opacity: 0 }}
                        transition={{
                            scaleX: { duration: 1.5, ease: [0.1, 0.4, 0.6, 1] },
                            opacity: { duration: 0.3, delay: 0.1 }
                        }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'linear-gradient(90deg, #dc2626, #ef4444, #f87171)',
                            transformOrigin: 'left center',
                            zIndex: 999999,
                            boxShadow: '0 0 8px rgba(220, 38, 38, 0.6)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Mobil Topbar ── */}
            <header className="admin-topbar">
                <div className="admin-topbar-brand">
                    <div className="admin-sidebar-logo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <p className="admin-topbar-title">HSDMTU Admin</p>
                </div>
                <button
                    className="admin-topbar-menu-btn"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label="Menüyü aç/kapat"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        {isMobileOpen ? (
                            <><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></>
                        ) : (
                            <><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></>
                        )}
                    </svg>
                </button>
            </header>

            {/* ── Mobil Overlay ── */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        className="admin-sidebar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <aside
                className={`admin-sidebar ${isCollapsed ? 'admin-sidebar--collapsed' : ''} ${isMobileOpen ? 'admin-sidebar--open' : ''}`}
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
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                            className={`admin-sidebar-link ${isActive(item.href) ? 'admin-sidebar-link--active' : ''} ${navigatingTo === item.href ? 'admin-sidebar-link--loading' : ''}`}
                            onClick={() => handleNavigation(item.href)}
                            title={isCollapsed ? item.label : undefined}
                            disabled={isNavigating && navigatingTo !== item.href}
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
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" x2="9" y1="12" y2="12" />
                        </svg>
                        {!isCollapsed && <span>{isLoggingOut ? 'Çıkılıyor...' : 'Çıkış Yap'}</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}
