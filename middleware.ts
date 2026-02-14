import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ============================================
// Rate Limiting (In-Memory Store)
// ============================================
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 dakika

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const attempts = loginAttempts.get(ip)

    if (!attempts) return false

    // Pencere süresi geçtiyse sıfırla
    if (now - attempts.lastAttempt > RATE_LIMIT_WINDOW_MS) {
        loginAttempts.delete(ip)
        return false
    }

    return attempts.count >= RATE_LIMIT_MAX
}

export function recordLoginAttempt(ip: string) {
    const now = Date.now()
    const attempts = loginAttempts.get(ip)

    if (!attempts || now - attempts.lastAttempt > RATE_LIMIT_WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, lastAttempt: now })
    } else {
        attempts.count++
        attempts.lastAttempt = now
    }
}

export function clearLoginAttempts(ip: string) {
    loginAttempts.delete(ip)
}

// ============================================
// Middleware
// ============================================
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Sadece /admin rotalarını kontrol et
    if (!pathname.startsWith('/admin')) {
        return NextResponse.next()
    }

    // Login sayfası ve Login API herkese açık (rate limit dahilinde)
    if (pathname === '/admin/login' || pathname === '/admin/login/api') {
        // Login POST isteği rate limit kontrolü (hem sayfa hem API için)
        if (request.method === 'POST') {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                request.headers.get('x-real-ip') ||
                'unknown'

            if (isRateLimited(ip)) {
                return NextResponse.json(
                    { error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
                    { status: 429 }
                )
            }
        }

        // Eğer sadece API isteği ise burada dur, auth kontrolüne gerek yok (API route kendi içinde yapıyor)
        if (pathname === '/admin/login/api') {
            return NextResponse.next()
        }

        // Login sayfasına auth'lu kullanıcı gelirse dashboard'a yönlendir
        let response = NextResponse.next()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll().map(cookie => ({
                            name: cookie.name,
                            value: cookie.value,
                        }))
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            response.cookies.set(name, value, options)
                        })
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Admin tablosunda var mı kontrol et
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('id')
                .eq('auth_id', user.id)
                .single()

            if (adminUser) {
                return NextResponse.redirect(new URL('/admin', request.url))
            }
        }

        return response
    }

    // /admin/* (login hariç) → Auth kontrolü
    let response = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll().map(cookie => ({
                        name: cookie.name,
                        value: cookie.value,
                    }))
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Admin tablosunda var mı kontrol et
    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('auth_id', user.id)
        .single()

    if (!adminUser) {
        // Auth var ama admin değil → logout ve login'e gönder
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return response
}

export const config = {
    matcher: ['/admin/:path*'],
}
