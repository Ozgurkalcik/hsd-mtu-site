// Automated Post-Fix Security & Integration Suite (Faz A-D)
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'admin_bootstrap_pass_2026';

async function runPostFixTests() {
    console.log('=== RUNNING WORKSPACE POST-FIX SECURITY & INTEGRATION TEST SUITE ===');
    console.log(`Target URL: ${BASE_URL}`);
    console.log(`Admin Init Password Mode: ${process.env.ADMIN_INITIAL_PASSWORD ? 'ENV' : 'BOOTSTRAP DEFAULT'}\n`);
    const results = [];

    function record(testName, category, status, details) {
        results.push({ testName, category, status, details });
        console.log(`[${status}] ${testName}`);
        if (details) console.log(`   ${details}`);
    }

    // ----------------------------------------------------
    // FAZ A: SUPABASE RLS MIGRATION & STATIC SECURITY CHECK
    // ----------------------------------------------------
    console.log('\n--- FAZ A: SUPABASE RLS MIGRATION & LEAST PRIVILEGE SPECIFICATION ---');
    try {
        const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261010_tighten_workspace_rls.sql');
        if (fs.existsSync(migrationPath)) {
            const sqlContent = fs.readFileSync(migrationPath, 'utf8');
            const hasOverlyPermissiveAnonMembers = sqlContent.includes("FOR SELECT TO anon USING (true)") && sqlContent.includes("workspace_members");
            const hasPublicCalendarFilter = sqlContent.includes("is_private = false");

            if (!hasOverlyPermissiveAnonMembers && hasPublicCalendarFilter) {
                record('Faz A - RLS Least Privilege Migration File', 'RLS/Security', 'PASS', 'Migration dosyası mevcut, workspace_members için anon(true) kaldırılmış, takvim is_private=false ile filtrelenmiş.');
            } else {
                record('Faz A - RLS Least Privilege Migration File', 'RLS/Security', 'FAIL', 'Migration dosyasında aşırı izinli anonim kural tespit edildi.');
            }
        } else {
            record('Faz A - RLS Least Privilege Migration File', 'RLS/Security', 'FAIL', 'Migration dosyası bulunamadı: ' + migrationPath);
        }
    } catch (e) {
        record('Faz A - RLS Migration Check', 'RLS/Security', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // FAZ 1 & TEST SUITE 1: STRICT UNAUTHENTICATED TESTS (NO COOKIE)
    // ----------------------------------------------------
    console.log('\n--- 1. UNAUTHENTICATED (ANONYMOUS) SECURITY BARRIER TESTS ---');

    // 1.1 GET /api/workspace/events -> Public Calendar (200 OK)
    try {
        const res = await fetch(`${BASE_URL}/api/workspace/events`);
        if (res.status === 200) {
            record('Public Events Read (GET /api/workspace/events)', 'Auth/Public', 'PASS', 'Status 200: Topluluk takvimi anonim okunabilir.');
        } else {
            record('Public Events Read (GET /api/workspace/events)', 'Auth/Public', 'FAIL', `Status: ${res.status}`);
        }
    } catch (e) {
        record('Public Events Read', 'Auth/Public', 'FAIL', e.message);
    }

    // 1.2 POST /api/workspace/events without cookie -> MUST BE 401
    try {
        const res = await fetch(`${BASE_URL}/api/workspace/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Hacked Event',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString()
            })
        });
        if (res.status === 401) {
            record('Anonymous Event Creation Blocked', 'Auth/P0', 'PASS', 'Status 401: Oturumu olmayan istek kesinlikle engellendi.');
        } else {
            record('Anonymous Event Creation Blocked', 'Auth/P0', 'FAIL', `Status: ${res.status} (Beklenen: 401)`);
        }
    } catch (e) {
        record('Anonymous Event Creation Blocked', 'Auth/P0', 'FAIL', e.message);
    }

    // 1.3 GET /api/workspace/admin/members without cookie -> MUST BE 401
    try {
        const res = await fetch(`${BASE_URL}/api/workspace/admin/members`);
        if (res.status === 401) {
            record('Anonymous Admin Members Read Blocked', 'Auth/P0', 'PASS', 'Status 401: Oturumu olmayan istek üye listesine erişemedi.');
        } else {
            record('Anonymous Admin Members Read Blocked', 'Auth/P0', 'FAIL', `Status: ${res.status} (Beklenen: 401)`);
        }
    } catch (e) {
        record('Anonymous Admin Members Read Blocked', 'Auth/P0', 'FAIL', e.message);
    }

    // 1.4 POST /api/workspace/admin/members without cookie -> MUST BE 401
    try {
        const res = await fetch(`${BASE_URL}/api/workspace/admin/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: 'Attacker Admin',
                email: 'attacker@evil.com',
                password: 'evilpass123',
                role: 'super_admin'
            })
        });
        if (res.status === 401) {
            record('Anonymous Member Creation Blocked', 'Auth/P0', 'PASS', 'Status 401: Dış saldırgan yeni admin ekleyemedi.');
        } else {
            record('Anonymous Member Creation Blocked', 'Auth/P0', 'FAIL', `Status: ${res.status} (Beklenen: 401)`);
        }
    } catch (e) {
        record('Anonymous Member Creation Blocked', 'Auth/P0', 'FAIL', e.message);
    }

    // 1.5 PUT /api/workspace/admin/roles without cookie -> MUST BE 401
    try {
        const res = await fetch(`${BASE_URL}/api/workspace/admin/roles`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'viewer',
                permissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_upload: true, can_share: true }
            })
        });
        if (res.status === 401) {
            record('Anonymous Role Permission Tampering Blocked', 'Auth/P0', 'PASS', 'Status 401: Dış saldırgan rol izinlerini değiştiremedi.');
        } else {
            record('Anonymous Role Permission Tampering Blocked', 'Auth/P0', 'FAIL', `Status: ${res.status} (Beklenen: 401)`);
        }
    } catch (e) {
        record('Anonymous Role Permission Tampering Blocked', 'Auth/P0', 'FAIL', e.message);
    }

    // 1.6 POST /api/workspace/files/upload without cookie -> MUST BE 401
    try {
        const formData = new FormData();
        formData.append('file', new Blob(['test file']), 'sample.txt');
        const res = await fetch(`${BASE_URL}/api/workspace/files/upload`, {
            method: 'POST',
            body: formData
        });
        if (res.status === 401) {
            record('Anonymous File Upload Blocked', 'Auth/P0', 'PASS', 'Status 401: Oturumu olmayan dosya yüklemesi engellendi.');
        } else {
            record('Anonymous File Upload Blocked', 'Auth/P0', 'FAIL', `Status: ${res.status} (Beklenen: 401)`);
        }
    } catch (e) {
        record('Anonymous File Upload Blocked', 'Auth/P0', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // FAZ C: GENERIC AUTH ERRORS & RATE LIMITING DEFENSE
    // ----------------------------------------------------
    console.log('\n--- FAZ C: AUTH ERROR ENUMERATION & RATE LIMITING DEFENSE ---');

    // C.1 Generic Login Error (Non-existent user vs wrong password)
    try {
        const resBadUser = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'non_existent_user_99999', password: 'wrong_password' })
        });
        const badUserData = await resBadUser.json();

        const resBadPass = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin', password: 'wrong_password_attempt' })
        });
        const badPassData = await resBadPass.json();

        if (
            resBadUser.status === 401 &&
            resBadPass.status === 401 &&
            badUserData.error === badPassData.error &&
            badUserData.error === 'Geçersiz kullanıcı adı/e-posta veya şifre.'
        ) {
            record('Generic Auth Error (No Enumeration)', 'Security/Enum', 'PASS', 'Status 401: Mevcut olmayan kullanıcı ve yanlış şifre aynı genel hata mesajını verdi, bilgi sızdırılmadı.');
        } else {
            record('Generic Auth Error (No Enumeration)', 'Security/Enum', 'FAIL', `User Msg: "${badUserData.error}", Pass Msg: "${badPassData.error}"`);
        }
    } catch (e) {
        record('Generic Auth Error', 'Security/Enum', 'FAIL', e.message);
    }

    // C.2 Login Rate Limiting (5 failed attempts limit)
    try {
        const rateLimitTestId = 'rate_limit_target_user';
        let hitRateLimit = false;
        let finalStatus = 0;

        for (let i = 0; i < 6; i++) {
            const res = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: rateLimitTestId, password: 'fail_pass_' + i })
            });
            finalStatus = res.status;
            if (res.status === 429) {
                hitRateLimit = true;
                break;
            }
        }

        if (hitRateLimit) {
            record('Login Rate Limiting (Brute-force Blocked)', 'Security/RateLimit', 'PASS', 'Status 429: Çok sayıda ardışık hatalı girişte hesap/IP bazlı rate limit devreye girdi.');
        } else {
            record('Login Rate Limiting (Brute-force Blocked)', 'Security/RateLimit', 'FAIL', `Son istek durumu: ${finalStatus} (Beklenen: 429)`);
        }
    } catch (e) {
        record('Login Rate Limiting', 'Security/RateLimit', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // TEST SUITE 2: AUTHENTICATED SESSIONS & ROLE MATRIX (RBAC)
    // ----------------------------------------------------
    console.log('\n--- 2. ROLE-BASED ACCESS CONTROL (RBAC) & SESSIONS ---');

    // 2.1 Super Admin Login with Secure Bootstrap Password & Must Change Password Flag
    let adminCookie = '';
    try {
        const res = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin', password: ADMIN_PASSWORD })
        });
        const cookie = res.headers.get('set-cookie');
        const loginData = await res.json();

        if (res.status === 200 && cookie) {
            adminCookie = cookie.split(';')[0];
            const mustChange = Boolean(loginData.user?.must_change_password);
            record('Super Admin Bootstrap Login', 'RBAC', 'PASS', `Status 200: Süper Admin giriş yaptı. must_change_password bayrağı: ${mustChange}`);
        } else {
            record('Super Admin Bootstrap Login', 'RBAC', 'FAIL', `Status: ${res.status}`);
        }
    } catch (e) {
        record('Super Admin Bootstrap Login', 'RBAC', 'FAIL', e.message);
    }

    // 2.2 Create Test Users: Viewer, Editor, Workspace Admin
    let viewerCookie = '';
    let editorCookie = '';
    let wadminCookie = '';
    const timeSuffix = Date.now().toString().slice(-4);

    const viewerUname = `v_${timeSuffix}`;
    const editorUname = `e_${timeSuffix}`;
    const wadminUname = `wa_${timeSuffix}`;

    try {
        // Create Viewer
        const rV = await fetch(`${BASE_URL}/api/workspace/admin/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
            body: JSON.stringify({ display_name: 'Test Viewer', username: viewerUname, email: `${viewerUname}@hsd.mtu`, password: 'pass12345!', role: 'viewer' })
        });
        const dV = await rV.json();

        // Create Editor
        const rE = await fetch(`${BASE_URL}/api/workspace/admin/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
            body: JSON.stringify({ display_name: 'Test Editor', username: editorUname, email: `${editorUname}@hsd.mtu`, password: 'pass12345!', role: 'editor' })
        });
        const dE = await rE.json();

        // Create Workspace Admin
        const rW = await fetch(`${BASE_URL}/api/workspace/admin/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
            body: JSON.stringify({ display_name: 'Test WAdmin', username: wadminUname, email: `${wadminUname}@hsd.mtu`, password: 'pass12345!', role: 'workspace_admin' })
        });
        const dW = await rW.json();

        if (rV.status === 201 && rE.status === 201 && rW.status === 201) {
            record('Super Admin Creates Roles (Viewer, Editor, WAdmin)', 'RBAC', 'PASS', 'Status 201: 3 farklı rolde kullanıcı başarıyla oluşturuldu.');
        } else {
            record('Super Admin Creates Roles', 'RBAC', 'FAIL', `Statuses: ${rV.status}, ${rE.status}, ${rW.status}`);
        }

        // Login as Viewer
        const lV = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: viewerUname, password: 'pass12345!' })
        });
        viewerCookie = (lV.headers.get('set-cookie') || '').split(';')[0];

        // Login as Editor
        const lE = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: editorUname, password: 'pass12345!' })
        });
        editorCookie = (lE.headers.get('set-cookie') || '').split(';')[0];

        // Login as Workspace Admin
        const lW = await fetch(`${BASE_URL}/api/workspace/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: wadminUname, password: 'pass12345!' })
        });
        wadminCookie = (lW.headers.get('set-cookie') || '').split(';')[0];
    } catch (e) {
        record('User Creation & Login', 'RBAC', 'FAIL', e.message);
    }

    // 2.3 Viewer Tests: Must be 403 Forbidden for writing/admin
    try {
        const resMem = await fetch(`${BASE_URL}/api/workspace/admin/members`, { headers: { 'Cookie': viewerCookie } });
        const resEvt = await fetch(`${BASE_URL}/api/workspace/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': viewerCookie },
            body: JSON.stringify({ title: 'Viewer Event', start_time: new Date().toISOString(), end_time: new Date().toISOString() })
        });

        if (resMem.status === 403 && resEvt.status === 403) {
            record('Viewer Permissions Enforcement', 'RBAC', 'PASS', 'Status 403: Viewer kullanıcısının admin rotasına ve etkinlik oluşturmaya erişimi engellendi.');
        } else {
            record('Viewer Permissions Enforcement', 'RBAC', 'FAIL', `resMem: ${resMem.status}, resEvt: ${resEvt.status}`);
        }
    } catch (e) {
        record('Viewer Permissions Enforcement', 'RBAC', 'FAIL', e.message);
    }

    // 2.4 Editor Tests: Can create/edit event, but CANNOT delete event and CANNOT access admin
    let editorCreatedEventId = '';
    let editorEventVersion = 1;
    try {
        // Editor creates event
        const resCreate = await fetch(`${BASE_URL}/api/workspace/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': editorCookie },
            body: JSON.stringify({
                title: 'Editor Legitimate Event',
                calendar_id: 'cal_core',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString()
            })
        });
        const dataCreate = await resCreate.json();
        editorCreatedEventId = dataCreate.event?.id;
        editorEventVersion = dataCreate.event?.version;

        // Editor attempts to DELETE event -> MUST BE 403
        const resDel = await fetch(`${BASE_URL}/api/workspace/events/${editorCreatedEventId}`, {
            method: 'DELETE',
            headers: { 'Cookie': editorCookie }
        });

        // Editor attempts to access admin -> MUST BE 403
        const resAdmin = await fetch(`${BASE_URL}/api/workspace/admin/members`, {
            headers: { 'Cookie': editorCookie }
        });

        if (resCreate.status === 201 && resDel.status === 403 && resAdmin.status === 403) {
            record('Editor Permissions Enforcement', 'RBAC', 'PASS', 'Status 201 Create OK, Status 403 Delete Blocked, Status 403 Admin Blocked.');
        } else {
            record('Editor Permissions Enforcement', 'RBAC', 'FAIL', `Create: ${resCreate.status}, Delete: ${resDel.status}, Admin: ${resAdmin.status}`);
        }
    } catch (e) {
        record('Editor Permissions Enforcement', 'RBAC', 'FAIL', e.message);
    }

    // 2.5 Privilege Escalation Defense: Workspace Admin cannot create or elevate to super_admin
    try {
        const resEsc = await fetch(`${BASE_URL}/api/workspace/admin/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': wadminCookie },
            body: JSON.stringify({
                display_name: 'Escalated Admin',
                username: `esc_${timeSuffix}`,
                email: `esc_${timeSuffix}@test.com`,
                password: 'password123',
                role: 'super_admin' // ATTEMPT TO ELEVATE
            })
        });

        // Workspace Admin attempts to alter role permissions -> MUST BE 403 (super_admin only)
        const resRole = await fetch(`${BASE_URL}/api/workspace/admin/roles`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Cookie': wadminCookie },
            body: JSON.stringify({ role: 'viewer', permissions: { can_view: true } })
        });

        if (resEsc.status === 403 && resRole.status === 403) {
            record('Privilege Escalation Defense by WAdmin', 'RBAC/Defense', 'PASS', 'Status 403: Workspace admin süper admin oluşturamadı ve rol matrisini değiştiremedi.');
        } else {
            record('Privilege Escalation Defense by WAdmin', 'RBAC/Defense', 'FAIL', `Esc: ${resEsc.status}, Role: ${resRole.status}`);
        }
    } catch (e) {
        record('Privilege Escalation Defense', 'RBAC/Defense', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // TEST SUITE 3: FUNCTIONAL & ATOMIC CONCURRENCY
    // ----------------------------------------------------
    console.log('\n--- 3. CONCURRENCY & ATOMIC DATABASE MUTATION ---');

    // 3.1 Valid Update with Current Version
    try {
        const resUpdate = await fetch(`${BASE_URL}/api/workspace/events/${editorCreatedEventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': editorCookie },
            body: JSON.stringify({
                version: editorEventVersion,
                title: 'Updated Event Title v2'
            })
        });
        const dataUpdate = await resUpdate.json();
        if (resUpdate.status === 200 && dataUpdate.event?.version === editorEventVersion + 1) {
            editorEventVersion = dataUpdate.event.version;
            record('Atomic Concurrency - Valid Update', 'Concurrency', 'PASS', `Status 200: Versiyon atomik olarak ${editorEventVersion} yapıldı.`);
        } else {
            record('Atomic Concurrency - Valid Update', 'Concurrency', 'FAIL', `Status: ${resUpdate.status}`);
        }
    } catch (e) {
        record('Atomic Concurrency - Valid Update', 'Concurrency', 'FAIL', e.message);
    }

    // 3.2 Conflict Detection with Stale Version (Sending version = 1 when version = 2)
    try {
        const resConflict = await fetch(`${BASE_URL}/api/workspace/events/${editorCreatedEventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': editorCookie },
            body: JSON.stringify({
                version: 1, // STALE!
                title: 'Conflicting Concurrent Edit'
            })
        });
        if (resConflict.status === 409) {
            record('Atomic Concurrency - Conflict Detection', 'Concurrency', 'PASS', 'Status 409 Conflict: Eski versiyonla gelen çakışma başarıyla yakalandı.');
        } else {
            record('Atomic Concurrency - Conflict Detection', 'Concurrency', 'FAIL', `Status: ${resConflict.status} (Beklenen: 409)`);
        }
    } catch (e) {
        record('Atomic Concurrency - Conflict Detection', 'Concurrency', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // TEST SUITE 4: FILE STORAGE & DOWNLOAD VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- 4. FILE STORAGE & DOWNLOAD VERIFICATION ---');

    let uploadedToken = '';
    const testContent = 'HSD MTU Topluluk Takvimi Güvenli Dosya İndirme Denetim İçeriği';
    try {
        const formData = new FormData();
        const testBlob = new Blob([testContent], { type: 'text/plain' });
        formData.append('file', testBlob, 'guvenlik_denetim_raporu.txt');
        formData.append('eventId', editorCreatedEventId);

        const resUpload = await fetch(`${BASE_URL}/api/workspace/files/upload`, {
            method: 'POST',
            headers: { 'Cookie': editorCookie },
            body: formData
        });
        const dataUpload = await resUpload.json();

        if (resUpload.status === 201 && dataUpload.file?.download_token) {
            uploadedToken = dataUpload.file.download_token;
            record('File Upload via Editor', 'Files', 'PASS', `Status 201: Dosya başarıyla yüklendi, Token: ${uploadedToken.substring(0, 16)}...`);
        } else {
            record('File Upload via Editor', 'Files', 'FAIL', `Status: ${resUpload.status}`);
        }

        // Test Download WITHOUT auth -> MUST BE 401 Unauthorized
        const resDownloadAnon = await fetch(`${BASE_URL}/api/workspace/files/download/${uploadedToken}`);
        if (resDownloadAnon.status === 401) {
            record('Unauthenticated File Download Blocked', 'Files', 'PASS', 'Status 401: Oturumu olmayan kullanıcının dosya indirmesi engellendi.');
        } else {
            record('Unauthenticated File Download Blocked', 'Files', 'FAIL', `Status: ${resDownloadAnon.status} (Beklenen: 401)`);
        }

        // Test Download WITH valid session cookie
        const resDownloadAuth = await fetch(`${BASE_URL}/api/workspace/files/download/${uploadedToken}`, {
            headers: { 'Cookie': editorCookie }
        });
        const downloadedText = await resDownloadAuth.text();

        if (resDownloadAuth.status === 200 && downloadedText === testContent) {
            record('Authenticated File Download via Token', 'Files', 'PASS', 'Status 200: İndirilen binary içerik yüklenen dosya ile birebir eşleşti.');
        } else {
            record('Authenticated File Download via Token', 'Files', 'FAIL', `Status: ${resDownloadAuth.status}, Body match: ${downloadedText === testContent}`);
        }

        // Test Download with Fake Token -> MUST BE 404
        const resFake = await fetch(`${BASE_URL}/api/workspace/files/download/fake_token_that_does_not_exist_123456789`, {
            headers: { 'Cookie': editorCookie }
        });
        if (resFake.status === 404) {
            record('Invalid Download Token Rejection', 'Files', 'PASS', 'Status 404: Sahte veya geçersiz indirme tokenı reddedildi.');
        } else {
            record('Invalid Download Token Rejection', 'Files', 'FAIL', `Status: ${resFake.status}`);
        }
    } catch (e) {
        record('File Storage Test', 'Files', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // TEST SUITE 5: PER-USER NOTIFICATION ISOLATION
    // ----------------------------------------------------
    console.log('\n--- 5. PER-USER NOTIFICATION READ ISOLATION ---');

    try {
        // Dispatch announcement to 'all'
        const resDispatch = await fetch(`${BASE_URL}/api/workspace/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
            body: JSON.stringify({
                title: 'Genel Topluluk Duyurusu',
                message: 'Tüm üyeler için izolasyon testi',
                targetAudience: 'all'
            })
        });

        // Viewer marks all as read
        await fetch(`${BASE_URL}/api/workspace/notifications`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': viewerCookie },
            body: JSON.stringify({ mark_all: true })
        });

        // Editor checks notifications -> General announcement must STILL be unread for Editor!
        const resEditorNotifs = await fetch(`${BASE_URL}/api/workspace/notifications`, {
            headers: { 'Cookie': editorCookie }
        });
        const dataEditor = await resEditorNotifs.json();
        const editorFound = dataEditor.notifications?.find(n => n.title === 'Genel Topluluk Duyurusu');

        // Viewer checks notifications -> Must be read for Viewer!
        const resViewerNotifs = await fetch(`${BASE_URL}/api/workspace/notifications`, {
            headers: { 'Cookie': viewerCookie }
        });
        const dataViewer = await resViewerNotifs.json();
        const viewerFound = dataViewer.notifications?.find(n => n.title === 'Genel Topluluk Duyurusu');

        if (editorFound && editorFound.is_read === false && viewerFound && viewerFound.is_read === true) {
            record('Per-User Notification Read Isolation', 'Notifications', 'PASS', 'Kullanıcı A okuduğunda Kullanıcı B için bildirim okunmamış (is_read: false) kalmaktadır.');
        } else {
            record('Per-User Notification Read Isolation', 'Notifications', 'FAIL', `Editor is_read: ${editorFound?.is_read}, Viewer is_read: ${viewerFound?.is_read}`);
        }
    } catch (e) {
        record('Notification Isolation Test', 'Notifications', 'FAIL', e.message);
    }

    // ----------------------------------------------------
    // TEST SUITE 6: LOGOUT & SESSION REVOCATION
    // ----------------------------------------------------
    console.log('\n--- 6. LOGOUT & SESSION REVOCATION ---');

    try {
        // Logout viewer
        const resLogout = await fetch(`${BASE_URL}/api/workspace/auth/logout`, {
            method: 'POST',
            headers: { 'Cookie': viewerCookie }
        });

        // Verify session is no longer valid
        const resSessionCheck = await fetch(`${BASE_URL}/api/workspace/auth/session`, {
            headers: { 'Cookie': viewerCookie }
        });
        const sessionData = await resSessionCheck.json();

        if (resLogout.status === 200 && sessionData.authenticated === false) {
            record('Logout Session Invalidation', 'Auth/Logout', 'PASS', 'Status 200: Logout sonrasında session silindi ve /auth/session authenticated=false döndürdü.');
        } else {
            record('Logout Session Invalidation', 'Auth/Logout', 'FAIL', `Logout status: ${resLogout.status}, sessionData: ${JSON.stringify(sessionData)}`);
        }
    } catch (e) {
        record('Logout Session Invalidation', 'Auth/Logout', 'FAIL', e.message);
    }

    console.log('\n=== POST-FIX SUITE SUMMARY ===');
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    console.log(`Total Scenarios: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);
    
    if (failCount > 0) {
        process.exitCode = 1;
    }
}

runPostFixTests();
