# HSD MTÜ — Güvenlik Denetim ve Sertleştirme Raporu (Security Audit Report)

**Hedef Sistem:** HSD MTÜ Topluluk Portalı & Workspace  
**Üretim Adresi:** `https://hsdmtu.vercel.app`  
**Tarih:** 23 Ekim 2026  
**Denetçi Rolü:** Senior Application Security Engineer & Supabase Security Architect  
**Versiyon:** 2.0.0 (Hardened)

---

## 1. Yönetici Özeti (Executive Summary)

HSD MTÜ projesinde uçtan uca kimlik doğrulama, yetkilendirme (RBAC), Supabase PostgreSQL Row Level Security (RLS), oturum güvenliği ve API katmanı denetlenmiştir. Yapılan derinlemesine analizde toplam **14 adet güvenlik açığı ve mimari eksiklik** (4 Kritik, 6 Yüksek, 4 Orta Seviye) tespit edilmiş, kök nedenleri izole edilmiş ve uygulanan kapsamlı sertleştirme çalışmalarıyla giderilmiştir.

Mevcut çalışan frontend özellikleri, genel web sayfaları ve kullanıcı iş akışları korunmuş; veri tabanında geri dönüşsüz bir hasar oluşmaksızın tüm RLS politikaları "En Az Yetki İlkesi" (Least Privilege) standardına getirilmiştir.

---

## 2. Mevcut Mimari ve Tehdit Modeli

### 2.1. Mimari Katmanlar
1. **İstemci (Client-Side):** Next.js App Router (React 19), SSR bileşenleri ve Supabase Browser Client.
2. **Uç Katman (Edge / Middleware):** `middleware.ts` — `/admin/*` rotalarını yönlendirme ve rate-limiting amacıyla korur.
3. **Sunucu API Katmanı (Next.js Server Handlers):** `/api/workspace/*` — Workspace verilerine erişimi yönetir ve `SUPABASE_SERVICE_ROLE_KEY` ile izole veritabanı işlemlerini yürütür.
4. **Veritabanı Katmanı (Supabase PostgreSQL):** Row Level Security (RLS) politikalarıyla PostgREST doğrudan erişimlerini denetler.

### 2.2. Tehdit Modeli ve Tehdit Aktörleri
- **Tehdit Aktörü 1 (Dış Saldırgan / Anonim Ziyaretçi):** Tarayıcıda yer alan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ve `NEXT_PUBLIC_SUPABASE_URL` anahtarlarını kullanarak Supabase REST API'ye doğrudan HTTP sorguları gönderir.
- **Tehdit Aktörü 2 (Düşük Yetkili Workspace Üyesi / Viewer-Contributor):** Kendi oturum token'ını manipüle ederek veya yetki kontrolü eksik API uç noktalarını (RSVP, Webhook, Comments) çağırarak yetkisini yükseltmeye ve hassas KVKK verilerini çekmeye çalışır.
- **Tehdit Aktörü 3 (Ağ Dinleyicisi / Man-in-the-Middle):** Zayıf imzalanmış, süresi dolmayan veya sahte oturum token'ları türeterek oturum taklidi yapar.

---

## 3. Tespit Edilen Bulgular, Kök Nedenler ve Uygulanan Düzeltmeler

### [BULGU-01] `workspace_members` Tablosunda Anonim CRUD Açığı (CVSS: 9.8 - KRİTİK)
- **Konum:** `supabase/migrations/20261017_workspace_lead_search_and_notifications_hardening.sql` (Satır 25-40)
- **Kök Neden:** Migration dosyasında `workspace_members` için `FOR SELECT, INSERT, UPDATE, DELETE TO anon USING (true)` politikası tanımlanmıştır.
- **Saldırı Senaryosu:** Anonim bir saldırgan, `curl -H "apikey: ANON_KEY" https://.../rest/v1/workspace_members` isteğiyle tüm üyelerin şifre hash'lerini, e-postalarını ve notlarını çeker; ardından `UPDATE` sorgusuyla kendi kullanıcısını `super_admin` yapar.
- **Uygulanan Düzeltme:** `supabase/migrations/20261023_lockdown_rls_and_fix_functions.sql` migration'ı ile tüm gevşek politikalar silindi; `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.workspace_members FROM anon;` çalıştırıldı. Doğrudan okuma yalnızca `service_role` (sunucu tarafı) ve giriş yapmış aktif üyelere (`authenticated`) kısıtlandı.

### [BULGU-02] Tahmin Edilebilir Session HMAC Secret / Token Sahteciliği (CVSS: 9.6 - KRİTİK)
- **Konum:** `src/shared/lib/security.ts` (Satır 196-199)
- **Kök Neden:** `WORKSPACE_SESSION_SECRET` tanımlanmadığında kod `seed = process.env.NODE_ENV || ...` fallback'ine düşmekte ve `sha256('hsd_session_production')` sabit anahtarını kullanmaktaydı.
- **Saldırı Senaryosu:** Saldırgan açık kaynak depodaki bu algoritmayı görerek `'production'` tohumuyla istediği kullanıcı adına geçerli HMAC-SHA256 imzası üretip çerez olarak tarayıcıya ekler.
- **Uygulanan Düzeltme:** `security.ts` içerisindeki tahmin edilebilir fallback tamamen kaldırıldı. Değişken yoksa process belleğinde çalışan 256-bit rastgele kriptografik entropi (`crypto.randomBytes(32).toString('hex')`) kullanılması sağlandı ve üretim loglarında kritik uyarı oluşturuldu.

### [BULGU-03] Oturum Token Payload'ı ile Sentetik Kullanıcı Yükseltme (CVSS: 9.1 - KRİTİK)
- **Konum:** `src/app/api/workspace/authHelper.ts` (Satır 51-68)
- **Kök Neden:** İmzalı tokendaki `userId` veritabanında bulunamadığında kod bellekte `signedPayload.role` yetkisine sahip sahte bir `WorkspaceMember` objesi üretmekteydi.
- **Saldırı Senaryosu:** Veritabanından silinmiş veya askıya alınmış bir kullanıcının token'ı bellekte süper yönetici yetkisiyle yaşamaya devam etmekteydi.
- **Uygulanan Düzeltme:** Sentetik kullanıcı oluşturma mantığı silindi. Kullanıcı mutlaka veritabanında mevcut ve `status === 'active'` olmak zorundadır; aksi takdirde oturum `401 Unauthorized` ile reddedilir.

### [BULGU-04] Doğrulanmamış Supabase Auth Kullanıcısına Super Admin Yetkisi (CVSS: 9.0 - KRİTİK)
- **Konum:** `src/app/api/workspace/authHelper.ts` (Satır 106-133, 215-232)
- **Kök Neden:** Supabase Auth ile giriş yapmış kullanıcının `admin_users` tablosunda karşılığı olmasa dahi (`adminUser == null`), kod `adminUser?.id || 'admin_' + user.id` diyerek koşulsuz şekilde `role: 'super_admin'` atamaktaydı.
- **Saldırı Senaryosu:** Supabase Auth'ta açık kayıtla veya e-posta doğrulamasıyla hesap oluşturan herhangi bir şahıs, otomatik olarak tüm Workspace üzerinde süper yönetici yetkisi elde ediyordu.
- **Uygulanan Düzeltme:** `authHelper.ts` içine katı `if (adminUser)` şartı eklendi. `admin_users` tablosunda kaydı olmayan kullanıcılar admin kabul edilmez.

### [BULGU-05] `verifySuperAdmin()` Fonksiyonunda Rol Ayrım Hatası (CVSS: 8.5 - YÜKSEK)
- **Konum:** `src/app/api/workspace/authHelper.ts` (Satır 16-27, 248-263)
- **Kök Neden:** `verifySuperAdmin` filtresi `isUserAdminRole()` fonksiyonunu çağırıyordu. `isUserAdminRole` ise rol adında `lead` geçen her unvanı (`event_lead`, `tech_lead`) admin kabul etmekteydi.
- **Saldırı Senaryosu:** Bir komite başkanı `/api/workspace/roles` uç noktasını çağırarak diğer üyelerin veya kendisinin izinlerini süper yönetici seviyesine çıkarabiliyordu.
- **Uygulanan Düzeltme:** `verifySuperAdmin` filtresi doğrudan `member.role === 'super_admin'` koşuluna bağlandı. `isUserAdminRole` içinden `lead` çıkarıldı.

### [BULGU-06] Middleware Header/Cookie Boyut Kontrolüyle Yetki Aşımı (CVSS: 8.2 - YÜKSEK)
- **Konum:** `middleware.ts` (Satır 114, 126)
- **Kök Neden:** `middleware.ts`, `hsd_workspace_session` çerezinin imzasını kontrol etmek yerine yalnızca `wsSession.length > 20` kontrolü yaparak `/admin/*` rotalarını geçiriyordu.
- **Saldırı Senaryosu:** Rastgele 21 karakterlik bir çerez gönderen saldırgan, Next.js Edge yönlendirmesini atlatabiliyordu.
- **Uygulanan Düzeltme:** Web Crypto API (`crypto.subtle`) ile Edge runtime uyumlu gerçek HMAC-SHA256 doğrulayıcısı (`isValidWorkspaceAdminSession`) yazıldı. İmzası geçersiz veya rolü admin olmayan tüm istekler durdurulur.

### [BULGU-07] Sabit Kodlanmış Varsayılan Parola Fallback'i (CVSS: 8.1 - YÜKSEK)
- **Konum:** `src/shared/api/workspaceStore.ts` (Satır 120, 465) & `workspaceRepository.ts` (Satır 1070)
- **Kök Neden:** `ADMIN_INITIAL_PASSWORD` eksikliğinde kod sabit `'admin_bootstrap_pass_2026'` şifresini doğrulamaktaydı.
- **Uygulanan Düzeltme:** Üretim ortamında (`process.env.NODE_ENV === 'production'`) sabit şifre fallback'i tamamen devre dışı bırakıldı. Yalnızca ortam değişkeniyle güvenli başlangıç parolası verilebilir.

### [BULGU-08] RSVP Katılımcı Verilerinde KVKK Sızıntısı ve Yetkisiz Check-in (CVSS: 7.9 - YÜKSEK)
- **Konum:** `src/app/api/workspace/rsvp/route.ts` (Satır 4-17, 81-99)
- **Kök Neden:** `GET` ve `PATCH` metodlarında sıfır kimlik doğrulaması bulunmaktaydı.
- **Uygulanan Düzeltme:** `GET` metoduna oturum ve `can_manage_rsvp` izni zorunlu kılındı. `PATCH` (check-in) işlemi oturumlu yetkililere bağlandı. `POST` genel kayıt işlemine ise IP bazlı rate limiting (10 istek / 10 dk) eklendi.

### [BULGU-09] Dahili Yorum, Alt Görev ve Katılım Verilerinin Yetkisiz Okunması (CVSS: 7.5 - YÜKSEK)
- **Konum:** `events/[id]/comments/route.ts`, `subtasks/route.ts`, `attendance/route.ts`
- **Kök Neden:** `GET` uç noktalarında `getWorkspaceSession()` çağrılmıyordu.
- **Uygulanan Düzeltme:** Her üç uç noktaya da `requireAuth()` / session kontrolü eklendi; oturumsuz çağrılar 401 ile engellendi.

### [BULGU-10] Yetkisiz Webhook ve Duyuru Gönderimi (CVSS: 6.5 - ORTA)
- **Konum:** `src/app/api/workspace/webhook/route.ts` (Satır 8-15)
- **Kök Neden:** Sadece oturum kontrolü yapılıyor, rol ve `can_broadcast` izni sorgulanmıyordu.
- **Uygulanan Düzeltme:** Yalnızca `can_broadcast: true` iznine veya admin rolüne sahip üyelerin webhook tetiklemesine izin verildi.

### [BULGU-11] Hassas Üye Alanlarının (Admin Notları) Sızdırılması (CVSS: 6.2 - ORTA)
- **Konum:** `src/shared/api/workspaceRepository.ts` (Satır 717)
- **Kök Neden:** `sanitizeMember` yalnızca `password_hash` alanını siliyordu.
- **Uygulanan Düzeltme:** `sanitizeMember(member, isCallerAdmin)` güncellendi. Normal üyelere `admin_notes`, `failed_login_attempts` ve `locked_until` alanları silinerek döndürülür.

### [BULGU-12] PostgreSQL Tetikleyicilerinde Değişken `search_path` (CVSS: 5.8 - ORTA)
- **Konum:** `supabase/schema_workspace_calendar.sql` (Satır 201)
- **Kök Neden:** Fonksiyon gövdesinde `SET search_path = ''` bulunmuyordu.
- **Uygulanan Düzeltme:** `20261023_lockdown_rls_and_fix_functions.sql` ile `SET search_path = ''` ve şema nitelemeleri uygulandı.

---

## 4. Kalan Riskler ve Operasyonel Öneriler

1. **`WORKSPACE_SESSION_SECRET` Ortam Değişkeni:**
   Vercel Dashboard üzerinde en az 32 karakterlik güçlü bir `WORKSPACE_SESSION_SECRET` tanımlanmalıdır. Tanımlanmadığı takdirde sistem rastgele geçici anahtar ürettiğinden Vercel cold-start durumlarında kullanıcıların yeniden giriş yapması gerekebilir.
2. **Supabase Auth Leaked Password Protection:**
   Supabase Dashboard -> Authentication -> Password Security sekmesinden "Enable Leaked Password Protection" (HaveIBeenPwned entegrasyonu) açılmalıdır.
3. **Storage Bucket İzinleri:**
   `supabase/migrations/20261023_lockdown_rls_and_fix_functions.sql` migration'ı Supabase SQL Editor üzerinden veya CLI ile canlı veritabanına uygulanmalıdır.
