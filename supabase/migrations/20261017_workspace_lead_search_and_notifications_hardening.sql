-- ==============================================================================
-- Migration: 20261017_workspace_lead_search_and_notifications_hardening.sql
-- Tanım: Komite Başkanı (lead_id/lead_name), Hoş Geldiniz Bildirim Temizliği,
--        Üye Rol Güncelleme RLS ve Notification İyileştirmeleri
-- ==============================================================================

-- 1. Komite Başkanı Alanları
ALTER TABLE IF EXISTS public.workspace_groups 
ADD COLUMN IF NOT EXISTS lead_id TEXT;

ALTER TABLE IF EXISTS public.workspace_groups 
ADD COLUMN IF NOT EXISTS lead_name TEXT;

-- 2. Tekrarlayan "Workspace Başlatıldı" Hoş Geldiniz Bildirimini Temizle
DELETE FROM public.workspace_notifications 
WHERE id = 'notif_welcome' 
   OR title ILIKE '%Workspace Başlatıldı%' 
   OR message ILIKE '%Workspace Store Manager başlatıldı%';

-- 3. workspace_members RLS Yetkilerini Güçlendir (Anon ve Auth Rol Değişimi & Okuma)
ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow members read access" ON public.workspace_members;
CREATE POLICY "Allow members read access" ON public.workspace_members
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow workspace members update group_id" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow workspace members update all" ON public.workspace_members;
CREATE POLICY "Allow workspace members update all" ON public.workspace_members
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow workspace members insert all" ON public.workspace_members;
CREATE POLICY "Allow workspace members insert all" ON public.workspace_members
    FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow workspace members delete all" ON public.workspace_members;
CREATE POLICY "Allow workspace members delete all" ON public.workspace_members
    FOR DELETE TO authenticated, anon USING (true);

-- 4. workspace_groups RLS Güncelleme Yetkisi (Komite Başkanı ve Üye Atamaları)
ALTER TABLE IF EXISTS public.workspace_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow groups read access" ON public.workspace_groups;
CREATE POLICY "Allow groups read access" ON public.workspace_groups
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow workspace groups update access" ON public.workspace_groups;
CREATE POLICY "Allow workspace groups update access" ON public.workspace_groups
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- 5. workspace_notifications RLS (Bildirim Gönderme ve Güncelleme)
ALTER TABLE IF EXISTS public.workspace_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow workspace notifications insert access" ON public.workspace_notifications;
CREATE POLICY "Allow workspace notifications insert access" ON public.workspace_notifications
    FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow workspace notifications update access" ON public.workspace_notifications;
CREATE POLICY "Allow workspace notifications update access" ON public.workspace_notifications
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow workspace notifications delete access" ON public.workspace_notifications;
CREATE POLICY "Allow workspace notifications delete access" ON public.workspace_notifications
    FOR DELETE TO authenticated, anon USING (true);
