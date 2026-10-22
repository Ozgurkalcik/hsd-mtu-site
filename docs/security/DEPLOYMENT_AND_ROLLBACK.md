# HSD MTÜ — Dağıtım ve Geri Dönüş Kılavuzu (Deployment & Rollback Guide)

**Hedef Sistem:** Supabase PostgreSQL & Vercel Dağıtımı  
**Tarih:** 23 Ekim 2026  
**Versiyon:** 2.2.0  
**Güvenlik Seviyesi:** Üretim Seviyesi Sıfır Güven (Production Zero-Trust Least Privilege)

---

## 1. Dağıtım Ön Koşulları (Pre-Deployment Checklist)

Üretime almadan önce aşağıdaki gereksinimlerin hazır olduğundan emin olun:
1. Supabase Proje Dashboard erişimi (SQL Editor ve Project Settings).
2. Vercel Dashboard proje ortam değişkenleri (Environment Variables) erişimi.
3. Git deposunun ilgili sürüm dalında olması ve yerel testlerin geçmiş olması.

---

## 2. Dağıtım Öncesi Güvenlik Yedeği (Pre-Migration Policy Snapshot)

Migration dosyasını canlı veritabanında çalıştırmadan önce, mevcut RLS politikalarının ve izinlerin anlık durumunu SQL Editor üzerinden sorgulayıp bir metin dosyasına kaydedin:

```sql
-- 1. Mevcut tüm RLS politikalarını yedekle
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename, policyname;

-- 2. Mevcut tablo yetkilerini (Grants) yedekle
SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee;
```

---

## 3. Migration Öncesi ve Sonrası Beklenen RLS Politikaları Matrisi

| Tablo Adı | Migration Öncesi Durum | Migration Sonrası Hedef Durum | Kapatılan Risk |
|:---|:---|:---|:---|
| `workspace_members` | Anon/Auth için geniş veya parçalı okuma politikaları | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | `password_hash`, `admin_notes` ve kilit sayaçlarının PostgREST sızıntısı tamamen engellendi. |
| `workspace_events` | `authenticated USING (true)` ve `visibility IS NULL` | **Dinamik DO döngüsüyle tüm eski politikalar silinir.** Yalnızca `service_role (ALL)` ve `anon, authenticated` için `visibility = 'public'` bırakılır. | Gizli, yönetim ve komite etkinliklerinin doğrudan PostgREST üzerinden okunması engellendi. |
| `workspace_event_comments` | `authenticated USING (true)` | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | Gizli toplantı yorumlarının PostgREST scraping ile çalınması engellendi. |
| `workspace_event_subtasks` | `authenticated USING (true)` | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | İç görevlerin ve atananların PostgREST'ten okunması engellendi. |
| `workspace_notifications` | `authenticated USING (true)` | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | Üyelere özel kişisel bildirimlerin ve disiplin notlarının okunması engellendi. |
| `workspace_notification_reads` | Parçalı politikalar | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | Kullanıcı okundu aktivite izlerinin sızması engellendi. |
| `workspace_groups` | 20261017'den kalan anonim UPDATE yetkisi ve public read | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | Komite üye ID dizilerinin (`members` jsonb) doğrudan PostgREST ile çekilmesi engellendi. |
| `workspace_settings` | `authenticated` için doğrudan okuma | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | Ayarlar `/api/workspace/settings` Route Handler'ı ile filtrelenerek sunulur. |
| `workspace_security_settings` | Parçalı politikalar | **Yalnızca `service_role`** (`REVOKE ALL FROM anon, authenticated`) | Parola kuralları ve sistem sınırları sunucuya izole edildi. |
| `popup_settings` | Anonim yazma riski | `anon, authenticated SELECT (USING true)`; `authenticated UPDATE/INSERT` (`EXISTS admin_users`) | Genel modal okuması korunurken, yetkisiz yazma/silme engellendi. |
| `community_projects` | Açık yazma riski | `anon, authenticated SELECT (is_active = true)`; yazma yalnızca `service_role` | Vitrin projeleri güvenli biçimde sunulur. |
| `admin_users` | Eski anonim okuma açığı | Yalnızca `service_role` ve `authenticated (auth_id = auth.uid())` | Yöneticiler yalnızca kendi satırını okuyabilir, birbirlerini göremez. |

---

## 4. Dağıtım Adımları (Step-by-Step Deployment Plan)

### Adım 1: Vercel Ortam Değişkenlerinin Tanımlanması
Vercel Dashboard -> Project Settings -> Environment Variables bölümünde aşağıdaki değişkenleri doğrulayın veya ekleyin:

| Değişken Adı | Minimum Gereksinim | Açıklama |
|:---|:---|:---|
| `WORKSPACE_SESSION_SECRET` | 32+ karakter rastgele dize | HMAC-SHA256 oturum tokenlarını imzalamak için kullanılır. (Örnek: `openssl rand -hex 32`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` gizli anahtarı | Next.js Server API katmanının güvenli sorgu yapmasını sağlar. İstemciye asla sızdırılmaz. |
| `ADMIN_INITIAL_PASSWORD` | Güçlü parola (12+ karakter) | İlk kurulumdaki varsayılan süper admin parolasını belirler. |

> [!IMPORTANT]
> `WORKSPACE_SESSION_SECRET` ilk kez tanımlandığında veya değiştirildiğinde mevcut aktif oturum çerezleri geçersiz kalacaktır. Kullanıcılar bir defaya mahsus parolasını girerek yeni HMAC imzalı oturum açacaktır.

---

### Adım 2: Supabase SQL Migration'ının Uygulanması
1. Supabase Dashboard -> **SQL Editor** bölümünü açın.
2. `supabase/migrations/20261023_lockdown_rls_and_fix_functions.sql` dosyasının içeriğini yapıştırın.
3. **Run** butonuna basarak çalıştırın.
4. Başarı mesajını ("Success. No rows returned") doğrulayın.

---

### Adım 3: Supabase Dashboard Ayarlarının Sertleştirilmesi
1. **Leaked Password Protection:**
   - Supabase Dashboard -> **Authentication** -> **Password Security** sekmesine gidin.
   - **"Enable Leaked Password Protection"** seçeneğini aktif edin ve kaydedin.
2. **PostgREST RLS Denetimi:**
   - Supabase Dashboard -> **Database** -> **Tables** sekmesine gidin.
   - Listedeki tüm workspace tablolarında **RLS: Enabled** olduğunu doğrulayın.

---

### Adım 4: Vercel Dağıtımı (Production Deployment)
1. Kod değişikliklerini sürüm dalına push edin:
   ```bash
   git add .
   git commit -m "fix(security): complete rls lockdown, strict rbac, and member allowlist serialization"
   git push origin <branch_name>
   ```
2. Vercel Dashboard üzerinde derlemenin (Build) başarıyla tamamlandığını doğrulayın (`40/40 routes generated`).

---

## 5. Dağıtım Sonrası Doğrulama Testleri (Post-Deployment Smoke Tests)

1. **Üye Tablosu Doğrudan İstemci Engeli Testi:**
   ```bash
   curl -i -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" \
        "https://<SUPABASE_PROJECT_REF>.supabase.co/rest/v1/workspace_members?select=*"
   ```
   **Beklenen Sonuç:** `HTTP 401 Unauthorized` veya `HTTP 403 Forbidden` (`permission denied for table workspace_members`).

2. **Dahili Etkinliklerin PostgREST'ten Okunamadığı Testi:**
   ```bash
   curl -i -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" \
        "https://<SUPABASE_PROJECT_REF>.supabase.co/rest/v1/workspace_events?visibility=neq.public"
   ```
   **Beklenen Sonuç:** `HTTP 200 []` (Boş dizi; hiçbir dahili, private veya admin_only etkinlik dönmemeli).

3. **Bildirimlerin ve Grupların PostgREST'ten Okunamadığı Testi:**
   ```bash
   curl -i -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" \
        "https://<SUPABASE_PROJECT_REF>.supabase.co/rest/v1/workspace_notifications"
   curl -i -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" \
        "https://<SUPABASE_PROJECT_REF>.supabase.co/rest/v1/workspace_groups"
   ```
   **Beklenen Sonuç:** `HTTP 401` veya `HTTP 403` (`permission denied`).

4. **Web Sitesi Genel Arayüz Testleri:**
   - `https://hsdmtu.vercel.app/` (Açılır duyuru popup modalı açılmalı, vitrin etkinlikleri listelenmeli).
   - `https://hsdmtu.vercel.app/ekip` (Ekip üyeleri doğru listelenmeli).
   - `https://hsdmtu.vercel.app/workspace` (Giriş formu ve takvim arayüzü hatasız açılmalı).

---

## 6. Güvenli Geri Dönüş (Rollback) Planı

> [!CAUTION]
> **ÖNEMLİ DOĞRULAMA UYARISI:** Aşağıdaki geri dönüş SQL betikleri sözdizimsel olarak doğrulanmış olmakla birlikte, canlı üretim veritabanında test **EDİLMEMİŞTİR**. Acil geri dönüş senaryosunda adımların sırasına ve doğrulamalara harfiyen uyulmalıdır.

Uygulama rollback'i ile veritabanı rollback'i birbirinden **bağımsız** prosedürlerdir:

### 6.1. Kapsam ve Veri Korunumu Bildirimi
- Bu migration yalnızca DDL izinlerini (`GRANT`/`REVOKE`) ve RLS politikalarını (`POLICY`) düzenlemektedir.
- Tablo şemasında hiçbir kolon silinmemiştir; hiçbir satır silinmemiş veya değiştirilmemiştir.
- Dolayısıyla geri dönüş işlemi **veri kaybına yol açmaz**, yalnızca RLS erişim kurallarını operasyonel acil durum moduna getirir.

### 6.2. Uygulama Rollback'i (Vercel Instant Rollback)
Eğer sorun API katmanında veya arayüzde meydana gelirse:
1. Vercel Dashboard -> **Deployments** sekmesine gidin.
2. Bu dağıtımdan bir önceki kararlı dağıtımı bulun.
3. Menüden **"Instant Rollback"** (veya **"Promote to Production"**) seçeneğine tıklayın.
4. Sistem 10 saniye içinde önceki koda dönecektir.

> [!NOTE]
> **Oturum Anahtarı (WORKSPACE_SESSION_SECRET) Uyumluluk Analizi:**
> Eski uygulama sürümüne geri dönülse bile Vercel'deki `WORKSPACE_SESSION_SECRET` değişkeninin **silinmesi gerekmez**. Eski uygulama kodu `process.env.WORKSPACE_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY` sırasıyla çalıştığı için, tanımlı anahtarla sorunsuz çalışmaya devam eder.

### 6.3. Veritabanı RLS Politikalarının Güvenli Geri Alınması
Eğer Next.js API katmanı veya web sitesi bileşenleri veritabanı yetkisi nedeniyle veri okuyamazsa, Supabase SQL Editor üzerinden aşağıdaki **güvenli** geri alma betiğini çalıştırın.

> [!WARNING]
> **ASLA YAPILMAMASI GEREKENLER:**
> - `public.workspace_members` tablosuna `GRANT SELECT ... TO anon, authenticated` komutu **VERİLMEMELİDİR**. Bu durum `password_hash`, `admin_notes` ve kilit sayaçlarını anında tüm internete ifşa eder!
> - `workspace_events` tablosunda `USING (true)` açılmamalıdır; sadece `visibility = 'public'` korunmalıdır.
> - Asla `DROP TABLE` veya `TRUNCATE` çalıştırılmamalıdır.

```sql
-- ==============================================================================
-- ACİL GÜVENLİ VERİTABANI ROLLBACK BETİĞİ (SAFE DATABASE ROLLBACK SCRIPT)
-- ==============================================================================

-- 1. workspace_events: Halka açık etkinlik okuma politikasını koru, dahili etkinlikleri PostgREST'e açma
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to public events" ON public.workspace_events;
CREATE POLICY "Allow public read access to public events" ON public.workspace_events
    FOR SELECT TO anon, authenticated
    USING (visibility = 'public');

GRANT SELECT ON public.workspace_events TO anon, authenticated;

-- 2. workspace_groups: Genel web sitesi komite listesi okumasını geçici olarak aç
ALTER TABLE public.workspace_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to groups" ON public.workspace_groups;
CREATE POLICY "Allow public read access to groups" ON public.workspace_groups
    FOR SELECT TO anon, authenticated
    USING (true);

GRANT SELECT ON public.workspace_groups TO anon, authenticated;

-- 3. popup_settings: Ana sayfa popup bileşeni okumasını açık tut
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'popup_settings') THEN
        ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read popup_settings" ON public.popup_settings;
        CREATE POLICY "Allow public read popup_settings" ON public.popup_settings
            FOR SELECT TO anon, authenticated
            USING (true);
        GRANT SELECT ON public.popup_settings TO anon, authenticated;
    END IF;
END $$;

-- 4. community_projects: Vitrin projeleri okumasını açık tut
ALTER TABLE public.community_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read active community projects" ON public.community_projects;
CREATE POLICY "Allow public read active community projects" ON public.community_projects
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

GRANT SELECT ON public.community_projects TO anon, authenticated;

-- 5. Service role tam erişimlerinin korunduğundan emin ol
CREATE POLICY "Allow service_role full access on workspace_members" ON public.workspace_members
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on events" ON public.workspace_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on attendees" ON public.workspace_event_attendees
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on comments" ON public.workspace_event_comments
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on subtasks" ON public.workspace_event_subtasks
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on notifications" ON public.workspace_notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access on notification_reads" ON public.workspace_notification_reads
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 6.4. Geri Dönüş Sonrası Doğrulama Adımları
1. `curl -I https://hsdmtu.vercel.app/` -> HTTP 200 dönmeli.
2. `curl -I https://hsdmtu.vercel.app/ekip` -> HTTP 200 dönmeli.
3. PostgREST `workspace_members` anonim sorgusunun hala 401/403 döndüğünü doğrulayın (`password_hash` sızıntısı olmamalı).
