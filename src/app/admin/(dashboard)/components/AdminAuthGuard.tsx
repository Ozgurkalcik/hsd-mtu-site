'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [isAuthed, setIsAuthed] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace('/admin/login')
                return
            }

            // Admin tablosunda kontrol
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('id')
                .eq('auth_id', user.id)
                .single()

            if (!adminUser) {
                await supabase.auth.signOut()
                router.replace('/admin/login')
                return
            }

            setIsAuthed(true)
            setIsLoading(false)
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
