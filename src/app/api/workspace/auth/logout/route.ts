import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { WORKSPACE_COOKIE_NAME, getWorkspaceSession } from '../../authHelper';

export async function POST() {
    try {
        const session = await getWorkspaceSession();
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(WORKSPACE_COOKIE_NAME);
        const tokenToRevoke = sessionCookie?.value || session?.sessionId;

        if (tokenToRevoke) {
            await WorkspaceRepository.revokeSession(tokenToRevoke);
        }

        if (session) {
            await WorkspaceRepository.logAudit({
                id: `audit_${Date.now()}`,
                user_id: session.member.id,
                user_email: session.member.email,
                action: 'AUTH_LOGOUT',
                entity_type: 'AUTH',
                entity_id: session.sessionId,
                details: 'Kullanıcı güvenli çıkış yaptı.',
                created_at: new Date().toISOString()
            });
        }

        cookieStore.set(WORKSPACE_COOKIE_NAME, '', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 0
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Çıkış sırasında hata oluştu.' },
            { status: 500 }
        );
    }
}
