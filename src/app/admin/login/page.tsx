'use client'

import './login.css'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'

export default function AdminLoginPage() {
    const router = useRouter()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [attempts, setAttempts] = useState(0)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')

        const form = e.currentTarget
        const formData = new FormData(form)
        const currentIdentifier = (identifier || (formData.get('email') as string) || (formData.get('identifier') as string) || '').trim()
        const currentPassword = password || (formData.get('password') as string) || ''

        // Boş alan kontrolü
        if (!currentIdentifier || !currentPassword) {
            setError('Lütfen e-posta/kullanıcı adı ve şifre alanlarını doldurun.')
            return
        }

        if (currentPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.')
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch('/admin/login/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentIdentifier,
                    identifier: currentIdentifier,
                    password: currentPassword,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setAttempts(prev => prev + 1)
                if (res.status === 429) {
                    setError('Çok fazla deneme yapıldı. 15 dakika bekleyin.')
                } else {
                    setError(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.')
                }
                setIsLoading(false)
                return
            }

            // Başarılı giriş
            router.push('/admin')
            router.refresh()
        } catch (err) {
            console.error('Admin login error:', err)
            setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.')
            setIsLoading(false)
        }
    }

    return (
        <div className="admin-login-page">
            {/* Arka plan efekti */}
            <div className="admin-login-bg">
                <div className="admin-login-grid" />
                <div className="admin-login-glow" />
                <div className="admin-login-glow admin-login-glow--secondary" />
            </div>

            <motion.div
                className="admin-login-container"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* Logo / Başlık */}
                <motion.div
                    className="admin-login-header"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <div className="admin-login-badge">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 className="admin-login-title">HSDMTU Admin</h1>
                    <p className="admin-login-subtitle">Yönetim Paneli Girişi</p>
                </motion.div>

                <div>
                    <form
                        onSubmit={handleSubmit}
                        className="admin-login-form"
                        noValidate
                        autoComplete="on"
                        method="post"
                    >
                        {/* E-posta veya Kullanıcı Adı */}
                        <div className="admin-login-field">
                            <label htmlFor="admin-email" className="admin-login-label">
                                E-posta veya Kullanıcı Adı
                            </label>
                            <div className="admin-login-input-wrapper">
                                <svg className="admin-login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                                <input
                                    id="admin-email"
                                    type="text"
                                    name="email"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="admin veya admin@hsdmtu.site"
                                    autoComplete="username"
                                    className="admin-login-input"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Şifre */}
                        <div className="admin-login-field">
                            <label htmlFor="admin-password" className="admin-login-label">
                                Şifre
                            </label>
                            <div className="admin-login-input-wrapper">
                                <svg className="admin-login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    id="admin-password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="admin-login-input"
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    className="admin-login-toggle-pw"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label="Şifreyi göster/gizle"
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" x2="23" y1="1" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="admin-login-error" role="alert" style={{ display: 'flex', alignItems: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="15" x2="9" y1="9" y2="15" />
                                    <line x1="9" x2="15" y1="9" y2="15" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Deneme sayacı */}
                        {attempts >= 3 && (
                            <div className="admin-login-warning">
                                ⚠️ {5 - attempts} deneme hakkınız kaldı.
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="admin-login-submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="admin-login-spinner" />
                                    <span>Giriş Yapılıyor...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                        <polyline points="10 17 15 12 10 7" />
                                        <line x1="15" x2="3" y1="12" y2="12" />
                                    </svg>
                                    <span>Giriş Yap</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="admin-login-footer">
                    HSD Malatya Turgut Özal Topluluğu © 2026 - MZ
                </p>
            </motion.div>
        </div>
    )
}

