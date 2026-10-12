import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';

export async function GET() {
    try {
        const events = await WorkspaceRepository.getPublicShowcaseEvents();
        return NextResponse.json({ events });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Etkinlikler alınamadı.' }, { status: 500 });
    }
}
