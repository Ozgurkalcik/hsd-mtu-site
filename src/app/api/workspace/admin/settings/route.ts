import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin, verifySuperAdmin } from '../../authHelper';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const settings = await WorkspaceRepository.getSecuritySettings();
    return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
    // Sadece Süper Yönetici sistem güvenlik ayarlarını değiştirebilir
    const { errorResponse } = await verifySuperAdmin();
    if (errorResponse) return errorResponse;

    try {
        const body = await req.json();
        const updated = await WorkspaceRepository.updateSecuritySettings(body);
        return NextResponse.json({ success: true, settings: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
