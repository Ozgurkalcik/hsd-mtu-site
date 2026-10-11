import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin } from '../../authHelper';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const auditLogs = await WorkspaceRepository.getAuditLogs();
    return NextResponse.json({ auditLogs });
}

export async function DELETE() {
    const { errorResponse, session } = await verifyAdmin();
    if (errorResponse || !session) return errorResponse;

    await WorkspaceRepository.clearAuditLogs(session.member.email || session.member.display_name || 'admin');
    return NextResponse.json({ success: true, message: 'Denetim izi geçmişi başarıyla temizlendi.' });
}
