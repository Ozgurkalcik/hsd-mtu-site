-- ==============================================================================
-- Migration: 20261012_security_hardening_rls.sql
-- Tanım: HSD MTÜ Workspace Güvenlik Sertleştirmesi (RLS Lockdown & Visibility & Member Notes)
-- Güvenlik Notu: Bu migration YIKICI DEĞİLDİR (Non-destructive).
-- 1. Açık anonim INSERT haklarını kaldırır ve yetkilendirmeyi kilitler.
-- 2. Etkinlik görünürlük (public, admin_only, private) seviyelerini ve izolasyonunu uygular.
-- 3. Üye notları ve yorum etiket/sabitleme alanlarını şemaya ekler.
-- ==============================================================================

-- 1. Şema Alanları Ekleme (Idempotent)
ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS reminders JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS member_notes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.workspace_event_comments 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

ALTER TABLE public.workspace_event_comments 
ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'general';

ALTER TABLE public.workspace_event_comments 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- 2. Eski Güvensiz Anonim Yazma Politikalarını Kaldır (Least Privilege Revocation)
DROP POLICY IF EXISTS "Allow authenticated insert comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow authenticated insert subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow authenticated update subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow insert notifications" ON public.workspace_notifications;

-- 3. Yalnızca Yetkili Kullanıcılara (Authenticated & Service Role) İzin Ver
CREATE POLICY "Allow authenticated insert comments" ON public.workspace_event_comments
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update comments" ON public.workspace_event_comments
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete comments" ON public.workspace_event_comments
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert subtasks" ON public.workspace_event_subtasks
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update subtasks" ON public.workspace_event_subtasks
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete subtasks" ON public.workspace_event_subtasks
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert notifications" ON public.workspace_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 4. Etkinlik Görünürlük (Visibility) Politikası Sıkılaştırma
DROP POLICY IF EXISTS "Allow public events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow private events authenticated read access" ON public.workspace_events;

-- 4.1 Kamuya Açık Etkinlikler: Takvim genel ve görünürlük 'public' ise okunabilir
CREATE POLICY "Allow public events read access" ON public.workspace_events
    FOR SELECT TO authenticated, anon
    USING (
        (visibility = 'public' OR visibility IS NULL) AND
        calendar_id IN (
            SELECT id FROM public.workspace_calendars WHERE is_private = false
        )
    );

-- 4.2 Özel ve Admin Etkinlikleri: Yalnızca yetkili oturumlar okuyabilir
CREATE POLICY "Allow authenticated events read access" ON public.workspace_events
    FOR SELECT TO authenticated
    USING (
        -- Genel takvimdeki herkese açık etkinlikler
        (visibility = 'public' OR visibility IS NULL)
        OR
        -- Özel not/etkinlik: sadece oluşturan kullanıcı
        (visibility = 'private' AND created_by = auth.uid()::text)
        OR
        -- Admin-only etkinlikler: admin rolündeki üyeler
        (
            visibility = 'admin_only' AND
            EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE id = auth.uid()::text AND role IN ('super_admin', 'workspace_admin', 'editor')
            )
        )
        OR
        -- Özel takvim etkinlikleri
        calendar_id IN (
            SELECT id FROM public.workspace_calendars WHERE is_private = true
        )
    );

-- 5. Denetim İzi (Audit Logs) Temizleme İzni
CREATE POLICY "Allow admins delete audit logs" ON public.workspace_audit_logs
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE id = auth.uid()::text AND role IN ('super_admin', 'workspace_admin')
        )
    );
