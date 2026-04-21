import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const cookieStore = await cookies()

    // Honeypot kontrolü
    const body = await request.json()
    if (body.website) {
        // Bot tespiti - honeypot alanı dolu
        return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }

    const { email, password } = body

    if (!email || !password) {
        return NextResponse.json({ error: 'Email ve şifre zorunludur.' }, { status: 400 })
    }

    // Input sanitization
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        return NextResponse.json({ error: 'Geçersiz email formatı.' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

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
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    } catch {
                        // Ignore
                    }
                },
            },
        }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
    })

    if (error) {
        return NextResponse.json(
            { error: 'Email veya şifre hatalı.' },
            { status: 401 }
        )
    }

    // Admin tablosunda var mı kontrol et
    const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role, display_name')
        .eq('auth_id', data.user.id)
        .single()

    if (adminError || !adminUser) {
        // Hata durumunu konsola yazdır (sunucu tarafında görünür)
        console.error('Admin check error:', adminError)

        // Auth başarılı ama admin değil → çıkış yap
        await supabase.auth.signOut()

        return NextResponse.json(
            { error: adminError ? `Veritabanı hatası: ${adminError.message}` : 'Bu hesap admin yetkisine sahip değil.' },
            { status: adminError ? 500 : 403 }
        )
    }

    return NextResponse.json({
        success: true,
        user: {
            id: adminUser.id,
            role: adminUser.role,
            displayName: adminUser.display_name,
            email: sanitizedEmail,
        },
    })
}
