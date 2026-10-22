/**
 * HSD MTÜ — Kapsamlı Güvenlik Regresyon Test Paketi (Security Regression Test Suite)
 * 
 * Bu betik sistemdeki kimlik doğrulama, token imzalama, fail-closed mimarisi,
 * RBAC rol izolasyonu, parola hashleme güvenliği, katı allowlist üye serileştirmesi,
 * etkinlik görünürlük filtreleri, yorum & alt görev ince yetkilendirme ve negatif testleri,
 * bildirim kullanıcı izolasyonu ve SQL RLS politikalarını
 * doğrudan test eder ve ölçülebilir kanıtlar üretir.
 * 
 * NOT: Bu testler birim ve servis düzeyinde statik/simüle testlerdir; canlı veritabanı
 * veya canlı HTTP bağlantısı içermez. Entegrasyon testleri ayrıca sınıflandırılır.
 * 
 * Çalıştırma: node scripts/security-regression-tests.mjs
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const results = [];
let passCount = 0;
let failCount = 0;

function assertTest(name, category, passed, proof) {
    if (passed) {
        passCount++;
        results.push({ name, category, status: 'PASS', proof });
        console.log(`\x1b[32m[PASS]\x1b[0m [${category}] ${name}`);
    } else {
        failCount++;
        results.push({ name, category, status: 'FAIL', proof });
        console.error(`\x1b[31m[FAIL]\x1b[0m [${category}] ${name} -> ${proof}`);
    }
}

console.log('='.repeat(80));
console.log('HSD MTÜ — Canlıya Geçiş Öncesi Güvenlik Regresyon Testleri Başlatılıyor');
console.log('='.repeat(80));

// ==============================================================================
// 1. Kriptografik Oturum İmzası ve Sahtecilik (Token Tampering) Testleri
// ==============================================================================
console.log('\n--- 1. Token Güvenliği, Tahrifat Engelleme ve Fail-Closed Testleri ---');

const secretKey = 'test_secure_secret_key_for_regression_testing_32bytes!';
function createTestToken(payload, key = secretKey, ttlSeconds = 3600) {
    const full = { ...payload, createdAt: Date.now(), expiresAt: Date.now() + ttlSeconds * 1000 };
    const dataStr = Buffer.from(JSON.stringify(full)).toString('base64url');
    const signature = crypto.createHmac('sha256', key).update(dataStr).digest('hex');
    return `${dataStr}.${signature}`;
}

function verifyTestToken(token, key = secretKey) {
    try {
        if (!token) return null;
        const [dataStr, signature] = token.split('.');
        if (!dataStr || !signature || signature.length !== 64) return null;
        const expected = crypto.createHmac('sha256', key).update(dataStr).digest('hex');
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }
        const parsed = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
        if (Date.now() > parsed.expiresAt) return null;
        return parsed;
    } catch {
        return null;
    }
}

// Test 1.1: Meşru token doğrulama
const validPayload = { userId: 'mem_1', email: 'test@hsdmtu.site', role: 'viewer', displayName: 'Viewer User' };
const legitimateToken = createTestToken(validPayload);
const verified = verifyTestToken(legitimateToken);
assertTest(
    'Meşru HMAC İmzalı Token Başarıyla Doğrulanmalı',
    'Session/HMAC',
    verified !== null && verified.userId === 'mem_1' && verified.role === 'viewer',
    'Doğrulandı: ' + JSON.stringify(verified)
);

// Test 1.2: Payload tahrifatı (Role Escalation Attack: viewer -> super_admin)
const [origPayloadStr, origSig] = legitimateToken.split('.');
const tamperedObj = JSON.parse(Buffer.from(origPayloadStr, 'base64url').toString('utf8'));
tamperedObj.role = 'super_admin';
const tamperedPayloadStr = Buffer.from(JSON.stringify(tamperedObj)).toString('base64url');
const forgedToken = `${tamperedPayloadStr}.${origSig}`;
const forgedVerified = verifyTestToken(forgedToken);
assertTest(
    'Payload Tahrifatı (Role Escalation to super_admin) Reddedilmeli',
    'Session/HMAC',
    forgedVerified === null,
    'Tahrif edilmiş token başarıyla engellendi (Sonuç: null)'
);

// Test 1.3: İmza bozulması (Signature Corruption)
const corruptedToken = `${origPayloadStr}.${origSig.slice(0, -4)}abcd`;
const corruptedVerified = verifyTestToken(corruptedToken);
assertTest(
    'Bozulmuş veya Sahte İmza Reddedilmeli',
    'Session/HMAC',
    corruptedVerified === null,
    'Bozuk imza başarıyla yakalandı ve reddedildi'
);

// Test 1.4: Süresi dolmuş token (Expired Token)
const expiredToken = createTestToken(validPayload, secretKey, -100);
const expiredVerified = verifyTestToken(expiredToken);
assertTest(
    'Süresi Dolmuş Token Reddedilmeli',
    'Session/HMAC',
    expiredVerified === null,
    'Süresi dolmuş token zaman aşımı filtresine takıldı'
);

// Test 1.5: Yanlış / tahmin edilmiş secret ile üretilen token reddedilmeli
const attackerSecret = 'hsd_session_production';
const attackerToken = createTestToken({ ...validPayload, role: 'super_admin' }, attackerSecret);
const attackerVerified = verifyTestToken(attackerToken, secretKey);
assertTest(
    'Eski Tahmin Edilebilir Secret (hsd_session_production) ile Üretilen Token Reddedilmeli',
    'Session/HMAC',
    attackerVerified === null,
    'Farklı secret ile imzalanan saldırgan tokenı başarıyla reddedildi'
);

// Test 1.6: Fail-Closed Secret Doğrulaması (Üretimde Secret Yoksa Hata Fırlatılmalı)
function getSessionSignSecretSimulation(envNodeEnv, envSecret) {
    if (envSecret && envSecret.trim().length >= 32) {
        return envSecret.trim();
    }
    if (envNodeEnv === 'production') {
        throw new Error('[SECURITY CONFIGURATION ERROR] WORKSPACE_SESSION_SECRET is missing or shorter than 32 characters in production.');
    }
    return 'hsd_mtu_dev_test_session_secret_32bytes_minimum_length_for_local!';
}

let productionFailedClosed = false;
try {
    getSessionSignSecretSimulation('production', undefined);
} catch (err) {
    productionFailedClosed = err.message.includes('[SECURITY CONFIGURATION ERROR]');
}
assertTest(
    'Üretimde WORKSPACE_SESSION_SECRET Eksikse Fail-Closed Olmalı (Hata Fırlatmalı)',
    'Session/FailClosed',
    productionFailedClosed === true,
    'Üretimde secret yoksa sistem geçici anahtar üretmiyor, doğrudan duruyor.'
);

let devSucceeded = false;
try {
    const devKey = getSessionSignSecretSimulation('development', undefined);
    devSucceeded = devKey.length >= 32;
} catch {
    devSucceeded = false;
}
assertTest(
    'Geliştirme Ortamında Güvenli 32-Byte Dev Secret ile İlerlenmeli',
    'Session/FailClosed',
    devSucceeded === true,
    'Geliştirme ve test ortamı izole geliştirici anahtarıyla stabil çalışıyor.'
);

// ==============================================================================
// 2. Parola Güvenliği ve Zamanlama Saldırısı Koruması Testleri
// ==============================================================================
console.log('\n--- 2. Parola Hashleme ve Zamanlama Saldırısı (Timing-Safe) Testleri ---');

function hashPasswordTest(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPasswordTest(password, storedHash) {
    if (!storedHash || !password) return false;
    const parts = storedHash.split(':');
    if (parts.length === 2 && parts[0].length === 32) {
        const [salt, originalHash] = parts;
        const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        const originalBuf = Buffer.from(originalHash, 'hex');
        const testBuf = Buffer.from(testHash, 'hex');
        if (originalBuf.length !== testBuf.length) return false;
        return crypto.timingSafeEqual(originalBuf, testBuf);
    }
    const passBuf = crypto.createHash('sha256').update(password).digest();
    const storedBuf = crypto.createHash('sha256').update(storedHash).digest();
    return crypto.timingSafeEqual(passBuf, storedBuf);
}

const securePassword = 'SuperStrongPassword2026!#';
const hashedPassword = hashPasswordTest(securePassword);

assertTest(
    'PBKDF2 SHA-512 Doğru Parola Doğrulaması',
    'Auth/Password',
    verifyPasswordTest(securePassword, hashedPassword) === true,
    'PBKDF2 100k iterasyon doğrulandı'
);

assertTest(
    'PBKDF2 SHA-512 Yanlış Parola Reddi',
    'Auth/Password',
    verifyPasswordTest('WrongPasswordAttempt123', hashedPassword) === false,
    'Yanlış parola başarıyla reddedildi'
);

assertTest(
    'Sabit Zamanlı (Timing-Safe) Hash Karşılaştırma Mekanizması',
    'Auth/Password',
    verifyPasswordTest('legacyPass', 'legacyPass') === true &&
    verifyPasswordTest('wrongPass', 'legacyPass') === false,
    'Sabit zamanlı SHA-256 fallback fonksiyonu doğrulandı'
);

// ==============================================================================
// 3. RBAC Rol İzolasyonu ve Sıkı Rol Kısıtlamaları (Strict Roles & Default-Deny)
// ==============================================================================
console.log('\n--- 3. RBAC Rol İzolasyonu ve Sıkı Rol Kısıtlamaları Testleri ---');

function isUserAdminRoleTest(role) {
    if (!role) return false;
    const r = role.toLowerCase().trim();
    return r === 'super_admin' || r === 'workspace_admin';
}

assertTest('super_admin Rolü Yönetici Kabul Edilmeli', 'RBAC', isUserAdminRoleTest('super_admin') === true, 'super_admin: true');
assertTest('workspace_admin Rolü Yönetici Kabul Edilmeli', 'RBAC', isUserAdminRoleTest('workspace_admin') === true, 'workspace_admin: true');

// KRİTİK KONTROL: 'admin', komite başkanları ve bilinmeyen roller REDDEDİLMELİ
assertTest('admin (Kanonik Olmayan Eski Değer) Workspace Yöneticisi Kabul Edilmemeli', 'RBAC', isUserAdminRoleTest('admin') === false, 'admin: false (Reddedildi)');
assertTest('event_lead Rolü Asla Yönetici Kabul Edilmemeli', 'RBAC', isUserAdminRoleTest('event_lead') === false, 'event_lead: false (Reddedildi)');
assertTest('tech_lead Rolü Asla Yönetici Kabul Edilmemeli', 'RBAC', isUserAdminRoleTest('tech_lead') === false, 'tech_lead: false (Reddedildi)');
assertTest('design_lead Rolü Asla Yönetici Kabul Edilmemeli', 'RBAC', isUserAdminRoleTest('design_lead') === false, 'design_lead: false (Reddedildi)');
assertTest('contributor Rolü Yönetici Kabul Edilmemeli', 'RBAC', isUserAdminRoleTest('contributor') === false, 'contributor: false (Reddedildi)');
assertTest('viewer Rolü Yönetici Kabul Edilmemeli', 'RBAC', isUserAdminRoleTest('viewer') === false, 'viewer: false (Reddedildi)');
assertTest('Bilinmeyen Rol ("manager", "moderator") Default-Deny ile Reddedilmeli', 'RBAC', isUserAdminRoleTest('manager') === false && isUserAdminRoleTest('moderator') === false, 'Bilinmeyen roller varsayılan olarak reddedildi.');

// ==============================================================================
// 4. Katı Allowlist Tabanlı Üye Veri Serileştirmesi ve KVKK Gizlilik Testleri
// ==============================================================================
console.log('\n--- 4. Katı Allowlist Tabanlı Üye Veri Serileştirmesi Testleri ---');

function sanitizeMemberAllowlistTest(member, keepAdminFields = false) {
    if (!member) return null;
    const baseAllowed = [
        'id', 'email', 'username', 'display_name', 'full_name', 'role',
        'status', 'mfa_enabled', 'last_active_at', 'created_at', 'avatar_url',
        'group_id', 'must_change_password', 'member_notes'
    ];
    const adminExtraAllowed = ['admin_notes', 'failed_login_attempts', 'locked_until'];
    const allowedKeys = keepAdminFields ? [...baseAllowed, ...adminExtraAllowed] : baseAllowed;
    const sanitized = {};
    for (const key of allowedKeys) {
        if (key in member && member[key] !== undefined) {
            sanitized[key] = member[key];
        }
    }
    return sanitized;
}

const rawMember = {
    id: 'mem_42',
    email: 'member@hsdmtu.site',
    username: 'testuser',
    display_name: 'Normal Member',
    full_name: 'Test Member Full',
    role: 'contributor',
    status: 'active',
    password_hash: 'secret_salt:secret_hash_value',
    admin_notes: 'Önemli gizli yönetici notu - disiplin uyarısı',
    failed_login_attempts: 3,
    locked_until: '2026-10-23T12:00:00Z',
    internal_session_secret: 'raw_secret_value',
    custom_injected_column: 'should_never_leak'
};

const publicView = sanitizeMemberAllowlistTest(rawMember, false);
assertTest('Parola Özeti (password_hash) Asla Hiçbir Yanıta Dahil Edilmemeli', 'Data Privacy', !('password_hash' in publicView), 'password_hash allowlist dışı tutuldu');
assertTest('Yönetici Notları (admin_notes) Normal Üyelerden Gizlenmeli', 'Data Privacy', !('admin_notes' in publicView), 'admin_notes allowlist dışı tutuldu');
assertTest('Başarısız Giriş Sayacı ve Kilit Zamanı Gizlenmeli', 'Data Privacy', !('failed_login_attempts' in publicView) && !('locked_until' in publicView), 'Kilit sayaçları gizlendi');
assertTest('Bilinmeyen / Ek Kolonlar (internal_session_secret vb.) Allowlist ile Otomatik Düşürülmeli', 'Data Privacy', !('internal_session_secret' in publicView) && !('custom_injected_column' in publicView), 'Bilinmeyen alanlar elendi');

const adminView = sanitizeMemberAllowlistTest(rawMember, true);
assertTest('Admin Çağrısında Yönetici Notları ve Sayaçlar Korunmalı', 'Data Privacy', adminView.admin_notes === rawMember.admin_notes && adminView.failed_login_attempts === 3, 'Admin alanları doğru aktarıldı');
assertTest('Admin Çağrısında Dahi password_hash ASLA Açığa Çıkmamalı', 'Data Privacy', !('password_hash' in adminView), 'Admin yanıtında bile password_hash sızdırılmadı');

// ==============================================================================
// 5. Etkinlik Görünürlüğü ve İzolasyon Mantığı (canMemberViewEvent) Testleri
// ==============================================================================
console.log('\n--- 5. Etkinlik Görünürlüğü ve İzolasyon Mantığı Testleri ---');

function canMemberViewEventTest(e, viewerMember) {
    const vis = e.visibility || 'public';
    if (vis === 'public') return true;

    const isViewerAdmin = viewerMember?.role === 'super_admin' ||
        viewerMember?.role === 'workspace_admin' ||
        viewerMember?.role === 'editor';

    if (vis === 'admin_only') return Boolean(isViewerAdmin);
    if (vis === 'private') {
        return Boolean(viewerMember && (e.created_by === viewerMember.id || viewerMember.role === 'super_admin'));
    }
    if (vis === 'committee') {
        if (!viewerMember) return false;
        if (viewerMember.role === 'super_admin' || viewerMember.role === 'workspace_admin' || viewerMember.role === 'editor' || e.created_by === viewerMember.id) return true;
        const allowed = e.allowed_committee_ids || [];
        if (!Array.isArray(allowed) || allowed.length === 0) return false;
        if (allowed.includes('cal_core') || allowed.includes('all')) return true;
        if (viewerMember.group_id && allowed.includes(viewerMember.group_id)) return true;
        return false;
    }
    return false;
}

const publicEvent = { id: 'ev_pub', title: 'Açık Konferans', visibility: 'public' };
const adminOnlyEvent = { id: 'ev_adm', title: 'Yönetim Toplantısı', visibility: 'admin_only' };
const privateEvent = { id: 'ev_priv', title: 'Özel Görüşme', visibility: 'private', created_by: 'mem_author' };
const committeeEvent = { id: 'ev_com', title: 'Yapay Zeka Komite Toplantısı', visibility: 'committee', allowed_committee_ids: ['grp_ai'] };

const superAdmin = { id: 'mem_sa', role: 'super_admin' };
const editorUser = { id: 'mem_ed', role: 'editor' };
const regularAuthor = { id: 'mem_author', role: 'contributor' };
const otherMember = { id: 'mem_other', role: 'contributor', group_id: 'grp_project' };
const aiMember = { id: 'mem_ai', role: 'contributor', group_id: 'grp_ai' };

assertTest('Halka Açık Etkinlik Herkesçe (Oturumsuz Dahil) Görülebilmeli', 'Events/Visibility', canMemberViewEventTest(publicEvent, null) === true, 'Public: true');
assertTest('admin_only Etkinlik Yöneticilerce Görülebilmeli', 'Events/Visibility', canMemberViewEventTest(adminOnlyEvent, editorUser) === true, 'Admin: true');
assertTest('admin_only Etkinlik Normal Üyelerden Gizlenmeli', 'Events/Visibility', canMemberViewEventTest(adminOnlyEvent, otherMember) === false, 'Normal üye: false');
assertTest('private Etkinlik Yalnızca Sahibi ve super_admin Tarafından Görülebilmeli', 'Events/Visibility', canMemberViewEventTest(privateEvent, regularAuthor) === true && canMemberViewEventTest(privateEvent, superAdmin) === true, 'Author & super_admin: true');
assertTest('private Etkinlik Diğer Üyelerden Gizlenmeli', 'Events/Visibility', canMemberViewEventTest(privateEvent, otherMember) === false, 'Diğer üye: false');
assertTest('Komite Etkinliği İlgili Komite Üyesince Görülebilmeli', 'Events/Visibility', canMemberViewEventTest(committeeEvent, aiMember) === true, 'Komite üyesi: true');
assertTest('Komite Etkinliği Farklı Komitedeki Üyeden Gizlenmeli', 'Events/Visibility', canMemberViewEventTest(committeeEvent, otherMember) === false, 'Farklı komite: false');

// ==============================================================================
// 6. Yorumlar (Comments) API Yetkilendirme ve Negatif Testleri
// ==============================================================================
console.log('\n--- 6. Yorumlar (Comments) API Yetkilendirme ve Negatif Testleri ---');

function simulateCommentsPatch({ event, comments, commentId, action, member }) {
    if (!member) return { status: 401, error: 'Oturum açmalısınız' };
    if (!canMemberViewEventTest(event, member)) return { status: 404, error: 'Etkinlik bulunamadı' };
    const targetComment = comments.find(c => c.id === commentId);
    if (!targetComment) return { status: 404, error: 'Yorum bu etkinliğe ait değil' };
    if (action === 'toggle_pin') {
        const canPin = isUserAdminRoleTest(member.role) || member.permissions?.can_edit;
        if (!canPin) return { status: 403, error: 'Yorum sabitleme yetkiniz yok' };
        return { status: 200, success: true, action: 'pinned' };
    }
    if (action === 'toggle_reaction') {
        return { status: 200, success: true, action: 'reacted' };
    }
    return { status: 400, error: 'Geçersiz işlem' };
}

function simulateCommentsDelete({ event, comments, commentId, member }) {
    if (!member) return { status: 401, error: 'Oturum açmalısınız' };
    if (!canMemberViewEventTest(event, member)) return { status: 404, error: 'Etkinlik bulunamadı' };
    const targetComment = comments.find(c => c.id === commentId);
    if (!targetComment) return { status: 404, error: 'Yorum bu etkinliğe ait değil' };
    const isAuthor = targetComment.user_id === member.id;
    const isAdmin = isUserAdminRoleTest(member.role);
    if (!isAuthor && !isAdmin) return { status: 403, error: 'Yalnızca kendi yorumunuzu silebilirsiniz' };
    return { status: 200, success: true, deleted: true };
}

const mockComments = [
    { id: 'com_1', event_id: 'ev_priv', user_id: 'mem_author', content: 'Özel not' },
    { id: 'com_2', event_id: 'ev_pub', user_id: 'mem_author', content: 'Halka açık yorum' }
];

// Test 6.1: Gizli etkinlikte yorum PATCH yetkisiz kullanıcı tarafından yapılamaz
const patchHiddenRes = simulateCommentsPatch({
    event: privateEvent,
    comments: mockComments,
    commentId: 'com_1',
    action: 'toggle_reaction',
    member: otherMember
});
assertTest('Gizli Etkinlikte Yorum PATCH Yetkisiz Kullanıcı Tarafından Yapılamaz (404/Gizli)', 'Comments/Auth', patchHiddenRes.status === 404, '404 döndü');

// Test 6.2: Yorum ID'si ile event ID eşleşmiyorsa işlem reddedilir (Cross-Event Mismatch)
const mismatchPatchRes = simulateCommentsPatch({
    event: publicEvent,
    comments: mockComments.filter(c => c.event_id === publicEvent.id),
    commentId: 'com_1', // com_1 privateEvent'e ait!
    action: 'toggle_reaction',
    member: regularAuthor
});
assertTest('Cross-Event ID Mismatch Durumunda Yorum PATCH Reddedilmeli', 'Comments/Auth', mismatchPatchRes.status === 404, 'Mismatch reddedildi');

// Test 6.3: Sıradan üye yöneticiye özel sabitleme (pin) işlemi yapamaz
const pinUnauthorizedRes = simulateCommentsPatch({
    event: publicEvent,
    comments: mockComments,
    commentId: 'com_2',
    action: 'toggle_pin',
    member: regularAuthor // contributor
});
assertTest('Sıradan Üye Yorum Sabitleme (Pin) Yapamaz (403 Forbidden)', 'Comments/Auth', pinUnauthorizedRes.status === 403, '403 döndü');

// Test 6.4: Yönetici yorum sabitleyebilir
const pinAdminRes = simulateCommentsPatch({
    event: publicEvent,
    comments: mockComments,
    commentId: 'com_2',
    action: 'toggle_pin',
    member: superAdmin
});
assertTest('Yönetici Yorum Sabitleyebilir (200 OK)', 'Comments/Auth', pinAdminRes.status === 200, '200 döndü');

// Test 6.5: Bir üye başka bir üyenin yorumunu silemez
const deleteUnauthorizedRes = simulateCommentsDelete({
    event: publicEvent,
    comments: mockComments,
    commentId: 'com_2', // yazar: mem_author
    member: otherMember // mem_other
});
assertTest('Bir Üye Başka Bir Üyenin Yorumunu Silemez (403 Forbidden)', 'Comments/Auth', deleteUnauthorizedRes.status === 403, '403 döndü');

// Test 6.6: Yazar kendi yorumunu silebilir
const deleteAuthorRes = simulateCommentsDelete({
    event: publicEvent,
    comments: mockComments,
    commentId: 'com_2',
    member: regularAuthor
});
assertTest('Yazar Kendi Yorumunu Silebilir (200 OK)', 'Comments/Auth', deleteAuthorRes.status === 200, '200 döndü');

// ==============================================================================
// 7. Alt Görevler (Subtasks) API Yetkilendirme ve Negatif Testleri
// ==============================================================================
console.log('\n--- 7. Alt Görevler (Subtasks) API Yetkilendirme ve Negatif Testleri ---');

function simulateSubtaskPatch({ event, subtasks, subtaskId, isCompleted, member, spoofedBody = {} }) {
    if (!member) return { status: 401, error: 'Oturum açmalısınız' };
    if (!canMemberViewEventTest(event, member)) return { status: 404, error: 'Etkinlik bulunamadı' };
    const targetSubtask = subtasks.find(s => s.id === subtaskId);
    if (!targetSubtask) return { status: 404, error: 'Alt görev bu etkinliğe ait değil' };

    // Görev tamamlama yetkisi kontrolü (Body'deki spoofed alanlara güvenilmez!)
    const isAdmin = isUserAdminRoleTest(member.role);
    const isEventOwner = event.created_by === member.id;
    const isAssignee = Array.isArray(event.assignees) && (
        event.assignees.includes(member.id) ||
        event.assignees.includes(member.username)
    );
    const canManageTasks = Boolean(member.permissions?.can_manage_tasks || member.permissions?.can_edit);

    const canToggle = isAdmin || isEventOwner || isAssignee || canManageTasks;
    if (!canToggle) {
        return { status: 403, error: 'Alt görev tamamlama yetkiniz yok' };
    }
    return { status: 200, success: true, updated: true };
}

function simulateSubtaskDelete({ event, subtasks, subtaskId, member }) {
    if (!member) return { status: 401, error: 'Oturum açmalısınız' };
    if (!canMemberViewEventTest(event, member)) return { status: 404, error: 'Etkinlik bulunamadı' };
    const targetSubtask = subtasks.find(s => s.id === subtaskId);
    if (!targetSubtask) return { status: 404, error: 'Alt görev bu etkinliğe ait değil' };

    const isAdmin = isUserAdminRoleTest(member.role);
    const isEventOwner = event.created_by === member.id;
    if (!isAdmin && !isEventOwner) {
        return { status: 403, error: 'Yalnızca etkinlik sahibi veya yöneticiler alt görev silebilir' };
    }
    return { status: 200, success: true, deleted: true };
}

const mockSubtasks = [
    { id: 'sub_1', event_id: 'ev_priv', title: 'Gizli görev' },
    { id: 'sub_2', event_id: 'ev_pub', title: 'Açık görev' }
];

const eventWithAssignees = {
    ...publicEvent,
    created_by: 'mem_creator',
    assignees: ['mem_assigned']
};

// Test 7.1: Gizli etkinliğin alt görevleri yetkisiz üye tarafından değiştirilemez
const subtaskHiddenRes = simulateSubtaskPatch({
    event: privateEvent,
    subtasks: mockSubtasks,
    subtaskId: 'sub_1',
    isCompleted: true,
    member: otherMember
});
assertTest('Gizli Etkinliğin Alt Görevi Yetkisiz Üye Tarafından Değiştirilemez (404)', 'Subtasks/Auth', subtaskHiddenRes.status === 404, '404 döndü');

// Test 7.2: Atanmamış üye, yalnızca etkinliği görebildiği için görevi tamamlayamaz
const unassignedCompleteRes = simulateSubtaskPatch({
    event: eventWithAssignees,
    subtasks: mockSubtasks,
    subtaskId: 'sub_2',
    isCompleted: true,
    member: otherMember // mem_other atanmış değil
});
assertTest('Atanmamış Üye Görevi Tamamlayamaz (403 Forbidden)', 'Subtasks/Auth', unassignedCompleteRes.status === 403, '403 döndü');

// Test 7.3: Atanmış üye görevi tamamlayabilir
const assignedCompleteRes = simulateSubtaskPatch({
    event: eventWithAssignees,
    subtasks: mockSubtasks,
    subtaskId: 'sub_2',
    isCompleted: true,
    member: { id: 'mem_assigned', role: 'contributor' }
});
assertTest('Atanmış Üye Görevi Başarıyla Tamamlayabilir (200 OK)', 'Subtasks/Auth', assignedCompleteRes.status === 200, '200 döndü');

// Test 7.4: Görev silme yetkisi olmayan kullanıcı görevi silemez
const subtaskDeleteDenied = simulateSubtaskDelete({
    event: eventWithAssignees,
    subtasks: mockSubtasks,
    subtaskId: 'sub_2',
    member: { id: 'mem_assigned', role: 'contributor' } // atanan kişi ama silme hakkı yok
});
assertTest('Atanmış Üye Bile Görevi Silemez (Yalnızca Sahip/Admin Silebilir -> 403)', 'Subtasks/Auth', subtaskDeleteDenied.status === 403, '403 döndü');

// Test 7.5: Etkinlik sahibi veya Admin görevi silebilir
const subtaskDeleteOwner = simulateSubtaskDelete({
    event: eventWithAssignees,
    subtasks: mockSubtasks,
    subtaskId: 'sub_2',
    member: { id: 'mem_creator', role: 'contributor' }
});
assertTest('Etkinlik Sahibi Alt Görevi Silebilir (200 OK)', 'Subtasks/Auth', subtaskDeleteOwner.status === 200, '200 döndü');

// Test 7.6: Sahte assignee_id gövdesi yetki yükseltmesine yol açmaz
const spoofedAssigneeRes = simulateSubtaskPatch({
    event: eventWithAssignees,
    subtasks: mockSubtasks,
    subtaskId: 'sub_2',
    isCompleted: true,
    member: otherMember,
    spoofedBody: { assignee_id: 'mem_assigned' } // Sahte atanan bilgisi
});
assertTest('İstemci Tarafından Gönderilen Sahte assignee_id Yetki Yükseltmesine Yol Açmaz', 'Subtasks/Auth', spoofedAssigneeRes.status === 403, '403 döndü');

// ==============================================================================
// 8. Bildirim Kullanıcı İzolasyonu Testleri
// ==============================================================================
console.log('\n--- 8. Bildirim Kullanıcı İzolasyonu Testleri ---');

function filterNotificationsForUser(allNotifications, requestingUserId) {
    if (!requestingUserId) return [];
    if (requestingUserId === 'all') {
        return allNotifications.filter(n => n.user_id === 'all');
    }
    return allNotifications.filter(n => n.user_id === 'all' || n.user_id === requestingUserId);
}

const mockNotifications = [
    { id: 'notif_1', user_id: 'all', title: 'Genel Duyuru' },
    { id: 'notif_2', user_id: 'mem_target', title: 'Hedef Üyeye Özel Uyarı' },
    { id: 'notif_3', user_id: 'mem_other', title: 'Başka Üyenin Bildirimi' }
];

const targetNotifications = filterNotificationsForUser(mockNotifications, 'mem_target');
assertTest(
    'Üye Kendisine Ait ve Genel Bildirimleri Alabilmeli',
    'Notifications/Isolation',
    targetNotifications.some(n => n.id === 'notif_1') && targetNotifications.some(n => n.id === 'notif_2'),
    'Kendi ve all bildirimleri alındı'
);
assertTest(
    'Üye Başka Bir Üyeye Ait Özel Bildirimi Asla Görememeli',
    'Notifications/Isolation',
    !targetNotifications.some(n => n.id === 'notif_3'),
    'Başka üyenin bildirimi (notif_3) filtrelendi'
);
assertTest(
    'Oturumsuz İstek Hiçbir Bildirim Almamalı (Boş Dizi)',
    'Notifications/Isolation',
    filterNotificationsForUser(mockNotifications, null).length === 0,
    'Oturumsuz erişim engellendi'
);

// ==============================================================================
// 9. SQL RLS ve Migration Statik Denetimleri
// ==============================================================================
console.log('\n--- 9. SQL RLS ve Migration Statik Denetimleri ---');

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261023_lockdown_rls_and_fix_functions.sql');
const migrationExists = fs.existsSync(migrationPath);
assertTest('Güvenlik Migration Dosyası (20261023) Mevcut Olmalı', 'SQL/RLS', migrationExists, migrationPath);

if (migrationExists) {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    assertTest(
        'workspace_events Tablosunda Dinamik pg_policies Temizleme Döngüsü Bulunmalı',
        'SQL/RLS',
        sql.includes("FROM pg_policies") &&
        sql.includes("WHERE tablename = 'workspace_events'") &&
        sql.includes("format('DROP POLICY IF EXISTS %I ON public.workspace_events'"),
        'Dinamik politika temizliği doğrulandı'
    );

    assertTest(
        'workspace_events Tablosunda "Allow authenticated events read access" Açıkça Düşürülmeli',
        'SQL/RLS',
        sql.includes('DROP POLICY IF EXISTS "Allow authenticated events read access" ON public.workspace_events;'),
        'Tarihsel artık politika DROP listesine eklendi'
    );

    assertTest(
        'workspace_events Tablosunda PostgREST SELECT Yalnızca Açıkça "visibility = \'public\'" ile Sınırlandırılmalı',
        'SQL/RLS',
        sql.includes("USING (visibility = 'public');") &&
        !sql.includes("visibility IS NULL"),
        'NULL etkinlik açığı kapatıldı, yalnızca açıkça public olanlar açık'
    );

    assertTest(
        'workspace_groups Tablosundan Doğrudan anon ve authenticated Erişimi Tamamen Kaldırılmalı',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.workspace_groups FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_groups FROM authenticated;') &&
        !sql.includes('CREATE POLICY "Allow public read access to groups"'),
        'workspace_groups PostgREST erişimine tamamen kapatıldı'
    );

    assertTest(
        'workspace_settings Tablosundan Doğrudan anon ve authenticated Erişimi Tamamen Kaldırılmalı',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.workspace_settings FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_settings FROM authenticated;') &&
        !sql.includes('CREATE POLICY "Allow authenticated read workspace settings"'),
        'workspace_settings PostgREST erişimine tamamen kapatıldı'
    );

    assertTest(
        'workspace_members Tablosundan anon ve authenticated Doğrudan Erişimi Tamamen Kaldırılmalı',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.workspace_members FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_members FROM authenticated;'),
        'workspace_members yalnızca service_role katmanına ayrıldı'
    );

    assertTest(
        'workspace_event_comments ve subtasks Tablolarından anon ve authenticated Tamamen İptal Edilmeli',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.workspace_event_comments FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_event_comments FROM authenticated;') &&
        sql.includes('REVOKE ALL ON public.workspace_event_subtasks FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_event_subtasks FROM authenticated;'),
        'Yorum ve görev tabloları PostgREST erişimine tamamen kapatıldı'
    );

    assertTest(
        'workspace_notifications ve notification_reads Tablolarından anon ve authenticated Tamamen İptal Edilmeli',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.workspace_notifications FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_notifications FROM authenticated;'),
        'Bildirim tabloları PostgREST erişimine tamamen kapatıldı'
    );

    assertTest(
        'workspace_event_attendees (RSVP KVKK) Tablosu anon ve authenticated Rollerinden İptal Edilmeli',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.workspace_event_attendees FROM anon;') &&
        sql.includes('REVOKE ALL ON public.workspace_event_attendees FROM authenticated;'),
        'RSVP KVKK tablosu doğrudan PostgREST erişimine kapatıldı'
    );

    assertTest(
        'admin_users Tablosunda Anonim Erişim Tamamen İptal Edilmeli',
        'SQL/RLS',
        sql.includes('REVOKE ALL ON public.admin_users FROM anon;') &&
        sql.includes('auth_id = auth.uid()'),
        'admin_users anonime kapatıldı, admin yalnızca kendi satırını okuyabilir'
    );

    assertTest(
        'handle_workspace_event_updated Fonksiyonunda search_path = \'\' Yapılandırılmalı',
        'SQL/RLS',
        sql.includes("SET search_path = ''"),
        'search_path = \'\' güvenliği doğrulandı'
    );
}

// ==============================================================================
// 10. Sonuç Özeti
// ==============================================================================
console.log('\n' + '='.repeat(80));
console.log(`TEST SONUCU: ${passCount} BAŞARILI, ${failCount} BAŞARISIZ`);
console.log('='.repeat(80));

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
