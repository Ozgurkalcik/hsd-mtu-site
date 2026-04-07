'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react'
import Image from 'next/image'

interface PopupSettings {
    id: string
    is_active: boolean
    title: string
    description: string
    button_label: string
    button_url: string
    image_url: string
    display_mode: 'every_visit' | 'once'
    delay_seconds: number
}

const STORAGE_KEY = 'hsdmtu_popup_v3'

/* ── Gürültü (SVG tabanlı) overlay ── */
function NoiseLayer() {
    return (
        <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035, pointerEvents: 'none', zIndex: 2 }}
            xmlns="http://www.w3.org/2000/svg"
        >
            <filter id="noise">
                <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
    )
}

/* ── Dönen çizgisel border ── */
function AnimatedBorder() {
    return (
        <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3, borderRadius: '24px', overflow: 'hidden' }}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff2d2d" stopOpacity="0.9">
                        <animate attributeName="offset" values="0%;100%;0%" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="#ff8c00" stopOpacity="0.6">
                        <animate attributeName="offset" values="50%;150%;50%" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0">
                        <animate attributeName="offset" values="100%;200%;100%" dur="3s" repeatCount="indefinite" />
                    </stop>
                </linearGradient>
            </defs>
            <rect x="0.5" y="0.5" width="calc(100% - 1px)" height="calc(100% - 1px)" rx="23" ry="23"
                fill="none" stroke="url(#borderGrad)" strokeWidth="1.5" />
        </svg>
    )
}

export default function SitePopup() {
    const [settings, setSettings] = useState<PopupSettings | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    /* mouse tilt */
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const rotateX = useTransform(mouseY, [-150, 150], [4, -4])
    const rotateY = useTransform(mouseX, [-200, 200], [-4, 4])

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        supabase
            .from('popup_settings')
            .select('*')
            .limit(1)
            .single()
            .then(({ data }: { data: any | null }) => {
                if (!data || !data.is_active) return
                const s = data as PopupSettings
                setSettings(s)
                
                // Popup içeriğine göre benzersiz bir imza (signature) oluşturuyoruz.
                // Eğer adminden başlık, açıklama, resim veya buton değişirse imza da değişir!
                const contentSignature = btoa(encodeURIComponent(`${s.title}|${s.description}|${s.image_url}|${s.button_url}`));
                
                if (s.display_mode === 'once') {
                    const uniqueKey = `${STORAGE_KEY}_${contentSignature}`;
                    if (localStorage.getItem(uniqueKey)) return
                }
                const timer = setTimeout(() => {
                    setIsVisible(true)
                    setHasLoaded(true)
                }, (s.delay_seconds || 0) * 1000)
                return () => clearTimeout(timer)
            })
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        if (settings?.display_mode === 'once') {
            const contentSignature = btoa(encodeURIComponent(`${settings.title}|${settings.description}|${settings.image_url}|${settings.button_url}`));
            const uniqueKey = `${STORAGE_KEY}_${contentSignature}`;
            localStorage.setItem(uniqueKey, Date.now().toString())
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = cardRef.current?.getBoundingClientRect()
        if (!rect) return
        mouseX.set(e.clientX - rect.left - rect.width / 2)
        mouseY.set(e.clientY - rect.top - rect.height / 2)
    }
    const handleMouseLeave = () => {
        mouseX.set(0)
        mouseY.set(0)
    }

    if (!settings || !hasLoaded) return null

    const hasImage = !!settings.image_url
    const hasButton = !!settings.button_label

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* ── Overlay ── */}
                    <motion.div
                        key="popup-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        onClick={handleClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 99998,
                            background: 'radial-gradient(ellipse at 50% 40%, rgba(150,10,10,0.18) 0%, rgba(0,0,0,0.88) 70%)',
                            backdropFilter: 'blur(18px) saturate(0.6)',
                            WebkitBackdropFilter: 'blur(18px) saturate(0.6)',
                        }}
                    />

                    {/* ── Kart ── */}
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 99999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1.25rem',
                            pointerEvents: 'none',
                        }}
                    >
                        <motion.div
                            key="popup-card"
                            ref={cardRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                width: '100%',
                                maxWidth: hasImage ? '760px' : '520px',
                                pointerEvents: 'auto',
                                perspective: 1200,
                                rotateX,
                                rotateY,
                                transformStyle: 'preserve-3d',
                            }}
                            initial={{ opacity: 0, scale: 0.8, y: 40, rotateX: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, scale: 0.88, y: 24 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
                        >
                            <div
                                style={{
                                    position: 'relative',
                                    borderRadius: '24px',
                                    overflow: 'hidden',
                                    background: 'linear-gradient(145deg, #0d0d0d 0%, #110808 50%, #0a0a0a 100%)',
                                    boxShadow: `
                                        0 0 0 1px rgba(255,255,255,0.04),
                                        0 0 80px rgba(220,38,38,0.18),
                                        0 40px 120px rgba(0,0,0,0.8),
                                        inset 0 1px 0 rgba(255,255,255,0.06)
                                    `,
                                    display: 'flex',
                                    flexDirection: hasImage ? 'row' : 'column',
                                    minHeight: hasImage ? '340px' : 'auto',
                                }}
                            >
                                <NoiseLayer />
                                <AnimatedBorder />

                                {/* ── Sol: Görsel ── */}
                                {hasImage && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.15, duration: 0.5 }}
                                        style={{
                                            width: '42%',
                                            flexShrink: 0,
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Image
                                            src={settings.image_url}
                                            alt={settings.title}
                                            fill
                                            sizes="320px"
                                            priority
                                            style={{
                                                objectFit: 'cover',
                                                filter: 'brightness(0.85) contrast(1.08)',
                                            }}
                                        />
                                        {/* İç kenar gölgesi — sağa doğru yumuşak geçiş */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: `
                                                linear-gradient(to right, transparent 55%, #0d0d0d 100%),
                                                linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%)
                                            `,
                                        }} />
                                    </motion.div>
                                )}

                                {/* ── Sağ / Ana İçerik ── */}
                                <div style={{
                                    flex: 1,
                                    padding: hasImage ? '2.25rem 2rem 2.25rem 2rem' : '2.5rem 2.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0',
                                    position: 'relative',
                                    zIndex: 4,
                                }}>

                                    {/* Kapat */}
                                    <motion.button
                                        onClick={handleClose}
                                        aria-label="Kapat"
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{ duration: 0.18 }}
                                        style={{
                                            position: 'absolute',
                                            top: '1.25rem',
                                            right: '1.25rem',
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#555',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                            <path d="M1 1l9 9M10 1l-9 9" />
                                        </svg>
                                    </motion.button>

                                    {/* Etiket şeridi */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2, duration: 0.4 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}
                                    >
                                        <div style={{
                                            height: '1px',
                                            width: '28px',
                                            background: 'linear-gradient(to right, #dc2626, transparent)',
                                        }} />
                                        <span style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.2em',
                                            textTransform: 'uppercase',
                                            color: '#dc2626',
                                            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                                        }}>
                                            HSDMTU · DUYURU
                                        </span>
                                    </motion.div>

                                    {/* Başlık */}
                                    {settings.title && (
                                        <motion.h2
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                            style={{
                                                fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                                                fontWeight: 800,
                                                lineHeight: 1.15,
                                                letterSpacing: '-0.03em',
                                                marginBottom: '0.875rem',
                                                background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #aaaaaa 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            }}
                                        >
                                            {settings.title}
                                        </motion.h2>
                                    )}

                                    {/* Ayraç çizgisi */}
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.42, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                        style={{
                                            height: '1px',
                                            background: 'linear-gradient(to right, rgba(220,38,38,0.5), rgba(255,255,255,0.04))',
                                            marginBottom: '0.875rem',
                                            transformOrigin: 'left',
                                        }}
                                    />

                                    {/* Açıklama */}
                                    {settings.description && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.48, duration: 0.5 }}
                                            style={{
                                                fontSize: '0.875rem',
                                                lineHeight: 1.7,
                                                color: '#8a8a8a',
                                                marginBottom: hasButton ? '1.75rem' : 0,
                                                flexGrow: 1,
                                            }}
                                        >
                                            {settings.description}
                                        </motion.p>
                                    )}

                                    {/* Buton + Kapat */}
                                    {hasButton && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
                                        >
                                            <motion.a
                                                href={settings.button_url || '#'}
                                                target={settings.button_url?.startsWith('http') ? '_blank' : '_self'}
                                                rel="noopener noreferrer"
                                                onClick={handleClose}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                style={{
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '0.7rem 1.6rem',
                                                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                                    borderRadius: '12px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    color: '#fff',
                                                    textDecoration: 'none',
                                                    letterSpacing: '0.02em',
                                                    overflow: 'hidden',
                                                    boxShadow: '0 4px 24px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                                                }}
                                            >
                                                {/* Shine sweep */}
                                                <motion.div
                                                    style={{
                                                        position: 'absolute', top: 0, left: '-100%', bottom: 0,
                                                        width: '60%',
                                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                                                        skewX: -20,
                                                    }}
                                                    animate={{ left: ['−100%', '200%'] }}
                                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                                                />
                                                {settings.button_label}
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 6h10M7 2l4 4-4 4" />
                                                </svg>
                                            </motion.a>

                                            <button
                                                onClick={handleClose}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#4b4b4b',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    letterSpacing: '0.04em',
                                                    fontFamily: 'inherit',
                                                    padding: '0.5rem 0.25rem',
                                                    transition: 'color 0.15s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#888'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = '#4b4b4b'}
                                            >
                                                Geç →
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Sağ alt köşe dekor */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '1.25rem',
                                        right: '1.5rem',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '0.58rem',
                                        color: 'rgba(255,255,255,0.07)',
                                        letterSpacing: '0.12em',
                                        userSelect: 'none',
                                    }}>
                                        {new Date().getFullYear()} / HSD
                                    </div>
                                </div>

                                {/* Arka plan: büyük yarı-saydam "HSD" yazısı */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-10px',
                                    right: hasImage ? '-8px' : '-12px',
                                    fontSize: '8rem',
                                    fontWeight: 900,
                                    fontFamily: 'system-ui, sans-serif',
                                    color: 'rgba(220,38,38,0.04)',
                                    lineHeight: 1,
                                    letterSpacing: '-0.05em',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                }}>
                                    HSD
                                </div>

                                {/* Top glow bar */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: '15%', right: '15%',
                                    height: '1px',
                                    background: 'linear-gradient(to right, transparent, rgba(220,38,38,0.6), rgba(255,120,40,0.4), transparent)',
                                    zIndex: 5,
                                }} />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
