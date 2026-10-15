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
