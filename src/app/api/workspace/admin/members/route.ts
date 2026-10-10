import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { verifyAdmin } from '../../authHelper';
import { WorkspaceMember } from '@/shared/api/workspaceTypes';

export async function GET() {
    const { errorResponse } = await verifyAdmin();
    if (errorResponse) return errorResponse;

    const members = await WorkspaceRepository.getMembers();

    return NextResponse.json({ members });
}

export async function POST(req: Request) {
    const { errorResponse, session } = await verifyAdmin();
    if (errorResponse || !session) return errorResponse;

    try {
        const body = await req.json();
        const { display_name, username, email, password, role, group_id } = body;

        if (!display_name || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Ad Soyad, e-posta, şifre ve rol alanları zorunludur.' },
                { status: 400 }
            );
        }

        // Yetki Yükseltme Koruması: Sadece super_admin yeni bir super_admin rolü oluşturabilir
        if (role === 'super_admin' && session.member.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Yalnızca Süper Yönetici yeni bir Süper Yönetici oluşturabilir.' },
                { status: 403 }
            );
        }

        // Kullanıcı adını temizle ve doğrula
        const rawUsername = (username || email.split('@')[0] || '').trim().toLowerCase().replace(/^@/, '');
        const cleanUsername = rawUsername.replace(/[^a-z0-9_.-]/g, '');

        if (!cleanUsername || cleanUsername.length < 2) {
            return NextResponse.json(
                { error: 'Kullanıcı adı en az 2 karakter olmalı ve yalnızca harf, rakam, alt tire veya nokta içermelidir.' },
                { status: 400 }
            );
        }

        const existingEmail = await WorkspaceRepository.getMemberByEmail(email);

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Bu e-posta adresiyle kayıtlı bir üye zaten mevcut.' },
                { status: 409 }
            );
        }

        const existingUsername = await WorkspaceRepository.getMemberByUsername(cleanUsername);
        if (existingUsername) {
            return NextResponse.json(
                { error: `"${cleanUsername}" kullanıcı adı zaten kullanımda. Lütfen farklı bir kullanıcı adı belirleyin.` },
                { status: 409 }
            );
        }

        const newMember: WorkspaceMember = {
            id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            email: email.trim().toLowerCase(),
            username: cleanUsername,
            display_name: display_name.trim(),
            role,
            status: 'active',
            mfa_enabled: false,
            group_id: group_id || undefined,
            must_change_password: true,
            created_at: new Date().toISOString()
        };

        const created = await WorkspaceRepository.addMember(newMember, password);

        // Komite seçildiyse üyeyi otomatik olarak o komiteye bağla
        if (group_id) {
            try {
                await WorkspaceRepository.toggleGroupMember(group_id, created.id, true);
            } catch (grpErr) {
                console.error('Üye komiteye eklenirken hata:', grpErr);
            }
        }

        return NextResponse.json({ success: true, member: created }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const { errorResponse, session } = await verifyAdmin();
    if (errorResponse || !session) return errorResponse;

    try {
        const body = await req.json();
        const { id, newPassword, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Üye ID zorunludur.' }, { status: 400 });
        }

        const targetMember = await WorkspaceRepository.getMemberById(id);

        if (!targetMember) {
            return NextResponse.json({ error: 'Üye bulunamadı.' }, { status: 404 });
        }

        // Yetki Yükseltme & Koruma Kontrolleri:
        // 1. Hedef üye super_admin ise ve istek yapan super_admin değilse engelle
        if (targetMember.role === 'super_admin' && session.member.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Bir Süper Yöneticinin bilgilerini yalnızca Süper Yönetici güncelleyebilir.' },
                { status: 403 }
            );
        }

        // 2. Bir kullanıcıya super_admin rolü verilmeye çalışılıyorsa ve istek yapan super_admin değilse engelle
        if (updates.role === 'super_admin' && session.member.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Yalnızca Süper Yönetici bir üyeyi Süper Yönetici yapabilir.' },
                { status: 403 }
            );
        }

        if (newPassword) {
            const passChanged = await WorkspaceRepository.changeMemberPassword(id, newPassword);
            if (!passChanged) {
                return NextResponse.json({ error: 'Şifre güncellenemedi.' }, { status: 404 });
            }
        }

        if (Object.keys(updates).length > 0) {
            await WorkspaceRepository.updateMember(id, updates);
        }

        const updated = await WorkspaceRepository.getMemberById(id);
        return NextResponse.json({ success: true, member: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { errorResponse, session } = await verifyAdmin();
    if (errorResponse || !session) return errorResponse;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Silinecek üye ID zorunludur.' }, { status: 400 });
        }

        // Kendini silmeyi engelle
        if (session.member.id === id) {
            return NextResponse.json({ error: 'Kendi aktif yönetici hesabınızı silemezsiniz.' }, { status: 400 });
        }

        const targetMember = await WorkspaceRepository.getMemberById(id);

        if (!targetMember) {
            return NextResponse.json({ error: 'Üye bulunamadı.' }, { status: 404 });
        }

        // Hedef üye super_admin ise sadece super_admin silebilir
        if (targetMember.role === 'super_admin' && session.member.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Yetersiz yetki: Süper Yönetici hesabı yalnızca başka bir Süper Yönetici tarafından silinebilir.' },
                { status: 403 }
            );
        }

        const deleted = await WorkspaceRepository.deleteMember(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Üye bulunamadı.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
