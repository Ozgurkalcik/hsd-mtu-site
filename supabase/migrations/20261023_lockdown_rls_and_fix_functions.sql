-- ==============================================================================
-- Migration: 20261023_lockdown_rls_and_fix_functions.sql
-- Başlık: Supabase RLS Tam Sıkılaştırma, Tablo/Sütun Yetki İzolasyonu ve search_path Sertleştirmesi
-- Standart: İdempotent (Tekrar tekrar güvenle çalıştırılabilir)
-- Güvenlik Seviyesi: Üretim Standardı En Az Yetki (Principle of Least Privilege)
-- ==============================================================================

-- ==============================================================================
-- 1. workspace_members Tablosu — Tam İzolasyon (Yalnızca service_role)
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 1.1. Eski açık politikaları temizle
DROP POLICY IF EXISTS "Allow members read access" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow workspace members update group_id" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow workspace members update all" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow workspace members insert all" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow workspace members delete all" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow authenticated read workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow authenticated read workspace members directory" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow service_role full access on workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow full access for service_role" ON public.workspace_members;

-- 1.2. Service role tam erişim (Next.js Server API katmanı için)
CREATE POLICY "Allow service_role full access on workspace_members"
    ON public.workspace_members
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 1.3. Doğrudan PostgREST istemci erişimini tamamen iptal et (password_hash, admin_notes sızıntı koruması)
REVOKE ALL ON public.workspace_members FROM anon;
REVOKE ALL ON public.workspace_members FROM authenticated;


-- ==============================================================================
-- 2. workspace_events Tablosu — Dinamik Politika Temizliği ve Tam İzolasyon
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_events ENABLE ROW LEVEL SECURITY;

-- 2.1. Dinamik Politika Temizliği: Geçmiş migration'lardan kalan TÜM politikaları sıfırla
-- (PostgreSQL RLS permissive OR kuralı nedeniyle eski bir politikanın bile kalması veri sızıntısına yol açabilir)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'workspace_events' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_events', pol.policyname);
    END LOOP;
END $$;

-- 2.2. Bilinen tarihsel politikaların açık DROP listesi (Ek güvenlik garantisi)
DROP POLICY IF EXISTS "Allow workspace events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events insert access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events update access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events delete access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow public events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow private events authenticated read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow authenticated events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow full access for service_role on events" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow service_role full access on events" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow public read access to public events" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow authenticated read internal events" ON public.workspace_events;

-- 2.3. Service role tam erişim (Next.js Server API katmanı için)
CREATE POLICY "Allow service_role full access on events"
    ON public.workspace_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2.4. Halka açık vitrin etkinlikleri anonim ve oturumlu PostgREST istemcilerince okunabilir
-- NOT: NULL değerleri varsayılan olarak halka açık kabul EDİLMEZ. Yalnızca açıkça 'public' olanlar okunabilir.
CREATE POLICY "Allow public read access to public events"
    ON public.workspace_events
    FOR SELECT
    TO anon, authenticated
    USING (visibility = 'public');

-- 2.5. PostgREST üzerinden doğrudan yazma/silme/truncate yetkileri tamamen iptal edilir.
-- SELECT yetkisi yalnızca açıkça halka açık etkinlik politikası ile sınırlandırılmıştır.
REVOKE ALL ON public.workspace_events FROM anon;
REVOKE ALL ON public.workspace_events FROM authenticated;
GRANT SELECT ON public.workspace_events TO anon;
GRANT SELECT ON public.workspace_events TO authenticated;


-- ==============================================================================
-- 3. workspace_event_attendees (RSVP & KVKK) Tablosu
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read attendees" ON public.workspace_event_attendees;
DROP POLICY IF EXISTS "Allow public attendees read access" ON public.workspace_event_attendees;
DROP POLICY IF EXISTS "Allow public attendees insert" ON public.workspace_event_attendees;
DROP POLICY IF EXISTS "Allow full access for service_role on attendees" ON public.workspace_event_attendees;
DROP POLICY IF EXISTS "Allow service_role full access on attendees" ON public.workspace_event_attendees;

CREATE POLICY "Allow service_role full access on attendees"
    ON public.workspace_event_attendees
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Katılımcı verileri doğrudan PostgREST üzerinden çekilemez; Next.js Server API zorunludur
REVOKE ALL ON public.workspace_event_attendees FROM anon;
REVOKE ALL ON public.workspace_event_attendees FROM authenticated;


-- ==============================================================================
-- 4. workspace_event_comments ve workspace_event_subtasks Tabloları
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_event_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace comments read access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments insert access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments update access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments delete access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow full access for service_role on comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow service_role full access on comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow authenticated read comments" ON public.workspace_event_comments;

DROP POLICY IF EXISTS "Allow workspace subtasks read access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks insert access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks update access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks delete access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow full access for service_role on subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow service_role full access on subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow authenticated read subtasks" ON public.workspace_event_subtasks;

CREATE POLICY "Allow service_role full access on comments"
    ON public.workspace_event_comments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on subtasks"
    ON public.workspace_event_subtasks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Yorumlar ve alt görevler doğrudan PostgREST üzerinden erişilemez; Next.js Server API zorunludur
REVOKE ALL ON public.workspace_event_comments FROM anon;
REVOKE ALL ON public.workspace_event_comments FROM authenticated;
REVOKE ALL ON public.workspace_event_subtasks FROM anon;
REVOKE ALL ON public.workspace_event_subtasks FROM authenticated;


-- ==============================================================================
-- 5. workspace_groups (Komiteler ve Çalışma Grupları) — Doğrudan PostgREST Kapatma
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_groups ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'workspace_groups' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_groups', pol.policyname);
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Allow groups read access" ON public.workspace_groups;
DROP POLICY IF EXISTS "Allow workspace groups update access" ON public.workspace_groups;
DROP POLICY IF EXISTS "Allow full access for service_role on groups" ON public.workspace_groups;
DROP POLICY IF EXISTS "Allow service_role full access on workspace_groups" ON public.workspace_groups;
DROP POLICY IF EXISTS "Allow public read access to groups" ON public.workspace_groups;

CREATE POLICY "Allow service_role full access on workspace_groups"
    ON public.workspace_groups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Doğrudan PostgREST istemci erişimini tamamen iptal et (members listesi sızıntı koruması, Next.js API zorunludur)
REVOKE ALL ON public.workspace_groups FROM anon;
REVOKE ALL ON public.workspace_groups FROM authenticated;


-- ==============================================================================
-- 6. workspace_settings & workspace_security_settings Tabloları — PostgREST İzolasyonu
-- ==============================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_settings') THEN
        ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'workspace_settings' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_settings', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "Allow workspace settings read" ON public.workspace_settings;
        DROP POLICY IF EXISTS "Allow workspace settings update" ON public.workspace_settings;
        DROP POLICY IF EXISTS "Allow workspace settings insert" ON public.workspace_settings;
        DROP POLICY IF EXISTS "Allow service_role full access on workspace_settings" ON public.workspace_settings;
        DROP POLICY IF EXISTS "Allow authenticated read workspace settings" ON public.workspace_settings;

        CREATE POLICY "Allow service_role full access on workspace_settings"
            ON public.workspace_settings
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        REVOKE ALL ON public.workspace_settings FROM anon;
        REVOKE ALL ON public.workspace_settings FROM authenticated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_security_settings') THEN
        ALTER TABLE public.workspace_security_settings ENABLE ROW LEVEL SECURITY;

        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'workspace_security_settings' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_security_settings', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "Allow full access for service_role on security" ON public.workspace_security_settings;
        DROP POLICY IF EXISTS "Allow service_role full access on security" ON public.workspace_security_settings;

        CREATE POLICY "Allow service_role full access on security"
            ON public.workspace_security_settings
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        REVOKE ALL ON public.workspace_security_settings FROM anon;
        REVOKE ALL ON public.workspace_security_settings FROM authenticated;
    END IF;
END $$;


-- ==============================================================================
-- 7. popup_settings (Ana Sayfa Açılır Duyuru Modalı) — P0 Lockdown
-- ==============================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'popup_settings') THEN
        ALTER TABLE public.popup_settings ENABLE ROW LEVEL SECURITY;

        -- Dinamik temizlik: popup_settings_auth_write dahil TÜM eski/artık politikaları sıfırla
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'popup_settings' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.popup_settings', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "popup_settings_auth_write" ON public.popup_settings;
        DROP POLICY IF EXISTS "Allow public read popup_settings" ON public.popup_settings;
        DROP POLICY IF EXISTS "Allow service_role full access on popup_settings" ON public.popup_settings;
        DROP POLICY IF EXISTS "Allow admin users update popup_settings" ON public.popup_settings;
        DROP POLICY IF EXISTS "Allow admin users insert popup_settings" ON public.popup_settings;

        -- SitePopup.tsx bileşeni için genel okuma
        CREATE POLICY "Allow public read popup_settings"
            ON public.popup_settings
            FOR SELECT
            TO anon, authenticated
            USING (true);

        -- Next.js Server API için tam erişim
        CREATE POLICY "Allow service_role full access on popup_settings"
            ON public.popup_settings
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        -- Admin panelinde (/admin/popup) oturum açmış yetkili yöneticiler (admin_users) güncelleyebilir
        CREATE POLICY "Allow admin users update popup_settings"
            ON public.popup_settings
            FOR UPDATE
            TO authenticated
            USING (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()))
            WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()));

        CREATE POLICY "Allow admin users insert popup_settings"
            ON public.popup_settings
            FOR INSERT
            TO authenticated
            WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()));

        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.popup_settings FROM anon;
        REVOKE DELETE, TRUNCATE ON public.popup_settings FROM authenticated;
    END IF;
END $$;


-- ==============================================================================
-- 8. community_projects (Açık Kaynak Projeler Vitrini)
-- ==============================================================================
ALTER TABLE IF EXISTS public.community_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public projects read access" ON public.community_projects;
DROP POLICY IF EXISTS "Allow projects insert access" ON public.community_projects;
DROP POLICY IF EXISTS "Allow projects update access" ON public.community_projects;
DROP POLICY IF EXISTS "Allow service_role full access on community_projects" ON public.community_projects;
DROP POLICY IF EXISTS "Allow public read active community projects" ON public.community_projects;

CREATE POLICY "Allow service_role full access on community_projects"
    ON public.community_projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read active community projects"
    ON public.community_projects
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.community_projects FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.community_projects FROM authenticated;


-- ==============================================================================
-- 9. admin_users (Eski Panel Yönetici Tablosu)
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
        ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow authenticated read own admin_users" ON public.admin_users;
        DROP POLICY IF EXISTS "Allow service_role full access on admin_users" ON public.admin_users;

        -- Her admin yalnızca kendi satırını okuyabilir
        CREATE POLICY "Allow authenticated read own admin_users"
            ON public.admin_users
            FOR SELECT
            TO authenticated
            USING (auth_id = auth.uid());

        CREATE POLICY "Allow service_role full access on admin_users"
            ON public.admin_users
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        REVOKE ALL ON public.admin_users FROM anon;
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_users FROM authenticated;
    END IF;
END $$;


-- ==============================================================================
-- 10. workspace_notifications & workspace_notification_reads Tabloları
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace notifications insert access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow workspace notifications update access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow workspace notifications delete access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow service_role full access on notifications" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow service_role full access on notification_reads" ON public.workspace_notification_reads;
DROP POLICY IF EXISTS "Allow authenticated read notifications" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow user isolated notifications read access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow user isolated notification reads select" ON public.workspace_notification_reads;
DROP POLICY IF EXISTS "Allow user isolated notification reads insert" ON public.workspace_notification_reads;

CREATE POLICY "Allow service_role full access on notifications"
    ON public.workspace_notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on notification_reads"
    ON public.workspace_notification_reads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Bildirimler ve okundu kayıtları doğrudan PostgREST üzerinden erişilemez; Next.js Server API zorunludur
REVOKE ALL ON public.workspace_notifications FROM anon;
REVOKE ALL ON public.workspace_notifications FROM authenticated;
REVOKE ALL ON public.workspace_notification_reads FROM anon;
REVOKE ALL ON public.workspace_notification_reads FROM authenticated;


-- ==============================================================================
-- 10.1. workspace_active_sessions ve workspace_event_files Tabloları — Tam Tecrit (P1)
-- ==============================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_active_sessions') THEN
        ALTER TABLE public.workspace_active_sessions ENABLE ROW LEVEL SECURITY;

        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'workspace_active_sessions' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_active_sessions', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "Allow full access for service_role on sessions" ON public.workspace_active_sessions;

        CREATE POLICY "Allow service_role full access on workspace_active_sessions"
            ON public.workspace_active_sessions
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        REVOKE ALL ON public.workspace_active_sessions FROM anon;
        REVOKE ALL ON public.workspace_active_sessions FROM authenticated;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_event_files') THEN
        ALTER TABLE public.workspace_event_files ENABLE ROW LEVEL SECURITY;

        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'workspace_event_files' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspace_event_files', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "Allow files read access" ON public.workspace_event_files;
        DROP POLICY IF EXISTS "Allow authenticated read workspace files metadata" ON public.workspace_event_files;
        DROP POLICY IF EXISTS "Allow full access for service_role on files" ON public.workspace_event_files;

        CREATE POLICY "Allow service_role full access on workspace_event_files"
            ON public.workspace_event_files
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        REVOKE ALL ON public.workspace_event_files FROM anon;
        REVOKE ALL ON public.workspace_event_files FROM authenticated;
    END IF;
END $$;


-- ==============================================================================
-- 11. PostgreSQL Tetikleyici Fonksiyonları search_path Sertleştirmesi
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_workspace_event_updated()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.clock_timestamp();
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE proname = 'update_updated_at_column' AND nspname = 'public'
    ) THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER 
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = ''''
        AS $f$
        BEGIN
            NEW.updated_at = pg_catalog.clock_timestamp();
            RETURN NEW;
        END;
        $f$;';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE proname = 'handle_updated_at' AND nspname = 'public'
    ) THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER 
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = ''''
        AS $f$
        BEGIN
            NEW.updated_at = pg_catalog.clock_timestamp();
            RETURN NEW;
        END;
        $f$;';
    END IF;
END $$;


-- ==============================================================================
-- 12. Storage (Depolama) Erişim Politikaları — uploads & workspace-files (P1)
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        -- Bilinen tüm eski/gevşek depolama politikalarını temizle
        DROP POLICY IF EXISTS "Public uploads access" ON storage.objects;
        DROP POLICY IF EXISTS "Allow public read on uploads bucket" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated upload uploads" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated update uploads" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated delete uploads" ON storage.objects;
        DROP POLICY IF EXISTS "Allow admin users manage uploads" ON storage.objects;
        DROP POLICY IF EXISTS "Allow service_role full uploads" ON storage.objects;

        DROP POLICY IF EXISTS "Public workspace-files access" ON storage.objects;
        DROP POLICY IF EXISTS "Allow service_role on workspace-files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated read workspace files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow authenticated upload workspace files" ON storage.objects;
        DROP POLICY IF EXISTS "Allow service_role full storage access" ON storage.objects;

        -- 12.1 uploads bucket: Herkes okuyabilir (galeri, logolar), fakat yükleme/silme yalnızca admin veya service_role
        CREATE POLICY "Allow public read on uploads bucket"
            ON storage.objects
            FOR SELECT
            TO anon, authenticated
            USING (bucket_id = 'uploads');

        CREATE POLICY "Allow admin users manage uploads"
            ON storage.objects
            FOR ALL
            TO authenticated
            USING (bucket_id = 'uploads' AND EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()))
            WITH CHECK (bucket_id = 'uploads' AND EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()));

        CREATE POLICY "Allow service_role full uploads"
            ON storage.objects
            FOR ALL
            TO service_role
            USING (bucket_id = 'uploads')
            WITH CHECK (bucket_id = 'uploads');

        -- 12.2 workspace-files bucket: ÖZEL BUCKET (Private). anon ve authenticated doğrudan erişemez!
        -- Dosyalar yalnızca Next.js API Route /api/workspace/files/download/[token] üzerinden service_role ile indirilir.
        CREATE POLICY "Allow service_role on workspace-files"
            ON storage.objects
            FOR ALL
            TO service_role
            USING (bucket_id = 'workspace-files')
            WITH CHECK (bucket_id = 'workspace-files');
    END IF;
END $$;


-- ==============================================================================
-- 13. contact_emails ve custom_pages — Admin Yetki Doğrulaması (P0)
-- ==============================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- 13.1 contact_emails: İletişim Formu E-posta Hedefleri (Kritik Admin Tablosu)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_emails') THEN
        ALTER TABLE public.contact_emails ENABLE ROW LEVEL SECURITY;

        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'contact_emails' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.contact_emails', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "Allow contact emails read" ON public.contact_emails;
        DROP POLICY IF EXISTS "Allow contact emails write" ON public.contact_emails;
        DROP POLICY IF EXISTS "Allow authenticated read contact_emails" ON public.contact_emails;
        DROP POLICY IF EXISTS "Allow authenticated manage contact_emails" ON public.contact_emails;

        CREATE POLICY "Allow service_role full access on contact_emails"
            ON public.contact_emails
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        -- Yalnızca admin_users tablosundaki doğrulanmış panel yöneticileri yönetebilir
        CREATE POLICY "Allow admin users manage contact_emails"
            ON public.contact_emails
            FOR ALL
            TO authenticated
            USING (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()))
            WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()));

        REVOKE ALL ON public.contact_emails FROM anon;
    END IF;

    -- 13.2 custom_pages: Dinamik Sayfalar (Kritik Admin Tablosu - XSS / Defacement Koruması)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_pages') THEN
        ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;

        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'custom_pages' AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.custom_pages', pol.policyname);
        END LOOP;

        DROP POLICY IF EXISTS "Allow custom pages read" ON public.custom_pages;
        DROP POLICY IF EXISTS "Allow custom pages write" ON public.custom_pages;
        DROP POLICY IF EXISTS "Allow authenticated manage custom_pages" ON public.custom_pages;

        -- Ziyaretçiler yalnızca yayında olan sayfaları okuyabilir
        CREATE POLICY "Allow public read active custom_pages"
            ON public.custom_pages
            FOR SELECT
            TO anon, authenticated
            USING (is_active = true);

        CREATE POLICY "Allow service_role full access on custom_pages"
            ON public.custom_pages
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);

        -- Yalnızca admin_users tablosundaki doğrulanmış panel yöneticileri sayfa ekleyebilir, güncelleyebilir veya silebilir
        CREATE POLICY "Allow admin users manage custom_pages"
            ON public.custom_pages
            FOR ALL
            TO authenticated
            USING (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()))
            WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE auth_id = auth.uid()));

        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.custom_pages FROM anon;
    END IF;
END $$;
