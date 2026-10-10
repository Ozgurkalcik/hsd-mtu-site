import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin } from '../../authHelper';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const auditLogs = await WorkspaceRepository.getAuditLogs();
    return NextResponse.json({ auditLogs });
}
