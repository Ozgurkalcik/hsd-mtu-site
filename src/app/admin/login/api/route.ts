import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { WorkspaceRepository } from '@/shared/api/workspaceRepository'
import { createSignedSessionToken } from '@/shared/lib/security'
import { WORKSPACE_COOKIE_NAME } from '@/app/api/workspace/authHelper'

export async function POST(request: Request) {
    const cookieStore = await cookies()

    const body = await request.json().catch(() => ({}))
    const rawIdentifier = (body.identifier || body.email || body.username || '').trim()
    const password = body.password

    if (!rawIdentifier || !password) {
        return NextResponse.json({ error: 'E-posta/kullanıcı adı ve şifre zorunludur.' }, { status: 400 })
    }

    const cleanIdentifier = rawIdentifier.toLowerCase().replace(/^@/, '')
    const candidateEmail = cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@hsdmtu.site`

    const cookiesToSetList: { name: string; value: string; options: any }[] = []

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll().map(cookie => ({
                        name: cookie.name,
                        value: cookie.value,
                    }))
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        try {
                            cookieStore.set(name, value, options)
                        } catch {
                            // ignore
                        }
                        cookiesToSetList.push({ name, value, options })
                    })
                },
            },
        }
    )

    let authenticatedAdmin: {
        id: string
        role: string
        displayName: string
        email: string
    } | null = null

    // 1. Önce Supabase Auth ile giriş dene
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: candidateEmail,
            password,
        })

        if (!authError && authData.user) {
            // Admin tablosunda yetki kontrolü
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('id, role, display_name')
                .eq('auth_id', authData.user.id)
                .single()

            if (adminUser) {
                authenticatedAdmin = {
                    id: adminUser.id || authData.user.id,
                    role: adminUser.role || 'super_admin',
                    displayName: adminUser.display_name || authData.user.email || 'Admin',
                    email: authData.user.email || candidateEmail,
                }
            }
        }
    } catch (authErr) {
        console.warn('Supabase auth attempt error:', authErr)
    }

    // 2. Eğer Supabase Auth ile eşleşmediyse, Workspace Members tablosundan super_admin / workspace_admin kontrolü yap
    if (!authenticatedAdmin) {
        try {
            const member = await WorkspaceRepository.getMemberByEmailOrUsername(cleanIdentifier)
            if (member && member.status === 'active' && (member.role === 'super_admin' || member.role === 'workspace_admin')) {
                const isValid = await WorkspaceRepository.verifyMemberPassword(cleanIdentifier, password)
                if (isValid) {
                    authenticatedAdmin = {
                        id: member.id,
                        role: member.role,
                        displayName: member.display_name,
                        email: member.email,
                    }
                }
            }
        } catch (wsErr) {
            console.error('Workspace admin check error:', wsErr)
        }
    }

    if (!authenticatedAdmin) {
        return NextResponse.json(
            { error: 'Geçersiz kullanıcı adı/e-posta veya şifre (Hesap yönetici yetkisine sahip değil).' },
            { status: 401 }
        )
    }

    // Başarılı giriş: Vercel serverless uyumlu imzalı session token üret
    const sessionToken = createSignedSessionToken({
        userId: authenticatedAdmin.id,
        email: authenticatedAdmin.email,
        role: authenticatedAdmin.role,
        displayName: authenticatedAdmin.displayName,
    })

    const response = NextResponse.json({
        success: true,
        user: authenticatedAdmin,
    })

    // 1. Supabase Auth çerezlerini yanıta ekle (Next.js 15 App Router için garanti)
    cookiesToSetList.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
    })

    // 2. Workspace session çerezini de ekle (hem /admin hem /workspace açık kalsın)
    response.cookies.set(WORKSPACE_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    })

    return response
}

