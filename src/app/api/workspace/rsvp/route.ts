import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        if (!eventId) {
            return NextResponse.json({ error: 'eventId parametresi zorunludur.' }, { status: 400 });
        }

        const attendees = await WorkspaceRepository.getEventAttendees(eventId);
        return NextResponse.json({ attendees });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Katılımcılar alınamadı.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { eventId, full_name, email, student_no, department } = body;

        if (!eventId || !full_name || !email) {
            return NextResponse.json(
                { error: 'Etkinlik seçimi, ad soyad ve e-posta zorunludur.' },
                { status: 400 }
            );
        }

        // Global ayar kontrolü
        const settings = await WorkspaceRepository.getSecuritySettings();
        if (settings.rsvp_registration_enabled === false) {
            return NextResponse.json(
                { error: 'Etkinlik kayıt sistemi yönetici tarafından geçici olarak kapatılmıştır.' },
                { status: 403 }
            );
        }

        // Etkinlik varlık ve kapasite kontrolü
        const event = await WorkspaceRepository.getEventById(eventId);
        if (event && event.rsvp_enabled === false) {
            return NextResponse.json(
                { error: 'Bu etkinlik için kayıtlar kapalıdır.' },
                { status: 400 }
            );
        }

        if (event && event.rsvp_capacity) {
            const currentAttendees = await WorkspaceRepository.getEventAttendees(eventId);
            if (currentAttendees.length >= event.rsvp_capacity) {
                return NextResponse.json(
                    { error: 'Etkinlik kontenjanı dolmuştur.' },
                    { status: 400 }
                );
            }
        }

        const result = await WorkspaceRepository.registerEventAttendee(
            eventId,
            full_name,
            email,
            student_no,
            department
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            attendee: result.attendee,
            qr_enabled: settings.rsvp_qr_enabled !== false && (event?.rsvp_qr_enabled !== false)
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Kayıt sırasında hata oluştu.' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { ticket_code } = body;

        if (!ticket_code) {
            return NextResponse.json({ error: 'Bilet kodu zorunludur.' }, { status: 400 });
        }

        const result = await WorkspaceRepository.checkInAttendee(ticket_code);
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, attendee: result.attendee });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Check-in işlemi başarısız.' }, { status: 500 });
    }
}
