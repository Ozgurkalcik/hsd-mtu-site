import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession, isUserAdminRole } from '../authHelper';

export async function POST(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli: Oturum açmalısınız.' }, { status: 401 });
        }

        const canBroadcast = session.permissions.can_broadcast || isUserAdminRole(session.member.role);
        if (!canBroadcast) {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Harici kanallara duyuru yayınlama izniniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { title, message, eventUrl } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Başlık ve mesaj zorunludur.' }, { status: 400 });
        }

        const sent = await WorkspaceRepository.sendWebhookNotification(
            String(title).trim(),
            String(message).trim(),
            eventUrl ? String(eventUrl).trim() : undefined
        );

        if (!sent) {
            return NextResponse.json(
                { error: 'Webhook gönderilemedi. Lütfen Admin Güvenlik Ayarlarından Webhook URL adresini tanımladığınızdan emin olun.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Duyuru Discord/Webhook kanalına başarıyla iletildi.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Webhook gönderim hatası.' }, { status: 500 });
    }
}
