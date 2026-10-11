import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../../../authHelper';
import { WorkspaceCommentTag } from '@/shared/api/workspaceTypes';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const comments = await WorkspaceRepository.getComments(id);
        return NextResponse.json({ comments: comments || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Yorum yapmak için oturum açmalısınız.' }, { status: 401 });
        }

        const body = await req.json();
        const { content, tag, is_pinned } = body;

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Yorum içeriği boş olamaz.' }, { status: 400 });
        }

        const validTag: WorkspaceCommentTag = ['general', 'idea', 'blocker', 'decision', 'info'].includes(tag)
            ? tag
            : 'general';

        const comment = await WorkspaceRepository.addComment(
            id,
            session.member.id,
            session.member.display_name,
            content.trim(),
            validTag,
            Boolean(is_pinned),
            session.member.avatar_url
        );

        return NextResponse.json({ success: true, comment }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Bu işlem için oturum açmalısınız.' }, { status: 401 });
        }

        const body = await req.json();
        const { commentId, action, emoji } = body;

        if (!commentId) {
            return NextResponse.json({ error: 'Yorum ID zorunludur.' }, { status: 400 });
        }

        if (action === 'toggle_pin') {
            const updated = await WorkspaceRepository.toggleCommentPin(id, commentId);
            return NextResponse.json({ success: true, comment: updated });
        }

        if (action === 'toggle_reaction' && emoji) {
            const updated = await WorkspaceRepository.toggleCommentReaction(
                id,
                commentId,
                emoji,
                session.member.display_name
            );
            return NextResponse.json({ success: true, comment: updated });
        }

        return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Silme işlemi için oturum açmalısınız.' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const commentId = searchParams.get('commentId');

        if (!commentId) {
            return NextResponse.json({ error: 'Yorum ID zorunludur.' }, { status: 400 });
        }

        const deleted = await WorkspaceRepository.deleteComment(id, commentId);
        return NextResponse.json({ success: deleted });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
