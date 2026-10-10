import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Server-side admin client for DB operations (Bypasses RLS if needed, but here we just need to read)
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

export async function POST(req: Request) {
    try {
        const { name, email, subject, message } = await req.json();

        // Basit Doğrulama
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Lütfen zorunlu alanları doldurun.' },
                { status: 400 }
            );
        }

        // 1. Veritabanındaki aktif mailleri çek
        const supabase = getSupabaseAdmin();
        const { data: dbEmails, error: dbError } = supabase 
            ? await supabase.from('contact_emails').select('email').eq('is_active', true)
            : { data: null, error: null };

        // 2. Alıcı listesini oluştur
        let recipientList: string[] = [];
        
        if (!dbError && dbEmails && dbEmails.length > 0) {
            recipientList = dbEmails.map(item => item.email);
        }

        // Eğer veritabanında mail yoksa veya hata oluştuysa yedek adresi ekle
        if (recipientList.length === 0) {
            recipientList = [process.env.CONTACT_RECEIVER || process.env.SMTP_USER || ''];
        }

        const recipients = recipientList.join(', ');

        // SMTP Yapılandırması (Gmail)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // SSL
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS, // Uygulama Şifresi (16 karakter)
            },
        });

        // E-posta İçeriği
        const mailOptions = {
            from: `"${name}" <${process.env.SMTP_USER}>`,
            to: recipients,
            replyTo: email,
            subject: `Yeni İletişim Formu Mesajı: ${subject || 'Konu Yok'}`,
            text: `
                İsim: ${name}
                E-posta: ${email}
                Konu: ${subject}
                
                Mesaj:
                ${message}
            `,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #e11d48; margin-bottom: 30px;">HSD-MTU | Yeni Mesaj</h2>
                    <p><strong>Gönderen:</strong> ${name}</p>
                    <p><strong>E-posta:</strong> ${email}</p>
                    <p><strong>Konu:</strong> ${subject}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p><strong>Mesaj:</strong></p>
                    <p style="white-space: pre-wrap; line-height: 1.6; background: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>
                </div>
            `,
        };

        // Gönderimi Başlat
        await transporter.sendMail(mailOptions);

        return NextResponse.json(
            { message: 'Mesaj başarıyla gönderildi.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('SMTP Hatası:', error);
        return NextResponse.json(
            { error: 'Mesaj gönderilirken bir hata oluştu. Lütfen teknik ekiple iletişime geçin.' },
            { status: 500 }
        );
    }
}
