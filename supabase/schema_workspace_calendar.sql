-- ==============================================================================
-- HSD MTÜ Topluluk Takvimi & Workspace Mimarisi Veritabanı Şeması
-- Supabase Postgres SQL Script (Idempotent / Tekrar Çalıştırılabilir)
--
-- NOT: Bu şema mevcut "public.events", "public.admin_users" ve diğer ana site
-- tablolarına KESİNLİKLE DOKUNMAZ. Tüm yeni tablolar "workspace_*" önekiyle
-- izole olarak oluşturulur.
-- ==============================================================================

-- 1. Gerekli Eklentiler (Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Tablo Tanımları (CREATE TABLE IF NOT EXISTS)
-- ==============================================================================

-- 2.1 Workspace Üyeleri
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id TEXT PRIMARY KEY DEFAULT ('mem_' || substr(gen_random_uuid()::text, 1, 8)),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'workspace_admin', 'editor', 'contributor', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    avatar_url TEXT,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kolonların mevcut tablolarda da bulunmasını garantiye al
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- 2.2 Takvimler (Public vs Private)
CREATE TABLE IF NOT EXISTS public.workspace_calendars (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    color TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Komiteler & Çalışma Grupları
CREATE TABLE IF NOT EXISTS public.workspace_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    role_key TEXT,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Etkinlikler (Optimistic Concurrency: version kolonu)
CREATE TABLE IF NOT EXISTS public.workspace_events (
    id TEXT PRIMARY KEY DEFAULT ('evt_' || substr(gen_random_uuid()::text, 1, 8)),
    calendar_id TEXT NOT NULL REFERENCES public.workspace_calendars(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Genel',
    color TEXT NOT NULL DEFAULT '#dc2626',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    assignees JSONB NOT NULL DEFAULT '[]'::jsonb,
    location TEXT,
    meeting_link TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    visibility TEXT DEFAULT 'public',
    created_by TEXT,
    reminders JSONB DEFAULT '[]'::jsonb,
    edit_history JSONB DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Alt Görevler (Checklist)
CREATE TABLE IF NOT EXISTS public.workspace_event_subtasks (
    id TEXT PRIMARY KEY DEFAULT ('sub_' || substr(gen_random_uuid()::text, 1, 8)),
    event_id TEXT NOT NULL REFERENCES public.workspace_events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Yorumlar
CREATE TABLE IF NOT EXISTS public.workspace_event_comments (
    id TEXT PRIMARY KEY DEFAULT ('com_' || substr(gen_random_uuid()::text, 1, 8)),
    event_id TEXT NOT NULL REFERENCES public.workspace_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Dosya Metaverisi
CREATE TABLE IF NOT EXISTS public.workspace_event_files (
    id TEXT PRIMARY KEY DEFAULT ('file_' || substr(gen_random_uuid()::text, 1, 8)),
    event_id TEXT NOT NULL REFERENCES public.workspace_events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    download_token TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Bildirimler (Duyurular & Hatırlatıcılar)
CREATE TABLE IF NOT EXISTS public.workspace_notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || substr(gen_random_uuid()::text, 1, 8)),
    user_id TEXT NOT NULL, -- Belirli üye ID'si veya 'all'
    event_id TEXT,
    event_title TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('info', 'warning', 'reminder', 'urgent', 'announcement')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 Aktif Oturumlar
CREATE TABLE IF NOT EXISTS public.workspace_active_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 Denetim İzi Kayıtları (Audit Logs)
CREATE TABLE IF NOT EXISTS public.workspace_audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('audit_' || substr(gen_random_uuid()::text, 1, 8)),
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 Rol İzin Matrisi
CREATE TABLE IF NOT EXISTS public.workspace_role_permissions (
    role TEXT PRIMARY KEY,
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_upload BOOLEAN NOT NULL DEFAULT FALSE,
    can_share BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2.12 Sistem Güvenlik Ayarları
CREATE TABLE IF NOT EXISTS public.workspace_security_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    max_file_size_mb INTEGER NOT NULL DEFAULT 25,
    allowed_file_types JSONB NOT NULL DEFAULT '["pdf","docx","xlsx","png","jpg","webp","mp3","zip"]'::jsonb,
    mfa_required BOOLEAN NOT NULL DEFAULT FALSE,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 120,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.13 Bildirim Okundu Kayıtları (Kullanıcı İzolasyonu)
CREATE TABLE IF NOT EXISTS public.workspace_notification_reads (
    notification_id TEXT NOT NULL REFERENCES public.workspace_notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);

-- ==============================================================================
-- 3. İndeksler (Performance Indexing)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspace_events_start_end ON public.workspace_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_workspace_events_calendar ON public.workspace_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_workspace_events_status ON public.workspace_events(status);
CREATE INDEX IF NOT EXISTS idx_workspace_subtasks_event ON public.workspace_event_subtasks(event_id);
CREATE INDEX IF NOT EXISTS idx_workspace_comments_event ON public.workspace_event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_event ON public.workspace_event_files(event_id);
CREATE INDEX IF NOT EXISTS idx_workspace_notifications_user_read ON public.workspace_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_created ON public.workspace_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_workspace_notif_reads_user ON public.workspace_notification_reads(user_id);

-- ==============================================================================
-- 4. Tetikleyiciler (Triggers)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_workspace_event_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspace_event_updated ON public.workspace_events;
CREATE TRIGGER trigger_workspace_event_updated
BEFORE UPDATE ON public.workspace_events
FOR EACH ROW EXECUTE FUNCTION public.handle_workspace_event_updated();

-- ==============================================================================
-- 5. Row Level Security (RLS) Etkinleştirme
-- ==============================================================================
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_event_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_event_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_security_settings ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 6. En Az Ayrıcalıklı (Least Privilege) RLS Politikaları (Idempotent)
-- ==============================================================================

-- 6.1 Takvimler
DROP POLICY IF EXISTS "Allow public calendars read access" ON public.workspace_calendars;
CREATE POLICY "Allow public calendars read access" ON public.workspace_calendars
    FOR SELECT TO authenticated, anon
    USING (is_private = false);

DROP POLICY IF EXISTS "Allow private calendars authenticated read access" ON public.workspace_calendars;
CREATE POLICY "Allow private calendars authenticated read access" ON public.workspace_calendars
    FOR SELECT TO authenticated
    USING (is_private = true);

-- 6.2 Etkinlikler
DROP POLICY IF EXISTS "Allow public events read access" ON public.workspace_events;
CREATE POLICY "Allow public events read access" ON public.workspace_events
    FOR SELECT TO authenticated, anon
    USING (calendar_id IN (SELECT id FROM public.workspace_calendars WHERE is_private = false));

DROP POLICY IF EXISTS "Allow private events authenticated read access" ON public.workspace_events;
CREATE POLICY "Allow private events authenticated read access" ON public.workspace_events
    FOR SELECT TO authenticated
    USING (calendar_id IN (SELECT id FROM public.workspace_calendars WHERE is_private = true));

DROP POLICY IF EXISTS "Allow full access for service_role on events" ON public.workspace_events;
CREATE POLICY "Allow full access for service_role on events" ON public.workspace_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.3 Gruplar / Komiteler
DROP POLICY IF EXISTS "Allow groups read access" ON public.workspace_groups;
CREATE POLICY "Allow groups read access" ON public.workspace_groups
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow full access for service_role on groups" ON public.workspace_groups;
CREATE POLICY "Allow full access for service_role on groups" ON public.workspace_groups
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.4 Alt Görevler
DROP POLICY IF EXISTS "Allow public subtasks read access" ON public.workspace_event_subtasks;
CREATE POLICY "Allow public subtasks read access" ON public.workspace_event_subtasks
    FOR SELECT TO authenticated, anon
    USING (event_id IN (SELECT e.id FROM public.workspace_events e JOIN public.workspace_calendars c ON e.calendar_id = c.id WHERE c.is_private = false));

DROP POLICY IF EXISTS "Allow full access for service_role on subtasks" ON public.workspace_event_subtasks;
CREATE POLICY "Allow full access for service_role on subtasks" ON public.workspace_event_subtasks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.5 Yorumlar
DROP POLICY IF EXISTS "Allow public comments read access" ON public.workspace_event_comments;
CREATE POLICY "Allow public comments read access" ON public.workspace_event_comments
    FOR SELECT TO authenticated, anon
    USING (event_id IN (SELECT e.id FROM public.workspace_events e JOIN public.workspace_calendars c ON e.calendar_id = c.id WHERE c.is_private = false));

DROP POLICY IF EXISTS "Allow full access for service_role on comments" ON public.workspace_event_comments;
CREATE POLICY "Allow full access for service_role on comments" ON public.workspace_event_comments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.6 Üyeler (Anonim Erişim Kesinlikle Kapalı)
DROP POLICY IF EXISTS "Allow authenticated read workspace members" ON public.workspace_members;
CREATE POLICY "Allow authenticated read workspace members" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow full access for service_role" ON public.workspace_members;
CREATE POLICY "Allow full access for service_role" ON public.workspace_members
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.7 Dosya Metaverisi (Anonim Erişim Kapalı)
DROP POLICY IF EXISTS "Allow authenticated read workspace files metadata" ON public.workspace_event_files;
CREATE POLICY "Allow authenticated read workspace files metadata" ON public.workspace_event_files
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow full access for service_role on files" ON public.workspace_event_files;
CREATE POLICY "Allow full access for service_role on files" ON public.workspace_event_files
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.8 Bildirimler (Kullanıcı İzolasyonu)
DROP POLICY IF EXISTS "Allow user isolated notifications read access" ON public.workspace_notifications;
CREATE POLICY "Allow user isolated notifications read access" ON public.workspace_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::text OR user_id = 'all');

DROP POLICY IF EXISTS "Allow full access for service_role on notifications" ON public.workspace_notifications;
CREATE POLICY "Allow full access for service_role on notifications" ON public.workspace_notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.9 Bildirim Okundu Kayıtları
DROP POLICY IF EXISTS "Allow user isolated notification reads select" ON public.workspace_notification_reads;
CREATE POLICY "Allow user isolated notification reads select" ON public.workspace_notification_reads
    FOR SELECT TO authenticated
    USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Allow user isolated notification reads insert" ON public.workspace_notification_reads;
CREATE POLICY "Allow user isolated notification reads insert" ON public.workspace_notification_reads
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Allow full access for service_role on notif reads" ON public.workspace_notification_reads;
CREATE POLICY "Allow full access for service_role on notif reads" ON public.workspace_notification_reads
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.10 Rol İzinleri ve Güvenlik Ayarları
DROP POLICY IF EXISTS "Allow authenticated read role permissions" ON public.workspace_role_permissions;
CREATE POLICY "Allow authenticated read role permissions" ON public.workspace_role_permissions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated read security settings" ON public.workspace_security_settings;
CREATE POLICY "Allow authenticated read security settings" ON public.workspace_security_settings
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow full access for service_role on permissions" ON public.workspace_role_permissions;
CREATE POLICY "Allow full access for service_role on permissions" ON public.workspace_role_permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access for service_role on security" ON public.workspace_security_settings;
CREATE POLICY "Allow full access for service_role on security" ON public.workspace_security_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6.11 Aktif Oturumlar ve Audit Logları
DROP POLICY IF EXISTS "Allow full access for service_role on sessions" ON public.workspace_active_sessions;
CREATE POLICY "Allow full access for service_role on sessions" ON public.workspace_active_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access for service_role on audit" ON public.workspace_audit_logs;
CREATE POLICY "Allow full access for service_role on audit" ON public.workspace_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. Supabase Storage: workspace-files Bucket ve Politikaları
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'workspace-files',
    'workspace-files',
    false,
    26214400, -- 25 MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/webp',
        'audio/mpeg',
        'application/zip'
    ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated read workspace files" ON storage.objects;
CREATE POLICY "Allow authenticated read workspace files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'workspace-files');

DROP POLICY IF EXISTS "Allow authenticated upload workspace files" ON storage.objects;
CREATE POLICY "Allow authenticated upload workspace files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'workspace-files');

DROP POLICY IF EXISTS "Allow service_role full storage access" ON storage.objects;
CREATE POLICY "Allow service_role full storage access" ON storage.objects
    FOR ALL TO service_role
    USING (bucket_id = 'workspace-files')
    WITH CHECK (bucket_id = 'workspace-files');

-- ==============================================================================
-- 8. Başlangıç Tohum Verileri (Seed Data - ON CONFLICT DO NOTHING)
-- ==============================================================================
INSERT INTO public.workspace_role_permissions (role, can_view, can_create, can_edit, can_delete, can_upload, can_share)
VALUES
    ('super_admin', true, true, true, true, true, true),
    ('workspace_admin', true, true, true, true, true, true),
    ('editor', true, true, true, false, true, true),
    ('contributor', true, true, false, false, true, false),
    ('viewer', true, false, false, false, false, false)
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.workspace_security_settings (id, max_file_size_mb, allowed_file_types, mfa_required, session_timeout_minutes)
VALUES ('default', 25, '["pdf","docx","xlsx","png","jpg","webp","mp3","zip"]'::jsonb, false, 120)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_calendars (id, title, color, description, is_private)
VALUES
    ('cal_core', 'HSD Ana Takvim', '#dc2626', 'Tüm topluluk ve çekirdek ekip etkinlikleri', false),
    ('cal_dev', 'Proje & Hackathon', '#8b5cf6', 'Yazılım projeleri, sprintler ve kod atölyeleri', false),
    ('cal_social', 'Sosyal Medya & İçerik', '#ec4899', 'Instagram, LinkedIn ve Medium içerik akışı', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_groups (id, name, code, description, color, role_key, members)
VALUES
    ('grp_project', 'Proje Komitesi', 'PROJECT', 'Yazılım geliştirme, açık kaynak projeleri ve teknik yarışmalar.', '#8b5cf6', 'project_lead', '[]'::jsonb),
    ('grp_event_sponsor', 'Etkinlik & Sponsorluk Komitesi', 'EVENT_SPONSOR', 'Konferanslar, workshoplar, üniversite iş birlikleri ve sponsor görüşmeleri.', '#dc2626', 'event_lead', '[]'::jsonb),
    ('grp_social_design', 'Sosyal Medya & Tasarım Komitesi', 'SOCIAL_DESIGN', 'Görsel iletişim, afiş tasarımları ve sosyal medya paylaşımları.', '#ec4899', 'design_lead', '[]'::jsonb),
    ('grp_medium', 'Medium Komitesi', 'MEDIUM', 'Teknik blog yazıları, yayın hazırlığı ve akademik içerikler.', '#f59e0b', 'writer_lead', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_members (id, email, display_name, role, status, mfa_enabled, must_change_password)
VALUES
    ('mem_admin_1', 'admin@hsdmtu.site', 'HSD MTÜ Super Admin', 'super_admin', 'active', false, true),
    ('mem_admin_2', 'admin@hsdmtu.com', 'HSD MTÜ Lead Admin', 'super_admin', 'active', false, true)
ON CONFLICT (email) DO NOTHING;
