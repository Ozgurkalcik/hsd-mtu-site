-- Migration: Add is_active column and RLS policies for workspace_notifications management
-- Date: 2026-10-15

ALTER TABLE IF EXISTS public.workspace_notifications
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_workspace_notifications_is_active 
ON public.workspace_notifications(is_active);

CREATE INDEX IF NOT EXISTS idx_workspace_notifications_user_active 
ON public.workspace_notifications(user_id, is_active);

-- Enable RLS
ALTER TABLE IF EXISTS public.workspace_notifications ENABLE ROW LEVEL SECURITY;

-- Allow update access
DROP POLICY IF EXISTS "Allow workspace notifications update access" ON public.workspace_notifications;
CREATE POLICY "Allow workspace notifications update access" ON public.workspace_notifications
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow delete access
DROP POLICY IF EXISTS "Allow workspace notifications delete access" ON public.workspace_notifications;
CREATE POLICY "Allow workspace notifications delete access" ON public.workspace_notifications
    FOR DELETE USING (true);

-- ==============================================================================
-- Workspace Event Comments Schema Alignment
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_event_comments
ADD COLUMN IF NOT EXISTS user_avatar TEXT;

ALTER TABLE IF EXISTS public.workspace_event_comments
ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'general';

ALTER TABLE IF EXISTS public.workspace_event_comments
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.workspace_event_comments
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- ==============================================================================
-- Workspace Events Visibility Schema Alignment (Belirli Komiteler & Kullanıcılar)
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_events
ADD COLUMN IF NOT EXISTS allowed_committee_ids JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.workspace_events
ADD COLUMN IF NOT EXISTS allowed_member_ids JSONB DEFAULT '[]'::jsonb;

-- ==============================================================================
-- Workspace Groups & Members Schema & RLS Alignment (Komite Üye Atama İzinleri)
-- ==============================================================================
ALTER TABLE IF EXISTS public.workspace_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace groups update access" ON public.workspace_groups;
CREATE POLICY "Allow workspace groups update access" ON public.workspace_groups
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace members update group_id" ON public.workspace_members;
CREATE POLICY "Allow workspace members update group_id" ON public.workspace_members
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);



