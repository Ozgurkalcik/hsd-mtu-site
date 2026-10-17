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
    WorkspaceCommentTag,
    WorkspaceAttachment,
    WorkspaceMemberNote,
    EventVisibility,
    EventAttendee,
    CommunityProject,
    MemberAttendance
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

    public static async getEvents(calendarId?: string, viewerMember?: WorkspaceMember | null): Promise<WorkspaceEvent[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                let query = supabase.from('workspace_events').select('*');
                if (calendarId) query = query.eq('calendar_id', calendarId);
                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    // Yorum ve alt görevleri veritabanından çekip bağla
                    const [comRes, subRes] = await Promise.all([
                        supabase.from('workspace_event_comments').select('*'),
                        supabase.from('workspace_event_subtasks').select('*')
                    ]);

                    const comments = comRes.data || [];
                    const subtasks = subRes.data || [];

                    let enriched = data.map((ev: any) => ({
                        ...ev,
                        comments: comments.filter((c: any) => c.event_id === ev.id),
                        subtasks: subtasks.filter((s: any) => s.event_id === ev.id),
                        attachments: [],
                        reminders: ev.reminders || [],
                        edit_history: ev.edit_history || []
                    })) as WorkspaceEvent[];

                    // Görünürlük (Visibility) Filtreleme
                    const isViewerAdmin = viewerMember?.role === 'super_admin' ||
                        viewerMember?.role === 'workspace_admin' ||
                        viewerMember?.role === 'editor';

                    enriched = enriched.filter(e => {
                        const vis = e.visibility || 'public';
                        if (vis === 'public') return true;
                        if (vis === 'admin_only') return isViewerAdmin;
                        if (vis === 'private') {
                            return viewerMember && (e.created_by === viewerMember.id || viewerMember.role === 'super_admin');
                        }
                        if (vis === 'committee') {
                            if (!viewerMember) return false;
                            if (viewerMember.role === 'super_admin' || viewerMember.role === 'workspace_admin' || viewerMember.role === 'editor' || e.created_by === viewerMember.id) return true;
                            const allowed = (e as any).allowed_committee_ids || [];
                            if (!Array.isArray(allowed) || allowed.length === 0) return false;
                            if (allowed.includes('cal_core') || allowed.includes('all')) return true;
                            if (viewerMember.group_id && allowed.includes(viewerMember.group_id)) return true;
                            const calToGroupMap: Record<string, string> = {
                                cal_proj: 'grp_project',
                                cal_event: 'grp_event_sponsor',
                                cal_social: 'grp_social_design',
                                cal_medium: 'grp_medium',
                                cal_mgmt: 'grp_mgmt',
                                cal_ai: 'grp_ai'
                            };
                            const groupToCalMap: Record<string, string> = {
                                grp_project: 'cal_proj',
                                grp_event_sponsor: 'cal_event',
                                grp_social_design: 'cal_social',
                                grp_medium: 'cal_medium',
                                grp_mgmt: 'cal_mgmt',
                                grp_ai: 'cal_ai'
                            };
                            if (viewerMember.group_id && groupToCalMap[viewerMember.group_id] && allowed.includes(groupToCalMap[viewerMember.group_id])) {
                                return true;
                            }
                            for (const cId of allowed) {
                                if (calToGroupMap[cId] && viewerMember.group_id === calToGroupMap[cId]) return true;
                            }
                            if (Array.isArray(e.assignees) && (e.assignees.includes(viewerMember.id) || e.assignees.includes(viewerMember.username))) {
                                return true;
                            }
                            return false;
                        }
                        if (vis === 'custom') {
                            if (!viewerMember) return false;
                            if (viewerMember.role === 'super_admin' || e.created_by === viewerMember.id) return true;
                            const allowed = (e as any).allowed_member_ids || e.assignees || [];
                            return allowed.includes(viewerMember.id) || allowed.includes(viewerMember.username);
                        }
                        return true;
                    });

                    return enriched;
                } else if (!error && data && data.length === 0) {
                    return [];
                }
            } catch (err) {
                console.warn('Postgres etkinlik okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getEvents(calendarId, viewerMember);
    }

    public static async getEventById(id: string): Promise<WorkspaceEvent | null> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_events').select('*').eq('id', id).single();
                if (!error && data) {
                    const [comRes, subRes] = await Promise.all([
                        supabase.from('workspace_event_comments').select('*').eq('event_id', id),
                        supabase.from('workspace_event_subtasks').select('*').eq('event_id', id)
                    ]);
                    return {
                        ...data,
                        comments: comRes.data || [],
                        subtasks: subRes.data || [],
                        attachments: [],
                        reminders: data.reminders || [],
                        edit_history: data.edit_history || []
                    } as WorkspaceEvent;
                }
            } catch (err) {
                console.warn('Postgres etkinlik getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getEventById(id) || null;
    }

    public static async createEvent(event: WorkspaceEvent): Promise<WorkspaceEvent> {
        this.ensureDatabaseConfigured();
        const storeEvent = WorkspaceStoreManager.getInstance().addEvent(event);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                // İlişkisel tablolara ait olan dizi alanları ayıkla
                const dbEvent = {
                    id: event.id,
                    calendar_id: event.calendar_id,
                    title: event.title,
                    description: event.description || '',
                    category: event.category || 'Toplantı',
                    color: event.color || '#dc2626',
                    start_time: event.start_time,
                    end_time: event.end_time,
                    is_all_day: Boolean(event.is_all_day),
                    assignees: event.assignees || [],
                    allowed_member_ids: event.allowed_member_ids || [],
                    allowed_committee_ids: event.allowed_committee_ids || [],
                    location: event.location || null,
                    meeting_link: event.meeting_link || null,
                    status: event.status || 'scheduled',
                    visibility: event.visibility || 'public',
                    created_by: event.created_by || null,
                    reminders: event.reminders || [],
                    edit_history: event.edit_history || [],
                    is_showcase: Boolean(event.is_showcase),
                    rsvp_enabled: Boolean(event.rsvp_enabled),
                    rsvp_qr_enabled: Boolean(event.rsvp_qr_enabled),
                    rsvp_capacity: event.rsvp_capacity || null,
                    version: event.version || 1,
                    created_at: event.created_at || new Date().toISOString(),
                    updated_at: event.updated_at || new Date().toISOString()
                };

                let { data, error } = await supabase.from('workspace_events').insert(dbEvent).select().single();
                if (error && (error.code === '42703' || String(error.message).includes('column'))) {
                    // Graceful fallback if allowed_committee_ids or allowed_member_ids columns are not yet in Postgres
                    const { allowed_committee_ids, allowed_member_ids, ...strippedDbEvent } = dbEvent as any;
                    const retry = await supabase.from('workspace_events').insert(strippedDbEvent).select().single();
                    if (!retry.error && retry.data) {
                        data = retry.data;
                        error = null;
                    }
                }
                if (!error && data) {
                    // Alt görev varsa veritabanına ekle
                    if (event.subtasks && event.subtasks.length > 0) {
                        for (const st of event.subtasks) {
                            await supabase.from('workspace_event_subtasks').insert(st);
                        }
                    }
                    // Yorum varsa veritabanına ekle
                    if (event.comments && event.comments.length > 0) {
                        for (const com of event.comments) {
                            await supabase.from('workspace_event_comments').insert(com);
                        }
                    }
                    return {
                        ...data,
                        subtasks: event.subtasks || [],
                        comments: event.comments || [],
                        attachments: event.attachments || [],
                        reminders: event.reminders || [],
                        edit_history: event.edit_history || []
                    } as WorkspaceEvent;
                } else if (error) {
                    console.warn('Postgres etkinlik kayıt hatası (fallback taban):', error);
                }
            } catch (err) {
                console.warn('Postgres etkinlik kayıt hatası:', err);
            }
        }
        return storeEvent;
    }

    public static async updateEventWithConcurrency(
        id: string,
        updates: Partial<WorkspaceEvent>,
        expectedVersion: number,
        editingMember?: WorkspaceMember | null,
        changeSummary?: string
    ): Promise<{ success: boolean; conflict?: boolean; currentVersion?: number; event?: WorkspaceEvent }> {
        this.ensureDatabaseConfigured();

        // Düzenleme geçmişi kaydını hazırla
        const currentEvent = await this.getEventById(id);
        if (!currentEvent) return { success: false };

        if (editingMember) {
            const updatedHistory = [...(updates.edit_history || currentEvent.edit_history || [])];
            updatedHistory.push({
                id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                event_id: id,
                user_id: editingMember.id,
                user_name: editingMember.display_name,
                user_avatar: editingMember.avatar_url,
                action: 'updated',
                details: changeSummary || 'Etkinlik güncellendi',
                timestamp: new Date().toISOString()
            });
            updates.edit_history = updatedHistory;
        }

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                if (currentEvent.version !== expectedVersion) {
                    return {
                        success: false,
                        conflict: true,
                        currentVersion: currentEvent.version,
                        event: currentEvent
                    };
                }

                const newVersion = currentEvent.version + 1;
                const { comments, subtasks, attachments, reminders, ...allowedDbFields } = updates as any;

                let { data, error } = await supabase
                    .from('workspace_events')
                    .update({ ...allowedDbFields, version: newVersion, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .eq('version', expectedVersion)
                    .select()
                    .single();

                if (error && (error.code === '42703' || String(error.message).includes('column'))) {
                    // Graceful fallback if columns are missing
                    const { allowed_committee_ids, allowed_member_ids, ...strippedDbFields } = allowedDbFields;
                    const retry = await supabase
                        .from('workspace_events')
                        .update({ ...strippedDbFields, version: newVersion, updated_at: new Date().toISOString() })
                        .eq('id', id)
                        .eq('version', expectedVersion)
                        .select()
                        .single();
                    if (!retry.error && retry.data) {
                        data = retry.data;
                        error = null;
                    }
                }

                if (!error && data) {
                    WorkspaceStoreManager.getInstance().updateEventWithConcurrency(id, updates, expectedVersion);
                    const fresh = await this.getEventById(id);
                    return { success: true, event: fresh || (data as WorkspaceEvent) };
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
        const subtaskId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newSubtask: WorkspaceSubtask = {
            id: subtaskId,
            event_id: eventId,
            title,
            is_completed: false,
            created_at: new Date().toISOString()
        };

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('workspace_event_subtasks')
                    .insert(newSubtask)
                    .select()
                    .single();

                if (!error && data) {
                    try { WorkspaceStoreManager.getInstance().addSubtask(eventId, title); } catch {}
                    return data as WorkspaceSubtask;
                }
                if (error) {
                    console.warn('Postgres subtask ekleme uyarısı:', error);
                }
            } catch (err) {
                console.warn('Postgres subtask ekleme hatası:', err);
            }
        }

        try {
            return WorkspaceStoreManager.getInstance().addSubtask(eventId, title);
        } catch {
            return newSubtask;
        }
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
                const { data, error } = await supabase
                    .from('workspace_event_comments')
                    .select('*')
                    .eq('event_id', eventId)
                    .order('created_at', { ascending: true });
                if (!error && Array.isArray(data)) {
                    return data.map((row: any) => ({
                        id: row.id,
                        event_id: row.event_id,
                        user_id: row.user_id,
                        user_name: row.user_name || 'Topluluk Üyesi',
                        user_avatar: row.user_avatar || undefined,
                        content: row.content || '',
                        tag: row.tag || 'general',
                        is_pinned: Boolean(row.is_pinned),
                        reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
                        created_at: row.created_at || new Date().toISOString()
                    }));
                }
            } catch (err) {
                console.warn('Postgres yorum okuma hatası:', err);
            }
        }
        const event = WorkspaceStoreManager.getInstance().getEventById(eventId);
        return event?.comments || [];
    }

    public static async addComment(
        eventId: string,
        userId: string,
        userName: string,
        content: string,
        tag: WorkspaceCommentTag = 'general',
        isPinned: boolean = false,
        userAvatar?: string
    ): Promise<WorkspaceComment> {
        this.ensureDatabaseConfigured();
        const commentId = `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const nowIso = new Date().toISOString();

        const newComment: WorkspaceComment = {
            id: commentId,
            event_id: eventId,
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            content,
            is_pinned: isPinned,
            tag,
            reactions: {},
            created_at: nowIso
        };

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                // 1) First attempt: insert full object (with extended fields)
                let { data, error } = await supabase
                    .from('workspace_event_comments')
                    .insert(newComment)
                    .select()
                    .single();

                // 2) If failed due to missing column (schema cache / unmigrated), fallback to standard schema columns
                if (error) {
                    console.warn('Postgres genişletilmiş yorum ekleme hatası, temel şemayla deneniyor:', error.message);
                    const fallbackPayload = {
                        id: newComment.id,
                        event_id: newComment.event_id,
                        user_id: newComment.user_id,
                        user_name: newComment.user_name,
                        content: newComment.content,
                        created_at: newComment.created_at
                    };
                    const fallbackRes = await supabase
                        .from('workspace_event_comments')
                        .insert(fallbackPayload)
                        .select()
                        .single();
                    if (!fallbackRes.error && fallbackRes.data) {
                        data = { ...newComment, ...fallbackRes.data };
                        error = null;
                    }
                }

                if (!error && data) {
                    try {
                        WorkspaceStoreManager.getInstance().addComment(eventId, userId, userName, content, tag, isPinned, userAvatar);
                    } catch {}
                    return {
                        id: data.id || newComment.id,
                        event_id: data.event_id || newComment.event_id,
                        user_id: data.user_id || newComment.user_id,
                        user_name: data.user_name || newComment.user_name,
                        user_avatar: data.user_avatar || userAvatar,
                        content: data.content || newComment.content,
                        tag: data.tag || tag,
                        is_pinned: Boolean(data.is_pinned ?? isPinned),
                        reactions: data.reactions && typeof data.reactions === 'object' ? data.reactions : {},
                        created_at: data.created_at || nowIso
                    };
                }
            } catch (err) {
                console.warn('Postgres yorum ekleme hatası:', err);
            }
        }

        try {
            return WorkspaceStoreManager.getInstance().addComment(eventId, userId, userName, content, tag, isPinned, userAvatar);
        } catch {
            return newComment;
        }
    }

    public static async toggleCommentPin(eventId: string, commentId: string): Promise<WorkspaceComment | null> {
        this.ensureDatabaseConfigured();
        let updated: WorkspaceComment | null = null;
        try {
            updated = WorkspaceStoreManager.getInstance().toggleCommentPin(eventId, commentId);
        } catch {}

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                let nextPinned = updated ? updated.is_pinned : true;
                if (!updated) {
                    const { data } = await supabase.from('workspace_event_comments').select('*').eq('id', commentId).single();
                    if (data) {
                        nextPinned = !Boolean(data.is_pinned);
                    }
                }
                const { data: updatedDb, error } = await supabase
                    .from('workspace_event_comments')
                    .update({ is_pinned: nextPinned })
                    .eq('id', commentId)
                    .select()
                    .single();
                if (!error && updatedDb) {
                    return {
                        id: updatedDb.id,
                        event_id: updatedDb.event_id,
                        user_id: updatedDb.user_id,
                        user_name: updatedDb.user_name,
                        user_avatar: updatedDb.user_avatar,
                        content: updatedDb.content,
                        tag: updatedDb.tag || 'general',
                        is_pinned: Boolean(updatedDb.is_pinned),
                        reactions: updatedDb.reactions && typeof updatedDb.reactions === 'object' ? updatedDb.reactions : {},
                        created_at: updatedDb.created_at
                    };
                }
            } catch (err) {
                console.warn('Postgres yorum sabitleme güncelleme hatası:', err);
            }
        }
        return updated;
    }

    public static async toggleCommentReaction(eventId: string, commentId: string, emoji: string, userName: string): Promise<WorkspaceComment | null> {
        this.ensureDatabaseConfigured();
        let updated: WorkspaceComment | null = null;
        try {
            updated = WorkspaceStoreManager.getInstance().toggleCommentReaction(eventId, commentId, emoji, userName);
        } catch {}

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                let nextReactions: Record<string, string[]> = (updated && updated.reactions) ? updated.reactions : {};
                if (!updated) {
                    const { data } = await supabase.from('workspace_event_comments').select('*').eq('id', commentId).single();
                    if (data) {
                        const reactions = (data.reactions && typeof data.reactions === 'object') ? { ...data.reactions } : {};
                        const userList: string[] = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
                        const userIdx = userList.indexOf(userName);
                        if (userIdx >= 0) {
                            userList.splice(userIdx, 1);
                        } else {
                            userList.push(userName);
                        }
                        if (userList.length === 0) {
                            delete reactions[emoji];
                        } else {
                            reactions[emoji] = userList;
                        }
                        nextReactions = reactions;
                    }
                }
                const { data: updatedDb, error } = await supabase
                    .from('workspace_event_comments')
                    .update({ reactions: nextReactions })
                    .eq('id', commentId)
                    .select()
                    .single();
                if (!error && updatedDb) {
                    return {
                        id: updatedDb.id,
                        event_id: updatedDb.event_id,
                        user_id: updatedDb.user_id,
                        user_name: updatedDb.user_name,
                        user_avatar: updatedDb.user_avatar,
                        content: updatedDb.content,
                        tag: updatedDb.tag || 'general',
                        is_pinned: Boolean(updatedDb.is_pinned),
                        reactions: updatedDb.reactions && typeof updatedDb.reactions === 'object' ? updatedDb.reactions : {},
                        created_at: updatedDb.created_at
                    };
                }
            } catch (err) {
                console.warn('Postgres yorum reaksiyon güncelleme hatası:', err);
            }
        }
        return updated;
    }

    public static async deleteComment(eventId: string, commentId: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        let deleted = false;
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { error } = await supabase.from('workspace_event_comments').delete().eq('id', commentId);
                if (!error) deleted = true;
            } catch (err) {
                console.warn('Postgres yorum silme hatası:', err);
            }
        }
        try {
            const storeDeleted = WorkspaceStoreManager.getInstance().deleteComment(eventId, commentId);
            if (storeDeleted) deleted = true;
        } catch {}
        return deleted;
    }

    // ==========================================
    // ÜYELER (Members & User Accounts)
    // ==========================================

    public static normalizeNameForMatch(name: string): string {
        if (!name) return '';
        return name
            .trim()
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .toLowerCase()
            .replace(/ç/g, 'c')
            .replace(/ğ/g, 'g')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ş/g, 's')
            .replace(/ü/g, 'u')
            .replace(/[^a-z0-9]/g, '');
    }

    public static sanitizeMember(member: WorkspaceMember | null): WorkspaceMember | null {
        if (!member) return null;
        const sanitized = { ...member };
        if ('password_hash' in sanitized) {
            delete (sanitized as any).password_hash;
        }
        return sanitized;
    }

    public static async resolveMemberAvatar(member: WorkspaceMember | null): Promise<WorkspaceMember | null> {
        if (!member) return null;
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data: teamMembers } = await supabase
                    .from('team_members')
                    .select('full_name, image_url')
                    .not('image_url', 'is', null);

                if (teamMembers && teamMembers.length > 0) {
                    const memNorm = this.normalizeNameForMatch(member.display_name);
                    const userNorm = member.username ? this.normalizeNameForMatch(member.username) : '';

                    for (const tm of teamMembers) {
                        if (!tm.full_name || !tm.image_url) continue;
                        const tmNorm = this.normalizeNameForMatch(tm.full_name);
                        if (
                            tmNorm === memNorm ||
                            (memNorm.length >= 3 && tmNorm.includes(memNorm)) ||
                            (tmNorm.length >= 3 && memNorm.includes(tmNorm)) ||
                            (userNorm.length >= 3 && tmNorm.includes(userNorm))
                        ) {
                            member.avatar_url = tm.image_url;
                            // Arka planda veritabanına da kalıcı olarak yaz
                            supabase
                                .from('workspace_members')
                                .update({ avatar_url: tm.image_url })
                                .eq('id', member.id)
                                .then(() => {});
                            break;
                        }
                    }
                }
            } catch {
                // ignore
            }
        }
        return this.sanitizeMember(member);
    }

    public static async getMembers(): Promise<WorkspaceMember[]> {
        this.ensureDatabaseConfigured();
        let members: WorkspaceMember[] = [];
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*');
                if (!error && data && data.length > 0) {
                    members = data as WorkspaceMember[];
                }

                // Ekip üyeleri (team_members) tablosundan profil fotoğraflarını çekip bağla
                try {
                    const { data: teamMembers } = await supabase
                        .from('team_members')
                        .select('full_name, image_url')
                        .not('image_url', 'is', null);

                    if (teamMembers && teamMembers.length > 0) {
                        for (const m of members) {
                            const memNorm = this.normalizeNameForMatch(m.display_name);
                            const userNorm = m.username ? this.normalizeNameForMatch(m.username) : '';
                            for (const tm of teamMembers) {
                                if (!tm.full_name || !tm.image_url) continue;
                                const tmNorm = this.normalizeNameForMatch(tm.full_name);
                                if (
                                    tmNorm === memNorm ||
                                    (memNorm.length >= 3 && tmNorm.includes(memNorm)) ||
                                    (tmNorm.length >= 3 && memNorm.includes(tmNorm)) ||
                                    (userNorm.length >= 3 && tmNorm.includes(userNorm))
                                ) {
                                    m.avatar_url = tm.image_url;
                                    break;
                                }
                            }
                        }
                    }
                } catch {
                    // ignore
                }
            } catch (err) {
                console.warn('Postgres üye listesi okuma hatası:', err);
            }
        }

        if (members.length === 0) {
            members = WorkspaceStoreManager.getInstance().getMembers();
        } else {
            // Local store'daki yeni eklenenleri de koru
            const storeMembers = WorkspaceStoreManager.getInstance().getMembers();
            const memberIds = new Set(members.map(m => m.id));
            for (const sm of storeMembers) {
                if (!memberIds.has(sm.id)) {
                    members.push(sm);
                }
            }
        }
        return members.map(m => this.sanitizeMember(m)!);
    }

    public static async getMemberById(id: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        if (!id) return null;
        const cleanId = String(id).trim();
        let found: WorkspaceMember | null = null;
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('workspace_members')
                    .select('*')
                    .or(`id.eq.${cleanId},email.eq.${cleanId.toLowerCase()},username.eq.${cleanId.toLowerCase()}`)
                    .maybeSingle();
                if (!error && data) found = data as WorkspaceMember;
            } catch (err) {
                console.warn('Postgres üye getirme hatası:', err);
            }
        }
        if (!found) {
            found = WorkspaceStoreManager.getInstance().getMemberById(cleanId) ||
                WorkspaceStoreManager.getInstance().getMemberByEmail(cleanId) ||
                WorkspaceStoreManager.getInstance().getMemberByUsername(cleanId) || null;
        }
        return await this.resolveMemberAvatar(found);
    }

    public static async getMemberByEmail(email: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        let found: WorkspaceMember | null = null;
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*').eq('email', email.trim().toLowerCase()).single();
                if (!error && data) found = data as WorkspaceMember;
            } catch (err) {
                console.warn('Postgres üye getirme hatası:', err);
            }
        }
        if (!found) {
            found = WorkspaceStoreManager.getInstance().getMemberByEmail(email) || null;
        }
        return await this.resolveMemberAvatar(found);
    }

    public static async getMemberByUsername(username: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        const clean = username.trim().toLowerCase().replace(/^@/, '');
        let found: WorkspaceMember | null = null;
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_members').select('*').eq('username', clean).single();
                if (!error && data) found = data as WorkspaceMember;
            } catch (err) {
                console.warn('Postgres kullanıcı adı getirme hatası:', err);
            }
        }
        if (!found) {
            found = WorkspaceStoreManager.getInstance().getMemberByUsername(clean) || null;
        }
        return await this.resolveMemberAvatar(found);
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
        const fromStore = WorkspaceStoreManager.getInstance().getMemberByEmailOrUsername(clean) || null;
        return await this.resolveMemberAvatar(fromStore);
    }

    public static async addMember(member: WorkspaceMember, password?: string): Promise<WorkspaceMember> {
        this.ensureDatabaseConfigured();
        const storeCreated = WorkspaceStoreManager.getInstance().addMember(member, password);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const payload: any = {
                    id: member.id,
                    email: member.email,
                    display_name: member.display_name,
                    role: member.role,
                    status: member.status || 'active',
                    mfa_enabled: Boolean(member.mfa_enabled),
                    must_change_password: Boolean(member.must_change_password),
                    avatar_url: member.avatar_url || null,
                    created_at: member.created_at || new Date().toISOString()
                };
                if (member.username) payload.username = member.username;
                if (member.group_id) payload.group_id = member.group_id;
                if (password) payload.password_hash = hashPassword(password);

                const { error } = await supabase.from('workspace_members').insert(payload);
                if (error) {
                    console.warn('Postgres üye ekleme hatası, temel kolonlarla deneniyor:', error);
                    const corePayload = {
                        id: member.id,
                        email: member.email,
                        display_name: member.display_name,
                        role: member.role,
                        status: member.status || 'active',
                        mfa_enabled: Boolean(member.mfa_enabled),
                        avatar_url: member.avatar_url || null,
                        created_at: member.created_at || new Date().toISOString()
                    };
                    const { error: coreErr } = await supabase.from('workspace_members').insert(corePayload);
                    if (coreErr) {
                        console.error('Postgres temel üye ekleme hatası:', coreErr);
                    }
                }
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
                if (!error && data && data.length > 0) {
                    return (data as WorkspaceCalendar[]).filter(c => c.id !== 'cal_ai' && !c.title.includes('Ar-Ge'));
                }
            } catch (err) {
                console.warn('Postgres takvim okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getCalendars().filter(c => c.id !== 'cal_ai' && !c.title.includes('Ar-Ge'));
    }

    public static async getGroups(): Promise<WorkspaceGroup[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_groups').select('*');
                if (!error && data && data.length > 0) {
                    return (data as any[]).map(g => ({
                        ...g,
                        members: Array.isArray(g.members)
                            ? g.members
                            : (typeof g.members === 'string' ? (() => {
                                try { return JSON.parse(g.members); } catch { return []; }
                            })() : [])
                    })).filter(g => g.id !== 'grp_ai' && !g.name.includes('Ar-Ge'));
                }
            } catch (err) {
                console.warn('Postgres grup okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getGroups().filter(g => g.id !== 'grp_ai' && !g.name.includes('Ar-Ge'));
    }

    public static async getGroupById(id: string): Promise<WorkspaceGroup | null> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase.from('workspace_groups').select('*').eq('id', id).single();
                if (!error && data) {
                    return {
                        ...data,
                        members: Array.isArray(data.members)
                            ? data.members
                            : (typeof data.members === 'string' ? (() => {
                                try { return JSON.parse(data.members); } catch { return []; }
                            })() : [])
                    } as WorkspaceGroup;
                }
            } catch (err) {
                console.warn('Postgres grup tekil okuma hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getGroupById(id) || null;
    }

    public static async addGroup(group: WorkspaceGroup): Promise<WorkspaceGroup> {
        this.ensureDatabaseConfigured();
        const created = WorkspaceStoreManager.getInstance().addGroup(group);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_groups').insert({
                    ...group,
                    members: Array.isArray(group.members) ? group.members : []
                });
            } catch (err) {
                console.warn('Postgres grup ekleme hatası:', err);
            }
        }
        return created;
    }

    public static async updateGroup(id: string, updates: Partial<WorkspaceGroup>): Promise<WorkspaceGroup | null> {
        this.ensureDatabaseConfigured();
        let result: WorkspaceGroup | null = null;
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('workspace_groups')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();
                if (!error && data) {
                    result = {
                        ...data,
                        members: Array.isArray(data.members)
                            ? data.members
                            : (typeof data.members === 'string' ? (() => {
                                try { return JSON.parse(data.members); } catch { return []; }
                            })() : [])
                    } as WorkspaceGroup;
                }
            } catch (err) {
                console.warn('Postgres grup güncelleme hatası:', err);
            }
        }
        const updated = WorkspaceStoreManager.getInstance().updateGroup(id, updates);
        return result || updated || null;
    }

    public static async toggleGroupMember(groupId: string, memberId: string, add: boolean): Promise<WorkspaceGroup | null> {
        this.ensureDatabaseConfigured();
        let targetGroup: WorkspaceGroup | null = null;

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                // 1. Veritabanındaki güncel grup kaydını doğrudan çek (Serverless hafıza kaybını engeller)
                const { data: dbGroup, error: fetchErr } = await supabase
                    .from('workspace_groups')
                    .select('*')
                    .eq('id', groupId)
                    .single();

                if (!fetchErr && dbGroup) {
                    let currentMembers: string[] = [];
                    if (Array.isArray(dbGroup.members)) {
                        currentMembers = [...dbGroup.members];
                    } else if (typeof dbGroup.members === 'string') {
                        try {
                            const parsed = JSON.parse(dbGroup.members);
                            if (Array.isArray(parsed)) currentMembers = parsed;
                        } catch {
                            currentMembers = [];
                        }
                    }

                    if (add) {
                        if (!currentMembers.includes(memberId)) {
                            currentMembers.push(memberId);
                        }
                    } else {
                        currentMembers = currentMembers.filter(m => m !== memberId);
                    }

                    // 2. Güncellenmiş üyeler dizisini Postgres'e yaz
                    const { data: updatedDbGroup, error: updateErr } = await supabase
                        .from('workspace_groups')
                        .update({ members: currentMembers })
                        .eq('id', groupId)
                        .select()
                        .single();

                    if (!updateErr && updatedDbGroup) {
                        targetGroup = {
                            ...updatedDbGroup,
                            members: Array.isArray(updatedDbGroup.members) ? updatedDbGroup.members : currentMembers
                        } as WorkspaceGroup;
                    } else {
                        targetGroup = {
                            ...dbGroup,
                            members: currentMembers
                        } as WorkspaceGroup;
                    }

                    // 3. workspace_members tablosundaki group_id değerini senkronize et
                    try {
                        if (add) {
                            await supabase
                                .from('workspace_members')
                                .update({ group_id: groupId })
                                .eq('id', memberId);
                        } else {
                            await supabase
                                .from('workspace_members')
                                .update({ group_id: null })
                                .eq('id', memberId)
                                .eq('group_id', groupId);
                        }
                    } catch (syncErr) {
                        console.warn('Üye group_id senkronizasyon uyarısı:', syncErr);
                    }

                    // 4. Bellek içi depoyu da güncelle
                    try {
                        const storeGroup = WorkspaceStoreManager.getInstance().getGroupById(groupId);
                        if (storeGroup) {
                            storeGroup.members = currentMembers;
                        }
                    } catch {}

                    return targetGroup;
                }
            } catch (err) {
                console.warn('Postgres grup üye güncelleme hatası:', err);
            }
        }

        // Supabase yapılandırılmamışsa veya bağlantı hatasında bellek içi fallback
        try {
            const updated = WorkspaceStoreManager.getInstance().toggleGroupMember(groupId, memberId, add);
            return updated || null;
        } catch {
            return null;
        }
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
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                let query = supabase
                    .from('workspace_notifications')
                    .select('*')
                    .neq('is_active', false)
                    .neq('id', 'notif_welcome')
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (userId && userId !== 'all') {
                    query = query.or(`user_id.eq.all,user_id.eq.${userId}`);
                }
                const { data, error } = await query;
                if (!error && data && data.length > 0) {
                    let readIds = new Set<string>();
                    if (userId && userId !== 'all') {
                        const { data: reads } = await supabase.from('workspace_notification_reads').select('notification_id').eq('user_id', userId);
                        if (reads) {
                            reads.forEach(r => readIds.add(r.notification_id));
                        }
                    }
                    return data
                        .filter(n => n.id !== 'notif_welcome' && !n.title?.includes('Workspace Başlatıldı'))
                        .map(n => ({
                            ...n,
                            is_active: n.is_active !== false,
                            is_read: n.is_read || readIds.has(n.id)
                        }));
                }
            } catch (err) {
                console.warn('Postgres bildirim getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getNotifications(userId)
            .filter(n => n.id !== 'notif_welcome' && !n.title?.includes('Workspace Başlatıldı'));
    }

    public static async getAllNotificationsAdmin(): Promise<WorkspaceNotification[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('workspace_notifications')
                    .select('*')
                    .neq('id', 'notif_welcome')
                    .order('created_at', { ascending: false })
                    .limit(200);
                if (!error && data && data.length > 0) {
                    return data
                        .filter(n => n.id !== 'notif_welcome' && !n.title?.includes('Workspace Başlatıldı'))
                        .map(n => ({
                            ...n,
                            is_active: n.is_active !== false
                        }));
                }
            } catch (err) {
                console.warn('Postgres admin bildirimleri getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getAllNotificationsAdmin()
            .filter(n => n.id !== 'notif_welcome' && !n.title?.includes('Workspace Başlatıldı'));
    }

    public static async toggleNotificationActive(id: string, isActive: boolean): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_notifications').update({ is_active: isActive }).eq('id', id);
            } catch (err) {
                console.warn('Postgres bildirim aktiflik güncelleme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().toggleNotificationActive(id, isActive);
    }

    public static async toggleNotificationsActive(ids: string[], isActive: boolean): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_notifications').update({ is_active: isActive }).in('id', ids);
            } catch (err) {
                console.warn('Postgres toplu bildirim aktiflik güncelleme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().toggleNotificationsActive(ids, isActive);
    }

    public static async deleteNotification(id: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_notifications').delete().eq('id', id);
            } catch (err) {
                console.warn('Postgres bildirim silme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().deleteNotification(id);
    }

    public static async deleteNotifications(ids: string[]): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_notifications').delete().in('id', ids);
            } catch (err) {
                console.warn('Postgres toplu bildirim silme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().deleteNotifications(ids);
    }

    public static async clearNotificationHistory(filter?: 'all' | 'read' | 'inactive'): Promise<boolean> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                if (!filter || filter === 'all') {
                    await supabase.from('workspace_notifications').delete().neq('id', '___non_existent___');
                } else if (filter === 'inactive') {
                    await supabase.from('workspace_notifications').delete().eq('is_active', false);
                } else if (filter === 'read') {
                    await supabase.from('workspace_notifications').delete().eq('is_read', true);
                }
            } catch (err) {
                console.warn('Postgres bildirim geçmişi temizleme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().clearNotificationHistory(filter);
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
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const notifications = await this.getNotifications(userId);
                const unread = notifications.filter(n => !n.is_read);
                if (unread.length > 0) {
                    const toInsert = unread.map(n => ({
                        notification_id: n.id,
                        user_id: userId,
                        read_at: new Date().toISOString()
                    }));
                    await supabase.from('workspace_notification_reads').upsert(toInsert);
                }
            } catch (err) {
                console.warn('Postgres tüm bildirimleri okundu yapma hatası:', err);
            }
        }
        WorkspaceStoreManager.getInstance().markAllNotificationsAsRead(userId);
    }

    public static async dispatchInstantNotification(params: any): Promise<WorkspaceNotification[]> {
        this.ensureDatabaseConfigured();
        let dispatched = WorkspaceStoreManager.getInstance().dispatchInstantNotification(params);

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                // Eğer serverless soğuk başlangıçta in-memory liste boşsa, üyeleri doğrudan Supabase'den çek
                if (dispatched.length === 0) {
                    const nowStr = new Date().toISOString();
                    const notifType = params.type || 'announcement';

                    if (params.targetAudience === 'group' && params.targetGroupId) {
                        const { data: grp } = await supabase
                            .from('workspace_groups')
                            .select('name, members')
                            .eq('id', params.targetGroupId)
                            .maybeSingle();

                        if (grp) {
                            let memberIds: string[] = [];
                            if (Array.isArray(grp.members)) memberIds = grp.members;
                            else if (typeof grp.members === 'string') {
                                try { memberIds = JSON.parse(grp.members); } catch {}
                            }
                            dispatched = memberIds.map(mId => ({
                                id: `notif_${Date.now()}_${mId}`,
                                user_id: mId,
                                event_id: params.eventId,
                                event_title: params.eventTitle,
                                title: `[${grp.name || 'Komite'}] ${params.title}`,
                                message: params.message,
                                type: notifType,
                                is_read: false,
                                is_active: true,
                                created_at: nowStr
                            }));
                        }
                    } else if (params.targetAudience === 'role' && params.targetRole) {
                        const { data: roleMembers } = await supabase
                            .from('workspace_members')
                            .select('id')
                            .eq('role', params.targetRole);

                        if (roleMembers && roleMembers.length > 0) {
                            dispatched = roleMembers.map(m => ({
                                id: `notif_${Date.now()}_${m.id}`,
                                user_id: m.id,
                                event_id: params.eventId,
                                event_title: params.eventTitle,
                                title: params.title,
                                message: params.message,
                                type: notifType,
                                is_read: false,
                                is_active: true,
                                created_at: nowStr
                            }));
                        }
                    }
                }

                if (dispatched.length > 0) {
                    await supabase.from('workspace_notifications').insert(dispatched);
                }
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

    public static async clearAuditLogs(clearedBy: string): Promise<boolean> {
        this.ensureDatabaseConfigured();
        WorkspaceStoreManager.getInstance().clearAuditLogs(clearedBy);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase.from('workspace_audit_logs').delete().neq('id', 'placeholder_keep_schema');
                await supabase.from('workspace_audit_logs').insert({
                    id: `audit_clear_${Date.now()}`,
                    user_id: 'admin',
                    user_email: clearedBy,
                    action: 'AUDIT_LOGS_CLEARED',
                    entity_type: 'SECURITY',
                    details: `Denetim günlüğü geçmişi ${clearedBy} tarafından güvenle temizlendi.`,
                    created_at: new Date().toISOString()
                });
            } catch (err) {
                console.warn('Postgres denetim izi temizleme hatası:', err);
            }
        }
        return true;
    }

    // ==========================================
    // ÜYE NOTLARI & DEĞERLENDİRME (Member Notes)
    // ==========================================

    public static async addMemberNote(
        memberId: string,
        note: { author_id: string; author_name: string; content: string }
    ): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().addMemberNote(memberId, note);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const member = await this.getMemberById(memberId);
                const notes = member?.member_notes || [];
                const newNoteObj = {
                    id: `mn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    author_id: note.author_id,
                    author_name: note.author_name,
                    content: note.content,
                    created_at: new Date().toISOString()
                };
                const updatedNotes = [newNoteObj, ...notes];
                await supabase.from('workspace_members').update({ member_notes: updatedNotes }).eq('id', memberId);
            } catch (err) {
                console.warn('Postgres üye notu ekleme hatası:', err);
            }
        }
        return updated;
    }

    public static async deleteMemberNote(memberId: string, noteId: string): Promise<WorkspaceMember | null> {
        this.ensureDatabaseConfigured();
        const updated = WorkspaceStoreManager.getInstance().deleteMemberNote(memberId, noteId);
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const member = await this.getMemberById(memberId);
                if (member?.member_notes) {
                    const filtered = member.member_notes.filter(n => n.id !== noteId);
                    await supabase.from('workspace_members').update({ member_notes: filtered }).eq('id', memberId);
                }
            } catch (err) {
                console.warn('Postgres üye notu silme hatası:', err);
            }
        }
        return updated;
    }

    // ==========================================
    // VİTRİN & GENEL ETKİNLİKLER (Public Showcase)
    // ==========================================

    public static async getPublicShowcaseEvents(): Promise<any[]> {
        this.ensureDatabaseConfigured();
        const results: any[] = [];
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                // Yalnızca klasik events tablosundaki halka açık etkinlikler (workspace_events kesinlikle ana sayfaya sızdırılmaz)
                const { data: legacyEvents } = await supabase
                    .from('events')
                    .select('*')
                    .eq('is_active', true)
                    .order('event_date', { ascending: false });

                if (legacyEvents && legacyEvents.length > 0) {
                    legacyEvents.forEach((ev: any) => {
                        results.push(ev);
                    });
                }
            } catch (err) {
                console.warn('Vitrin etkinlikleri çekme hatası:', err);
            }
        }
        return results;
    }

    // ==========================================
    // RSVP KATILIMCI YÖNETİMİ & BİLETLEME
    // ==========================================

    public static async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('workspace_event_attendees')
                    .select('*')
                    .eq('event_id', eventId)
                    .order('created_at', { ascending: false });
                if (!error && data) return data as EventAttendee[];
            } catch (err) {
                console.warn('Katılımcı listesi getirme hatası:', err);
            }
        }
        return [];
    }

    public static async registerEventAttendee(
        eventId: string,
        full_name: string,
        email: string,
        student_no?: string,
        department?: string
    ): Promise<{ success: boolean; attendee?: EventAttendee; error?: string }> {
        this.ensureDatabaseConfigured();
        const ticket_code = `HSD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const newAttendee: Omit<EventAttendee, 'id'> = {
            event_id: eventId,
            full_name: full_name.trim(),
            email: email.trim().toLowerCase(),
            student_no: student_no?.trim() || undefined,
            department: department?.trim() || undefined,
            ticket_code,
            status: 'registered',
            created_at: new Date().toISOString()
        };

        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data: existing } = await supabase
                    .from('workspace_event_attendees')
                    .select('id')
                    .eq('event_id', eventId)
                    .eq('email', newAttendee.email)
                    .maybeSingle();

                if (existing) {
                    return { success: false, error: 'Bu e-posta adresiyle bu etkinliğe zaten kayıt olunmuş.' };
                }

                const { data, error } = await supabase
                    .from('workspace_event_attendees')
                    .insert(newAttendee)
                    .select()
                    .single();

                if (!error && data) {
                    return { success: true, attendee: data as EventAttendee };
                }
            } catch (err: any) {
                console.warn('Katılımcı kayıt hatası:', err);
                return { success: false, error: err.message || 'Kayıt oluşturulamadı.' };
            }
        }

        return {
            success: true,
            attendee: {
                id: `att_${Date.now()}`,
                ...newAttendee
            }
        };
    }

    public static async checkInAttendee(ticketCode: string): Promise<{ success: boolean; attendee?: EventAttendee; error?: string }> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const cleanCode = ticketCode.trim().toUpperCase();
                const { data, error } = await supabase
                    .from('workspace_event_attendees')
                    .update({ status: 'attended', checked_in_at: new Date().toISOString() })
                    .eq('ticket_code', cleanCode)
                    .select()
                    .single();

                if (!error && data) {
                    return { success: true, attendee: data as EventAttendee };
                }
                return { success: false, error: 'Bilet bulunamadı veya geçersiz.' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'Veritabanı bağlantısı yok.' };
    }

    // ==========================================
    // DAHİLİ EKİP LCV KATILIM TEYİDİ & YÖNETİMİ
    // ==========================================

    public static async getMemberAttendance(eventId: string): Promise<MemberAttendance[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('workspace_events')
                    .select('member_attendance')
                    .eq('id', eventId)
                    .single();
                if (!error && data?.member_attendance && Array.isArray(data.member_attendance)) {
                    return data.member_attendance as MemberAttendance[];
                }
            } catch (err) {
                console.warn('Postgres member_attendance getirme hatası:', err);
            }
        }
        return WorkspaceStoreManager.getInstance().getMemberAttendance(eventId);
    }

    public static async recordMemberAttendance(
        eventId: string,
        userId: string,
        userName: string,
        role: WorkspaceRole,
        status: 'attending' | 'declined' | 'maybe',
        reason?: string,
        userAvatar?: string
    ): Promise<{ success: boolean; attendance?: MemberAttendance; event?: WorkspaceEvent; error?: string }> {
        this.ensureDatabaseConfigured();

        // 1. Eğer etkinlik RAM'de yoksa Supabase Postgres'ten getir ve RAM'e yükle (Vercel Cold Start Koruması)
        let inMemoryEvent = WorkspaceStoreManager.getInstance().getEventById(eventId);
        if (!inMemoryEvent && this.isSupabaseConfigured()) {
            try {
                const dbEvent = await this.getEventById(eventId);
                if (dbEvent) {
                    WorkspaceStoreManager.getInstance().addEvent(dbEvent);
                    inMemoryEvent = dbEvent;
                }
            } catch (fetchErr) {
                console.warn('Postgres etkinlik ön yükleme hatası:', fetchErr);
            }
        }

        const res = WorkspaceStoreManager.getInstance().recordMemberAttendance(
            eventId,
            userId,
            userName,
            role,
            status,
            reason,
            userAvatar
        );

        if (!res.success || !res.event) {
            return res;
        }

        // Supabase Postgres Veritabanına Eşitle
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                await supabase
                    .from('workspace_events')
                    .update({ member_attendance: res.event.member_attendance })
                    .eq('id', eventId);
            } catch (err) {
                console.warn('Postgres member_attendance kaydetme hatası:', err);
            }
        }

        // İlgili adminlere ve etkinlik yöneticilerine anlık LCV bildirim dağıtımı
        try {
            const statusTr = status === 'attending' 
                ? 'KATILACAĞINI' 
                : status === 'declined' 
                    ? 'KATILMAYACAĞINI' 
                    : 'BELKİ KATILABİLECEĞİNİ';
            const notifTitle = `📢 Katılım Bildirimi: ${res.event.title}`;
            const notifMsg = `${userName} (${role}), "${res.event.title}" etkinliği için ${statusTr} bildirdi.${reason ? ` Gerekçe: "${reason}"` : ''}`;

            // 1. Workspace Admin rolüne bildirim
            await this.dispatchInstantNotification({
                title: notifTitle,
                message: notifMsg,
                type: 'committee',
                category: 'committee',
                target_audience: 'role',
                target_role: 'workspace_admin',
                eventId: res.event.id,
                eventTitle: res.event.title
            });

            // 2. Super Admin rolüne bildirim
            await this.dispatchInstantNotification({
                title: notifTitle,
                message: notifMsg,
                type: 'committee',
                category: 'committee',
                target_audience: 'role',
                target_role: 'super_admin',
                eventId: res.event.id,
                eventTitle: res.event.title
            });

            // 3. Etkinliği oluşturan kişiye bildirim (eğer kendisi değilse)
            if (res.event.created_by && res.event.created_by !== userId) {
                await this.dispatchInstantNotification({
                    title: notifTitle,
                    message: notifMsg,
                    type: 'committee',
                    category: 'committee',
                    target_audience: 'selected',
                    target_users: [res.event.created_by],
                    eventId: res.event.id,
                    eventTitle: res.event.title
                });
            }
        } catch (notifErr) {
            console.warn('LCV bildirim gönderimi hatası (sessiz):', notifErr);
        }

        return res;
    }

    // ==========================================
    // TOPLULUK PROJELERİ VİTRİNİ (Community Projects)
    // ==========================================

    public static async getCommunityProjects(): Promise<CommunityProject[]> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('community_projects')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                if (!error && data) return data as CommunityProject[];
            } catch (err) {
                console.warn('Topluluk projeleri getirme hatası:', err);
            }
        }
        return [
            {
                id: 'proj_1',
                title: 'HSD MTÜ Topluluk Portalı & Çalışma Alanı',
                description: 'Huawei Student Developers topluluğu için geliştirilmiş açık kaynak etkinlik, Notion-tarzı takvim ve yönetim platformu.',
                github_url: 'https://github.com/mustafazahter/hsd-mtu-site',
                demo_url: 'https://hsdmtu.vercel.app',
                tech_stack: ['Next.js 15', 'TypeScript', 'TailwindCSS', 'Supabase PostgreSQL', 'RLS'],
                stars_count: 14,
                contributors: ['Mustafa Zahter', 'Özgür Kalçık', 'HSD Core Team'],
                is_active: true,
                created_at: new Date().toISOString()
            }
        ];
    }

    public static async createCommunityProject(project: Partial<CommunityProject>): Promise<CommunityProject | null> {
        this.ensureDatabaseConfigured();
        if (this.isSupabaseConfigured()) {
            try {
                const supabase = this.getSupabaseClient();
                const { data, error } = await supabase
                    .from('community_projects')
                    .insert(project)
                    .select()
                    .single();
                if (!error && data) return data as CommunityProject;
            } catch (err) {
                console.warn('Proje ekleme hatası:', err);
            }
        }
        return null;
    }

    // ==========================================
    // DISCORD / MEET / WEBHOOK DUYURU BİLDİRİMİ
    // ==========================================

    public static async sendWebhookNotification(title: string, message: string, eventUrl?: string): Promise<boolean> {
        const settings = await this.getSecuritySettings();
        const webhookUrl = settings.webhook_url?.trim();
        if (!webhookUrl) return false;

        try {
            const payload = {
                username: 'HSD MTÜ Topluluk Botu',
                avatar_url: 'https://hsdmtu.vercel.app/icon.png',
                content: `📢 **Yeni Topluluk Bildirimi / Etkinlik**`,
                embeds: [
                    {
                        title,
                        description: message,
                        url: eventUrl || 'https://hsdmtu.vercel.app/workspace',
                        color: 14423100, // Rose #dc2626
                        footer: {
                            text: 'Huawei Student Developers - MTÜ Topluluk Takvimi'
                        },
                        timestamp: new Date().toISOString()
                    }
                ]
            };

            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return res.ok;
        } catch (err) {
            console.warn('Webhook gönderim hatası:', err);
            return false;
        }
    }
}
