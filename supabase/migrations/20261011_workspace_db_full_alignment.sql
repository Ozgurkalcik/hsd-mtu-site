-- ==============================================================================
-- Migration: 20261011_workspace_db_full_alignment.sql
-- Tanım: HSD MTÜ Workspace Veritabanı Tam Uyum ve Komite Takvimleri Migration'ı
-- ==============================================================================

-- 1. Üye Tablosu Kolon Eklemleri (Non-destructive)
ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS group_id TEXT;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_username ON public.workspace_members (username);

-- 2. Tüm Komite Takvimlerini Ekle (Idempotent UPSERT)
INSERT INTO public.workspace_calendars (id, title, color, description, is_private)
VALUES 
    ('cal_core', 'Genel Topluluk Takvimi', '#ef4444', 'Tüm HSD MTÜ üyelerine açık genel etkinlikler ve zirveler', false),
    ('cal_proj', 'Proje Komitesi Takvimi', '#8b5cf6', 'Yazılım geliştirme, sprintler, code-review ve teknik hackathonlar', false),
    ('cal_event', 'Etkinlik & Sponsorluk Komitesi', '#dc2626', 'Fiziki konferanslar, atölyeler ve sponsorluk görüşmeleri', false),
    ('cal_social', 'Sosyal Medya & Tasarım Komitesi', '#ec4899', 'Görsel iletişim, sosyal medya akışı ve tasarım teslimleri', false),
    ('cal_medium', 'Medium Komitesi Takvimi', '#f59e0b', 'Teknik blog makaleleri, bülten hazırlığı ve peer-review', false),
    ('cal_mgmt', 'Yönetim & Koordinasyon Takvimi', '#3b82f6', 'Liderlik toplantıları, komite başkanları oturumları', true),
    ('cal_ai', 'Ar-Ge & Yapay Zeka Komitesi', '#10b981', 'Yapay zeka modelleri, makale incelemeleri ve akademik projeler', false)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    is_private = EXCLUDED.is_private;

-- 3. Komite / Grupları Ekle (Idempotent UPSERT)
INSERT INTO public.workspace_groups (id, name, code, description, color, role_key)
VALUES 
    ('grp_project', 'Proje Komitesi', 'PROJECT', 'Yazılım geliştirme, açık kaynak projeleri ve teknik yarışmalar.', '#8b5cf6', 'project_lead'),
    ('grp_event_sponsor', 'Etkinlik & Sponsorluk Komitesi', 'EVENT_SPONSOR', 'Konferanslar, workshoplar, üniversite iş birlikleri ve sponsor görüşmeleri.', '#dc2626', 'event_lead'),
    ('grp_social_design', 'Sosyal Medya & Tasarım Komitesi', 'SOCIAL_DESIGN', 'Görsel iletişim, afiş tasarımları ve sosyal medya paylaşımları.', '#ec4899', 'design_lead'),
    ('grp_medium', 'Medium Komitesi', 'MEDIUM', 'Teknik blog yazıları, yayın hazırlığı ve akademik içerikler.', '#f59e0b', 'writer_lead'),
    ('grp_mgmt', 'Yönetim & Koordinasyon Komitesi', 'MANAGEMENT', 'Çekirdek liderlik, topluluk stratejisi ve idari koordinasyon.', '#3b82f6', 'super_admin'),
    ('grp_ai', 'Ar-Ge & Yapay Zeka Komitesi', 'AI_RESEARCH', 'Makine öğrenimi, büyük dil modelleri ve derin teknoloji araştırmaları.', '#10b981', 'ai_lead')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    role_key = EXCLUDED.role_key;

-- 4. Yorum ve Alt Görev Yazma İzinleri (RLS Politikası Güncellemesi)
DROP POLICY IF EXISTS "Allow authenticated insert comments" ON public.workspace_event_comments;
CREATE POLICY "Allow authenticated insert comments" ON public.workspace_event_comments
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated insert subtasks" ON public.workspace_event_subtasks;
CREATE POLICY "Allow authenticated insert subtasks" ON public.workspace_event_subtasks
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update subtasks" ON public.workspace_event_subtasks;
CREATE POLICY "Allow authenticated update subtasks" ON public.workspace_event_subtasks
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 5. Bildirim Dağıtımı İzni
DROP POLICY IF EXISTS "Allow insert notifications" ON public.workspace_notifications;
CREATE POLICY "Allow insert notifications" ON public.workspace_notifications
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);
