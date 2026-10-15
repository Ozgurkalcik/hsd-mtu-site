import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../authHelper';

const ADMIN_ROLES = ['super_admin', 'workspace_admin', 'editor'];

export async function GET(req: Request) {
    try {
        const session = await getWorkspaceSession();
        const url = new URL(req.url);
        const scope = url.searchParams.get('scope');

        // Admin Scope: Tüm aktif ve pasif bildirimleri getirir
        if (scope === 'admin') {
            if (!session || !ADMIN_ROLES.includes(session.member.role)) {
                return NextResponse.json({ error: 'Bu veriyi görüntüleme yetkiniz yok.' }, { status: 403 });
            }
            const notifications = await WorkspaceRepository.getAllNotificationsAdmin();
            return NextResponse.json({ notifications });
        }

        const userId = session?.member.id || 'all';
        const notifications = await WorkspaceRepository.getNotifications(userId);

        return NextResponse.json({ notifications });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json({ error: 'Bu işlem için oturum açmalısınız.' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ids, is_active, mark_all } = body;

        // Toplu Aktiflik / Pasiflik Değişimi (Admin)
        if (Array.isArray(ids) && typeof is_active === 'boolean') {
            if (!ADMIN_ROLES.includes(session.member.role)) {
                return NextResponse.json({ error: 'Bildirim durumunu değiştirme yetkiniz bulunmuyor.' }, { status: 403 });
            }
            const success = await WorkspaceRepository.toggleNotificationsActive(ids, is_active);
            return NextResponse.json({
                success,
                message: `${ids.length} adet bildirim ${is_active ? 'yayına alındı' : 'pasife alındı'}.`
            });
        }

        // Tekil Aktiflik / Pasiflik Değişimi (Admin)
        if (id && typeof is_active === 'boolean') {
            if (!ADMIN_ROLES.includes(session.member.role)) {
                return NextResponse.json({ error: 'Bildirim durumunu değiştirme yetkiniz bulunmuyor.' }, { status: 403 });
            }
            const success = await WorkspaceRepository.toggleNotificationActive(id, is_active);
            return NextResponse.json({
                success,
                message: `Bildirim ${is_active ? 'yayına alındı' : 'pasife alındı'}.`
            });
        }

        // Tümünü Okundu İşaretle
        if (mark_all) {
            await WorkspaceRepository.markAllNotificationsAsRead(session.member.id);
            return NextResponse.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi.' });
        }

        // Tekil Okundu İşaretle
        if (id) {
            const updated = await WorkspaceRepository.markNotificationAsRead(id, session.member.id);
            return NextResponse.json({ success: updated });
        }

        return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * 🗑️ Bildirim Silme & Geçmiş Temizleme (Admin)
 */
export async function DELETE(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session || !ADMIN_ROLES.includes(session.member.role)) {
            return NextResponse.json({ error: 'Bildirimleri silme yetkiniz bulunmuyor.' }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const { id, ids, clear_history, filter } = body;

        // Bildirim Geçmişini Temizle (all, read, inactive)
        if (clear_history) {
            const success = await WorkspaceRepository.clearNotificationHistory(filter);
            return NextResponse.json({
                success,
                message: filter === 'inactive'
                    ? 'Pasif bildirim geçmişi temizlendi.'
                    : filter === 'read'
                        ? 'Okunmuş bildirim geçmişi temizlendi.'
                        : 'Tüm bildirim geçmişi sıfırlandı ve temizlendi.'
            });
        }

        // Toplu Bildirim Silme (Seçilenleri Yayından Kaldır & Sil)
        if (Array.isArray(ids) && ids.length > 0) {
            const success = await WorkspaceRepository.deleteNotifications(ids);
            return NextResponse.json({
                success,
                message: `${ids.length} adet bildirim yayından kaldırıldı ve silindi.`
            });
        }

        // Tekil Bildirim Silme
        if (id) {
            const success = await WorkspaceRepository.deleteNotification(id);
            return NextResponse.json({
                success,
                message: 'Bildirim yayından kaldırıldı ve silindi.'
            });
        }

        return NextResponse.json({ error: 'Silinecek bildirim belirtilmedi.' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * ⚡ Anlık Duyur (dispatchInstantNotification) API Handler
 */
export async function POST(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json({ error: 'Duyuru göndermek için oturum açmalısınız.' }, { status: 401 });
        }

        // Sadece paylaşım izni olanlar veya yöneticiler duyuru dağıtabilir
        const canShare = session.permissions.can_share || 
                         session.member.role === 'super_admin' || 
                         session.member.role === 'workspace_admin';

        if (!canShare) {
            return NextResponse.json({ error: 'Duyuru dağıtma yetkiniz bulunmamaktadır.' }, { status: 403 });
        }

        const body = await req.json();
        const {
            eventId,
            eventTitle,
            title,
            message,
            targetAudience,
            targetGroupId,
            targetRole,
            targetUserIds,
            type
        } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Duyuru başlığı ve mesajı zorunludur.' }, { status: 400 });
        }

        const dispatched = await WorkspaceRepository.dispatchInstantNotification({
            eventId,
            eventTitle,
            title,
            message,
            targetAudience: targetAudience || 'all',
            targetGroupId,
            targetRole,
            targetUserIds,
            type: type || 'announcement'
        });

        return NextResponse.json({
            success: true,
            dispatchedCount: dispatched.length,
            notifications: dispatched
        }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Duyuru dağıtılamadı.' }, { status: 500 });
    }
}
