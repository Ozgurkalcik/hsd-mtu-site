import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../authHelper';

export async function GET(req: Request) {
    try {
        const session = await getWorkspaceSession();
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
        const { id, mark_all } = body;

        if (mark_all) {
            await WorkspaceRepository.markAllNotificationsAsRead(session.member.id);
            return NextResponse.json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi.' });
        }

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
