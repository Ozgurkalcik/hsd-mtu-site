'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'motion/react'

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

export default function AdminPopupPage() {
    const [settings, setSettings] = useState<PopupSettings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchSettings = useCallback(async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('popup_settings')
            .select('*')
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') {
            setMessage({ type: 'error', text: 'Ayarlar yüklenirken hata oluştu.' })
        } else if (data) {
            setSettings(data)
        }
        setIsLoading(false)
    }, [])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    useEffect(() => {
        if (message) {
            const t = setTimeout(() => setMessage(null), 4000)
            return () => clearTimeout(t)
        }
    }, [message])

    const handleChange = (key: keyof PopupSettings, value: unknown) => {
        setSettings((prev) => prev ? { ...prev, [key]: value } : null)
    }

    const handleImageUpload = async (file: File) => {
        const { validateImageSize, compressImage } = await import('@/shared/utils/imageCompressor')

        // Boyut kontrolü
        const { valid, error: sizeError } = validateImageSize(file)
        if (!valid) {
            setMessage({ type: 'error', text: sizeError! })
            return
        }

        setIsUploading(true)
        setMessage({ type: 'success', text: 'Görsel sıkıştırılıyor...' })

        // Sıkıştır
        let processedFile = file
        try {
            processedFile = await compressImage(file)
        } catch {
            // Sıkıştırma başarısız olursa orijinali kullan
        }

        const fileExt = processedFile.type === 'image/png' ? 'png' : 'jpg'
        const fileName = `popup_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(fileName, processedFile, { upsert: true })

        if (uploadError) {
            setMessage({ type: 'error', text: 'Görsel yüklenirken hata oluştu.' })
            setIsUploading(false)
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(fileName)

        handleChange('image_url', publicUrl)
        setMessage({ type: 'success', text: 'Görsel yüklendi.' })
        setIsUploading(false)
    }

    const handleSave = async () => {
        if (!settings) return
        setIsSaving(true)

        const { id, created_at: _c, updated_at: _u, ...updateData } = settings as PopupSettings & { created_at?: string; updated_at?: string }

        const { error } = await supabase
            .from('popup_settings')
            .update(updateData)
            .eq('id', id)

        if (error) {
            setMessage({ type: 'error', text: `Kayıt hatası: ${error.message}` })
        } else {
            setMessage({ type: 'success', text: 'Popup ayarları kaydedildi.' })
        }
        setIsSaving(false)
    }

    return (
        <div>
            {/* Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '1.5rem',
                            right: '1.5rem',
                            zIndex: 9999,
                            padding: '0.75rem 1.25rem',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(220, 38, 38, 0.95)',
                            border: `1px solid ${message.type === 'success' ? '#34d399' : '#f87171'}`,
                            color: '#ffffff',
                            fontWeight: '500',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="admin-page-header">
                <motion.h1
                    className="admin-page-title"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    Popup Yönetimi
                </motion.h1>
                <p className="admin-page-desc">Ana sayfada görüntülenecek popup ayarlarını yapılandırın.</p>
            </div>

            {isLoading ? (
                <div className="admin-empty"><div className="admin-loading-spinner" /></div>
            ) : !settings ? (
                <div className="admin-empty"><p className="admin-empty-title">Ayarlar yüklenemedi.</p></div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <div className="admin-form" style={{ maxWidth: '680px' }}>

                        {/* Aktif Toggle */}
                        <div className="admin-form-group">
                            <div className="admin-form-checkbox-row" style={{ gap: '1rem', alignItems: 'center' }}>
                                <div
                                    onClick={() => handleChange('is_active', !settings.is_active)}
                                    style={{
                                        width: '48px',
                                        height: '26px',
                                        borderRadius: '9999px',
                                        background: settings.is_active ? '#dc2626' : 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'background 0.25s',
                                        flexShrink: 0,
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: settings.is_active ? '24px' : '3px',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: '#fff',
                                        transition: 'left 0.25s',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                    }} />
                                </div>
                                <div>
                                    <label className="admin-form-label" style={{ margin: 0, cursor: 'pointer' }} onClick={() => handleChange('is_active', !settings.is_active)}>
                                        Popup Aktif
                                    </label>
                                    <p style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>
                                        {settings.is_active ? 'Popup site ziyaretçilerine gösterilecek.' : 'Popup kapalı, kimseye gösterilmeyecek.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Display Mode */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">Gösterim Sıklığı</label>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {([
                                    { value: 'every_visit', label: 'Her Ziyarette', desc: 'Sayfa her açıldığında görünür' },
                                    { value: 'once', label: 'Yalnızca Bir Kez', desc: 'Kullanıcı kapattıktan sonra tekrar çıkmaz' },
                                ] as const).map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleChange('display_mode', opt.value)}
                                        style={{
                                            flex: 1,
                                            minWidth: '180px',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '10px',
                                            border: `1px solid ${settings.display_mode === opt.value ? '#dc2626' : 'rgba(255,255,255,0.1)'}`,
                                            background: settings.display_mode === opt.value ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: settings.display_mode === opt.value ? '#f87171' : '#d1d5db', marginBottom: '4px' }}>
                                            {opt.label}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: '#888' }}>{opt.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Delay */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">Gecikme (saniye)</label>
                            <input
                                type="number"
                                min={0}
                                max={30}
                                className="admin-form-input"
                                style={{ maxWidth: '160px' }}
                                value={settings.delay_seconds}
                                onChange={(e) => handleChange('delay_seconds', Number(e.target.value))}
                            />
                            <p style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.4rem' }}>
                                Sayfa açıldıktan kaç saniye sonra popup gösterilsin.
                            </p>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0 1.25rem' }} />

                        {/* Başlık */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">Başlık</label>
                            <input
                                type="text"
                                className="admin-form-input"
                                value={settings.title || ''}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="Duyuru başlığı..."
                            />
                        </div>

                        {/* Açıklama */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">Açıklama</label>
                            <textarea
                                className="admin-form-input admin-form-textarea"
                                value={settings.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Popup içeriği..."
                                rows={4}
                            />
                        </div>

                        {/* Görsel */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">Görsel (İsteğe Bağlı)</label>
                            {settings.image_url && (
                                <div style={{ marginBottom: '0.75rem', position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={settings.image_url}
                                        alt="Popup görseli"
                                        style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }}
                                    />
                                    <button
                                        onClick={() => handleChange('image_url', '')}
                                        style={{
                                            position: 'absolute', top: '6px', right: '6px',
                                            background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                                            borderRadius: '50%', width: '24px', height: '24px',
                                            cursor: 'pointer', fontSize: '14px', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                        title="Görseli kaldır"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="admin-form-input"
                                disabled={isUploading}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleImageUpload(e.target.files[0])
                                }}
                            />
                            <p style={{ fontSize: '0.72rem', color: '#888', margin: '0.4rem 0 0.4rem' }}>veya URL yapıştır:</p>
                            <input
                                type="url"
                                className="admin-form-input"
                                value={settings.image_url || ''}
                                onChange={(e) => handleChange('image_url', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.5rem 0 1.25rem' }} />

                        {/* Buton */}
                        <div className="admin-form-group">
                            <label className="admin-form-label">Buton Metni (İsteğe Bağlı)</label>
                            <input
                                type="text"
                                className="admin-form-input"
                                value={settings.button_label || ''}
                                onChange={(e) => handleChange('button_label', e.target.value)}
                                placeholder="Daha Fazla Bilgi..."
                            />
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-form-label">Buton Yönlendirme URL</label>
                            <input
                                type="url"
                                className="admin-form-input"
                                value={settings.button_url || ''}
                                onChange={(e) => handleChange('button_url', e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="admin-form-actions">
                            <button
                                className="admin-btn admin-btn--primary"
                                onClick={handleSave}
                                disabled={isSaving || isUploading}
                            >
                                {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                            </button>
                        </div>
                    </div>

                    {/* Önizleme */}
                    {(settings.title || settings.description) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            style={{ maxWidth: '680px', marginTop: '2rem' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'monospace' }}>
                                    Önizleme
                                </span>
                                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                            </div>

                            {/* Popup kartı önizleme */}
                            <div style={{
                                position: 'relative',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                background: 'linear-gradient(145deg, #0d0d0d 0%, #110808 50%, #0a0a0a 100%)',
                                border: '1px solid rgba(220,38,38,0.18)',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 8px 40px rgba(0,0,0,0.6)',
                                display: 'flex',
                                flexDirection: settings.image_url ? 'row' : 'column',
                                minHeight: settings.image_url ? '260px' : 'auto',
                            }}>
                                {/* Top glow bar */}
                                <div style={{
                                    position: 'absolute', top: 0, left: '15%', right: '15%',
                                    height: '1px', zIndex: 5,
                                    background: 'linear-gradient(to right, transparent, rgba(220,38,38,0.5), rgba(255,120,40,0.3), transparent)',
                                }} />

                                {/* Görsel */}
                                {settings.image_url && (
                                    <div style={{
                                        width: '42%', flexShrink: 0,
                                        position: 'relative', overflow: 'hidden',
                                    }}>
                                        <img
                                            src={settings.image_url}
                                            alt=""
                                            style={{
                                                width: '100%', height: '100%',
                                                objectFit: 'cover', display: 'block',
                                                filter: 'brightness(0.85) contrast(1.08)',
                                            }}
                                        />
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            background: 'linear-gradient(to right, transparent 55%, #0d0d0d 100%)',
                                        }} />
                                    </div>
                                )}

                                {/* İçerik */}
                                <div style={{
                                    flex: 1,
                                    padding: settings.image_url ? '1.75rem 1.75rem 1.75rem 1.75rem' : '2rem 1.75rem',
                                    display: 'flex', flexDirection: 'column', gap: 0,
                                    position: 'relative',
                                }}>
                                    {/* Etiket */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.875rem' }}>
                                        <div style={{ height: '1px', width: '22px', background: 'linear-gradient(to right, #dc2626, transparent)' }} />
                                        <span style={{
                                            fontSize: '0.58rem', fontWeight: 800,
                                            letterSpacing: '0.2em', textTransform: 'uppercase',
                                            color: '#dc2626', fontFamily: 'monospace',
                                        }}>
                                            HSDMTU · DUYURU
                                        </span>
                                    </div>

                                    {/* Başlık */}
                                    {settings.title && (
                                        <h3 style={{
                                            fontSize: '1.25rem', fontWeight: 800,
                                            lineHeight: 1.15, letterSpacing: '-0.03em',
                                            marginBottom: '0.6rem',
                                            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #aaaaaa 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                        }}>
                                            {settings.title}
                                        </h3>
                                    )}

                                    {/* Ayraç */}
                                    <div style={{
                                        height: '1px', marginBottom: '0.6rem',
                                        background: 'linear-gradient(to right, rgba(220,38,38,0.4), rgba(255,255,255,0.03))',
                                    }} />

                                    {/* Açıklama */}
                                    {settings.description && (
                                        <p style={{
                                            fontSize: '0.82rem', lineHeight: 1.65,
                                            color: '#666', marginBottom: settings.button_label ? '1.25rem' : 0,
                                            flexGrow: 1,
                                        }}>
                                            {settings.description}
                                        </p>
                                    )}

                                    {/* Buton */}
                                    {settings.button_label && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '0.55rem 1.25rem',
                                                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                                                borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700,
                                                color: '#fff', letterSpacing: '0.02em',
                                                boxShadow: '0 4px 16px rgba(220,38,38,0.35)',
                                            }}>
                                                {settings.button_label}
                                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 6h10M7 2l4 4-4 4" />
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: '0.72rem', color: '#333' }}>Geç →</span>
                                        </div>
                                    )}

                                    {/* Köşe dekor */}
                                    <div style={{
                                        position: 'absolute', bottom: '1rem', right: '1.25rem',
                                        fontSize: '0.55rem', color: 'rgba(255,255,255,0.05)',
                                        fontFamily: 'monospace', letterSpacing: '0.1em', userSelect: 'none',
                                    }}>
                                        {new Date().getFullYear()} / HSD
                                    </div>
                                </div>

                                {/* Büyük HSD yazısı */}
                                <div style={{
                                    position: 'absolute', bottom: '-8px', right: '-10px',
                                    fontSize: '6rem', fontWeight: 900,
                                    color: 'rgba(220,38,38,0.04)',
                                    lineHeight: 1, letterSpacing: '-0.05em',
                                    userSelect: 'none', pointerEvents: 'none', zIndex: 1,
                                }}>
                                    HSD
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </div>
    )
}
