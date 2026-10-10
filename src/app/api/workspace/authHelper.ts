import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { WorkspaceMember, RolePermissions, WorkspaceRole } from '@/shared/api/workspaceTypes';

export const WORKSPACE_COOKIE_NAME = 'hsd_workspace_session';

export interface AuthenticatedUserSession {
    member: WorkspaceMember;
    permissions: RolePermissions;
    sessionId: string;
}

/**
 * Aktif oturumu doğrular.
 * Çerezden session token'ı alır, mağazadaki doğrulanmış oturumu ve aktif üyeyi bulur.
 * GÜVENLİK KURALI: Anonim veya geçersiz isteklerde KESİNLİKLE varsayılan admin fallback yapılmaz!
 */
export async function getWorkspaceSession(): Promise<AuthenticatedUserSession | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value || sessionCookie.value.trim() === '') {
        return null;
    }

    const sessionId = sessionCookie.value.trim();
    const activeSessions = await WorkspaceRepository.getActiveSessions();
    const foundSession = activeSessions.find(s => s.id === sessionId);

    if (!foundSession) {
        return null;
    }

    const member = (await WorkspaceRepository.getMemberById(foundSession.user_id)) || (await WorkspaceRepository.getMemberByEmail(foundSession.email));
    if (!member || member.status !== 'active') {
        return null;
    }

    const permissions = await WorkspaceRepository.getPermissionsForRole(member.role);
    return { member, permissions, sessionId };
}

/**
 * Oturum zorunlu kılan filtre. Oturumu olmayan isteklere 401 Unauthorized döner.
 */
export async function requireAuth(): Promise<{ errorResponse?: NextResponse; session?: AuthenticatedUserSession }> {
    const session = await getWorkspaceSession();
    if (!session) {
        return {
            errorResponse: NextResponse.json(
                { error: 'Yetkisiz erişim: Bu işlem için geçerli bir oturum gereklidir.' },
                { status: 401 }
            )
        };
    }
    return { session };
}

/**
 * Belirli bir rol iznini zorunlu kılan filtre.
 * Oturum yoksa 401, oturum var ama izin yoksa 403 Forbidden döner.
 */
export async function requirePermission(
    permissionKey: keyof RolePermissions
): Promise<{ errorResponse?: NextResponse; session?: AuthenticatedUserSession }> {
    const { errorResponse, session } = await requireAuth();
    if (errorResponse || !session) return { errorResponse };

    if (!session.permissions[permissionKey]) {
        return {
            errorResponse: NextResponse.json(
                { error: `Yetersiz yetki: Bu işlem için "${String(permissionKey)}" iznine sahip değilsiniz.` },
                { status: 403 }
            )
        };
    }

    return { session };
}

/**
 * Admin rotaları için super_admin veya workspace_admin rolünü zorunlu kılan filtre.
 * Oturum yoksa 401, yetki yetersizse 403 Forbidden döner.
 */
export async function verifyAdmin(): Promise<{ errorResponse?: NextResponse; session?: AuthenticatedUserSession }> {
    const { errorResponse, session } = await requireAuth();
    if (errorResponse || !session) return { errorResponse };

    const { member } = session;
    if (member.role !== 'super_admin' && member.role !== 'workspace_admin') {
        return {
            errorResponse: NextResponse.json(
                { error: 'Yetersiz yetki: Bu işlem için Yönetici yetkisi gereklidir.' },
                { status: 403 }
            )
        };
    }

    return { session };
}

/**
 * Sadece super_admin rolünü zorunlu kılan kritik yönetim filtresi.
 * Rol izinlerini değiştirme veya güvenlik ayarları gibi işlemler için kullanılır.
 */
export async function verifySuperAdmin(): Promise<{ errorResponse?: NextResponse; session?: AuthenticatedUserSession }> {
    const { errorResponse, session } = await requireAuth();
    if (errorResponse || !session) return { errorResponse };

    const { member } = session;
    if (member.role !== 'super_admin') {
        return {
            errorResponse: NextResponse.json(
                { error: 'Yetersiz yetki: Bu işlem yalnızca Süper Yönetici (super_admin) tarafından gerçekleştirilebilir.' },
                { status: 403 }
            )
        };
    }

    return { session };
}
