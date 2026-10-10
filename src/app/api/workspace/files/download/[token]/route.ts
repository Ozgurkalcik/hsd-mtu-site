import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '@/app/api/workspace/authHelper';

interface RouteParams {
    params: Promise<{ token: string }>;
}

export async function GET(req: Request, context: RouteParams) {
    try {
        const { token } = await context.params;

        if (!token || token.trim().length < 16) {
            return NextResponse.json({ error: 'Geçersiz indirme tokenı.' }, { status: 400 });
        }

        // 1. Kimlik Doğrulama ve İndirme İzni Kontrolü
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Dosyayı indirmek için aktif bir Workspace oturumu gereklidir.' },
                { status: 401 }
            );
        }

        if (!session.permissions.can_view) {
            return NextResponse.json(
                { error: 'Dosyayı görüntüleme veya indirme yetkiniz bulunmamaktadır.' },
                { status: 403 }
            );
        }

        const record = await WorkspaceRepository.getAttachmentByToken(token);

        if (!record) {
            return NextResponse.json(
                { error: 'Dosya bulunamadı veya indirme bağlantısı geçersiz.' },
                { status: 404 }
            );
        }

        const { attachment, buffer } = record;

        // 2. Süre Sınırı Kontrolü (Token TTL: 24 Saat)
        const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
        const fileAge = Date.now() - new Date(attachment.created_at).getTime();
        if (fileAge > TOKEN_MAX_AGE_MS) {
            return NextResponse.json(
                { error: 'İndirme bağlantısının geçerlilik süresi (24 saat) dolmuştur.' },
                { status: 410 }
            );
        }

        // 3. Bellek içi veya yerel Buffer mevcutsa doğrudan sun
        if (buffer && buffer.length > 0) {
            return new Response(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    'Content-Type': attachment.mime_type || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.file_name)}"`,
                    'Content-Length': buffer.length.toString(),
                    'Cache-Control': 'private, max-age=3600',
                },
            });
        }

        // 4. Supabase Storage entegrasyonu (Canlı servis anahtarı mevcutsa)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && serviceKey && !supabaseUrl.includes('placeholder')) {
            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseAdmin = createClient(supabaseUrl, serviceKey);
                const { data: fileBlob, error: downloadErr } = await supabaseAdmin.storage
                    .from('workspace-files')
                    .download(attachment.file_path);

                if (!downloadErr && fileBlob) {
                    const arrayBuf = await fileBlob.arrayBuffer();
                    return new Response(new Uint8Array(arrayBuf), {
                        status: 200,
                        headers: {
                            'Content-Type': attachment.mime_type || 'application/octet-stream',
                            'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.file_name)}"`,
                            'Content-Length': fileBlob.size.toString(),
                            'Cache-Control': 'private, max-age=3600',
                        },
                    });
                }
            } catch (storageErr) {
                console.error('Supabase storage indirme hatası:', storageErr);
            }
        }

        // Dosya verisi bulunamadı
        return NextResponse.json(
            { error: 'Dosya içeriği depolama alanında bulunamadı.' },
            { status: 404 }
        );
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Dosya indirilirken hata oluştu.' },
            { status: 500 }
        );
    }
}
