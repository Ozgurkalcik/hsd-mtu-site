'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [isAuthed, setIsAuthed] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!url || !key) {
            // Geliştirme ortamında Supabase anahtarları henüz girilmemişse doğrudan aç
            setIsAuthed(true)
            setIsLoading(false)
            return
        }

        const supabase = createBrowserClient(url, key)

        const checkAuth = async () => {
            try {
                // 1. Supabase Auth kontrolü
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    const { data: adminUser } = await supabase
                        .from('admin_users')
                        .select('id')
                        .eq('auth_id', user.id)
                        .single()

                    if (adminUser) {
                        setIsAuthed(true)
                        setIsLoading(false)
                        return
                    }
                }
            } catch (sbErr) {
                console.warn('Supabase auth guard check error:', sbErr)
            }

            // 2. Workspace Session (SSO) kontrolü
            try {
                const res = await fetch('/api/workspace/auth/session')
                if (res.ok) {
                    const data = await res.json()
                    if (data.authenticated && (data.user?.role === 'super_admin' || data.user?.role === 'workspace_admin')) {
                        setIsAuthed(true)
                        setIsLoading(false)
                        return
                    }
                }
            } catch (wsErr) {
                console.warn('Workspace session guard check error:', wsErr)
            }

            // Yetkilendirme sağlanamadı
            router.replace('/admin/login')
        }

        checkAuth()

        // Session değişikliğini dinle
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                router.replace('/admin/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    if (isLoading) {
        return (
            <div className="admin-loading">
                <div className="admin-loading-spinner" />
                <p>Doğrulanıyor...</p>
            </div>
        )
    }

    if (!isAuthed) return null

    return <>{children}</>
}
