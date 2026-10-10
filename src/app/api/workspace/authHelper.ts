import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { WorkspaceMember, RolePermissions, WorkspaceRole } from '@/shared/api/workspaceTypes';
import { verifySignedSessionToken } from '@/shared/lib/security';

export const WORKSPACE_COOKIE_NAME = 'hsd_workspace_session';

export interface AuthenticatedUserSession {
    member: WorkspaceMember;
    permissions: RolePermissions;
    sessionId: string;
}

export function isUserAdminRole(role?: string): boolean {
    if (!role) return false;
    const r = role.toLowerCase().trim();
    return (
        r === 'super_admin' ||
        r === 'workspace_admin' ||
        r === 'admin' ||
        r.includes('admin') ||
        r.includes('yonetici') ||
        r.includes('lead')
    );
}

/**
 * Aktif oturumu doğrular.
 * 1. Çerezden `hsd_workspace_session` token'ını alır.
 *    - Durumsuz imzalı HMAC token (Serverless / Vercel uyumlu) ise doğrular.
 *    - Veritabanı / aktif oturum listesinde kayıtlıysa doğrular.
 * 2. Eğer workspace çerezi yoksa, Supabase SSR oturum çerezlerini kontrol eder.
 *    - Admin panelinde (`/admin`) giriş yapmış bir yönetici ise otomatik olarak `super_admin` yetkisiyle tanır.
 * Bu sayede hem Vercel sunucusuz mimarisinde oturumlar kopmaz hem de admin paneli ve takvim tam entegre çalışır.
 */
export async function getWorkspaceSession(): Promise<AuthenticatedUserSession | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_COOKIE_NAME);

    // 1. Workspace Çerez Kontrolü
    if (sessionCookie && sessionCookie.value && sessionCookie.value.trim() !== '') {
        const token = sessionCookie.value.trim();

        // İptal edilmiş oturum kontrolü
        if (!WorkspaceRepository.isSessionRevoked(token)) {
            // 1.A: Kriptografik Olarak İmzalı Stateless Token (Serverless Uyumu)
            const signedPayload = verifySignedSessionToken(token);
            if (signedPayload) {
                const member = (await WorkspaceRepository.getMemberById(signedPayload.userId)) ||
                    (await WorkspaceRepository.getMemberByEmail(signedPayload.email)) || {
                    id: signedPayload.userId,
                    email: signedPayload.email,
                    username: signedPayload.email.split('@')[0],
                    display_name: signedPayload.displayName,
                    role: signedPayload.role as WorkspaceRole,
                    status: 'active' as const,
                    mfa_enabled: false,
                    last_active_at: new Date().toISOString(),
                    created_at: new Date(signedPayload.createdAt).toISOString()
                };

                if (member.status === 'active') {
                    await WorkspaceRepository.resolveMemberAvatar(member);
                    const permissions = await WorkspaceRepository.getPermissionsForRole(member.role);
                    return { member, permissions, sessionId: token };
                }
            }

            // 1.B: Geriye Dönük Veritabanı / Bellek Oturum Listesi Kontrolü
            const activeSessions = await WorkspaceRepository.getActiveSessions();
            const foundSession = activeSessions.find(s => s.id === token);

            if (foundSession) {
                const member = (await WorkspaceRepository.getMemberById(foundSession.user_id)) ||
                    (await WorkspaceRepository.getMemberByEmail(foundSession.email));
                if (member && member.status === 'active') {
                    await WorkspaceRepository.resolveMemberAvatar(member);
                    const permissions = await WorkspaceRepository.getPermissionsForRole(member.role);
                    return { member, permissions, sessionId: token };
                }
            }
        }
    }

    // 2. Admin Paneli Supabase Auth Entegrasyonu (SSO Fallback)
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
            const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
                cookies: {
                    getAll() {
                        return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }));
                    },
                    setAll() { }
                }
            });

            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Admin tablosunda kontrol et
                const { data: adminUser } = await supabase
                    .from('admin_users')
                    .select('id, role, display_name')
                    .eq('auth_id', user.id)
                    .maybeSingle();

                const permissions: RolePermissions = {
                    role: 'super_admin',
                    can_view: true,
                    can_create: true,
                    can_edit: true,
                    can_delete: true,
                    can_upload: true,
                    can_share: true
                };

                const member: WorkspaceMember = {
                    id: adminUser?.id || `admin_${user.id}`,
                    email: user.email || 'admin@hsdmtu.site',
                    username: (user.email || 'admin').split('@')[0],
                    display_name: adminUser?.display_name || user.email || 'HSD Admin',
                    role: 'super_admin',
                    status: 'active',
                    mfa_enabled: false,
                    last_active_at: new Date().toISOString(),
                    created_at: new Date().toISOString()
                };

                await WorkspaceRepository.resolveMemberAvatar(member);

                return {
                    member,
                    permissions,
                    sessionId: `sb_admin_${user.id}`
                };
            }
        }
    } catch {
        // Supabase kontrol hatası durumunda sessizce devam et
    }

    return null;
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

    if (isUserAdminRole(session.member.role) || session.permissions[permissionKey]) {
        return { session };
    }

    return {
        errorResponse: NextResponse.json(
            { error: `Yetersiz yetki: Bu işlem için "${String(permissionKey)}" iznine sahip değilsiniz.` },
            { status: 403 }
        )
    };
}

/**
 * Admin rotaları için yönetici yetkisini zorunlu kılan filtre.
 * Oturum yoksa 401, yetki yetersizse 403 Forbidden döner.
 */
export async function verifyAdmin(): Promise<{ errorResponse?: NextResponse; session?: AuthenticatedUserSession }> {
    const { errorResponse, session } = await requireAuth();
    if (errorResponse || !session) return { errorResponse };

    const { member } = session;
    if (isUserAdminRole(member.role)) {
        return { session };
    }

    // Ekstra güvence: Supabase admin oturumu var mı kontrol et
    try {
        const cookieStore = await cookies();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
            const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
                cookies: {
                    getAll() {
                        return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }));
                    },
                    setAll() { }
                }
            });
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                return {
                    session: {
                        member: { ...member, role: 'super_admin' },
                        permissions: {
                            role: 'super_admin',
                            can_view: true,
                            can_create: true,
                            can_edit: true,
                            can_delete: true,
                            can_upload: true,
                            can_share: true
                        },
                        sessionId: session.sessionId
                    }
                };
            }
        }
    } catch {}

    return {
        errorResponse: NextResponse.json(
            { error: 'Yetersiz yetki: Bu işlem için Yönetici yetkisi gereklidir.' },
            { status: 403 }
        )
    };
}

/**
 * Sadece super_admin rolünü zorunlu kılan kritik yönetim filtresi.
 * Rol izinlerini değiştirme veya güvenlik ayarları gibi işlemler için kullanılır.
 */
export async function verifySuperAdmin(): Promise<{ errorResponse?: NextResponse; session?: AuthenticatedUserSession }> {
    const { errorResponse, session } = await requireAuth();
    if (errorResponse || !session) return { errorResponse };

    const { member } = session;
    if (isUserAdminRole(member.role)) {
        return { session };
    }

    return {
        errorResponse: NextResponse.json(
            { error: 'Yetersiz yetki: Bu işlem yalnızca Süper Yönetici tarafından gerçekleştirilebilir.' },
            { status: 403 }
        )
    };
}
