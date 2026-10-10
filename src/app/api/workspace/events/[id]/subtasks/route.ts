import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../../../authHelper';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
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

        if (!session.permissions.can_edit && !session.permissions.can_create) {
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

        if (!session.permissions.can_edit) {
            return NextResponse.json({ error: 'Alt görevi güncelleme yetkiniz bulunmamaktadır.' }, { status: 403 });
        }

        const body = await req.json();
        const { subtaskId, is_completed } = body;

        if (!subtaskId) {
            return NextResponse.json({ error: 'subtaskId zorunludur.' }, { status: 400 });
        }

        const updated = await WorkspaceRepository.toggleSubtask(id, subtaskId, is_completed);

        if (!updated) {
            return NextResponse.json({ error: 'Alt görev bulunamadı.' }, { status: 404 });
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

        if (!session.permissions.can_edit && !session.permissions.can_delete) {
            return NextResponse.json({ error: 'Alt görevi silme yetkiniz bulunmamaktadır.' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const subtaskId = searchParams.get('subtaskId');

        if (!subtaskId) {
            return NextResponse.json({ error: 'subtaskId parametresi zorunludur.' }, { status: 400 });
        }

        const deleted = await WorkspaceRepository.deleteSubtask(id, subtaskId);

        if (!deleted) {
            return NextResponse.json({ error: 'Alt görev bulunamadı.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
