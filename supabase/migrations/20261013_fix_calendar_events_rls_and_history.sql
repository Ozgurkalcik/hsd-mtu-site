-- ==============================================================================
-- Migration: 20261013_fix_calendar_events_rls_and_history.sql
-- Tanım: Topluluk Takvimi Etkinlik Görünürlük, RLS Düzeltmesi, Yazar & Düzenleme Geçmişi
-- ve Ar-Ge Komitesi Kaldırılması (Idempotent / Tekrar Çalıştırılabilir)
-- ==============================================================================

-- 1. Şema Alanları Ekleme (Idempotent)
ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS reminders JSONB DEFAULT '[]'::jsonb;

-- 2. Ar-Ge & Yapay Zeka Komitesi Takvimini ve Grubunu Temizle (Diğerlerine Karışmadan)
UPDATE public.workspace_events 
SET calendar_id = 'cal_core' 
WHERE calendar_id = 'cal_ai';

DELETE FROM public.workspace_calendars WHERE id = 'cal_ai';
DELETE FROM public.workspace_groups WHERE id = 'grp_ai';

-- 3. Standart Topluluk Takvimlerini Garantiye Al (Idempotent UPSERT)
INSERT INTO public.workspace_calendars (id, title, color, description, is_private)
VALUES
    ('cal_core', 'Genel Topluluk Takvimi', '#ef4444', 'Tüm HSD MTÜ üyelerine açık genel etkinlikler ve zirveler', false),
    ('cal_proj', 'Proje Komitesi Takvimi', '#8b5cf6', 'Yazılım geliştirme, sprintler, code-review ve teknik hackathonlar', false),
    ('cal_dev', 'Proje & Hackathon Takvimi', '#8b5cf6', 'Yazılım projeleri, sprintler ve kod atölyeleri', false),
    ('cal_event', 'Etkinlik & Sponsorluk Komitesi', '#dc2626', 'Fiziki konferanslar, atölyeler ve sponsorluk görüşmeleri', false),
    ('cal_social', 'Sosyal Medya & Tasarım Komitesi', '#ec4899', 'Görsel iletişim, sosyal medya akışı ve tasarım teslimleri', false),
    ('cal_medium', 'Medium Komitesi Takvimi', '#f59e0b', 'Teknik blog makaleleri, bülten hazırlığı ve peer-review', false),
    ('cal_mgmt', 'Yönetim & Koordinasyon Takvimi', '#3b82f6', 'Liderlik toplantıları, komite başkanları oturumları', true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    is_private = EXCLUDED.is_private;

-- 4. RLS Politikalarının Düzeltilmesi (Takvim Etkinliklerinin Herkeste Kesintisiz Görünmesi İçin)
-- Eski kısıtlayıcı politikaları kaldır
DROP POLICY IF EXISTS "Allow public events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow private events authenticated read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow authenticated events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow full access for service_role on events" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events read access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events insert access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events update access" ON public.workspace_events;
DROP POLICY IF EXISTS "Allow workspace events delete access" ON public.workspace_events;

-- API Route üzerinden ve oturumlu/anonim tüm takvim okumalarını serbest bırak
-- (Oturum doğrulama ve görünürlük izolasyonu Next.js API katmanında RBAC ile tam denetlenir)
CREATE POLICY "Allow workspace events read access" ON public.workspace_events
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Allow workspace events insert access" ON public.workspace_events
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Allow workspace events update access" ON public.workspace_events
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow workspace events delete access" ON public.workspace_events
    FOR DELETE TO authenticated, anon
    USING (true);

CREATE POLICY "Allow full access for service_role on events" ON public.workspace_events
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Alt Görevler (Subtasks) İzinleri
DROP POLICY IF EXISTS "Allow public subtasks read access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow authenticated insert subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow authenticated update subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow authenticated delete subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow full access for service_role on subtasks" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks read access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks insert access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks update access" ON public.workspace_event_subtasks;
DROP POLICY IF EXISTS "Allow workspace subtasks delete access" ON public.workspace_event_subtasks;

CREATE POLICY "Allow workspace subtasks read access" ON public.workspace_event_subtasks
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Allow workspace subtasks insert access" ON public.workspace_event_subtasks
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Allow workspace subtasks update access" ON public.workspace_event_subtasks
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow workspace subtasks delete access" ON public.workspace_event_subtasks
    FOR DELETE TO authenticated, anon
    USING (true);

CREATE POLICY "Allow full access for service_role on subtasks" ON public.workspace_event_subtasks
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Yorumlar (Comments) İzinleri
DROP POLICY IF EXISTS "Allow public comments read access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow authenticated insert comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow authenticated update comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow authenticated delete comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow full access for service_role on comments" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments read access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments insert access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments update access" ON public.workspace_event_comments;
DROP POLICY IF EXISTS "Allow workspace comments delete access" ON public.workspace_event_comments;

CREATE POLICY "Allow workspace comments read access" ON public.workspace_event_comments
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Allow workspace comments insert access" ON public.workspace_event_comments
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

CREATE POLICY "Allow workspace comments update access" ON public.workspace_event_comments
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow workspace comments delete access" ON public.workspace_event_comments
    FOR DELETE TO authenticated, anon
    USING (true);

CREATE POLICY "Allow full access for service_role on comments" ON public.workspace_event_comments
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. Takvimler ve Komiteler İzinleri
DROP POLICY IF EXISTS "Allow public calendars read access" ON public.workspace_calendars;
DROP POLICY IF EXISTS "Allow private calendars authenticated read access" ON public.workspace_calendars;
DROP POLICY IF EXISTS "Allow workspace calendars read access" ON public.workspace_calendars;

CREATE POLICY "Allow workspace calendars read access" ON public.workspace_calendars
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow groups read access" ON public.workspace_groups;
DROP POLICY IF EXISTS "Allow workspace groups read access" ON public.workspace_groups;

CREATE POLICY "Allow workspace groups read access" ON public.workspace_groups
    FOR SELECT TO authenticated, anon
    USING (true);

-- 8. Bildirim İzinleri
DROP POLICY IF EXISTS "Allow insert notifications" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow user isolated notifications read access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow workspace notifications read access" ON public.workspace_notifications;
DROP POLICY IF EXISTS "Allow workspace notifications insert access" ON public.workspace_notifications;

CREATE POLICY "Allow workspace notifications read access" ON public.workspace_notifications
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Allow workspace notifications insert access" ON public.workspace_notifications
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);
