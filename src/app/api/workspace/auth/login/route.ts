import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { generateSecureToken, checkRateLimit, resetRateLimit } from '@/shared/lib/security';
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
        const member = await WorkspaceRepository.getMemberByEmailOrUsername(cleanIdentifier);

        // 3. Bilgi Sızıntısını ve Enumeration'ı Önleme (Generic Error)
        if (!member) {
            return NextResponse.json(
                { error: 'Geçersiz kullanıcı adı/e-posta veya şifre.' },
                { status: 401 }
            );
        }

        if (member.status === 'suspended') {
            return NextResponse.json(
                { error: 'Bu kullanıcı hesabı askıya alınmıştır.' },
                { status: 403 }
            );
        }

        const isValid = await WorkspaceRepository.verifyMemberPassword(cleanIdentifier, password);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Geçersiz kullanıcı adı/e-posta veya şifre.' },
                { status: 401 }
            );
        }

        // Giriş başarılı, rate limiter sıfırla
        resetRateLimit(rateLimitKey);

        // 4. Oturum Oluşturma
        const sessionId = `sess_${generateSecureToken(24)}`;
        const userAgent = req.headers.get('user-agent') || 'Browser Client';

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

        // 5. Çerez Ayarla
        const cookieStore = await cookies();
        cookieStore.set(WORKSPACE_COOKIE_NAME, sessionId, {
            httpOnly: true,
            sameSite: 'strict',
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
