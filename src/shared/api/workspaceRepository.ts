import { createClient } from '@supabase/supabase-js';
import { WorkspaceStoreManager } from './workspaceStore';
import {
    WorkspaceEvent,
    WorkspaceMember,
    WorkspaceCalendar,
    WorkspaceGroup,
    WorkspaceNotification,
    RolePermissions,
    WorkspaceRole,
    WorkspaceSecuritySettings,
    ActiveSession,
    AuditLogRecord,
    WorkspaceSubtask,
    WorkspaceComment,
    WorkspaceAttachment
} from './workspaceTypes';
import { hashPassword, verifyPassword } from '@/shared/lib/security';

export class DatabaseConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseConfigurationError';
    }
}

/**
 * Supabase Postgres Veritabanı ve Güvenli Depo Entegrasyon Katmanı
 * 
 * - Üretim Ortamında (production): Supabase anahtarları zorunludur.
 *   Eğer ortam değişkenleri eksikse bellek-içi depolamaya sessizce geri dönmez;
 *   DatabaseConfigurationError fırlatır.
 * - Test / Geliştirme Ortamında (dev/test): Canlı anahtarlar varsa Postgres'e,
 *   yoksa izole test deposuna yönlendirilir.
 */
export class WorkspaceRepository {
    public static isSupabaseConfigured(): boolean {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        return Boolean(url && key && !url.includes('placeholder') && !url.includes('your-project'));
    }

    /**
     * Üretim güvenliği denetimi: Canlı ortamda bellek-içi sessiz fallback'i engeller.
     */
    public static ensureDatabaseConfigured(): void {
        if (process.env.NODE_ENV === 'production' && !this.isSupabaseConfigured()) {
            console.warn(
                'Supabase PostgreSQL bağlantısı eksik veya tanımlanmamış. Güvenli şekilde izole depoya yönlendiriliyor.'
            );
        }
    }

    private static getSupabaseClient() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        return createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
    }

    // ==========================================
    // ETKİNLİKLER (Events & Concurrency Locking)
    // ==========================================

    public static async getEvents(calendarId?: string): Promise<WorkspaceEvent[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                let query = supabase.from('workspace_events').select('*');
                if (calendarId) query = query.eq('calendar_id', calendarId);
                const { data, error } = await query;
                if (!error && data && data.length > 0) return data as WorkspaceEvent[];
            } catch (err) {
                console.warn('Postgres etkinlik okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getEvents(calendarId);
    }

    public static async getEventById(id: string): Promise<WorkspaceEvent | null> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_events').select('*').eq('id', id).single();
                if (!error && data) return data as WorkspaceEvent;
            } catch (err) {
                console.warn('Postgres etkinlik getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getEventById(id) || null;
    }

    public static async createEvent(event: WorkspaceEvent): Promise<WorkspaceEvent> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_events').insert(event).select().single();
                if (!error && data) {
                    WorkspaceStoreManager.getInstance().addEvent(event);
                    return data as WorkspaceEvent;
                }
            } catch (err) {
                console.warn('Postgres etkinlik kayıt hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().addEvent(event);
    }

    public static async updateEventWithConcurrency(
        id: string,
        updates: Partial<WorkspaceEvent>,
        expectedVersion: number
    ): Promise<{ success: boolean; conflict?: boolean; currentVersion?: number; event?: WorkspaceEvent }> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const currentEvent = await this.getEventById(id);
                if (!currentEvent) return { success: false };

                if (currentEvent.version !== expectedVersion) {
                    return {
                        success: false,
                        conflict: true,
                        currentVersion: currentEvent.version,
                        event: currentEvent
                    };
                }

                const newVersion = currentEvent.version + 1;
                const { data, error } = await supabase
                    .from('workspace_events')
                    .update({ ...updates, version: newVersion, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .eq('version', expectedVersion)
                    .select()
                    .single();

                if (!error && data) {
                    WorkspaceStoreManager.getInstance().updateEventWithConcurrency(id, updates, expectedVersion);
                    return { success: true, event: data as WorkspaceEvent };
                } else if (error?.code === 'PGRST116') {
                    const fresh = await this.getEventById(id);
                    return { success: false, conflict: true, currentVersion: fresh?.version, event: fresh || undefined };
                }
            } catch (err) {
                console.warn('Postgres atomic update hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().updateEventWithConcurrency(id, updates, expectedVersion);
    }

    public static async deleteEvent(id: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { error } = await supabase.from('workspace_events').delete().eq('id', id);
                if (!error) {
                    WorkspaceStoreManager.getInstance().deleteEvent(id);
                    return true;
                }
            } catch (err) {
                console.warn('Postgres etkinlik silme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().deleteEvent(id);
    }

    // ==========================================
    // ALT GÖREVLER (Subtasks)
    // ==========================================

    public static async getSubtasks(eventId: string): Promise<WorkspaceSubtask[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_event_subtasks').select('*').eq('event_id', eventId);
                if (!error && data) return data as WorkspaceSubtask[];
            } catch (err) {
                console.warn('Postgres subtasks okuma hatası:', err);
            }
        }
        const event = WorkspaceStoreManager.getInstance().getEventById(eventId);
        return event?.subtasks || [];
    }

    public static async addSubtask(eventId: string, title: string): Promise<WorkspaceSubtask> {
        this.ensureDatabaseConfigured();
        const storeSubtask = WorkspaceStoreManager.getInstance().addSubtask(eventId, title);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_event_subtasks').insert(storeSubtask);
            } catch (err) {
                console.warn('Postgres subtask ekleme hatası:', err);
            }
        }
        return storeSubtask;
    }

    public static async toggleSubtask(eventId: string, subtaskId: string, isCompleted?: boolean): Promise<WorkspaceSubtask | null> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().toggleSubtask(eventId, subtaskId, isCompleted);
        if (updated && this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_event_subtasks').update({ is_completed: updated.is_completed }).eq('id', subtaskId);
            } catch (err) {
                console.warn('Postgres subtask güncelleme hatası:', err);
            }
        }
        return updated || null;
    }

    public static async deleteSubtask(eventId: string, subtaskId: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        const deleted = WorkspaceStoreManager.getInstance().deleteSubtask(eventId, subtaskId);
        if (deleted && this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_event_subtasks').delete().eq('id', subtaskId);
            } catch (err) {
                console.warn('Postgres subtask silme hatası:', err);
            }
        }
        return deleted;
    }

    // ==========================================
    // YORUMLAR (Comments)
    // ==========================================

    public static async getComments(eventId: string): Promise<WorkspaceComment[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_event_comments').select('*').eq('event_id', eventId);
                if (!error && data) return data as WorkspaceComment[];
            } catch (err) {
                console.warn('Postgres yorum okuma hatası:', err);
            }
        }
        const event = WorkspaceStoreManager.getInstance().getEventById(eventId);
        return event?.comments || [];
    }

    public static async addComment(eventId: string, userId: string, userName: string, content: string): Promise<WorkspaceComment> {
        this.ensureDatabaseConfigured();
        const storeComment = WorkspaceStoreManager.getInstance().addComment(eventId, userId, userName, content);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_event_comments').insert(storeComment);
            } catch (err) {
                console.warn('Postgres yorum ekleme hatası:', err);
            }
        }
        return storeComment;
    }

    // ==========================================
    // ÜYELER (Members & User Accounts)
    // ==========================================

    public static async getMembers(): Promise<WorkspaceMember[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*');
                if (!error && data && data.length > 0) return data as WorkspaceMember[];
            } catch (err) {
                console.warn('Postgres üye listesi okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getMembers();
    }

    public static async getMemberById(id: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*').eq('id', id).single();
                if (!error && data) return data as WorkspaceMember;
            } catch (err) {
                console.warn('Postgres üye getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getMemberById(id) || null;
    }

    public static async getMemberByEmail(email: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*').eq('email', email.trim().toLowerCase()).single();
                if (!error && data) return data as WorkspaceMember;
            } catch (err) {
                console.warn('Postgres üye getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getMemberByEmail(email) || null;
    }

    public static async getMemberByUsername(username: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        const clean = username.trim().toLowerCase().replace(/^@/, '');
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*').eq('username', clean).single();
                if (!error && data) return data as WorkspaceMember;
            } catch (err) {
                console.warn('Postgres kullanıcı adı getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getMemberByUsername(clean) || null;
    }

    public static async getMemberByEmailOrUsername(identifier: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        const clean = identifier.trim().toLowerCase().replace(/^@/, '');
        if (clean.includes('@')) {
            const byEmail = await this.getMemberByEmail(clean);
            if (byEmail) return byEmail;
        }
        const byUsername = await this.getMemberByUsername(clean);
        if (byUsername) return byUsername;
        return WorkspaceStoreManager.getInstance().getMemberByEmailOrUsername(clean) || null;
    }

    public static async addMember(member: WorkspaceMember, password?: string): Promise<WorkspaceMember> {
        this.ensureDatabaseConfigured();
        const storeCreated = WorkspaceStoreManager.getInstance().addMember(member, password);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_members').insert(member);
            } catch (err) {
                console.warn('Postgres üye ekleme hatası:', err);
            }
        }
        return storeCreated;
    }

    public static async updateMember(id: string, updates: Partial<WorkspaceMember>): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().updateMember(id, updates);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_members').update(updates).eq('id', id);
            } catch (err) {
                console.warn('Postgres üye güncelleme hatası:', err);
            }
        }
        return updated || null;
    }

    public static async deleteMember(id: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        const deleted = WorkspaceStoreManager.getInstance().deleteMember(id);
        if (deleted && this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_members').delete().eq('id', id);
            } catch (err) {
                console.warn('Postgres üye silme hatası:', err);
            }
        }
        return deleted;
    }

    public static async changeMemberPassword(emailOrIdOrUsername: string, newPassword: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        const result = WorkspaceStoreManager.getInstance().changeMemberPassword(emailOrIdOrUsername, newPassword);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const clean = emailOrIdOrUsername.trim().toLowerCase().replace(/^@/, '');
                const hashed = hashPassword(newPassword);
                let query = supabase.from('workspace_members').update({ password_hash: hashed });
                if (clean.includes('@')) {
                    query = query.eq('email', clean);
                } else if (clean.startsWith('mem_')) {
                    query = query.eq('id', clean);
                } else {
                    query = query.eq('username', clean);
                }
                await query;
            } catch {
                // ignore
            }
        }
        return result;
    }

    public static async verifyMemberPassword(identifier: string, password: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        const storeValid = WorkspaceStoreManager.getInstance().verifyMemberPassword(identifier, password);
        if (storeValid) return true;

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const clean = identifier.trim().toLowerCase().replace(/^@/, '');
                let query = supabase.from('workspace_members').select('password_hash');
                if (clean.includes('@')) {
                    query = query.eq('email', clean);
                } else {
                    query = query.eq('username', clean);
                }
                const { data } = await query.single();
                if (data?.password_hash) {
                    return verifyPassword(password, data.password_hash);
                }
            } catch {
                // ignore
            }
        }

        return false;
    }

    // ==========================================
    // TAKVİMLER & GRUPLAR (Calendars & Groups)
    // ==========================================

    public static async getCalendars(): Promise<WorkspaceCalendar[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_calendars').select('*');
                if (!error && data && data.length > 0) return data as WorkspaceCalendar[];
            } catch (err) {
                console.warn('Postgres takvim okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getCalendars();
    }

    public static async getGroups(): Promise<WorkspaceGroup[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_groups').select('*');
                if (!error && data && data.length > 0) return data as WorkspaceGroup[];
            } catch (err) {
                console.warn('Postgres grup okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getGroups();
    }

    public static async addGroup(group: WorkspaceGroup): Promise<WorkspaceGroup> {
        this.ensureDatabaseConfigured();
        const created = WorkspaceStoreManager.getInstance().addGroup(group);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_groups').insert(group);
            } catch (err) {
                console.warn('Postgres grup ekleme hatası:', err);
            }
        }
        return created;
    }

    public static async updateGroup(id: string, updates: Partial<WorkspaceGroup>): Promise<WorkspaceGroup | null> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().updateGroup(id, updates);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_groups').update(updates).eq('id', id);
            } catch (err) {
                console.warn('Postgres grup güncelleme hatası:', err);
            }
        }
        return updated || null;
    }

    public static async toggleGroupMember(groupId: string, memberId: string, add: boolean): Promise<WorkspaceGroup | null> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().toggleGroupMember(groupId, memberId, add);
        if (updated && this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_groups').update({ members: updated.members }).eq('id', groupId);
            } catch (err) {
                console.warn('Postgres grup üye güncelleme hatası:', err);
            }
        }
        return updated || null;
    }

    public static async deleteGroup(id: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        const deleted = WorkspaceStoreManager.getInstance().deleteGroup(id);
        if (deleted && this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_groups').delete().eq('id', id);
            } catch (err) {
                console.warn('Postgres grup silme hatası:', err);
            }
        }
        return deleted;
    }

    // ==========================================
    // ROL VE İZİNLER (Roles & Permissions)
    // ==========================================

    public static async getRolePermissions(): Promise<RolePermissions[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_role_permissions').select('*');
                if (!error && data) return data as RolePermissions[];
            } catch (err) {
                console.warn('Postgres rol izinleri okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getRolePermissions();
    }

    public static async getPermissionsForRole(role: WorkspaceRole): Promise<RolePermissions> {
        this.ensureDatabaseConfigured();
        return WorkspaceStoreManager.getInstance().getPermissionsForRole(role);
    }

    public static async updateRolePermissions(role: WorkspaceRole, permissions: Partial<RolePermissions>): Promise<RolePermissions> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().updateRolePermissions(role, permissions);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_role_permissions').upsert(updated);
            } catch (err) {
                console.warn('Postgres rol izni güncelleme hatası:', err);
            }
        }
        return updated;
    }

    // ==========================================
    // GÜVENLİK AYARLARI (Security Settings)
    // ==========================================

    public static async getSecuritySettings(): Promise<WorkspaceSecuritySettings> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_security_settings').select('*').eq('id', 'default').single();
                if (!error && data) return data as WorkspaceSecuritySettings;
            } catch (err) {
                console.warn('Postgres güvenlik ayarları getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getSecuritySettings();
    }

    public static async updateSecuritySettings(settings: Partial<WorkspaceSecuritySettings>): Promise<WorkspaceSecuritySettings> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().updateSecuritySettings(settings);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_security_settings').upsert({ id: 'default', ...updated, updated_at: new Date().toISOString() });
            } catch (err) {
                console.warn('Postgres güvenlik ayarları güncelleme hatası:', err);
            }
        }
        return updated;
    }

    // ==========================================
    // AKTİF OTURUMLAR (Sessions)
    // ==========================================

    public static async registerSession(session: ActiveSession): Promise<void> {
        this.ensureDatabaseConfigured();
        WorkspaceStoreManager.getInstance().registerSession(session);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_active_sessions').insert(session);
            } catch (err) {
                console.warn('Postgres oturum kayıt hatası:', err);
            }
        }
    }

    public static async getActiveSessions(): Promise<ActiveSession[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_active_sessions').select('*');
                if (!error && data) return data as ActiveSession[];
            } catch (err) {
                console.warn('Postgres aktif oturumlar okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getActiveSessions();
    }

    public static async revokeSession(sessionId: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        const revoked = WorkspaceStoreManager.getInstance().revokeSession(sessionId);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_active_sessions').delete().eq('id', sessionId);
            } catch (err) {
                console.warn('Postgres oturum silme hatası:', err);
            }
        }
        return revoked;
    }

    public static isSessionRevoked(sessionId: string): boolean {
        return WorkspaceStoreManager.getInstance().isSessionRevoked(sessionId);
    }

    // ==========================================
    // BİLDİRİMLER (Notifications)
    // ==========================================

    public static async getNotifications(userId?: string): Promise<WorkspaceNotification[]> {
        this.ensureDatabaseConfigured();
        return WorkspaceStoreManager.getInstance().getNotifications(userId);
    }

    public static async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_notification_reads').upsert({
                    notification_id: id,
                    user_id: userId,
                    read_at: new Date().toISOString()
                });
            } catch (err) {
                console.warn('Postgres bildirim okundu hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().markNotificationAsRead(id, userId);
    }

    public static async markAllNotificationsAsRead(userId: string): Promise<void> {
        this.ensureDatabaseConfigured();
        WorkspaceStoreManager.getInstance().markAllNotificationsAsRead(userId);
    }

    public static async dispatchInstantNotification(params: any): Promise<WorkspaceNotification[]> {
        this.ensureDatabaseConfigured();
        const dispatched = WorkspaceStoreManager.getInstance().dispatchInstantNotification(params);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_notifications').insert(dispatched);
            } catch (err) {
                console.warn('Postgres bildirim dağıtma hatası:', err);
            }
        }
        return dispatched;
    }

    // ==========================================
    // DOSYA VE EKLER (Files & Attachments)
    // ==========================================

    public static async registerAttachment(attachment: WorkspaceAttachment, buffer?: Buffer): Promise<void> {
        this.ensureDatabaseConfigured();
        WorkspaceStoreManager.getInstance().registerAttachment(attachment, buffer);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_event_files').insert(attachment);
            } catch (err) {
                console.warn('Postgres dosya metaverisi kayıt hatası:', err);
            }
        }
    }

    public static async addAttachment(eventId: string, attachment: WorkspaceAttachment, buffer?: Buffer): Promise<void> {
        this.ensureDatabaseConfigured();
        try {
            WorkspaceStoreManager.getInstance().addAttachment(eventId, attachment, buffer);
        } catch {
            WorkspaceStoreManager.getInstance().registerAttachment(attachment, buffer);
        }
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_event_files').insert(attachment);
            } catch (err) {
                console.warn('Postgres dosya ekleme hatası:', err);
            }
        }
    }

    public static async getAttachmentByToken(token: string): Promise<{ attachment: WorkspaceAttachment; buffer?: Buffer } | null> {
        this.ensureDatabaseConfigured();
        return WorkspaceStoreManager.getInstance().getAttachmentByToken(token) || null;
    }

    // ==========================================
    // DENETİM İZİ (Audit Logs)
    // ==========================================

    public static async logAudit(log: AuditLogRecord): Promise<void> {
        this.ensureDatabaseConfigured();
        WorkspaceStoreManager.getInstance().logAudit(log);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_audit_logs').insert(log);
            } catch (err) {
                console.warn('Postgres denetim izi kayıt hatası:', err);
            }
        }
    }

    public static async getAuditLogs(): Promise<AuditLogRecord[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_audit_logs').select('*').order('created_at', { ascending: false });
                if (!error && data) return data as AuditLogRecord[];
            } catch (err) {
                console.warn('Postgres denetim izi okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getAuditLogs();
    }
}
