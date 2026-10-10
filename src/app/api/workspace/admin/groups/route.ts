import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin } from '../../authHelper';
import { WorkspaceGroup } from '@/shared/api/workspaceTypes';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const groups = await WorkspaceRepository.getGroups();
    return NextResponse.json({ groups });
}

export async function POST(req: Request) {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    try {
        const body = await req.json();
        const { name, code, description, color, role_key } = body;

        if (!name || !code || !color) {
            return NextResponse.json({ error: 'Grup adı, kodu ve rengi zorunludur.' }, { status: 400 });
        }

        const newGroup: WorkspaceGroup = {
            id: `grp_${code.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${Date.now().toString(36).substring(2, 6)}`,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description || '',
            color: color || '#8b5cf6',
            role_key: role_key || 'member',
            members: []
        };

        const created = await WorkspaceRepository.addGroup(newGroup);
        return NextResponse.json({ success: true, group: created }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Grup ID zorunludur.' }, { status: 400 });
        }

        const updated = await WorkspaceRepository.updateGroup(id, updates);
        return NextResponse.json({ success: true, group: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    try {
        const body = await req.json();
        const { groupId, memberId, add } = body;

        if (!groupId || !memberId || typeof add !== 'boolean') {
            return NextResponse.json({ error: 'groupId, memberId ve add (boolean) parametreleri zorunludur.' }, { status: 400 });
        }

        const updated = await WorkspaceRepository.toggleGroupMember(groupId, memberId, add);
        return NextResponse.json({ success: true, group: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Grup ID zorunludur.' }, { status: 400 });
        }

        const deleted = await WorkspaceRepository.deleteGroup(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Komite bulunamadı.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
