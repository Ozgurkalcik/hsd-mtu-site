'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'motion/react'

export default function ArticlesSettingsPage() {
    const [mediumUrl, setMediumUrl] = useState('')
    const [originalUrl, setOriginalUrl] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchSettings = useCallback(async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'medium_rss_url')
            .single()

        if (data) {
            setMediumUrl(data.value)
            setOriginalUrl(data.value)
        }
        if (error && error.code !== 'PGRST116') {
            console.error('Settings fetch error:', error)
        }
        setIsLoading(false)
    }, [])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        const { error } = await supabase
            .from('site_settings')
            .upsert({
                key: 'medium_rss_url',
                value: mediumUrl.trim(),
                label: 'Medium RSS URL',
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })

        if (error) {
            console.error('Save error:', error)
            setMessage({ type: 'error', text: `Kaydetme hatası: ${error.message}` })
        } else {
            setOriginalUrl(mediumUrl.trim())
            setMessage({ type: 'success', text: 'Medium URL güncellendi.' })
        }
        setIsSaving(false)
    }

    const hasChanges = mediumUrl.trim() !== originalUrl

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1 className="admin-page-title">Yazılar Ayarları</h1>
                <p className="admin-page-subtitle">
                    Medium hesap URL&apos;sini buradan yönetebilirsiniz. Yazılar bölümü bu URL&apos;den otomatik olarak RSS ile çekilir.
                </p>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`admin-alert admin-alert--${message.type}`}
                >
                    {message.text}
                </motion.div>
            )}

            <div className="admin-card" style={{ maxWidth: 640 }}>
                <div className="admin-form-group">
                    <label className="admin-form-label">Medium Profil URL</label>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                        Örnek: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>https://medium.com/feed/@kullanici-adi</code>
                    </p>
                    <input
                        type="url"
                        value={mediumUrl}
                        onChange={(e) => setMediumUrl(e.target.value)}
                        placeholder="https://medium.com/feed/@kullanici-adi"
                        className="admin-form-input"
                        disabled={isLoading}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                        className="admin-btn admin-btn--primary"
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges || isLoading}
                    >
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    {hasChanges && (
                        <button
                            className="admin-btn admin-btn--ghost"
                            onClick={() => setMediumUrl(originalUrl)}
                            disabled={isSaving}
                        >
                            İptal
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
