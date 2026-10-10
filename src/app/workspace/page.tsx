'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import NotionCalendar from '@/widgets/workspace/NotionCalendar';
import FrozenSection from '@/shared/lib/FrozenSection';
import { WorkspaceMember, RolePermissions } from '@/shared/api/workspaceTypes';

export default function WorkspacePage() {
    const [user, setUser] = useState<WorkspaceMember | null>(null);
    const [permissions, setPermissions] = useState<RolePermissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Login Form State
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Session
    const checkSession = async () => {
        try {
            const res = await fetch('/api/workspace/auth/session');
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated && data.user) {
                    setUser(data.user);
                    setPermissions(data.permissions);
                } else {
                    setUser(null);
                    setPermissions(null);
                }
            } else {
                setUser(null);
                setPermissions(null);
            }
        } catch (err) {
            console.error('Oturum kontrol hatası:', err);
            setUser(null);
            setPermissions(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    // Login Handler
    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoginError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/workspace/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                setLoginError(data.error || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
                setIsSubmitting(false);
                return;
            }

            setUser(data.user);
            setPermissions(data.permissions);
            setLoginPassword('');
            setLoginIdentifier('');
        } catch (err: any) {
            setLoginError(err.message || 'Sunucuyla bağlantı kurulamadı.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Logout Handler
    const handleLogout = async () => {
        try {
            await fetch('/api/workspace/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Çıkış hatası:', err);
        } finally {
            setUser(null);
            setPermissions(null);
        }
    };

    // 1. Yükleniyor Ekranı
    if (isLoading) {
        return (
            <FrozenSection id="workspace-loading" className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-rose-950/50 animate-pulse">
                        H
                    </div>
                    <div className="space-y-1">
                        <div className="w-7 h-7 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-zinc-400 font-mono tracking-wider pt-2">HSD WORKSPACE DOĞRULANIYOR...</p>
                    </div>
                </div>
            </FrozenSection>
        );
    }

    // 2. Korumalı Ekran: Giriş Yapılmadan Asla ve Asla Görüntülenemez
    if (!user) {
        return (
            <FrozenSection id="workspace-auth-guard" className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Arka Plan Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />

                <div className="w-full max-w-md bg-zinc-950/90 border border-zinc-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg shadow-rose-950/60 border border-rose-500/30">
                            H
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            HSD MTÜ Topluluk Çalışma Alanı
                        </h1>
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                            Topluluk Takvimine ve Çekirdek Ekip planlarına erişebilmek için lütfen yetkili hesabınızla giriş yapınız.
                        </p>
                    </div>

                    {/* Hata Bildirimi */}
                    {loginError && (
                        <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                            <span className="shrink-0 text-rose-400 font-bold">⚠️</span>
                            <span>{loginError}</span>
                        </div>
                    )}

                    {/* Giriş Formu */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                E-Posta veya Kullanıcı Adı
                            </label>
                            <input
                                type="text"
                                value={loginIdentifier}
                                onChange={(e) => setLoginIdentifier(e.target.value)}
                                placeholder="kullanici_adi veya ornek@hsdmtu.site"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-medium text-zinc-300">Şifre</label>
                                <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    {showLoginPassword ? 'Gizle' : 'Göster'}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showLoginPassword ? 'text' : 'password'}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 pr-11 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
                                >
                                    {showLoginPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-md shadow-rose-950/40 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Doğrulanıyor...</span>
                                </>
                            ) : (
                                <span>Giriş Yap ➔</span>
                            )}
                        </button>
                    </form>

                    {/* Ana Sayfaya Dönüş */}
                    <div className="mt-6 pt-4 border-t border-zinc-900 text-center">
                        <Link
                            href="/"
                            className="text-xs text-zinc-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1.5"
                        >
                            <span>←</span>
                            <span>hsdmtu.site Ana Sayfasına Dön</span>
                        </Link>
                    </div>
                </div>
            </FrozenSection>
        );
    }

    // 3. Giriş Yapılmış Durum: Tam Yetkili Workspace & Notion Calendar
    return (
        <FrozenSection id="workspace" className="min-h-screen bg-black text-zinc-100 flex flex-col p-2 sm:p-4">
            <div className="flex-1">
                <NotionCalendar
                    currentUser={user}
                    userPermissions={permissions}
                    isAdmin={user?.role === 'super_admin' || user?.role === 'workspace_admin'}
                    onLogout={handleLogout}
                />
            </div>
        </FrozenSection>
    );
}
