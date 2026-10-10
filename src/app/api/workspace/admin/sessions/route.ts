import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin } from '../../authHelper';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const sessions = await WorkspaceRepository.getActiveSessions();
    return NextResponse.json({ sessions });
}

export async function DELETE(req: Request) {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('id');

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId zorunludur.' }, { status: 400 });
        }

        const revoked = await WorkspaceRepository.revokeSession(sessionId);
        if (!revoked) {
            return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Oturum başarıyla sonlandırıldı.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
