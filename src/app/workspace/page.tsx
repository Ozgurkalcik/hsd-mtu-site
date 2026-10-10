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

    // Login Modal State
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
            }
        } catch (err) {
            console.error('Oturum kontrol hatası:', err);
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
                setLoginError(data.error || 'Giriş yapılamadı.');
                setIsSubmitting(false);
                return;
            }

            setUser(data.user);
            setPermissions(data.permissions);
            setIsLoginModalOpen(false);
            setLoginPassword('');
        } catch (err: any) {
            setLoginError(err.message || 'Ağ hatası.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Logout Handler
    const handleLogout = async () => {
        try {
            await fetch('/api/workspace/auth/logout', { method: 'POST' });
            setUser(null);
            setPermissions(null);
        } catch (err) {
            console.error('Çıkış hatası:', err);
        }
    };

    // Quick Login Helper for Demo/Admins
    const handleQuickLogin = (idOrEmail: string) => {
        setLoginIdentifier(idOrEmail);
        setLoginPassword('admin_bootstrap_pass_2026');
    };

    return (
        <FrozenSection id="workspace" className="min-h-screen bg-black text-zinc-100 flex flex-col p-2 sm:p-4">
            {/* Notion Calendar Component with Unified Top Bar */}
            <div className="flex-1">
                <NotionCalendar
                    currentUser={user}
                    userPermissions={permissions}
                    isAdmin={user?.role === 'super_admin' || user?.role === 'workspace_admin'}
                    onRequireLogin={() => setIsLoginModalOpen(true)}
                    onLogout={handleLogout}
                />
            </div>

            {/* Login Modal */}
            {isLoginModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
                        <button
                            type="button"
                            onClick={() => setIsLoginModalOpen(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white text-lg"
                        >
                            ✕
                        </button>

                        <div className="mb-5 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400 text-xl font-bold">
                                🔒
                            </div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Çekirdek Ekip Doğrulaması</h2>
                            <p className="text-xs text-zinc-400 mt-1">
                                Topluluk Takvimine erişmek, etkinlik planlamak ve duyuru göndermek için giriş yapın.
                            </p>
                        </div>

                        {loginError && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs">
                                {loginError}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">E-Posta veya Kullanıcı Adı</label>
                                <input
                                    type="text"
                                    value={loginIdentifier}
                                    onChange={(e) => setLoginIdentifier(e.target.value)}
                                    placeholder="admin veya ornek@hsdmtu.site"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-medium text-zinc-400">Şifre</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        className="text-[11px] text-zinc-400 hover:text-zinc-200"
                                    >
                                        {showLoginPassword ? '🙈 Gizle' : '👁️ Göster'}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showLoginPassword ? 'text' : 'password'}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
                                    >
                                        {showLoginPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-md shadow-rose-950/40 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap ➔'}
                            </button>
                        </form>

                        {/* Hızlı Demo Giriş Butonları */}
                        <div className="mt-5 pt-4 border-t border-zinc-900 text-center">
                            <span className="text-[11px] text-zinc-500 block mb-2 font-mono">Hızlı Test Girişi (Kullanıcı Adı):</span>
                            <div className="flex gap-2 justify-center flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('admin')}
                                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-mono transition-colors"
                                >
                                    @admin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('leadadmin')}
                                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-mono transition-colors"
                                >
                                    @leadadmin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('admin@hsdmtu.site')}
                                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-mono transition-colors"
                                >
                                    admin@hsdmtu.site
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2 font-mono">
                                Test parolası: <code className="text-rose-400/90 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">admin_bootstrap_pass_2026</code>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </FrozenSection>
    );
}
