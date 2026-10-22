import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession, isUserAdminRole } from '../../../authHelper';
import { WorkspaceCommentTag } from '@/shared/api/workspaceTypes';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim: Yorumları görüntülemek için oturum açmalısınız.' },
                { status: 401 }
            );
        }

        const { id } = await context.params;
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğin yorumlarını görüntüleme yetkiniz yok.' },
                { status: 404 }
            );
        }
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

        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğe yorum ekleme yetkiniz yok.' },
                { status: 404 }
            );
        }

        // Yorum yetki kontrolü: En az Contributor seviyesi veya can_comment: true izni gereklidir
        const canComment = session.permissions?.can_comment ?? (
            session.member.role === 'super_admin' ||
            session.member.role === 'workspace_admin' ||
            session.member.role === 'editor' ||
            session.member.role === 'contributor'
        );

        if (!canComment) {
            return NextResponse.json(
                { error: 'Yorum yapabilmek için en az Contributor (Katkı Sağlayıcı) yetkisine sahip olmalısınız.' },
                { status: 403 }
            );
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

        // 1. Etkinlik varlık ve görünürlük kontrolü
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğe erişim yetkiniz yok.' },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { commentId, action, emoji } = body;

        if (!commentId) {
            return NextResponse.json({ error: 'Yorum ID zorunludur.' }, { status: 400 });
        }

        // 2. Yorumun gerçekten bu etkinliğe ait olduğunu doğrula (Cross-Event ID Mismatch Engelleme)
        const comments = await WorkspaceRepository.getComments(id);
        const targetComment = comments.find(c => c.id === commentId);
        if (!targetComment) {
            return NextResponse.json(
                { error: 'Yorum bu etkinliğe ait değil veya bulunamadı.' },
                { status: 404 }
            );
        }

        // 3. Sabitleme (Pin) İşlemi: Yalnızca Yönetici veya can_edit yetkisi olanlar
        if (action === 'toggle_pin') {
            const canPin = isUserAdminRole(session.member.role) || session.permissions?.can_edit;
            if (!canPin) {
                return NextResponse.json({ error: 'Yorum sabitleme yetkiniz bulunmamaktadır.' }, { status: 403 });
            }
            const updated = await WorkspaceRepository.toggleCommentPin(id, commentId);
            return NextResponse.json({ success: true, comment: updated });
        }

        // 4. Reaksiyon (Emoji) İşlemi: Etkinliği görüntüleyebilen üyeler reaksiyon ekleyip kaldırabilir
        if (action === 'toggle_reaction') {
            if (!emoji || typeof emoji !== 'string' || !emoji.trim()) {
                return NextResponse.json({ error: 'Geçerli bir emoji belirtilmelidir.' }, { status: 400 });
            }
            const updated = await WorkspaceRepository.toggleCommentReaction(
                id,
                commentId,
                emoji.trim(),
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

        // 1. Etkinlik varlık ve görünürlük kontrolü
        const event = await WorkspaceRepository.getEventById(id, session.member);
        if (!event) {
            return NextResponse.json(
                { error: 'Etkinlik bulunamadı veya bu etkinliğe erişim yetkiniz yok.' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const commentId = searchParams.get('commentId');

        if (!commentId) {
            return NextResponse.json({ error: 'Yorum ID zorunludur.' }, { status: 400 });
        }

        // 2. Yorumun bu etkinliğe ait olduğunu doğrula
        const comments = await WorkspaceRepository.getComments(id);
        const targetComment = comments.find(c => c.id === commentId);
        if (!targetComment) {
            return NextResponse.json(
                { error: 'Yorum bu etkinliğe ait değil veya bulunamadı.' },
                { status: 404 }
            );
        }

        // 3. Yorum sahibi veya admin silebilir
        const isAuthor = targetComment.user_id === session.member.id;
        const isAdmin = isUserAdminRole(session.member.role);
        if (!isAuthor && !isAdmin) {
            return NextResponse.json(
                { error: 'Yalnızca kendi yorumunuzu veya yönetici olarak silebilirsiniz.' },
                { status: 403 }
            );
        }

        const deleted = await WorkspaceRepository.deleteComment(id, commentId);
        return NextResponse.json({ success: deleted });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
