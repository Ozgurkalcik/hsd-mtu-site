-- ==============================================================================
-- Migration: 20261010_tighten_workspace_rls.sql
-- Tanım: HSD MTÜ Workspace RLS Güvenlik Sıkılaştırması (Least Privilege)
-- Güvenlik Notu: Bu migration YIKICI DEĞİLDİR (Non-destructive).
-- Hiçbir tabloyu veya veriyi silmez. Yalnızca aşırı izinli politikaları kaldırıp
-- en az ayrıcalık ilkesine uygun güvenli kurallarla günceller.
-- ==============================================================================

-- 1. Eski Aşırı İzinli Okuma Politikalarını Kaldır (Idempotent)
DROP POLICY IF EXISTS "Allow members read access" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow calendars read access" ON public.workspace_calendars;
DROP POLICY IF EXISTS "Allow groups read access" ON public.workspace_groups;
DROP POLICY IF EXISTS "Allow events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow subtasks read access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow comments read access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow files read access" ON public.workspace_event_files;
DROP POLICY IF EXISTS "Allow notifications read access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow permissions read access" ON public.workspace_role_permissions;
DROP POLICY IF EXISTS "Allow security settings read access" ON public.workspace_security_settings;
DROP POLICY IF EXISTS "Allow members read their notification status" ON public.workspace_notification_reads;
DROP POLICY IF EXISTS "Allow members insert their notification read status" ON public.workspace_notification_reads;

-- Storage eski politikalarını kaldır
DROP POLICY IF EXISTS "Allow authenticated read workspace files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload workspace files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service_role full storage access" ON storage.objects;

-- ==============================================================================
-- 2. Sıkılaştırılmış ve İzolasyonlu Yeni RLS Politikaları
-- ==============================================================================

-- 2.1 Takvimler (Public vs Private İzolasyonu)
-- Kamuya açık (is_private = false) takvimleri herkes (anon + auth) okuyabilir.
CREATE POLICY "Allow public calendars read access" ON public.workspace_calendars
    FOR SELECT TO authenticated, anon
    USING (is_private = false);

-- Özel takvimleri yalnızca oturumlu üyeler okuyabilir
CREATE POLICY "Allow private calendars authenticated read access" ON public.workspace_calendars
    FOR SELECT TO authenticated
    USING (is_private = true);

-- 2.2 Etkinlikler (Public Takvim İzolasyonu)
-- Kamuya açık takvimlerdeki etkinlikler anonim ve oturumlu herkes tarafından okunabilir
CREATE POLICY "Allow public events read access" ON public.workspace_events
    FOR SELECT TO authenticated, anon
    USING (
        calendar_id IN (
            SELECT id FROM public.workspace_calendars WHERE is_private = false
        )
    );

-- Özel takvimlerdeki etkinlikler yalnızca oturumlu kullanıcılar tarafından okunabilir
CREATE POLICY "Allow private events authenticated read access" ON public.workspace_events
    FOR SELECT TO authenticated
    USING (
        calendar_id IN (
            SELECT id FROM public.workspace_calendars WHERE is_private = true
        )
    );

-- 2.3 Komiteler / Gruplar
-- Komite isimleri ve renkleri kamu takviminde filtreleme için herkese açıktır
CREATE POLICY "Allow groups read access" ON public.workspace_groups
    FOR SELECT TO authenticated, anon
    USING (true);

-- 2.4 Alt Görevler & Yorumlar
-- Kamuya açık takvimlerdeki etkinliklerin alt görevleri/yorumları okunabilir
CREATE POLICY "Allow public subtasks read access" ON public.workspace_event_subtasks
    FOR SELECT TO authenticated, anon
    USING (
        event_id IN (
            SELECT e.id FROM public.workspace_events e
            JOIN public.workspace_calendars c ON e.calendar_id = c.id
            WHERE c.is_private = false
        )
    );

CREATE POLICY "Allow public comments read access" ON public.workspace_event_comments
    FOR SELECT TO authenticated, anon
    USING (
        event_id IN (
            SELECT e.id FROM public.workspace_events e
            JOIN public.workspace_calendars c ON e.calendar_id = c.id
            WHERE c.is_private = false
        )
    );

-- 2.5 Üyeler (workspace_members) — ANONİM ERİŞİM KESİNLİKLE KAPATILDI
-- Yalnızca oturumlu kullanıcılar ve service_role üye listesini görebilir
CREATE POLICY "Allow authenticated read workspace members" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (true);

-- 2.6 Dosya Metaverisi (workspace_event_files) — ANONİM ERİŞİM KAPATILDI
CREATE POLICY "Allow authenticated read workspace files metadata" ON public.workspace_event_files
    FOR SELECT TO authenticated
    USING (true);

-- 2.7 Bildirimler (workspace_notifications) — KULLANICI İZOLASYONU
-- Anonim erişim engellendi. Kullanıcı yalnızca kendine ait veya genel duyuruları okuyabilir
CREATE POLICY "Allow user isolated notifications read access" ON public.workspace_notifications
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()::text 
        OR user_id = 'all'
    );

-- 2.8 Bildirim Okundu Kayıtları (workspace_notification_reads)
CREATE POLICY "Allow user isolated notification reads select" ON public.workspace_notification_reads
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::text);

CREATE POLICY "Allow user isolated notification reads insert" ON public.workspace_notification_reads
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

-- 2.9 Rol İzinleri ve Güvenlik Ayarları
CREATE POLICY "Allow authenticated read role permissions" ON public.workspace_role_permissions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read security settings" ON public.workspace_security_settings
    FOR SELECT TO authenticated
    USING (true);

-- 2.10 Storage: workspace-files Bucket İzolasyonu (ANONİM İNDİRME KAPATILDI)
CREATE POLICY "Allow authenticated read workspace files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'workspace-files');

CREATE POLICY "Allow authenticated upload workspace files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'workspace-files');

CREATE POLICY "Allow service_role full storage access" ON storage.objects
    FOR ALL TO service_role
    USING (bucket_id = 'workspace-files')
    WITH CHECK (bucket_id = 'workspace-files');

-- ==============================================================================
-- 3. Üye Tablosuna Güvenlik Kolonları (Gerekliyse Ekle)
-- ==============================================================================
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;
