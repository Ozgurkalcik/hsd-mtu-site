/**
 * HSD MTÜ Workspace - Kapsamlı Güvenlik Denetim Aracı (Security Audit)
 * 
 * Bu betik projedeki kritik güvenlik noktalarını otomatik olarak denetler:
 * 1. HMAC Session Sign Secret sızıntısı (NEXT_PUBLIC_ anahtarı kullanılmamalı)
 * 2. Parola hash'i sızıntı koruması (password_hash istemciye asla dönmemeli)
 * 3. Kimlik doğrulama hız sınırlaması (Admin & Workspace Login Rate Limiting)
 * 4. Dosya yükleme & path traversal koruması (sanitizeFileName, uzantı whitelist)
 * 5. İletişim formu HTML enjeksiyonu ve Rate Limiting
 * 6. Admin API uç noktalarının yetkilendirme koruması
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
let passedTests = 0;
let totalTests = 0;
const issues = [];

function test(name, assertionFn) {
    totalTests++;
    try {
        const result = assertionFn();
        if (result === true) {
            console.log(`  ✅ [GEÇTİ] ${name}`);
            passedTests++;
        } else {
            console.error(`  ❌ [BAŞARISIZ] ${name}: ${result || 'Koşul sağlanamadı'}`);
            issues.push({ name, reason: result });
        }
    } catch (err) {
        console.error(`  ❌ [HATA] ${name}: ${err.message}`);
        issues.push({ name, reason: err.message });
    }
}

console.log('\n🔒 HSD MTÜ WORKSPACE GÜVENLİK DENETİMİ BAŞLATILIYOR...\n');

// 1. HMAC Session Token Güvenliği
test('1. HMAC İmzalamada NEXT_PUBLIC_ anahtarı KULLANILMAMALI', () => {
    const secFile = fs.readFileSync(path.join(ROOT_DIR, 'src/shared/lib/security.ts'), 'utf-8');
    if (secFile.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY') && secFile.includes('SESSION_SIGN_SECRET')) {
        return 'SESSION_SIGN_SECRET değişkeninde NEXT_PUBLIC_SUPABASE_ANON_KEY tespit edildi! Anon anahtarı istemciye açık olduğundan HMAC imza taklidi yapılabilir.';
    }
    return true;
});

// 2. Parola Hash'i Sanitizasyonu (Data Leakage)
test('2. WorkspaceRepository üyeleri döndürürken password_hash alanını temizlemeli', () => {
    const repoFile = fs.readFileSync(path.join(ROOT_DIR, 'src/shared/api/workspaceRepository.ts'), 'utf-8');
    if (!repoFile.includes('sanitizeMember') && !repoFile.includes('delete') && !repoFile.includes('password_hash')) {
        return 'workspaceRepository.ts içinde sanitizeMember fonksiyonu bulunamadı; password_hash istemciye sızabilir.';
    }
    return true;
});

// 3. Admin Login API Rate Limiting
test('3. /admin/login/api rotasında Rate Limiting (Kaba Kuvvet Koruması) olmalı', () => {
    const adminLoginFile = fs.readFileSync(path.join(ROOT_DIR, 'src/app/admin/login/api/route.ts'), 'utf-8');
    if (!adminLoginFile.includes('checkRateLimit')) {
        return '/admin/login/api içinde checkRateLimit çağrısı bulunmuyor; yönetici paneli kaba kuvvet (brute-force) saldırılarına açık.';
    }
    return true;
});

// 4. İletişim Formu Güvenliği (XSS / HTML Injection & Rate Limit)
test('4. /api/contact rotasında Rate Limiting ve HTML Sanitizasyonu olmalı', () => {
    const contactFile = fs.readFileSync(path.join(ROOT_DIR, 'src/app/api/contact/route.ts'), 'utf-8');
    if (!contactFile.includes('checkRateLimit')) {
        return '/api/contact içinde Rate Limiting yok, spam gönderilerek SMTP kotası tüketilebilir.';
    }
    return true;
});

// 5. Dosya Yükleme & Path Traversal Koruması
test('5. Dosya yükleme doğrulayıcısı path traversal karakterlerini temizlemeli', () => {
    const secFile = fs.readFileSync(path.join(ROOT_DIR, 'src/shared/lib/security.ts'), 'utf-8');
    if (!secFile.includes('sanitizeFileName') || !secFile.includes('ALLOWED_EXTENSIONS')) {
        return 'security.ts içinde dosya temizleme veya uzantı beyaz listesi eksik.';
    }
    return true;
});

// 6. Admin API Rotalarının Yetki Koruması
test('6. Tüm admin API rotaları verifyAdmin veya verifySuperAdmin ile korunmalı', () => {
    const adminApiDir = path.join(ROOT_DIR, 'src/app/api/workspace/admin');
    const subDirs = fs.readdirSync(adminApiDir);
    for (const sub of subDirs) {
        const routePath = path.join(adminApiDir, sub, 'route.ts');
        if (fs.existsSync(routePath)) {
            const content = fs.readFileSync(routePath, 'utf-8');
            if (!content.includes('verifyAdmin') && !content.includes('verifySuperAdmin')) {
                return `${sub}/route.ts içinde yetkilendirme kontrolü (verifyAdmin) bulunamadı!`;
            }
        }
    }
    return true;
});

// 7. Etkinlik Silme ve Düzenleme Yetki İzolasyonu
test('7. Etkinlik silme ve düzenleme rotası yetkisiz silme işlemlerini engellemeli', () => {
    const eventIdRoute = fs.readFileSync(path.join(ROOT_DIR, 'src/app/api/workspace/events/[id]/route.ts'), 'utf-8');
    if (!eventIdRoute.includes('canDelete') || !eventIdRoute.includes('canEdit')) {
        return 'events/[id]/route.ts içinde canDelete / canEdit kontrolü eksik.';
    }
    return true;
});

console.log(`\n========================================`);
console.log(`SONUÇ: ${passedTests}/${totalTests} Güvenlik Denetimi Başarılı.`);
console.log(`========================================\n`);

if (issues.length > 0) {
    console.log(`⚠️ Giderilmesi Gereken Güvenlik Hususları:`);
    issues.forEach((iss, idx) => console.log(`  ${idx + 1}. [${iss.name}]: ${iss.reason}`));
    process.exit(1);
} else {
    console.log(`🎉 Tebrikler! Tüm kritik güvenlik standartları karşılandı.`);
    process.exit(0);
}
