import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { validateFileUpload, generateSecureToken, checkRateLimit } from '@/shared/lib/security';
import { getWorkspaceSession } from '../../authHelper';
import { WorkspaceAttachment } from '@/shared/api/workspaceTypes';

export async function POST(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json({ error: 'Dosya yüklemek için oturum açmalısınız.' }, { status: 401 });
        }

        if (!session.permissions.can_upload) {
            return NextResponse.json({ error: 'Dosya yükleme yetkiniz bulunmamaktadır.' }, { status: 403 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
        
        // Rate Limiting: Kullanıcı/IP bazlı saatlik maksimum 20 dosya
        const uploadLimitKey = `upload_${session.member.id}_${ip}`;
        const limitCheck = checkRateLimit(uploadLimitKey, 20, 60 * 60 * 1000);
        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: `Saatlik dosya yükleme sınırına ulaştınız. Lütfen ${limitCheck.retryAfterSeconds} saniye sonra tekrar deneyin.`
            }, { status: 429 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const eventId = formData.get('eventId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'Yüklenecek dosya seçilmedi.' }, { status: 400 });
        }

        const settings = await WorkspaceRepository.getSecuritySettings();

        // Boyut, tür, MIME ve ad doğrulaması
        const validation = validateFileUpload(
            file.name,
            file.type,
            file.size,
            settings.max_file_size_mb || 25
        );

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const safeFileName = validation.sanitizedName || 'uploaded_document';
        const downloadToken = generateSecureToken(32);
        
        // Gerçek dosya içeriğini buffer'a oku
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        let storageFilePath = `/storage/workspace/${Date.now()}_${safeFileName}`;

        // Supabase Storage entegrasyonu (Canlı servis anahtarı mevcutsa)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceKey && !supabaseUrl.includes('placeholder')) {
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseAdmin = createClient(supabaseUrl, serviceKey);
                const storagePath = `events/${eventId || 'general'}/${Date.now()}_${safeFileName}`;
                const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
                    .from('workspace-files')
                    .upload(storagePath, fileBuffer, {
                        contentType: file.type,
                        upsert: false
                    });
                if (!uploadErr && uploadData) {
                    storageFilePath = uploadData.path;
                }
            } catch (storageErr) {
                console.warn('Supabase storage yükleme uyarısı (bellek önbelleğine geçildi):', storageErr);
            }
        }

        const attachment: WorkspaceAttachment = {
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            event_id: eventId || 'general',
            file_name: safeFileName,
            file_size: file.size,
            mime_type: file.type,
            file_path: storageFilePath,
            download_token: downloadToken,
            uploaded_by: session.member.display_name,
            created_at: new Date().toISOString()
        };

        if (eventId) {
            await WorkspaceRepository.addAttachment(eventId, attachment, fileBuffer);
        } else {
            await WorkspaceRepository.registerAttachment(attachment, fileBuffer);
        }

        // Audit Log
        await WorkspaceRepository.logAudit({
            id: `audit_${Date.now()}`,
            user_id: session.member.id,
            user_email: session.member.email,
            action: 'FILE_UPLOAD',
            entity_type: 'FILE',
            entity_id: attachment.id,
            details: `Dosya yüklendi: ${safeFileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            file: attachment
        }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Dosya yüklenirken hata oluştu.' }, { status: 500 });
    }
}
