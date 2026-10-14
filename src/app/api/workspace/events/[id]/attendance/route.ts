import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../../../authHelper';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const attendees = await WorkspaceRepository.getMemberAttendance(id);
        return NextResponse.json({ attendees: attendees || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Katılım listesi alınamadı.' }, { status: 500 });
    }
}

export async function POST(req: Request, context: RouteParams) {
    try {
        const { id } = await context.params;
        const session = await getWorkspaceSession();

        if (!session) {
            return NextResponse.json({ error: 'Katılım bildirmek için oturum açmalısınız.' }, { status: 401 });
        }

        const body = await req.json();
        const { status, reason } = body;

        if (!status || !['attending', 'declined', 'maybe'].includes(status)) {
            return NextResponse.json({ error: 'Geçersiz katılım durumu (attending, declined, maybe bekleniyor).' }, { status: 400 });
        }

        const res = await WorkspaceRepository.recordMemberAttendance(
            id,
            session.member.id,
            session.member.display_name,
            session.member.role,
            status,
            reason,
            session.member.avatar_url
        );

        if (!res.success) {
            return NextResponse.json({ error: res.error || 'Katılım kaydedilemedi.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            attendance: res.attendance,
            event: res.event
        }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Sunucu hatası oluştu.' }, { status: 500 });
    }
}
