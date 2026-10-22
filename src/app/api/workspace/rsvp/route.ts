import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession, isUserAdminRole } from '../authHelper';
import { checkRateLimit } from '@/shared/lib/security';

export async function GET(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim: Katılımcı listesini görüntülemek için oturum açmalısınız.' },
                { status: 401 }
            );
        }

        const canManage = session.permissions.can_manage_rsvp || session.permissions.can_edit || isUserAdminRole(session.member.role);
        if (!canManage) {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Katılımcı listesini görüntüleme yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

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
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
        const rateLimitKey = `rsvp_reg_${ip}`;
        const rateLimit = checkRateLimit(rateLimitKey, 10, 10 * 60 * 1000); // 10 dakika içinde en fazla 10 kayıt

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Çok fazla kayıt isteği gönderildi. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { eventId, full_name, email, student_no, department } = body;

        if (!eventId || !full_name || !email) {
            return NextResponse.json(
                { error: 'Etkinlik seçimi, ad soyad ve e-posta zorunludur.' },
                { status: 400 }
            );
        }

        const cleanEmail = String(email).trim().toLowerCase();
        if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
            return NextResponse.json({ error: 'Geçersiz e-posta adresi.' }, { status: 400 });
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
            String(full_name).trim(),
            cleanEmail,
            student_no ? String(student_no).trim() : undefined,
            department ? String(department).trim() : undefined
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
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim: Check-in yapabilmek için oturum açmalısınız.' },
                { status: 401 }
            );
        }

        const canManage = session.permissions.can_manage_rsvp || session.permissions.can_edit || isUserAdminRole(session.member.role);
        if (!canManage) {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Bilet doğrulama ve check-in yapma yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { ticket_code } = body;

        if (!ticket_code) {
            return NextResponse.json({ error: 'Bilet kodu zorunludur.' }, { status: 400 });
        }

        const result = await WorkspaceRepository.checkInAttendee(String(ticket_code).trim());
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, attendee: result.attendee });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Check-in işlemi başarısız.' }, { status: 500 });
    }
}
