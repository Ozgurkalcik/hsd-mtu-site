import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin, verifySuperAdmin } from '../../authHelper';
import { WorkspaceRole } from '@/shared/api/workspaceTypes';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const roles = await WorkspaceRepository.getRolePermissions();
    return NextResponse.json({ roles });
}

export async function PUT(req: Request) {
    // Sadece Süper Yönetici rol izinlerini değiştirebilir
    const { errorResponse } = await verifySuperAdmin();
    if (errorResponse) return errorResponse;

    try {
        const body = await req.json();
        const { role, permissions } = body;

        if (!role || !permissions) {
            return NextResponse.json({ error: 'Rol ve izin objesi zorunludur.' }, { status: 400 });
        }

        const updated = await WorkspaceRepository.updateRolePermissions(role as WorkspaceRole, permissions);
        return NextResponse.json({ success: true, rolePermissions: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
