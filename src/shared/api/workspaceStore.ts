import {
    WorkspaceMember,
    WorkspaceRole,
    RolePermissions,
    WorkspaceCalendar,
    WorkspaceGroup,
    WorkspaceEvent,
    WorkspaceSubtask,
    WorkspaceComment,
    WorkspaceCommentTag,
    WorkspaceAttachment,
    WorkspaceNotification,
    ActiveSession,
    AuditLogRecord,
    WorkspaceSecuritySettings,
    WorkspaceMemberNote,
    MemberAttendance
} from './workspaceTypes';
import { hashPassword, verifyPassword } from '@/shared/lib/security';

export class WorkspaceStoreManager {
    private static instance: WorkspaceStoreManager;

    private members: Map<string, WorkspaceMember> = new Map();
    private memberPasswords: Map<string, string> = new Map(); // email/id -> hashed password
    private groups: Map<string, WorkspaceGroup> = new Map();
    private calendars: Map<string, WorkspaceCalendar> = new Map();
    private events: Map<string, WorkspaceEvent> = new Map();
    private attachmentsByToken: Map<string, WorkspaceAttachment> = new Map();
    private fileBuffers: Map<string, Buffer> = new Map();
    private notifications: WorkspaceNotification[] = [];
    private notificationReads: Set<string> = new Set(); // "${notificationId}:${userId}"
    private activeSessions: Map<string, ActiveSession> = new Map();
    private revokedTokens: Set<string> = new Set();
    private auditLogs: AuditLogRecord[] = [];
    private rolePermissions: Map<WorkspaceRole, RolePermissions> = new Map();
    private securitySettings: WorkspaceSecuritySettings = {
        max_file_size_mb: 25,
        allowed_file_types: ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'webp', 'mp3', 'zip'],
        mfa_required: false,
        session_timeout_minutes: 120,
        rsvp_registration_enabled: true,
        rsvp_qr_enabled: true,
        kanban_view_enabled: true,
        showcase_projects_enabled: false,
        webhook_url: '',
        webhook_channel: 'etkinlik-duyuru'
    };

    private constructor() {
        this.initializeDefaults();
    }

    public static getInstance(): WorkspaceStoreManager {
        const globalRef = globalThis as unknown as { __workspaceStoreInstance__?: WorkspaceStoreManager };
        if (!globalRef.__workspaceStoreInstance__) {
            globalRef.__workspaceStoreInstance__ = new WorkspaceStoreManager();
        }
        return globalRef.__workspaceStoreInstance__;
    }

    private initializeDefaults() {
        // 1. Varsayılan İzin Matrisi (Genişletilmiş RBAC)
        const defaultPerms: RolePermissions[] = [
            {
                role: 'super_admin',
                can_view: true, can_create: true, can_edit: true, can_delete: true, can_upload: true, can_share: true,
                can_comment: true, can_manage_rsvp: true, can_manage_tasks: true, can_broadcast: true, can_export: true
            },
            {
                role: 'workspace_admin',
                can_view: true, can_create: true, can_edit: true, can_delete: true, can_upload: true, can_share: true,
                can_comment: true, can_manage_rsvp: true, can_manage_tasks: true, can_broadcast: true, can_export: true
            },
            {
                role: 'editor',
                can_view: true, can_create: true, can_edit: true, can_delete: true, can_upload: true, can_share: true,
                can_comment: true, can_manage_rsvp: true, can_manage_tasks: true, can_broadcast: false, can_export: true
            },
            {
                role: 'contributor',
                can_view: true, can_create: true, can_edit: false, can_delete: false, can_upload: true, can_share: false,
                can_comment: true, can_manage_rsvp: false, can_manage_tasks: true, can_broadcast: false, can_export: false
            },
            {
                role: 'viewer',
                can_view: true, can_create: false, can_edit: false, can_delete: false, can_upload: false, can_share: false,
                can_comment: false, can_manage_rsvp: false, can_manage_tasks: false, can_broadcast: false, can_export: false
            }
        ];
        defaultPerms.forEach(p => this.rolePermissions.set(p.role, p));

        // 2. Varsayılan Süper Adminler
        const defaultAdmin1: WorkspaceMember = {
            id: 'mem_admin_1',
            email: 'admin@hsdmtu.site',
            username: 'admin',
            display_name: 'HSD MTÜ Super Admin',
            role: 'super_admin',
            status: 'active',
            mfa_enabled: false,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        const defaultAdmin2: WorkspaceMember = {
            id: 'mem_admin_2',
            email: 'admin@hsdmtu.com',
            username: 'leadadmin',
            display_name: 'HSD MTÜ Lead Admin',
            role: 'super_admin',
            status: 'active',
            mfa_enabled: false,
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        this.members.set(defaultAdmin1.id, defaultAdmin1);
        this.members.set(defaultAdmin2.id, defaultAdmin2);
        defaultAdmin1.must_change_password = true;
        defaultAdmin2.must_change_password = true;
        const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin_bootstrap_pass_2026';
        const hashedAdminPass = hashPassword(initialAdminPassword);
        this.memberPasswords.set(defaultAdmin1.email.toLowerCase(), hashedAdminPass);
        this.memberPasswords.set(defaultAdmin1.username.toLowerCase(), hashedAdminPass);
        this.memberPasswords.set(defaultAdmin2.email.toLowerCase(), hashedAdminPass);
        this.memberPasswords.set(defaultAdmin2.username.toLowerCase(), hashedAdminPass);

        // 3. Varsayılan Takvimler (Tüm Komite Takvimleri)
        const coreCal: WorkspaceCalendar = {
            id: 'cal_core',
            title: 'Genel Topluluk Takvimi',
            color: '#ef4444',
            description: 'Tüm HSD MTÜ üyelerine açık genel etkinlikler ve zirveler',
            is_private: false
        };
        const projCal: WorkspaceCalendar = {
            id: 'cal_proj',
            title: 'Proje Komitesi Takvimi',
            color: '#3b82f6',
            description: 'Yazılım geliştirme, sprintler, code-review ve teknik hackathonlar',
            is_private: false
        };
        const eventCal: WorkspaceCalendar = {
            id: 'cal_event',
            title: 'Etkinlik & Sponsorluk Komitesi',
            color: '#f97316',
            description: 'Fiziki konferanslar, atölyeler ve sponsorluk görüşmeleri',
            is_private: false
        };
        const socialCal: WorkspaceCalendar = {
            id: 'cal_social',
            title: 'Sosyal Medya & Tasarım Komitesi',
            color: '#ec4899',
            description: 'Görsel iletişim, sosyal medya akışı ve tasarım teslimleri',
            is_private: false
        };
        const mediumCal: WorkspaceCalendar = {
            id: 'cal_medium',
            title: 'Medium Komitesi Takvimi',
            color: '#eab308',
            description: 'Teknik blog makaleleri, bülten hazırlığı ve peer-review',
            is_private: false
        };
        const mgmtCal: WorkspaceCalendar = {
            id: 'cal_mgmt',
            title: 'Yönetim & Koordinasyon Takvimi',
            color: '#8b5cf6',
            description: 'Liderlik toplantıları, komite başkanları oturumları',
            is_private: true
        };

        this.calendars.set(coreCal.id, coreCal);
        this.calendars.set(projCal.id, projCal);
        this.calendars.set(eventCal.id, eventCal);
        this.calendars.set(socialCal.id, socialCal);
        this.calendars.set(mediumCal.id, mediumCal);
        this.calendars.set(mgmtCal.id, mgmtCal);

        // 4. Varsayılan Komiteler (Core Team)
        const projectCommittee: WorkspaceGroup = {
            id: 'grp_project',
            name: 'Proje Komitesi',
            code: 'PROJECT',
            description: 'Yazılım geliştirme, açık kaynak projeleri ve teknik yarışmalar.',
            color: '#8b5cf6',
            role_key: 'project_lead',
            members: [defaultAdmin1.id, defaultAdmin2.id]
        };
        const eventSponsorCommittee: WorkspaceGroup = {
            id: 'grp_event_sponsor',
            name: 'Etkinlik & Sponsorluk Komitesi',
            code: 'EVENT_SPONSOR',
            description: 'Konferanslar, workshoplar, üniversite iş birlikleri ve sponsor görüşmeleri.',
            color: '#dc2626',
            role_key: 'event_lead',
            members: [defaultAdmin1.id]
        };
        const socialDesignCommittee: WorkspaceGroup = {
            id: 'grp_social_design',
            name: 'Sosyal Medya & Tasarım Komitesi',
            code: 'SOCIAL_DESIGN',
            description: 'Görsel iletişim, afiş tasarımları ve sosyal medya paylaşımları.',
            color: '#ec4899',
            role_key: 'design_lead',
            members: [defaultAdmin2.id]
        };
        const mediumCommittee: WorkspaceGroup = {
            id: 'grp_medium',
            name: 'Medium Komitesi',
            code: 'MEDIUM',
            description: 'Teknik blog yazıları, yayın hazırlığı ve akademik içerikler.',
            color: '#f59e0b',
            role_key: 'writer_lead',
            members: [defaultAdmin1.id]
        };
        const mgmtCommittee: WorkspaceGroup = {
            id: 'grp_mgmt',
            name: 'Yönetim & Koordinasyon Komitesi',
            code: 'MANAGEMENT',
            description: 'Çekirdek liderlik, topluluk stratejisi ve idari koordinasyon.',
            color: '#3b82f6',
            role_key: 'super_admin',
            members: [defaultAdmin1.id, defaultAdmin2.id]
        };

        this.groups.set(projectCommittee.id, projectCommittee);
        this.groups.set(eventSponsorCommittee.id, eventSponsorCommittee);
        this.groups.set(socialDesignCommittee.id, socialDesignCommittee);
        this.groups.set(mediumCommittee.id, mediumCommittee);
        this.groups.set(mgmtCommittee.id, mgmtCommittee);

        // 5. Başlangıç Etkinlikleri (Örnek Core Verisi)
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const sampleEvent1: WorkspaceEvent = {
            id: 'evt_sample_1',
            calendar_id: 'cal_core',
            title: 'HSD MTÜ Haftalık Çekirdek Ekip Koordinasyon Toplantısı',
            description: '### Toplantı Gündemi\n- Geçen haftanın sprint değerlendirmesi\n- Yaklaşan Yapay Zeka Zirvesi hazırlıkları\n- Komite bütçe ve sponsorluk durumları',
            category: 'Toplantı',
            color: '#dc2626',
            start_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0).toISOString(),
            end_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 30).toISOString(),
            is_all_day: false,
            assignees: [defaultAdmin1.id, defaultAdmin2.id],
            location: 'Google Meet',
            meeting_link: 'https://meet.google.com/hsd-mtu-core',
            status: 'scheduled',
            version: 1,
            subtasks: [
                { id: 'sub_1', event_id: 'evt_sample_1', title: 'Toplantı notlarının hazırlanması', is_completed: true, created_at: now.toISOString() },
                { id: 'sub_2', event_id: 'evt_sample_1', title: 'Komite raporlarının sunulması', is_completed: false, created_at: now.toISOString() }
            ],
            comments: [
                { id: 'com_1', event_id: 'evt_sample_1', user_id: defaultAdmin1.id, user_name: defaultAdmin1.display_name, content: 'Lütfen herkes komite güncellemelerini hazırlasın.', created_at: now.toISOString() }
            ],
            attachments: [],
            reminders: [],
            edit_history: [
                { id: 'hist_sample_1', event_id: 'evt_sample_1', user_id: defaultAdmin1.id, user_name: defaultAdmin1.display_name, action: 'created', details: 'Etkinlik oluşturuldu', timestamp: now.toISOString() }
            ],
            created_by: defaultAdmin1.id,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
        };

        const sampleEvent2: WorkspaceEvent = {
            id: 'evt_sample_2',
            calendar_id: 'cal_proj',
            title: 'Yeni Web Sitesi & Workspace Mimari İncelemesi',
            description: 'Supabase SSR ve Notion Calendar bileşenlerinin canlı testleri yapılacak.',
            category: 'Geliştirme',
            color: '#8b5cf6',
            start_time: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0).toISOString(),
            end_time: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 16, 0).toISOString(),
            is_all_day: false,
            assignees: [defaultAdmin1.id],
            location: 'Discord Ses Kanalı',
            meeting_link: 'https://discord.gg/hsdmtu',
            status: 'scheduled',
            version: 1,
            subtasks: [
                { id: 'sub_3', event_id: 'evt_sample_2', title: 'RLS yetkilendirme testleri', is_completed: false, created_at: tomorrow.toISOString() }
            ],
            comments: [],
            attachments: [],
            reminders: [],
            edit_history: [
                { id: 'hist_sample_2', event_id: 'evt_sample_2', user_id: defaultAdmin1.id, user_name: defaultAdmin1.display_name, action: 'created', details: 'Etkinlik oluşturuldu', timestamp: now.toISOString() }
            ],
            created_by: defaultAdmin1.id,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
        };

        const sampleEvent3: WorkspaceEvent = {
            id: 'evt_sample_3',
            calendar_id: 'cal_social',
            title: 'Medium Teknik Blog: Modern Frontend Mimarisi',
            description: 'Next.js 16 ve App Router performans optimizasyonları hakkında blog yayını.',
            category: 'Yayın',
            color: '#f59e0b',
            start_time: new Date(inTwoDays.getFullYear(), inTwoDays.getMonth(), inTwoDays.getDate(), 10, 0).toISOString(),
            end_time: new Date(inTwoDays.getFullYear(), inTwoDays.getMonth(), inTwoDays.getDate(), 18, 0).toISOString(),
            is_all_day: true,
            assignees: [defaultAdmin2.id],
            status: 'scheduled',
            version: 1,
            subtasks: [],
            comments: [],
            attachments: [],
            reminders: [],
            created_at: now.toISOString(),
            updated_at: now.toISOString()
        };

        this.events.set(sampleEvent1.id, sampleEvent1);
        this.events.set(sampleEvent2.id, sampleEvent2);
        this.events.set(sampleEvent3.id, sampleEvent3);

        // Başlangıç Bildirimi
        this.notifications.push({
            id: 'notif_welcome',
            user_id: 'all',
            event_id: sampleEvent1.id,
            event_title: sampleEvent1.title,
            title: 'HSD MTÜ Workspace Başlatıldı',
            message: 'Topluluk Takvimi ve Çekirdek Ekip Çalışma Alanına hoş geldiniz.',
            type: 'announcement',
            is_read: false,
            is_active: true,
            created_at: now.toISOString()
        });

        // Başlangıç Denetim İzi
        this.logAudit({
            id: 'audit_init',
            user_id: defaultAdmin1.id,
            user_email: defaultAdmin1.email,
            action: 'WORKSPACE_INITIALIZED',
            entity_type: 'SYSTEM',
            details: 'Workspace Store Manager başlatıldı ve varsayılan komiteler yüklendi.',
            ip_address: '127.0.0.1',
            created_at: now.toISOString()
        });
    }

    // ============================================
    // Üye Yönetimi (Members)
    // ============================================
    public getMembers(): WorkspaceMember[] {
        return Array.from(this.members.values());
    }

    public getMemberById(id: string): WorkspaceMember | undefined {
        return this.members.get(id);
    }

    public getMemberByEmail(email: string): WorkspaceMember | undefined {
        const lower = email.trim().toLowerCase();
        for (const member of this.members.values()) {
            if (member.email.toLowerCase() === lower) return member;
        }
        return undefined;
    }

    public getMemberByUsername(username: string): WorkspaceMember | undefined {
        const clean = username.trim().toLowerCase().replace(/^@/, '');
        for (const member of this.members.values()) {
            if (member.username && member.username.toLowerCase() === clean) return member;
        }
        return undefined;
    }

    public getMemberByEmailOrUsername(identifier: string): WorkspaceMember | undefined {
        const clean = identifier.trim().toLowerCase().replace(/^@/, '');
        return this.getMemberByEmail(clean) || this.getMemberByUsername(clean);
    }

    public addMember(member: WorkspaceMember, password?: string): WorkspaceMember {
        this.members.set(member.id, member);
        if (password) {
            const hashed = hashPassword(password);
            this.memberPasswords.set(member.email.toLowerCase(), hashed);
            if (member.username) {
                this.memberPasswords.set(member.username.toLowerCase(), hashed);
            }
        }
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: member.email,
            action: 'MEMBER_CREATED',
            entity_type: 'MEMBER',
            entity_id: member.id,
            details: `Yeni üye eklendi: ${member.display_name} (@${member.username || '-'}) [${member.role}]`,
            created_at: new Date().toISOString()
        });
        return member;
    }

    public updateMember(id: string, updates: Partial<WorkspaceMember>): WorkspaceMember {
        const existing = this.members.get(id);
        if (!existing) throw new Error('Üye bulunamadı');
        const updated = { ...existing, ...updates };
        this.members.set(id, updated);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: updated.email,
            action: 'MEMBER_UPDATED',
            entity_type: 'MEMBER',
            entity_id: id,
            details: `Üye bilgileri güncellendi: ${updated.display_name}`,
            created_at: new Date().toISOString()
        });
        return updated;
    }

    public changeMemberPassword(emailOrIdOrUsername: string, newPassword: string): boolean {
        const member = this.getMemberById(emailOrIdOrUsername) || this.getMemberByEmailOrUsername(emailOrIdOrUsername);
        if (!member) return false;
        const hashed = hashPassword(newPassword);
        this.memberPasswords.set(member.email.toLowerCase(), hashed);
        if (member.username) {
            this.memberPasswords.set(member.username.toLowerCase(), hashed);
        }
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: member.id,
            user_email: member.email,
            action: 'PASSWORD_CHANGED',
            entity_type: 'MEMBER',
            entity_id: member.id,
            details: `Üye şifresi değiştirildi (@${member.username || '-'}).`,
            created_at: new Date().toISOString()
        });
        return true;
    }

    public verifyMemberPassword(identifier: string, password: string): boolean {
        const clean = identifier.trim().toLowerCase().replace(/^@/, '');
        const member = this.getMemberByEmailOrUsername(clean);
        if (!member) return false;

        const savedPass = this.memberPasswords.get(member.email.toLowerCase()) || 
                          (member.username ? this.memberPasswords.get(member.username.toLowerCase()) : undefined);

        if (!savedPass) {
            // Varsayılan süper adminler için ortam değişkeni veya bootstrap parolası kontrolü
            const bootstrapPass = process.env.ADMIN_INITIAL_PASSWORD || 'admin_bootstrap_pass_2026';
            if (bootstrapPass && (member.email === 'admin@hsdmtu.site' || member.email === 'admin@hsdmtu.com')) {
                return verifyPassword(password, hashPassword(bootstrapPass));
            }
            return false;
        }
        return verifyPassword(password, savedPass);
    }

    public deleteMember(id: string): boolean {
        const member = this.members.get(id);
        if (!member) return false;
        this.members.delete(id);
        this.memberPasswords.delete(member.email.toLowerCase());
        if (member.username) {
            this.memberPasswords.delete(member.username.toLowerCase());
        }
        // Komitelerden temizle
        for (const group of this.groups.values()) {
            if (group.members.includes(id)) {
                group.members = group.members.filter(m => m !== id);
            }
        }
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: member.email,
            action: 'MEMBER_DELETED',
            entity_type: 'MEMBER',
            entity_id: id,
            details: `Üye silindi: ${member.display_name}`,
            created_at: new Date().toISOString()
        });
        return true;
    }

    // ============================================
    // Grup / Komite Yönetimi (Groups)
    // ============================================
    public getGroups(): WorkspaceGroup[] {
        return Array.from(this.groups.values());
    }

    public getGroupById(id: string): WorkspaceGroup | undefined {
        return this.groups.get(id);
    }

    public addGroup(group: WorkspaceGroup): WorkspaceGroup {
        this.groups.set(group.id, group);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: 'admin',
            action: 'GROUP_CREATED',
            entity_type: 'GROUP',
            entity_id: group.id,
            details: `Yeni komite oluşturuldu: ${group.name}`,
            created_at: new Date().toISOString()
        });
        return group;
    }

    public updateGroup(id: string, updates: Partial<WorkspaceGroup>): WorkspaceGroup {
        const existing = this.groups.get(id);
        if (!existing) throw new Error('Komite bulunamadı');
        const updated = { ...existing, ...updates };
        this.groups.set(id, updated);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: 'admin',
            action: 'GROUP_UPDATED',
            entity_type: 'GROUP',
            entity_id: id,
            details: `Komite güncellendi: ${updated.name}`,
            created_at: new Date().toISOString()
        });
        return updated;
    }

    public toggleGroupMember(groupId: string, memberId: string, add: boolean): WorkspaceGroup {
        const group = this.groups.get(groupId);
        if (!group) throw new Error('Komite bulunamadı');
        if (add && !group.members.includes(memberId)) {
            group.members.push(memberId);
        } else if (!add) {
            group.members = group.members.filter(m => m !== memberId);
        }
        return group;
    }

    public deleteGroup(id: string): boolean {
        const group = this.groups.get(id);
        if (!group) return false;
        this.groups.delete(id);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: 'admin',
            action: 'GROUP_DELETED',
            entity_type: 'GROUP',
            entity_id: id,
            details: `Komite silindi: ${group.name}`,
            created_at: new Date().toISOString()
        });
        return true;
    }

    // ============================================
    // Takvim Yönetimi (Calendars)
    // ============================================
    public getCalendars(): WorkspaceCalendar[] {
        return Array.from(this.calendars.values());
    }

    // ============================================
    // Etkinlik Yönetimi & Optimistic Lock (Events)
    // ============================================
    public getEvents(calendarId?: string, viewerMember?: WorkspaceMember | null): WorkspaceEvent[] {
        let list = Array.from(this.events.values());
        if (calendarId) {
            list = list.filter(e => e.calendar_id === calendarId);
        }

        // Görünürlük (Visibility) İzolasyonu
        const isViewerAdmin = viewerMember?.role === 'super_admin' ||
            viewerMember?.role === 'workspace_admin' ||
            viewerMember?.role === 'editor';

        list = list.filter(e => {
            const vis = e.visibility || 'public';
            if (vis === 'public') return true;
            if (vis === 'admin_only') {
                return isViewerAdmin;
            }
            if (vis === 'private') {
                return viewerMember && (e.created_by === viewerMember.id || viewerMember.role === 'super_admin');
            }
            if (vis === 'custom') {
                if (!viewerMember) return false;
                if (viewerMember.role === 'super_admin' || e.created_by === viewerMember.id) return true;
                const allowed = (e as any).allowed_member_ids || e.assignees || [];
                return allowed.includes(viewerMember.id) || allowed.includes(viewerMember.username);
            }
            return true;
        });

        return list;
    }

    public getEventById(id: string): WorkspaceEvent | undefined {
        return this.events.get(id);
    }

    public addEvent(event: WorkspaceEvent): WorkspaceEvent {
        if (!event.version) event.version = 1;
        if (!event.visibility) event.visibility = 'public';
        if (!event.subtasks) event.subtasks = [];
        if (!event.comments) event.comments = [];
        if (!event.attachments) event.attachments = [];
        if (!event.reminders) event.reminders = [];
        if (!event.edit_history) event.edit_history = [];
        event.created_at = new Date().toISOString();
        event.updated_at = new Date().toISOString();

        this.events.set(event.id, event);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: event.created_by || 'user',
            user_email: 'user',
            action: 'EVENT_CREATED',
            entity_type: 'EVENT',
            entity_id: event.id,
            details: `Yeni etkinlik oluşturuldu: ${event.title} [Erişim: ${event.visibility}]`,
            created_at: new Date().toISOString()
        });
        return event;
    }

    /**
     * Optimistic Concurrency Control ile güncelleme.
     * Gönderilen version ile mevcut version uyuşmazsa 409 Conflict fırlatır.
     */
    public updateEventWithConcurrency(
        id: string,
        updates: Partial<WorkspaceEvent>,
        clientVersion: number
    ): { success: boolean; event?: WorkspaceEvent; conflict?: boolean; currentVersion?: number } {
        const existing = this.events.get(id);
        if (!existing) {
            return { success: false };
        }

        if (existing.version !== clientVersion) {
            return {
                success: false,
                conflict: true,
                currentVersion: existing.version,
                event: existing
            };
        }

        const newVersion = existing.version + 1;
        const updated: WorkspaceEvent = {
            ...existing,
            ...updates,
            id: existing.id,
            version: newVersion,
            updated_at: new Date().toISOString()
        };

        this.events.set(id, updated);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'user',
            user_email: 'user',
            action: 'EVENT_UPDATED',
            entity_type: 'EVENT',
            entity_id: id,
            details: `Etkinlik güncellendi (v${newVersion}): ${updated.title}`,
            created_at: new Date().toISOString()
        });

        return { success: true, event: updated };
    }

    public deleteEvent(id: string): boolean {
        const existing = this.events.get(id);
        if (!existing) return false;
        this.events.delete(id);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'user',
            user_email: 'user',
            action: 'EVENT_DELETED',
            entity_type: 'EVENT',
            entity_id: id,
            details: `Etkinlik silindi: ${existing.title}`,
            created_at: new Date().toISOString()
        });
        return true;
    }

    // Subtasks
    public addSubtask(eventId: string, title: string): WorkspaceSubtask {
        const event = this.events.get(eventId);
        if (!event) throw new Error('Etkinlik bulunamadı');
        const subtask: WorkspaceSubtask = {
            id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            event_id: eventId,
            title,
            is_completed: false,
            created_at: new Date().toISOString()
        };
        event.subtasks.push(subtask);
        event.version += 1;
        event.updated_at = new Date().toISOString();
        return subtask;
    }

    public toggleSubtask(eventId: string, subtaskId: string, completed?: boolean): WorkspaceSubtask | undefined {
        const event = this.events.get(eventId);
        if (!event) return undefined;
        const sub = event.subtasks.find(s => s.id === subtaskId);
        if (!sub) return undefined;
        sub.is_completed = completed !== undefined ? completed : !sub.is_completed;
        event.version += 1;
        event.updated_at = new Date().toISOString();
        return sub;
    }

    public deleteSubtask(eventId: string, subtaskId: string): boolean {
        const event = this.events.get(eventId);
        if (!event) return false;
        const initLen = event.subtasks.length;
        event.subtasks = event.subtasks.filter(s => s.id !== subtaskId);
        if (event.subtasks.length !== initLen) {
            event.version += 1;
            event.updated_at = new Date().toISOString();
            return true;
        }
        return false;
    }

    // Comments
    public addComment(
        eventId: string,
        userId: string,
        userName: string,
        content: string,
        tag: WorkspaceCommentTag = 'general',
        isPinned: boolean = false,
        userAvatar?: string
    ): WorkspaceComment {
        const event = this.events.get(eventId);
        if (!event) throw new Error('Etkinlik bulunamadı');
        const comment: WorkspaceComment = {
            id: `com_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            event_id: eventId,
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            content,
            is_pinned: isPinned,
            tag,
            reactions: {},
            created_at: new Date().toISOString()
        };
        event.comments.push(comment);
        event.version += 1;
        event.updated_at = new Date().toISOString();
        return comment;
    }

    public toggleCommentPin(eventId: string, commentId: string): WorkspaceComment | null {
        const event = this.events.get(eventId);
        if (!event) return null;
        const comment = event.comments.find(c => c.id === commentId);
        if (!comment) return null;
        comment.is_pinned = !comment.is_pinned;
        event.version += 1;
        event.updated_at = new Date().toISOString();
        return comment;
    }

    public toggleCommentReaction(eventId: string, commentId: string, emoji: string, userName: string): WorkspaceComment | null {
        const event = this.events.get(eventId);
        if (!event) return null;
        const comment = event.comments.find(c => c.id === commentId);
        if (!comment) return null;
        if (!comment.reactions) comment.reactions = {};
        const currentList = comment.reactions[emoji] || [];
        if (currentList.includes(userName)) {
            comment.reactions[emoji] = currentList.filter(u => u !== userName);
            if (comment.reactions[emoji].length === 0) {
                delete comment.reactions[emoji];
            }
        } else {
            comment.reactions[emoji] = [...currentList, userName];
        }
        event.version += 1;
        event.updated_at = new Date().toISOString();
        return comment;
    }

    public deleteComment(eventId: string, commentId: string): boolean {
        const event = this.events.get(eventId);
        if (!event) return false;
        const initLen = event.comments.length;
        event.comments = event.comments.filter(c => c.id !== commentId);
        if (event.comments.length !== initLen) {
            event.version += 1;
            event.updated_at = new Date().toISOString();
            return true;
        }
        return false;
    }

    // Attachments
    public addAttachment(eventId: string, attachment: WorkspaceAttachment, buffer?: Buffer): WorkspaceAttachment {
        this.registerAttachment(attachment, buffer);
        const event = this.events.get(eventId);
        if (event) {
            event.attachments.push(attachment);
            event.version += 1;
            event.updated_at = new Date().toISOString();
        }
        return attachment;
    }

    public registerAttachment(attachment: WorkspaceAttachment, buffer?: Buffer): void {
        this.attachmentsByToken.set(attachment.download_token, attachment);
        if (buffer) {
            this.fileBuffers.set(attachment.download_token, buffer);
        }
    }

    public getAttachmentByToken(token: string): { attachment: WorkspaceAttachment; buffer?: Buffer } | null {
        const attachment = this.attachmentsByToken.get(token);
        if (!attachment) return null;
        const buffer = this.fileBuffers.get(token);
        return { attachment, buffer };
    }

    // ============================================
    // Dahili Ekip LCV & Katılım Teyidi
    // ============================================
    public getMemberAttendance(eventId: string): MemberAttendance[] {
        const event = this.events.get(eventId);
        return event?.member_attendance || [];
    }

    public recordMemberAttendance(
        eventId: string,
        userId: string,
        userName: string,
        role: WorkspaceRole,
        status: 'attending' | 'declined' | 'maybe',
        reason?: string,
        userAvatar?: string
    ): { success: boolean; attendance?: MemberAttendance; event?: WorkspaceEvent; error?: string } {
        const event = this.events.get(eventId);
        if (!event) {
            return { success: false, error: 'Etkinlik bulunamadı.' };
        }

        const newAttendance: MemberAttendance = {
            user_id: userId,
            user_name: userName,
            user_avatar: userAvatar,
            role,
            status,
            reason: reason?.trim() || undefined,
            responded_at: new Date().toISOString()
        };

        const existingList = event.member_attendance || [];
        const filtered = existingList.filter(a => a.user_id !== userId);
        const updatedList = [newAttendance, ...filtered];

        const updatedEvent: WorkspaceEvent = {
            ...event,
            member_attendance: updatedList,
            updated_at: new Date().toISOString()
        };

        this.events.set(eventId, updatedEvent);
        return { success: true, attendance: newAttendance, event: updatedEvent };
    }

    // ============================================
    // Bildirim Dağıtımı & Anlık Duyuru
    // ============================================
    public getNotifications(userId?: string): WorkspaceNotification[] {
        if (!userId) {
            return this.notifications
                .filter(n => n.is_active !== false)
                .map(n => ({ ...n }));
        }
        return this.notifications
            .filter(n => (n.user_id === 'all' || n.user_id === userId) && n.is_active !== false)
            .map(n => {
                if (n.user_id === 'all') {
                    const isRead = this.notificationReads.has(`${n.id}:${userId}`);
                    return { ...n, is_read: isRead };
                }
                return { ...n };
            });
    }

    public getAllNotificationsAdmin(): WorkspaceNotification[] {
        return this.notifications.map(n => ({
            ...n,
            is_active: n.is_active !== false
        }));
    }

    public toggleNotificationActive(id: string, isActive: boolean): boolean {
        const notif = this.notifications.find(n => n.id === id);
        if (!notif) return false;
        notif.is_active = isActive;
        this.logAudit({
            id: `audit_notif_toggle_${Date.now()}`,
            user_id: 'admin',
            user_email: 'admin@hsd-mtu.org',
            action: isActive ? 'NOTIFICATION_ACTIVATED' : 'NOTIFICATION_DEACTIVATED',
            entity_type: 'NOTIFICATION',
            details: `Bildirim #${id} (${notif.title}) durumu '${isActive ? 'Aktif/Yayında' : 'Pasif'}' olarak güncellendi.`,
            ip_address: '127.0.0.1',
            created_at: new Date().toISOString()
        });
        return true;
    }

    public toggleNotificationsActive(ids: string[], isActive: boolean): boolean {
        let count = 0;
        const idSet = new Set(ids);
        this.notifications.forEach(n => {
            if (idSet.has(n.id)) {
                n.is_active = isActive;
                count++;
            }
        });
        if (count > 0) {
            this.logAudit({
                id: `audit_notifs_bulk_toggle_${Date.now()}`,
                user_id: 'admin',
                user_email: 'admin@hsd-mtu.org',
                action: isActive ? 'NOTIFICATIONS_BULK_ACTIVATED' : 'NOTIFICATIONS_BULK_DEACTIVATED',
                entity_type: 'NOTIFICATION',
                details: `${count} adet bildirim topluca '${isActive ? 'Aktif/Yayında' : 'Pasif'}' duruma getirildi.`,
                ip_address: '127.0.0.1',
                created_at: new Date().toISOString()
            });
        }
        return count > 0;
    }

    public deleteNotification(id: string): boolean {
        const idx = this.notifications.findIndex(n => n.id === id);
        if (idx === -1) return false;
        const removed = this.notifications.splice(idx, 1)[0];

        // Remove read tracking records
        Array.from(this.notificationReads).forEach(key => {
            if (key.startsWith(`${id}:`)) {
                this.notificationReads.delete(key);
            }
        });

        this.logAudit({
            id: `audit_notif_del_${Date.now()}`,
            user_id: 'admin',
            user_email: 'admin@hsd-mtu.org',
            action: 'NOTIFICATION_DELETED',
            entity_type: 'NOTIFICATION',
            details: `Bildirim yayından kaldırıldı ve silindi: #${id} (${removed.title})`,
            ip_address: '127.0.0.1',
            created_at: new Date().toISOString()
        });
        return true;
    }

    public deleteNotifications(ids: string[]): boolean {
        const idSet = new Set(ids);
        const prevLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => !idSet.has(n.id));

        ids.forEach(id => {
            Array.from(this.notificationReads).forEach(key => {
                if (key.startsWith(`${id}:`)) {
                    this.notificationReads.delete(key);
                }
            });
        });

        const deletedCount = prevLength - this.notifications.length;
        if (deletedCount > 0) {
            this.logAudit({
                id: `audit_notifs_bulk_del_${Date.now()}`,
                user_id: 'admin',
                user_email: 'admin@hsd-mtu.org',
                action: 'NOTIFICATIONS_BULK_DELETED',
                entity_type: 'NOTIFICATION',
                details: `${deletedCount} adet bildirim yayından kaldırılıp silindi.`,
                ip_address: '127.0.0.1',
                created_at: new Date().toISOString()
            });
        }
        return deletedCount > 0;
    }

    public clearNotificationHistory(filter?: 'all' | 'read' | 'inactive'): boolean {
        if (!filter || filter === 'all') {
            const count = this.notifications.length;
            this.notifications = [];
            this.notificationReads.clear();
            this.logAudit({
                id: `audit_notifs_clear_all_${Date.now()}`,
                user_id: 'admin',
                user_email: 'admin@hsd-mtu.org',
                action: 'NOTIFICATION_HISTORY_CLEARED',
                entity_type: 'NOTIFICATION',
                details: `Tüm bildirim geçmişi temizlendi (${count} kayıt).`,
                ip_address: '127.0.0.1',
                created_at: new Date().toISOString()
            });
            return true;
        } else if (filter === 'inactive') {
            const before = this.notifications.length;
            this.notifications = this.notifications.filter(n => n.is_active !== false);
            const cleared = before - this.notifications.length;
            this.logAudit({
                id: `audit_notifs_clear_inactive_${Date.now()}`,
                user_id: 'admin',
                user_email: 'admin@hsd-mtu.org',
                action: 'INACTIVE_NOTIFICATIONS_CLEARED',
                entity_type: 'NOTIFICATION',
                details: `Pasif durumdaki ${cleared} adet bildirim geçmişten temizlendi.`,
                ip_address: '127.0.0.1',
                created_at: new Date().toISOString()
            });
            return true;
        } else if (filter === 'read') {
            const before = this.notifications.length;
            this.notifications = this.notifications.filter(n => !n.is_read);
            const cleared = before - this.notifications.length;
            this.logAudit({
                id: `audit_notifs_clear_read_${Date.now()}`,
                user_id: 'admin',
                user_email: 'admin@hsd-mtu.org',
                action: 'READ_NOTIFICATIONS_CLEARED',
                entity_type: 'NOTIFICATION',
                details: `Okunmuş durumdaki ${cleared} adet bildirim temizlendi.`,
                ip_address: '127.0.0.1',
                created_at: new Date().toISOString()
            });
            return true;
        }
        return false;
    }

    public markNotificationAsRead(id: string, userId?: string): boolean {
        const notif = this.notifications.find(n => n.id === id);
        if (notif) {
            if (notif.user_id === 'all' && userId) {
                this.notificationReads.add(`${id}:${userId}`);
                return true;
            }
            notif.is_read = true;
            if (userId) {
                this.notificationReads.add(`${id}:${userId}`);
            }
            return true;
        }
        return false;
    }

    public markAllNotificationsAsRead(userId: string): void {
        this.notifications.forEach(n => {
            if (n.user_id === 'all') {
                this.notificationReads.add(`${n.id}:${userId}`);
            } else if (n.user_id === userId) {
                n.is_read = true;
                this.notificationReads.add(`${n.id}:${userId}`);
            }
        });
    }

    /**
     * Anlık Duyuru & Hatırlatıcı Dağıtımı (dispatchInstantNotification)
     */
    public dispatchInstantNotification(payload: {
        eventId?: string;
        eventTitle?: string;
        title: string;
        message: string;
        targetAudience: 'all' | 'group' | 'role' | 'selected';
        targetGroupId?: string;
        targetRole?: WorkspaceRole;
        targetUserIds?: string[];
        type?: 'info' | 'warning' | 'reminder' | 'urgent' | 'announcement';
    }): WorkspaceNotification[] {
        const notifs: WorkspaceNotification[] = [];
        const notifType = payload.type || 'announcement';
        const nowStr = new Date().toISOString();

        if (payload.targetAudience === 'all') {
            const notif: WorkspaceNotification = {
                id: `notif_${Date.now()}_all`,
                user_id: 'all',
                event_id: payload.eventId,
                event_title: payload.eventTitle,
                title: payload.title,
                message: payload.message,
                type: notifType,
                is_read: false,
                is_active: true,
                created_at: nowStr
            };
            this.notifications.unshift(notif);
            notifs.push(notif);
        } else if (payload.targetAudience === 'group' && payload.targetGroupId) {
            const group = this.groups.get(payload.targetGroupId);
            const memberIds = group ? group.members : [];
            memberIds.forEach(mId => {
                const notif: WorkspaceNotification = {
                    id: `notif_${Date.now()}_${mId}`,
                    user_id: mId,
                    event_id: payload.eventId,
                    event_title: payload.eventTitle,
                    title: `[${group?.name || 'Komite'}] ${payload.title}`,
                    message: payload.message,
                    type: notifType,
                    is_read: false,
                    is_active: true,
                    created_at: nowStr
                };
                this.notifications.unshift(notif);
                notifs.push(notif);
            });
        } else if (payload.targetAudience === 'role' && payload.targetRole) {
            const targetRole = payload.targetRole;
            const matchingMembers = Array.from(this.members.values()).filter(m => m.role === targetRole);
            matchingMembers.forEach(m => {
                const notif: WorkspaceNotification = {
                    id: `notif_${Date.now()}_${m.id}`,
                    user_id: m.id,
                    event_id: payload.eventId,
                    event_title: payload.eventTitle,
                    title: payload.title,
                    message: payload.message,
                    type: notifType,
                    is_read: false,
                    is_active: true,
                    created_at: nowStr
                };
                this.notifications.unshift(notif);
                notifs.push(notif);
            });
        } else if (payload.targetAudience === 'selected' && payload.targetUserIds) {
            payload.targetUserIds.forEach(uId => {
                const notif: WorkspaceNotification = {
                    id: `notif_${Date.now()}_${uId}`,
                    user_id: uId,
                    event_id: payload.eventId,
                    event_title: payload.eventTitle,
                    title: payload.title,
                    message: payload.message,
                    type: notifType,
                    is_read: false,
                    is_active: true,
                    created_at: nowStr
                };
                this.notifications.unshift(notif);
                notifs.push(notif);
            });
        }

        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'system',
            user_email: 'broadcast',
            action: 'INSTANT_NOTIFICATION_DISPATCHED',
            entity_type: 'NOTIFICATION',
            details: `Anlık duyuru gönderildi: "${payload.title}" (Hedef: ${payload.targetAudience})`,
            created_at: nowStr
        });

        return notifs;
    }

    // ============================================
    // Oturum & Güvenlik Yönetimi (Sessions)
    // ============================================
    public getActiveSessions(): ActiveSession[] {
        return Array.from(this.activeSessions.values());
    }

    public registerSession(session: ActiveSession): void {
        this.activeSessions.set(session.id, session);
    }

    public revokeSession(sessionId: string): boolean {
        this.revokedTokens.add(sessionId);
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            this.logAudit({
                id: `audit_${Date.now()}`,
                user_id: session.user_id,
                user_email: session.email,
                action: 'SESSION_REVOKED',
                entity_type: 'SESSION',
                entity_id: sessionId,
                details: `Oturum sonlandırıldı (IP: ${session.ip_address})`,
                created_at: new Date().toISOString()
            });
        }
        return true;
    }

    public isSessionRevoked(sessionId: string): boolean {
        return this.revokedTokens.has(sessionId);
    }

    // ============================================
    // Denetim İzi Kaydı (Audit Logs)
    // ============================================
    public getAuditLogs(): AuditLogRecord[] {
        return [...this.auditLogs];
    }

    public logAudit(record: AuditLogRecord): void {
        this.auditLogs.unshift(record);
        if (this.auditLogs.length > 500) {
            this.auditLogs.pop();
        }
    }

    public clearAuditLogs(clearedBy: string): void {
        this.auditLogs = [];
        this.logAudit({
            id: `audit_clear_${Date.now()}`,
            user_id: 'admin',
            user_email: clearedBy,
            action: 'AUDIT_LOGS_CLEARED',
            entity_type: 'SECURITY',
            details: `Denetim günlüğü geçmişi ${clearedBy} tarafından güvenle temizlendi.`,
            created_at: new Date().toISOString()
        });
    }

    public addMemberNote(memberId: string, note: { author_id: string; author_name: string; content: string }): WorkspaceMember | null {
        const member = this.members.get(memberId);
        if (!member) return null;
        if (!member.member_notes) member.member_notes = [];
        member.member_notes.unshift({
            id: `mn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            author_id: note.author_id,
            author_name: note.author_name,
            content: note.content,
            created_at: new Date().toISOString()
        });
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: note.author_id,
            user_email: note.author_name,
            action: 'MEMBER_NOTE_ADDED',
            entity_type: 'MEMBER',
            entity_id: memberId,
            details: `Üye (@${member.username || member.email}) için değerlendirme notu eklendi.`,
            created_at: new Date().toISOString()
        });
        return member;
    }

    public deleteMemberNote(memberId: string, noteId: string): WorkspaceMember | null {
        const member = this.members.get(memberId);
        if (!member || !member.member_notes) return null;
        member.member_notes = member.member_notes.filter(n => n.id !== noteId);
        return member;
    }

    // ============================================
    // Rol İzin Matrisi (RBAC)
    // ============================================
    public getRolePermissions(): RolePermissions[] {
        return Array.from(this.rolePermissions.values());
    }

    public getPermissionsForRole(role: WorkspaceRole): RolePermissions {
        if (this.rolePermissions.has(role)) {
            const p = this.rolePermissions.get(role)!;
            // Editor için de silme izni ver
            if (role === 'editor') {
                return { ...p, can_delete: true };
            }
            return p;
        }

        const r = (role || '').toLowerCase();
        if (r.includes('admin') || r === 'super_admin' || r === 'workspace_admin') {
            return {
                role,
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: true,
                can_upload: true,
                can_share: true,
                can_comment: true,
                can_manage_rsvp: true,
                can_manage_tasks: true,
                can_broadcast: true,
                can_export: true
            };
        }

        if (r.includes('lead') || r.includes('editor') || r.includes('baskan') || r.includes('yonetici')) {
            return {
                role,
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: true,
                can_upload: true,
                can_share: true,
                can_comment: true,
                can_manage_rsvp: true,
                can_manage_tasks: true,
                can_broadcast: false,
                can_export: true
            };
        }

        if (r === 'contributor' || r.includes('katkici') || r.includes('contributor')) {
            return {
                role,
                can_view: true,
                can_create: true,
                can_edit: false,
                can_delete: false,
                can_upload: true,
                can_share: false,
                can_comment: true,
                can_manage_rsvp: false,
                can_manage_tasks: true,
                can_broadcast: false,
                can_export: false
            };
        }

        if (r === 'viewer' || r.includes('salt_okunur') || r.includes('readonly')) {
            return {
                role,
                can_view: true,
                can_create: false,
                can_edit: false,
                can_delete: false,
                can_upload: false,
                can_share: false,
                can_comment: false,
                can_manage_rsvp: false,
                can_manage_tasks: false,
                can_broadcast: false,
                can_export: false
            };
        }

        // Genel komite ve aktif çalışma alanı üyeleri için varsayılan tam düzenleme yetkisi
        return {
            role,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true,
            can_upload: true,
            can_share: true,
            can_comment: true,
            can_manage_rsvp: false,
            can_manage_tasks: true,
            can_broadcast: false,
            can_export: false
        };
    }

    public updateRolePermissions(role: WorkspaceRole, permissions: Partial<RolePermissions>): RolePermissions {
        const current = this.getPermissionsForRole(role);
        const updated = { ...current, ...permissions, role };
        this.rolePermissions.set(role, updated);
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'admin',
            user_email: 'admin',
            action: 'ROLE_PERMISSIONS_UPDATED',
            entity_type: 'RBAC',
            details: `Rol izinleri güncellendi: ${role}`,
            created_at: new Date().toISOString()
        });
        return updated;
    }

    // ============================================
    // Güvenlik Ayarları (Security Settings)
    // ============================================
    public getSecuritySettings(): WorkspaceSecuritySettings {
        return { ...this.securitySettings };
    }

    public updateSecuritySettings(settings: Partial<WorkspaceSecuritySettings>): WorkspaceSecuritySettings {
        this.securitySettings = { ...this.securitySettings, ...settings };
        this.logAudit({
            id: `audit_${Date.now()}`,
            user_id: 'admin',
            user_email: 'admin',
            action: 'SECURITY_SETTINGS_UPDATED',
            entity_type: 'SECURITY',
            details: `Sistem güvenlik ayarları güncellendi.`,
            created_at: new Date().toISOString()
        });
        return this.securitySettings;
    }
}
