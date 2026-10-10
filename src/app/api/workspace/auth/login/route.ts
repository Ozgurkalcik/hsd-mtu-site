import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { generateSecureToken, checkRateLimit, resetRateLimit, createSignedSessionToken } from '@/shared/lib/security';
import { WORKSPACE_COOKIE_NAME } from '../../authHelper';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, username, identifier, password } = body;
        const rawIdentifier = (identifier || username || email || '').trim();

        if (!rawIdentifier || !password) {
            return NextResponse.json(
                { error: 'E-posta/kullanıcı adı ve şifre zorunludur.' },
                { status: 400 }
            );
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
        const cleanIdentifier = rawIdentifier.toLowerCase().replace(/^@/, '');

        // 1. IP ve Hesap Bazlı Rate Limiting (5 deneme, 15 dakika)
        const rateLimitKey = `login_${ip}_${cleanIdentifier}`;
        const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Çok fazla başarısız giriş denemesi yapıldı. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        // 2. Kullanıcıyı getir
        let member = await WorkspaceRepository.getMemberByEmailOrUsername(cleanIdentifier);
        let isValid = false;

        if (member) {
            if (member.status === 'suspended') {
                return NextResponse.json(
                    { error: 'Bu kullanıcı hesabı askıya alınmıştır.' },
                    { status: 403 }
                );
            }
            isValid = await WorkspaceRepository.verifyMemberPassword(cleanIdentifier, password);
        }

        // 3. Eğer Workspace kaydıyla doğrulanamadıysa, Supabase Auth (Admin hesabı) kontrolü yap
        if (!member || !isValid) {
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
                    const { createClient } = await import('@supabase/supabase-js');
                    const sb = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
                    const candidateEmail = cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@hsdmtu.site`;
                    const { data: sbAuth, error: sbErr } = await sb.auth.signInWithPassword({
                        email: candidateEmail,
                        password,
                    });

                    if (!sbErr && sbAuth.user) {
                        const { data: adminUser } = await sb
                            .from('admin_users')
                            .select('id, role, display_name')
                            .eq('auth_id', sbAuth.user.id)
                            .single();

                        if (adminUser) {
                            member = {
                                id: adminUser.id || `admin_${sbAuth.user.id}`,
                                email: sbAuth.user.email || candidateEmail,
                                username: cleanIdentifier.replace(/@.*$/, ''),
                                display_name: adminUser.display_name || 'Admin',
                                role: 'super_admin',
                                status: 'active',
                                mfa_enabled: false,
                                last_active_at: new Date().toISOString(),
                                created_at: new Date().toISOString()
                            };
                            isValid = true;
                        }
                    }
                }
            } catch {
                // ignore
            }
        }

        // 4. Bilgi Sızıntısını ve Enumeration'ı Önleme (Generic Error)
        if (!member || !isValid) {
            return NextResponse.json(
                { error: 'Geçersiz kullanıcı adı/e-posta veya şifre.' },
                { status: 401 }
            );
        }

        // Giriş başarılı, rate limiter sıfırla
        resetRateLimit(rateLimitKey);

        // 5. Kriptografik Olarak İmzalı Stateless Oturum Oluşturma (Vercel Serverless Uyumlu)
        const sessionId = createSignedSessionToken({
            userId: member.id,
            email: member.email,
            role: member.role,
            displayName: member.display_name,
        });
        const userAgent = req.headers.get('user-agent') || 'Browser Client';

        try {
            await WorkspaceRepository.registerSession({
                id: sessionId,
                user_id: member.id,
                email: member.email,
                role: member.role,
                ip_address: ip,
                user_agent: userAgent,
                last_active_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            });

            await WorkspaceRepository.logAudit({
                id: `audit_${Date.now()}`,
                user_id: member.id,
                user_email: member.email,
                action: 'AUTH_LOGIN_SUCCESS',
                entity_type: 'AUTH',
                entity_id: sessionId,
                details: `Giriş başarılı (Rol: ${member.role}, IP: ${ip})`,
                ip_address: ip,
                created_at: new Date().toISOString()
            });
        } catch (regErr) {
            console.warn('Oturum kaydı uyarısı:', regErr);
        }

        // 6. Çerez Ayarla (Lax mod: sekmeler ve yönlendirmeler arası oturumu korur)
        const cookieStore = await cookies();
        cookieStore.set(WORKSPACE_COOKIE_NAME, sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 gün
        });

        const permissions = await WorkspaceRepository.getPermissionsForRole(member.role);

        return NextResponse.json({
            success: true,
            user: member,
            permissions,
            must_change_password: member.must_change_password || false
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Giriş işlemi sırasında sunucu hatası.' },
            { status: 500 }
        );
    }
}
