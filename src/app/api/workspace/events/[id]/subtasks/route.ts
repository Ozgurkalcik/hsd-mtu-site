import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession, isUserAdminRole } from '../../../authHelper';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim: Alt görevleri görüntülemek için oturum açmalısınız.' },
                { status: 401 }
            );
        }

        const { id } = await context.params;
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğin alt görevlerini görüntüleme yetkiniz yok.' },
                { status: 404 }
            );
        }
        const subtasks = await WorkspaceRepository.getSubtasks(id);
        return NextResponse.json({ subtasks: subtasks || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Alt görev eklemek için oturum açmalısınız.' }, { status: 401 });
        }

        // 1. Etkinlik varlık ve görünürlük kontrolü
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğe görev ekleme yetkiniz yok.' },
                { status: 404 }
            );
        }

        // 2. Yetki kontrolü: Yöneticiler, etkinlik sahibi veya can_manage_tasks / can_edit yetkisi olanlar
        const isEventOwner = event.created_by === session.member.id;
        const isAdmin = isUserAdminRole(session.member.role);
        const canManage = Boolean(session.permissions?.can_manage_tasks || session.permissions?.can_edit || session.permissions?.can_create);

        if (!isAdmin && !isEventOwner && !canManage) {
            return NextResponse.json({ error: 'Alt görev ekleme yetkiniz bulunmamaktadır.' }, { status: 403 });
        }

        const body = await req.json();
        const { title } = body;

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Görev başlığı boş olamaz.' }, { status: 400 });
        }

        const subtask = await WorkspaceRepository.addSubtask(id, title.trim());

        return NextResponse.json({ success: true, subtask }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Alt görevi güncellemek için oturum açmalısınız.' }, { status: 401 });
        }

        // 1. Etkinlik varlık ve görünürlük kontrolü
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğe erişim yetkiniz yok.' },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { subtaskId, is_completed } = body;

        if (!subtaskId) {
            return NextResponse.json({ error: 'subtaskId zorunludur.' }, { status: 400 });
        }

        // 2. Alt görevin gerçekten bu etkinliğe ait olduğunu doğrula (Cross-Event ID Mismatch Engelleme)
        const subtasks = await WorkspaceRepository.getSubtasks(id);
        const targetSubtask = subtasks.find(s => s.id === subtaskId);
        if (!targetSubtask) {
            return NextResponse.json(
                { error: 'Alt görev bu etkinliğe ait değil veya bulunamadı.' },
                { status: 404 }
            );
        }

        // 3. Görev tamamlama yetkisi ayrımı:
        // - Yönetici veya etkinlik sahibi
        // - Göreve atanmış olan üye (assignees listesinde veya targetSubtask'ta)
        // - Komite üyesi olup can_manage_tasks yetkisine sahip olan üye
        const isAdmin = isUserAdminRole(session.member.role);
        const isEventOwner = event.created_by === session.member.id;
        const isAssignee = Array.isArray(event.assignees) && (
            event.assignees.includes(session.member.id) ||
            event.assignees.includes(session.member.username)
        );
        const canManageTasks = Boolean(session.permissions?.can_manage_tasks || session.permissions?.can_edit);

        const canToggle = isAdmin || isEventOwner || isAssignee || canManageTasks;
        if (!canToggle) {
            return NextResponse.json(
                { error: 'Bu etkinliğin alt görevlerini tamamlama veya güncelleme yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const updated = await WorkspaceRepository.toggleSubtask(id, subtaskId, is_completed);

        if (!updated) {
            return NextResponse.json({ error: 'Alt görev güncellenemedi.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, subtask: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Alt görevi silmek için oturum açmalısınız.' }, { status: 401 });
        }

        // 1. Etkinlik varlık ve görünürlük kontrolü
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğe erişim yetkiniz yok.' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const subtaskId = searchParams.get('subtaskId');

        if (!subtaskId) {
            return NextResponse.json({ error: 'subtaskId parametresi zorunludur.' }, { status: 400 });
        }

        // 2. Alt görevin bu etkinliğe ait olduğunu doğrula
        const subtasks = await WorkspaceRepository.getSubtasks(id);
        const targetSubtask = subtasks.find(s => s.id === subtaskId);
        if (!targetSubtask) {
            return NextResponse.json(
                { error: 'Alt görev bu etkinliğe ait değil veya bulunamadı.' },
                { status: 404 }
            );
        }

        // 3. Görev Silme Yetkisi: Yalnızca Yönetici veya Etkinlik Sahibi silebilir (Normal üye yalnızca tamamlayabilir, silemez!)
        const isAdmin = isUserAdminRole(session.member.role);
        const isEventOwner = event.created_by === session.member.id;

        if (!isAdmin && !isEventOwner) {
            return NextResponse.json(
                { error: 'Alt görevi silme yetkiniz bulunmamaktadır. Yalnızca etkinlik sahibi veya yöneticiler alt görev silebilir.' },
                { status: 403 }
            );
        }

        const deleted = await WorkspaceRepository.deleteSubtask(id, subtaskId);

        if (!deleted) {
            return NextResponse.json({ error: 'Alt görev silinemedi.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
