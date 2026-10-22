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

/**
 * Web Crypto (SubtleCrypto) ile Edge uyumlu Workspace Oturum Doğrulaması.
 * Basit string length kontrolleri yerine tam kriptografik HMAC-SHA256 ve rol denetimi yapar.
 */
async function isValidWorkspaceAdminSession(token?: string): Promise<boolean> {
    if (!token || typeof token !== 'string') return false
    const secretStr = process.env.WORKSPACE_SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'hsd_mtu_dev_test_session_secret_32bytes_minimum_length_for_local!' : undefined);
    if (!secretStr || secretStr.trim().length < 32) return false

    try {
        const [dataStr, signature] = token.split('.')
        if (!dataStr || !signature || signature.length !== 64) return false

        const enc = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secretStr.trim()),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        )

        const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
        const isValidSig = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataStr))
        if (!isValidSig) return false

        let base64 = dataStr.replace(/-/g, '+').replace(/_/g, '/')
        while (base64.length % 4) base64 += '='
        const jsonStr = atob(base64)
        const payload = JSON.parse(jsonStr)

        // Süre kontrolü
        if (typeof payload.expiresAt === 'number' && Date.now() > payload.expiresAt) {
            return false
        }

        // Yalnızca resmi Workspace Admin yetkisine sahip roller /admin alanına geçebilir
        const role = String(payload.role || '').toLowerCase()
        return role === 'super_admin' || role === 'workspace_admin'
    } catch {
        return false
    }
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
        const response = NextResponse.next()

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

        // Eğer geçerli kriptografik imzalı workspace admin oturumu varsa yönlendir
        const wsSession = request.cookies.get('hsd_workspace_session')?.value
        if (await isValidWorkspaceAdminSession(wsSession)) {
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        return response
    }

    // /admin/* (login hariç) → Auth kontrolü
    const response = NextResponse.next()

    // 1. Kriptografik Olarak Doğrulanmış Workspace Admin Oturumu Kontrolü
    const wsSession = request.cookies.get('hsd_workspace_session')?.value
    if (await isValidWorkspaceAdminSession(wsSession)) {
        return response
    }

    // 2. Supabase Auth Kontrolü
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
        // Auth var ama admin tablosunda yok → çıkış yap ve login'e gönder
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return response
}

export const config = {
    matcher: ['/admin/:path*'],
}
