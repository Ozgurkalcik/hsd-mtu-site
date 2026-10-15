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

        // Görünürlük filtresi için aktif kullanıcı oturumu parametre olarak iletilir
        const events = await WorkspaceRepository.getEvents(calendarId, session.member);
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
        const {
            title,
            calendar_id,
            start_time,
            end_time,
            category,
            color,
            description,
            is_all_day,
            assignees,
            location,
            meeting_link,
            visibility,
            subtasks,
            reminders,
            comments,
            attachments,
            is_showcase,
            rsvp_enabled,
            rsvp_qr_enabled,
            rsvp_capacity
        } = body;

        if (!title || !start_time || !end_time) {
            return NextResponse.json(
                { error: 'Başlık, başlangıç ve bitiş zamanı zorunludur.' },
                { status: 400 }
            );
        }

        // Görünürlük Seviyesi Doğrulama
        const validVisibility = (visibility === 'admin_only' || visibility === 'private' || visibility === 'custom')
            ? visibility
            : 'public';

        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const nowIso = new Date().toISOString();

        const newEvent: WorkspaceEvent = {
            id: eventId,
            calendar_id: calendar_id || 'cal_core',
            title: title.trim(),
            description: description || '',
            category: category || 'Genel',
            color: color || '#dc2626',
            start_time,
            end_time,
            is_all_day: Boolean(is_all_day),
            assignees: Array.isArray(assignees) ? assignees : [session.member.id],
            allowed_member_ids: validVisibility === 'custom' && Array.isArray((body as any).allowed_member_ids)
                ? (body as any).allowed_member_ids
                : (validVisibility === 'custom' && Array.isArray(assignees) ? assignees : []),
            location: location || '',
            meeting_link: meeting_link || '',
            status: 'scheduled',
            visibility: validVisibility,
            is_showcase: Boolean(is_showcase),
            rsvp_enabled: Boolean(rsvp_enabled),
            rsvp_qr_enabled: Boolean(rsvp_qr_enabled),
            rsvp_capacity: rsvp_capacity || null,
            created_by: session.member.id,
            version: 1,
            subtasks: Array.isArray(subtasks) ? subtasks : [],
            comments: Array.isArray(comments) ? comments.map((c: any) => ({ ...c, event_id: eventId })) : [],
            attachments: Array.isArray(attachments) ? attachments : [],
            reminders: Array.isArray(reminders) ? reminders : [],
            edit_history: [
                {
                    id: `hist_${Date.now()}_init`,
                    event_id: eventId,
                    user_id: session.member.id,
                    user_name: session.member.display_name,
                    user_avatar: session.member.avatar_url,
                    action: 'created',
                    details: 'Etkinlik oluşturuldu',
                    timestamp: nowIso
                }
            ],
            created_at: nowIso,
            updated_at: nowIso
        };

        const created = await WorkspaceRepository.createEvent(newEvent);

        // Also persist any initial comments to database
        if (Array.isArray(comments) && comments.length > 0) {
            for (const com of comments) {
                if (com && com.content) {
                    try {
                        await WorkspaceRepository.addComment(
                            eventId,
                            com.user_id || session.member.id,
                            com.user_name || session.member.display_name,
                            com.content,
                            com.tag || 'general',
                            Boolean(com.is_pinned),
                            com.user_avatar || session.member.avatar_url
                        );
                    } catch {}
                }
            }
        }

        // 📢 Otomatik Komite ve Topluluk Bildirimi Dağıtımı
        // Bir komite ile ilgili etkinlik eklendiğinde veya herkese açık duyurulduğunda diğer tüm üyelere otomatik bildirim iletilir
        try {
            const calendars = await WorkspaceRepository.getCalendars();
            const cal = calendars.find(c => c.id === (calendar_id || 'cal_core'));
            const committeeTitle = cal ? cal.title : 'Topluluk';

            if (validVisibility === 'public' || validVisibility === 'admin_only') {
                const targetAudience = validVisibility === 'admin_only' ? 'role' : 'all';
                await WorkspaceRepository.dispatchInstantNotification({
                    eventId: created.id,
                    eventTitle: created.title,
                    title: `📢 [${committeeTitle}] Yeni Etkinlik: ${created.title}`,
                    message: `${session.member.display_name} tarafından yeni bir etkinlik oluşturuldu: "${created.title}". (${new Date(start_time).toLocaleDateString('tr-TR')}${location ? ` - ${location}` : ''})`,
                    targetAudience: targetAudience as any,
                    targetRole: validVisibility === 'admin_only' ? 'workspace_admin' : undefined,
                    type: 'announcement'
                });
            }
        } catch (notifErr) {
            console.warn('Otomatik komite bildirimi tetikleme uyarısı:', notifErr);
        }

        return NextResponse.json({ success: true, event: created }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Etkinlik oluşturulamadı.' },
            { status: 500 }
        );
    }
}
