import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../../authHelper';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const event = await WorkspaceRepository.getEventById(id);

        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ event });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Etkinlik bilgisi alınamadı.' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Etkinliği güncellemek için oturum açmalısınız.' },
                { status: 401 }
            );
        }

        const currentEvent = await WorkspaceRepository.getEventById(id);
        if (!currentEvent) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı.' },
                { status: 404 }
            );
        }

        const isCreator = currentEvent.created_by === session.member.id;
        const canEdit = session.permissions?.can_edit ||
            isCreator ||
            session.member.role === 'super_admin' ||
            session.member.role === 'workspace_admin' ||
            session.member.role?.toLowerCase().includes('admin') ||
            session.member.role?.toLowerCase().includes('lead') ||
            session.member.role?.toLowerCase().includes('editor');

        if (!canEdit) {
            return NextResponse.json(
                { error: 'Etkinlik düzenleme yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { version, change_summary, ...updates } = body;

        if (typeof version !== 'number') {
            return NextResponse.json(
                { error: 'Eşzamanlılık kontrolü için "version" parametresi zorunludur.' },
                { status: 400 }
            );
        }

        const result = await WorkspaceRepository.updateEventWithConcurrency(
            id,
            updates,
            version,
            session.member,
            change_summary || (updates.title ? `Başlık / detaylar güncellendi (${updates.title})` : 'Etkinlik güncellendi')
        );

        if (result.conflict) {
            return NextResponse.json(
                {
                    error: 'Eşzamanlılık çakışması (Concurrency Conflict): Bu etkinlik başka bir üye tarafından güncellendi. Lütfen en son veriyi çekip tekrar deneyin.',
                    currentVersion: result.currentVersion,
                    currentEvent: result.event
                },
                { status: 409 }
            );
        }

        if (!result.success || !result.event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya güncellenemedi.' },
                { status: 404 }
            );
        }

        // 🗓️ Otomatik Tarih Güncelleme & Taşıma Bildirimi Dağıtımı
        if (updates.start_time && updates.start_time !== currentEvent.start_time) {
            try {
                const newDateFormatted = new Date(updates.start_time).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                await WorkspaceRepository.dispatchInstantNotification({
                    eventId: result.event.id,
                    eventTitle: result.event.title,
                    title: `🗓️ Etkinlik Tarihi Güncellendi: ${result.event.title}`,
                    message: `"${result.event.title}" etkinliği ${session.member.display_name} tarafından yeni bir tarihe taşındı: ${newDateFormatted}`,
                    targetAudience: result.event.visibility === 'admin_only' ? 'role' : 'all',
                    targetRole: result.event.visibility === 'admin_only' ? 'workspace_admin' : undefined,
                    type: 'urgent'
                });
            } catch (notifErr) {
                console.warn('Tarih güncelleme bildirimi iletilemedi:', notifErr);
            }
        }

        return NextResponse.json({ success: true, event: result.event });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Güncelleme sırasında hata oluştu.' },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request, context: RouteParams) {
    return PATCH(req, context);
}

export async function DELETE(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json(
                { error: 'Silme işlemi için oturum açmalısınız.' },
                { status: 401 }
            );
        }

        const canDelete = session.permissions?.can_delete ||
            session.member.role === 'super_admin' ||
            session.member.role === 'workspace_admin' ||
            session.member.role?.toLowerCase().includes('admin') ||
            session.member.role?.toLowerCase().includes('lead') ||
            session.member.role?.toLowerCase().includes('editor');

        const existing = await WorkspaceRepository.getEventById(id);
        const isCreator = existing?.created_by === session.member.id;
        const isAssignee = existing?.assignees?.includes(session.member.id);
        if (!canDelete && !isCreator && !isAssignee) {
            return NextResponse.json(
                { error: 'Etkinlik silme yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const deleted = await WorkspaceRepository.deleteEvent(id);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Silinecek etkinlik bulunamadı.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Silme işlemi sırasında hata oluştu.' },
            { status: 500 }
        );
    }
}
