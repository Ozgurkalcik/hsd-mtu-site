-- ==============================================================================
-- Migration: 20261014_rsvp_kanban_projects_showcase.sql
-- Tanım: RSVP Kayıt & QR Bilet, Ana Sayfa Vitrin Yayını, Açık Kaynak Projeler
-- ve Kanban / Webhook Ayarları (Idempotent / Tekrar Çalıştırılabilir)
-- ==============================================================================

-- 1. workspace_events Tablosuna Yeni Kolonlar Ekle
ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS is_showcase BOOLEAN DEFAULT false;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS rsvp_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS rsvp_qr_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS rsvp_capacity INTEGER DEFAULT NULL;

ALTER TABLE public.workspace_events 
ADD COLUMN IF NOT EXISTS member_attendance JSONB DEFAULT '[]'::jsonb;

-- 2. workspace_event_attendees (RSVP Katılımcı Kayıtları) Tablosu
CREATE TABLE IF NOT EXISTS public.workspace_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    student_no TEXT,
    department TEXT,
    ticket_code TEXT NOT NULL,
    status TEXT DEFAULT 'registered',
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON public.workspace_event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_ticket_code ON public.workspace_event_attendees (ticket_code);

-- RLS
ALTER TABLE public.workspace_event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow attendees read access" ON public.workspace_event_attendees;
CREATE POLICY "Allow attendees read access" ON public.workspace_event_attendees
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow attendees insert access" ON public.workspace_event_attendees;
CREATE POLICY "Allow attendees insert access" ON public.workspace_event_attendees
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow attendees update access" ON public.workspace_event_attendees;
CREATE POLICY "Allow attendees update access" ON public.workspace_event_attendees
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 3. community_projects (Açık Kaynak Projeler Vitrini) Tablosu
CREATE TABLE IF NOT EXISTS public.community_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    github_url TEXT,
    demo_url TEXT,
    tech_stack TEXT[] DEFAULT '{}',
    stars_count INTEGER DEFAULT 0,
    contributors TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.community_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public projects read access" ON public.community_projects;
CREATE POLICY "Allow public projects read access" ON public.community_projects
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow projects insert access" ON public.community_projects;
CREATE POLICY "Allow projects insert access" ON public.community_projects
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow projects update access" ON public.community_projects;
CREATE POLICY "Allow projects update access" ON public.community_projects
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- 4. workspace_settings Tablosu (Yoksa Oluştur, Varsa Güncelle)
CREATE TABLE IF NOT EXISTS public.workspace_settings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_name              TEXT DEFAULT 'HSD MTÜ Workspace',
    allow_member_registration   BOOLEAN DEFAULT true,
    default_calendar_id         TEXT DEFAULT 'cal_core',
    created_at                  TIMESTAMPTZ DEFAULT now(),
    updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace settings read" ON public.workspace_settings;
CREATE POLICY "Allow workspace settings read" ON public.workspace_settings
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow workspace settings update" ON public.workspace_settings;
CREATE POLICY "Allow workspace settings update" ON public.workspace_settings
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow workspace settings insert" ON public.workspace_settings;
CREATE POLICY "Allow workspace settings insert" ON public.workspace_settings
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Varsayılan satırı ekle (yoksa)
INSERT INTO public.workspace_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Yeni Ayar Kolonları (Idempotent)
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS rsvp_registration_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS rsvp_qr_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS kanban_view_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS showcase_projects_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS webhook_url TEXT DEFAULT '';

ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS webhook_channel TEXT DEFAULT 'etkinlik-duyuru';
