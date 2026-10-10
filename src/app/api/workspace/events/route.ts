import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../authHelper';
import { WorkspaceEvent } from '@/shared/api/workspaceTypes';

export async function GET(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Topluluk Takvimine erişmek için yetkili hesapla giriş yapmalısınız.' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const calendarId = searchParams.get('calendar_id') || undefined;

        const events = await WorkspaceRepository.getEvents(calendarId);
        const calendars = await WorkspaceRepository.getCalendars();
        const groups = await WorkspaceRepository.getGroups();
        const allMembers = await WorkspaceRepository.getMembers();
        const members = (allMembers || []).map(m => ({
            id: m.id,
            display_name: m.display_name,
            username: m.username,
            role: m.role,
            status: m.status,
            avatar_url: m.avatar_url
        }));

        return NextResponse.json({
            events,
            calendars,
            groups,
            members
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Etkinlikler yüklenirken hata oluştu.' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Etkinlik oluşturmak için giriş yapmalısınız.' },
                { status: 401 }
            );
        }

        const canCreate = session.permissions?.can_create ||
            session.member.role === 'super_admin' ||
            session.member.role === 'workspace_admin' ||
            session.member.role?.toLowerCase().includes('admin') ||
            session.member.role?.toLowerCase().includes('lead') ||
            session.member.role?.toLowerCase().includes('editor');

        if (!canCreate) {
            return NextResponse.json(
                { error: 'Etkinlik oluşturma yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { title, calendar_id, start_time, end_time, category, color, description, is_all_day, assignees, location, meeting_link } = body;

        if (!title || !start_time || !end_time) {
            return NextResponse.json(
                { error: 'Başlık, başlangıç ve bitiş zamanı zorunludur.' },
                { status: 400 }
            );
        }

        const newEvent: WorkspaceEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            calendar_id: calendar_id || 'cal_core',
            title: title.trim(),
            description: description || '',
            category: category || 'Genel',
            color: color || '#dc2626',
            start_time,
            end_time,
            is_all_day: Boolean(is_all_day),
            assignees: Array.isArray(assignees) ? assignees : [session.member.id],
            location: location || '',
            meeting_link: meeting_link || '',
            status: 'scheduled',
            version: 1,
            subtasks: [],
            comments: [],
            attachments: [],
            reminders: []
        };

        const created = await WorkspaceRepository.createEvent(newEvent);

        return NextResponse.json({ success: true, event: created }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Etkinlik oluşturulamadı.' },
            { status: 500 }
        );
    }
}
