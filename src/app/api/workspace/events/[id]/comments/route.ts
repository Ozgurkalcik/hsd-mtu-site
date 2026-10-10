import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../../../authHelper';

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
        const { content } = body;

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Yorum içeriği boş olamaz.' }, { status: 400 });
        }

        const comment = await WorkspaceRepository.addComment(
            id,
            session.member.id,
            session.member.display_name,
            content.trim()
        );

        return NextResponse.json({ success: true, comment }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
