export type WorkspaceRole = 'super_admin' | 'workspace_admin' | 'editor' | 'contributor' | 'viewer';

export interface WorkspaceMemberNote {
    id: string;
    author_id: string;
    author_name: string;
    content: string;
    category?: string;
    created_at: string;
}

export interface WorkspaceMember {
    id: string;
    email: string;
    username: string;
    display_name: string;
    full_name?: string;
    role: WorkspaceRole;
    status: 'active' | 'suspended' | 'invited';
    mfa_enabled: boolean;
    last_active_at?: string;
    created_at: string;
    avatar_url?: string;
    group_id?: string;
    must_change_password?: boolean;
    admin_notes?: string;
    member_notes?: WorkspaceMemberNote[];
}

export interface RolePermissions {
    role: WorkspaceRole;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_upload: boolean;
    can_share: boolean;
    can_comment?: boolean;
    can_manage_rsvp?: boolean;
    can_manage_tasks?: boolean;
    can_broadcast?: boolean;
    can_export?: boolean;
}

export interface WorkspaceCalendar {
    id: string;
    title: string;
    color: string;
    description?: string;
    is_private: boolean;
}

export interface WorkspaceGroup {
    id: string;
    name: string;
    code: string;
    description: string;
    color: string;
    role_key: string;
    members: string[]; // member ids or emails
}

export interface WorkspaceSubtask {
    id: string;
    event_id: string;
    title: string;
    is_completed: boolean;
    created_at: string;
}

export type WorkspaceCommentTag = 'general' | 'idea' | 'blocker' | 'decision' | 'info';

export interface WorkspaceComment {
    id: string;
    event_id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    content: string;
    created_at: string;
    is_pinned?: boolean;
    tag?: WorkspaceCommentTag;
    reactions?: Record<string, string[]>; // emoji -> [user_name]
}

export interface WorkspaceAttachment {
    id: string;
    event_id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    file_path: string;
    download_token: string;
    uploaded_by: string;
    created_at: string;
}

export interface WorkspaceReminder {
    id: string;
    event_id?: string;
    title?: string;
    trigger_minutes_before?: number; // e.g. 0, 15, 60, 1440
    minutes_before?: number; // alias for quick reminder chips
    channel?: 'notification' | 'email' | 'all';
    target?: 'all' | 'admins' | 'assignees';
    target_audience?: 'all' | 'group' | 'role' | 'selected' | 'self';
    target_group_id?: string;
    target_role?: WorkspaceRole;
    target_users?: string[];
    is_custom?: boolean;
    custom_datetime?: string;
    is_sent?: boolean;
    status?: 'pending' | 'sent';
    created_at?: string;
}

export type EventVisibility = 'public' | 'admin_only' | 'private' | 'custom';

export interface WorkspaceEventEditHistoryRecord {
    id: string;
    event_id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    user_role?: string;
    action: string;
    summary?: string;
    details?: string;
    timestamp: string;
}

export interface WorkspaceEvent {
    id: string;
    calendar_id: string;
    title: string;
    description: string; // Markdown supported
    category: string;
    color: string;
    start_time: string; // ISO 8601
    end_time: string;   // ISO 8601
    is_all_day: boolean;
    assignees: string[]; // member IDs
    allowed_member_ids?: string[]; // 'custom' görünürlük için seçilen üye ID'leri
    location?: string;
    meeting_link?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    visibility?: EventVisibility; // 'public' | 'admin_only' | 'private' | 'custom'
    created_by?: string; // member id
    version: number; // Concurrency lock
    subtasks: WorkspaceSubtask[];
    comments: WorkspaceComment[];
    attachments: WorkspaceAttachment[];
    reminders: WorkspaceReminder[];
    edit_history?: WorkspaceEventEditHistoryRecord[];
    change_summary?: string;
    is_showcase?: boolean; // Ana Sayfa Vitrininde Yayınla
    rsvp_enabled?: boolean; // Etkinlik Kayıt Sistemi Aç/Kapat
    rsvp_qr_enabled?: boolean; // QR Kod Dijital Bilet Aç/Kapat
    rsvp_capacity?: number; // Maksimum Katılımcı Kontenjanı
    attendee_count?: number; // Anlık Kayıtlı Katılımcı Sayısı
    member_attendance?: MemberAttendance[]; // Dahili Ekip LCV Katılım Durumları
    created_at?: string;
    updated_at?: string;
}

export interface MemberAttendance {
    user_id: string;
    user_name: string;
    user_avatar?: string;
    role: WorkspaceRole;
    status: 'attending' | 'declined' | 'maybe';
    reason?: string;
    responded_at: string;
}

export interface EventAttendee {
    id: string;
    event_id: string;
    full_name: string;
    email: string;
    student_no?: string;
    student_number?: string;
    department?: string;
    ticket_code: string;
    status: 'registered' | 'attended' | 'checked_in' | 'cancelled';
    checked_in_at?: string;
    created_at: string;
}

export interface CommunityProject {
    id: string;
    title: string;
    description: string;
    category?: string;
    github_url?: string;
    demo_url?: string;
    tech_stack: string[];
    stars_count?: number;
    forks_count?: number;
    contributors: string[];
    is_featured?: boolean;
    is_active?: boolean;
    created_at: string;
}

export interface WorkspaceNotification {
    id: string;
    user_id: string; // target user id, or 'all'
    event_id?: string;
    event_title?: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'reminder' | 'urgent' | 'announcement' | 'committee';
    category?: 'general' | 'committee' | 'reminder' | 'security';
    target_group_id?: string;
    is_read: boolean;
    is_active?: boolean; // true: yayında / aktif, false: pasif / yayından kaldırılmış
    created_at: string;
}

export interface ActiveSession {
    id: string;
    user_id: string;
    email: string;
    role: WorkspaceRole;
    ip_address: string;
    user_agent: string;
    last_active_at: string;
    created_at: string;
}

export interface AuditLogRecord {
    id: string;
    user_id: string;
    user_email: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: string;
    ip_address?: string;
    created_at: string;
}

export interface WorkspaceSecuritySettings {
    max_file_size_mb: number;
    allowed_file_types: string[];
    mfa_required: boolean;
    session_timeout_minutes: number;
    rsvp_registration_enabled?: boolean;
    rsvp_qr_enabled?: boolean;
    kanban_view_enabled?: boolean;
    showcase_projects_enabled?: boolean;
    webhook_url?: string;
    webhook_channel?: string;
}

