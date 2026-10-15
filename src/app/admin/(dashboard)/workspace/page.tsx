'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    WorkspaceMember,
    WorkspaceGroup,
    RolePermissions,
    ActiveSession,
    AuditLogRecord,
    WorkspaceSecuritySettings,
    WorkspaceRole,
    WorkspaceEvent,
    MemberAttendance,
    WorkspaceNotification
} from '@/shared/api/workspaceTypes';
import { AdminTableSkeleton } from '@/shared/ui/WorkspaceSkeleton';

type AdminTab = 'members' | 'groups' | 'roles' | 'attendance' | 'notifications' | 'sessions' | 'audit' | 'settings';

export default function AdminWorkspacePage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('members');
    const [loading, setLoading] = useState(true);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Data Collections
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
    const [roles, setRoles] = useState<RolePermissions[]>([]);
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
    const [settings, setSettings] = useState<WorkspaceSecuritySettings | null>(null);
    const [events, setEvents] = useState<WorkspaceEvent[]>([]);
    const [attendanceEventFilter, setAttendanceEventFilter] = useState<string>('all');
    const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');
    const [attendanceSearchQuery, setAttendanceSearchQuery] = useState<string>('');

    // Modals
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [newMemberForm, setNewMemberForm] = useState({
        display_name: '',
        username: '',
        email: '',
        password: '',
        role: 'editor' as WorkspaceRole,
        group_id: '',
    });
    const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);

    const [passwordModalMember, setPasswordModalMember] = useState<WorkspaceMember | null>(null);
    const [newPasswordValue, setNewPasswordValue] = useState('');
    const [showChangePasswordVal, setShowChangePasswordVal] = useState(false);

    const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
    const [newGroupForm, setNewGroupForm] = useState({
        name: '',
        code: '',
        description: '',
        color: '#8b5cf6',
        role_key: 'member',
    });

    // Group Member Management Filter
    const [selectedGroup, setSelectedGroup] = useState<WorkspaceGroup | null>(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    // Member Notes & Evaluation Modal
    const [notesModalMember, setNotesModalMember] = useState<WorkspaceMember | null>(null);
    const [newMemberNoteText, setNewMemberNoteText] = useState('');
    const [noteCategory, setNoteCategory] = useState('Performans');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Audit Log Clear State
    const [isClearAuditModalOpen, setIsClearAuditModalOpen] = useState(false);
    const [isClearingAudit, setIsClearingAudit] = useState(false);

    // Notification Management State
    const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
    const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);
    const [notifSearchQuery, setNotifSearchQuery] = useState<string>('');
    const [notifStatusFilter, setNotifStatusFilter] = useState<'all' | 'active' | 'passive' | 'announcement' | 'reminder'>('all');
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [isClearNotifModalOpen, setIsClearNotifModalOpen] = useState(false);
    const [clearFilterChoice, setClearFilterChoice] = useState<'all' | 'inactive' | 'read'>('all');
    const [inspectNotification, setInspectNotification] = useState<WorkspaceNotification | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        message: '',
        type: 'announcement' as 'announcement' | 'reminder' | 'info' | 'urgent',
        targetAudience: 'all' as 'all' | 'group' | 'role' | 'selected',
        targetGroupId: '',
        targetRole: 'contributor' as WorkspaceRole,
        targetUserIds: [] as string[],
        eventId: '',
        eventTitle: ''
    });

    const showNotification = (type: 'success' | 'error', text: string) => {
        setStatusMsg({ type, text });
        setTimeout(() => setStatusMsg(null), 4000);
    };

    // Auto-suggest username as full name is typed
    const handleDisplayNameChange = (val: string) => {
        const trMap: Record<string, string> = {
            'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i',
            'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u'
        };
        const normalized = val.split('').map(c => trMap[c] || c).join('').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

        setNewMemberForm(prev => {
            const isManual = prev.username && prev.username !== '';
            return {
                ...prev,
                display_name: val,
                username: isManual ? prev.username : normalized
            };
        });
    };

    // Generate random strong password
    const generateRandomPassword = () => {
        const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
        const numbers = '23456789';
        const symbols = '!@#$%&*';
        let pass = '';
        for (let i = 0; i < 5; i++) pass += letters.charAt(Math.floor(Math.random() * letters.length));
        for (let i = 0; i < 3; i++) pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
        pass += symbols.charAt(Math.floor(Math.random() * symbols.length));
        setNewMemberForm(prev => ({ ...prev, password: pass }));
        setShowNewMemberPassword(true);
    };

    // Load Tab Data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [memRes, grpRes, rolRes, sesRes, audRes, setRes, evtRes, notifRes] = await Promise.all([
                fetch('/api/workspace/admin/members').catch(() => null),
                fetch('/api/workspace/admin/groups').catch(() => null),
                fetch('/api/workspace/admin/roles').catch(() => null),
                fetch('/api/workspace/admin/sessions').catch(() => null),
                fetch('/api/workspace/admin/audit-logs').catch(() => null),
                fetch('/api/workspace/admin/settings').catch(() => null),
                fetch('/api/workspace/events').catch(() => null),
                fetch('/api/workspace/notifications?scope=admin').catch(() => null),
            ]);

            if (memRes && memRes.ok) setMembers((await memRes.json()).members || []);
            if (grpRes && grpRes.ok) {
                const grpData = (await grpRes.json()).groups || [];
                setGroups(grpData);
                if (!selectedGroup && grpData.length > 0) setSelectedGroup(grpData[0]);
            }
            if (rolRes && rolRes.ok) setRoles((await rolRes.json()).roles || []);
            if (sesRes && sesRes.ok) setSessions((await sesRes.json()).sessions || []);
            if (audRes && audRes.ok) setAuditLogs((await audRes.json()).auditLogs || []);
            if (setRes && setRes.ok) setSettings((await setRes.json()).settings || null);
            if (evtRes && evtRes.ok) {
                const evtData = await evtRes.json();
                setEvents(evtData.events || []);
            }
            if (notifRes && notifRes.ok) {
                const notifData = await notifRes.json();
                setNotifications(notifData.notifications || []);
            }
        } catch (err: any) {
            console.error('Admin veri yükleme hatası:', err);
            showNotification('error', 'Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [selectedGroup]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ───────────────────────────────────────────────
    // Bildirim Yönetim Fonksiyonları
    // ───────────────────────────────────────────────

    // Toggle Single Notification Active State (Yayından Kaldır / Yayına Al)
    const handleToggleNotificationActive = async (id: string, currentActive: boolean) => {
        setActionLoadingId(id);
        const nextActive = !currentActive;
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: nextActive })
            });
            const data = await res.json();
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_active: nextActive } : n));
                showNotification('success', nextActive ? 'Bildirim yayına alındı.' : 'Bildirim pasife alındı (kullanıcılardan gizlendi).');
            } else {
                showNotification('error', data.error || 'Bildirim durumu değiştirilemedi.');
            }
        } catch {
            showNotification('error', 'İşlem sırasında bağlantı hatası oluştu.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Bulk Toggle Active State (Seçilenleri Pasife Al / Yayına Al)
    const handleBulkToggleActive = async (targetActive: boolean) => {
        if (selectedNotifIds.length === 0) return;
        setIsBulkActionLoading(true);
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedNotifIds, is_active: targetActive })
            });
            const data = await res.json();
            if (res.ok) {
                setNotifications(prev => prev.map(n => selectedNotifIds.includes(n.id) ? { ...n, is_active: targetActive } : n));
                showNotification('success', targetActive ? `${selectedNotifIds.length} bildirim yayına alındı.` : `${selectedNotifIds.length} bildirim pasife alındı.`);
                setSelectedNotifIds([]);
            } else {
                showNotification('error', data.error || 'Toplu işlem başarısız oldu.');
            }
        } catch {
            showNotification('error', 'Toplu işlem sırasında hata oluştu.');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Delete Single Notification
    const handleDeleteNotification = async (id: string) => {
        if (!window.confirm('Bu bildirimi kalıcı olarak silmek ve yayından kaldırmak istediğinize emin misiniz?')) return;
        setActionLoadingId(id);
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
                setSelectedNotifIds(prev => prev.filter(x => x !== id));
                if (inspectNotification?.id === id) setInspectNotification(null);
                showNotification('success', 'Bildirim yayından kaldırıldı ve silindi.');
            } else {
                showNotification('error', data.error || 'Bildirim silinemedi.');
            }
        } catch {
            showNotification('error', 'Silme işlemi sırasında hata oluştu.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Bulk Delete Notifications
    const handleBulkDeleteNotifications = async () => {
        if (selectedNotifIds.length === 0) return;
        if (!window.confirm(`Seçilen ${selectedNotifIds.length} adet bildirimi yayından kaldırmak ve silmek istediğinize emin misiniz?`)) return;
        setIsBulkActionLoading(true);
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedNotifIds })
            });
            const data = await res.json();
            if (res.ok) {
                setNotifications(prev => prev.filter(n => !selectedNotifIds.includes(n.id)));
                setSelectedNotifIds([]);
                showNotification('success', `${selectedNotifIds.length} adet bildirim yayından kaldırıldı ve silindi.`);
            } else {
                showNotification('error', data.error || 'Toplu silme başarısız oldu.');
            }
        } catch {
            showNotification('error', 'Toplu silme işlemi sırasında hata oluştu.');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Clear Notification History
    const handleClearNotificationHistory = async () => {
        setIsBulkActionLoading(true);
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clear_history: true, filter: clearFilterChoice })
            });
            const data = await res.json();
            if (res.ok) {
                if (clearFilterChoice === 'all') {
                    setNotifications([]);
                } else if (clearFilterChoice === 'inactive') {
                    setNotifications(prev => prev.filter(n => n.is_active !== false));
                } else if (clearFilterChoice === 'read') {
                    setNotifications(prev => prev.filter(n => !n.is_read));
                }
                setSelectedNotifIds([]);
                setIsClearNotifModalOpen(false);
                showNotification('success', data.message || 'Bildirim geçmişi temizlendi.');
            } else {
                showNotification('error', data.error || 'Bildirim geçmişi temizlenemedi.');
            }
        } catch {
            showNotification('error', 'Temizleme işlemi sırasında hata oluştu.');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Dispatch Instant Broadcast
    const handleDispatchBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
            showNotification('error', 'Lütfen bildirim başlığı ve mesajını doldurun.');
            return;
        }
        setIsBulkActionLoading(true);
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(broadcastForm)
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('success', `Duyuru/Bildirim başarıyla dağıtıldı (${data.dispatchedCount || 1} alıcı).`);
                setIsBroadcastModalOpen(false);
                setBroadcastForm({
                    title: '',
                    message: '',
                    type: 'announcement',
                    targetAudience: 'all',
                    targetGroupId: '',
                    targetRole: 'contributor',
                    targetUserIds: [],
                    eventId: '',
                    eventTitle: ''
                });
                // Yeniden yükle
                const refreshed = await fetch('/api/workspace/notifications?scope=admin').then(r => r.json()).catch(() => null);
                if (refreshed?.notifications) setNotifications(refreshed.notifications);
            } else {
                showNotification('error', data.error || 'Bildirim dağıtılamadı.');
            }
        } catch {
            showNotification('error', 'Bildirim gönderilirken hata oluştu.');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Katılım & LCV Analitiği Hesaplamaları
    const allAttendanceRecords = React.useMemo(() => {
        const records: Array<MemberAttendance & { event_id: string; event_title: string; event_date: string }> = [];
        (events || []).forEach(evt => {
            if (evt.member_attendance && Array.isArray(evt.member_attendance)) {
                evt.member_attendance.forEach(att => {
                    records.push({
                        ...att,
                        event_id: evt.id,
                        event_title: evt.title,
                        event_date: evt.start_time,
                    });
                });
            }
        });
        return records;
    }, [events]);

    const filteredAttendanceRecords = React.useMemo(() => {
        return allAttendanceRecords.filter(r => {
            if (attendanceEventFilter !== 'all' && r.event_id !== attendanceEventFilter) return false;
            if (attendanceStatusFilter !== 'all' && r.status !== attendanceStatusFilter) return false;
            if (attendanceSearchQuery.trim()) {
                const q = attendanceSearchQuery.toLowerCase();
                const matchesUser = (r.user_name || '').toLowerCase().includes(q);
                const matchesEvent = (r.event_title || '').toLowerCase().includes(q);
                const matchesReason = (r.reason || '').toLowerCase().includes(q);
                if (!matchesUser && !matchesEvent && !matchesReason) return false;
            }
            return true;
        });
    }, [allAttendanceRecords, attendanceEventFilter, attendanceStatusFilter, attendanceSearchQuery]);

    const memberParticipationSummary = React.useMemo(() => {
        return members.map(m => {
            const memberRecords = allAttendanceRecords.filter(r => r.user_id === m.id || r.user_name === m.display_name);
            const attending = memberRecords.filter(r => r.status === 'attending').length;
            const declined = memberRecords.filter(r => r.status === 'declined').length;
            const maybe = memberRecords.filter(r => r.status === 'maybe').length;
            const total = memberRecords.length;
            const rate = total > 0 ? Math.round((attending / total) * 100) : 0;
            return {
                member: m,
                attending,
                declined,
                maybe,
                total,
                rate,
            };
        });
    }, [members, allAttendanceRecords]);

    const handleExportAttendanceCSV = () => {
        if (filteredAttendanceRecords.length === 0) {
            showNotification('error', 'Dışa aktarılacak katılım kaydı bulunamadı.');
            return;
        }

        const headers = ['Etkinlik Adı', 'Etkinlik Tarihi', 'Üye Adı', 'Rol', 'Katılım Durumu', 'Mazeret / Açıklama', 'Yanıt Tarihi'];
        const rows = filteredAttendanceRecords.map(r => [
            `"${(r.event_title || '').replace(/"/g, '""')}"`,
            `"${new Date(r.event_date).toLocaleString('tr-TR')}"`,
            `"${(r.user_name || '').replace(/"/g, '""')}"`,
            `"${r.role || ''}"`,
            `"${r.status === 'attending' ? 'Katılıyor' : r.status === 'declined' ? 'Katılamıyor' : 'Belirsiz'}"`,
            `"${(r.reason || '').replace(/"/g, '""')}"`,
            `"${r.responded_at ? new Date(r.responded_at).toLocaleString('tr-TR') : ''}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `hsd_katilim_raporu_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('success', 'Katılım raporu başarıyla CSV olarak indirildi.');
    };

    // Member Actions
    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/workspace/admin/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMemberForm),
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('success', `✓ ${newMemberForm.display_name} (@${data.member?.username || newMemberForm.username}) başarıyla oluşturuldu!`);
                if (data.member) {
                    setMembers(prev => [data.member, ...prev.filter(m => m.id !== data.member.id)]);
                }
                setIsAddMemberOpen(false);
                setNewMemberForm({ display_name: '', username: '', email: '', password: '', role: 'editor', group_id: '' });
                loadData();
            } else {
                showNotification('error', data.error || 'Üye oluşturulamadı.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModalMember || !newPasswordValue) return;

        try {
            const res = await fetch('/api/workspace/admin/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: passwordModalMember.id,
                    newPassword: newPasswordValue,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('success', `${passwordModalMember.display_name} şifresi güncellendi.`);
                setPasswordModalMember(null);
                setNewPasswordValue('');
            } else {
                showNotification('error', data.error || 'Şifre güncellenemedi.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    const handleDeleteMember = async (id: string, name: string) => {
        if (!confirm(`"${name}" üyesini silmek istediğinize emin misiniz?`)) return;

        try {
            const res = await fetch(`/api/workspace/admin/members?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('success', 'Üye silindi.');
                loadData();
            } else {
                showNotification('error', data.error || 'Üye silinemedi.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    // Hızlı Rol Güncelleme
    const handleUpdateMemberRole = async (memberId: string, nextRole: WorkspaceRole) => {
        try {
            const res = await fetch('/api/workspace/admin/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: memberId, role: nextRole }),
            });
            const data = await res.json();
            if (res.ok && data.member) {
                setMembers(prev => prev.map(m => m.id === memberId ? data.member : m));
                showNotification('success', `✓ Rol güncellendi: ${nextRole}`);
            } else {
                showNotification('error', data.error || 'Rol güncellenemedi.');
            }
        } catch {
            showNotification('error', 'Rol güncellenirken hata oluştu.');
        }
    };

    // Üyeye Not / Değerlendirme Yorumu Ekleme
    const handleAddMemberNote = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!notesModalMember || !newMemberNoteText.trim()) return;
        setIsSavingNote(true);
        try {
            const res = await fetch('/api/workspace/admin/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: notesModalMember.id,
                    newNote: { content: newMemberNoteText.trim(), category: noteCategory },
                }),
            });
            const data = await res.json();
            if (res.ok && data.member) {
                setMembers(prev => prev.map(m => m.id === notesModalMember.id ? data.member : m));
                setNotesModalMember(data.member);
                setNewMemberNoteText('');
                showNotification('success', '✓ Ekip değerlendirme notu eklendi.');
            } else {
                showNotification('error', data.error || 'Not kaydedilemedi.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        } finally {
            setIsSavingNote(false);
        }
    };

    // Üye Notunu Silme
    const handleDeleteMemberNote = async (noteId: string) => {
        if (!notesModalMember) return;
        try {
            const res = await fetch('/api/workspace/admin/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: notesModalMember.id,
                    deleteNoteId: noteId,
                }),
            });
            const data = await res.json();
            if (res.ok && data.member) {
                setMembers(prev => prev.map(m => m.id === notesModalMember.id ? data.member : m));
                setNotesModalMember(data.member);
                showNotification('success', '✓ Not silindi.');
            } else {
                showNotification('error', data.error || 'Not silinemedi.');
            }
        } catch {
            showNotification('error', 'Not silinemedi.');
        }
    };

    // Denetim Günlüğü Temizleme (Clear Audit Logs)
    const handleConfirmClearAuditLogs = async () => {
        setIsClearingAudit(true);
        try {
            const res = await fetch('/api/workspace/admin/audit-logs', { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setAuditLogs([]);
                setIsClearAuditModalOpen(false);
                showNotification('success', '✓ Denetim izi geçmişi başarıyla temizlendi.');
                loadData();
            } else {
                showNotification('error', data.error || 'Denetim izi temizlenemedi.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        } finally {
            setIsClearingAudit(false);
        }
    };

    // Group Actions
    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/workspace/admin/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGroupForm),
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('success', 'Yeni komite oluşturuldu.');
                setIsAddGroupOpen(false);
                setNewGroupForm({ name: '', code: '', description: '', color: '#8b5cf6', role_key: 'member' });
                loadData();
            } else {
                showNotification('error', data.error || 'Komite oluşturulamadı.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    const handleToggleGroupMember = async (groupId: string, memberId: string, add: boolean) => {
        try {
            const res = await fetch('/api/workspace/admin/groups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, memberId, add }),
            });
            const data = await res.json();
            if (res.ok) {
                setGroups(groups.map(g => g.id === groupId ? data.group : g));
                if (selectedGroup?.id === groupId) {
                    setSelectedGroup(data.group);
                }
                showNotification('success', add ? 'Üye komiteye eklendi.' : 'Üye komiteden çıkarıldı.');
            } else {
                showNotification('error', data.error || 'Üye durumu güncellenemedi.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    // Role Permissions Update
    const handleTogglePermission = async (roleKey: WorkspaceRole, field: keyof RolePermissions) => {
        const currentRole = roles.find(r => r.role === roleKey);
        if (!currentRole) return;

        const nextVal = !currentRole[field];
        const updatedPerms = { ...currentRole, [field]: nextVal };

        try {
            const res = await fetch('/api/workspace/admin/roles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: roleKey, permissions: { [field]: nextVal } }),
            });
            if (res.ok) {
                setRoles(roles.map(r => r.role === roleKey ? updatedPerms : r));
                showNotification('success', `${roleKey} yetkileri güncellendi.`);
            }
        } catch {
            showNotification('error', 'Yetki güncellenemedi.');
        }
    };

    // Session Revoke
    const handleRevokeSession = async (sessionId: string) => {
        if (!confirm('Bu oturumu sonlandırmak istediğinize emin misiniz?')) return;

        try {
            const res = await fetch(`/api/workspace/admin/sessions?id=${sessionId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSessions(sessions.filter(s => s.id !== sessionId));
                showNotification('success', 'Oturum sonlandırıldı.');
            } else {
                showNotification('error', 'Oturum sonlandırılamadı.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    // Settings Update
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        try {
            const res = await fetch('/api/workspace/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                showNotification('success', 'Güvenlik ayarları kaydedildi.');
            } else {
                showNotification('error', 'Ayarlar kaydedilemedi.');
            }
        } catch {
            showNotification('error', 'İşlem başarısız.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span>Topluluk Takvimi & Workspace Yönetimi</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                            Admin v2.0
                        </span>
                    </h1>
                    <p className="text-xs text-zinc-400 mt-1">
                        Üyeler, komiteler, RBAC izin matrisi, oturumlar ve güvenlik denetim izi merkezi.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="/workspace"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                        <span>📅</span> Takvimi Aç ↗
                    </a>
                </div>
            </div>

            {/* Notification Toast */}
            {statusMsg && (
                <div
                    className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 animate-in fade-in ${statusMsg.type === 'success'
                            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                            : 'bg-rose-950/70 border-rose-800 text-rose-200'
                        }`}
                >
                    <span>{statusMsg.type === 'success' ? '✓' : '⚠'}</span>
                    <span>{statusMsg.text}</span>
                </div>
            )}

            {/* 7 Tabs Navigation */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
                {[
                    { key: 'members', label: 'Üyeler', count: members.length },
                    { key: 'groups', label: 'Komite & Ekip Ayarları', count: groups.length },
                    { key: 'roles', label: 'Yetki Matrisi (RBAC)' },
                    { key: 'attendance', label: '🎯 Katılım Analitiği', count: allAttendanceRecords.length },
                    { key: 'notifications', label: '📢 Bildirim & Duyuru Yönetimi', count: notifications.length },
                    { key: 'sessions', label: 'Aktif Oturumlar', count: sessions.length },
                    { key: 'audit', label: 'Denetim İzi (Audit)', count: auditLogs.length },
                    { key: 'settings', label: 'Güvenlik Ayarları' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key as AdminTab)}
                        className={`px-3.5 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 ${activeTab === tab.key
                                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                            }`}
                    >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className="px-1.5 py-0.2 rounded-full bg-zinc-950 text-[10px] text-zinc-400 font-mono">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            {loading ? (
                <div className="p-12 text-center text-xs text-zinc-500 font-mono">Yükleniyor...</div>
            ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
                    {/* ── 1. ÜYELER TABI ── */}
                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            {/* Bilgilendirme Notu */}
                            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-start gap-3 text-xs">
                                <span className="text-rose-400 text-base mt-0.5 shrink-0">ℹ️</span>
                                <div>
                                    <p className="font-bold text-white">Çekirdek Ekip Giriş ve Takvim Erişimi:</p>
                                    <p className="text-zinc-300 mt-0.5 leading-relaxed">
                                        Burada oluşturduğunuz üyeler, belirlediğiniz <strong>E-Posta</strong> veya <strong>Kullanıcı Adı</strong> (@kullanici_adi) ve <strong>Şifreleri</strong> ile <a href="/workspace" target="_blank" className="text-rose-400 hover:underline font-bold">/workspace</a> sayfasına giriş yaparak topluluk takvimine ve komite etkinliklerine anında erişebilir.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-white">Topluluk Üyeleri</h2>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono font-semibold">
                                        {members.length} Üye
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewMemberForm({ display_name: '', username: '', email: '', password: '', role: 'editor', group_id: '' });
                                        setIsAddMemberOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all flex items-center gap-1.5"
                                >
                                    <span>+</span>
                                    <span>Yeni Üye Ekle</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-3">Ad / Soyad & Kullanıcı Adı</th>
                                            <th className="py-3 px-3">Komite / Ekip</th>
                                            <th className="py-3 px-3">E-Posta</th>
                                            <th className="py-3 px-3">Rol</th>
                                            <th className="py-3 px-3">Durum</th>
                                            <th className="py-3 px-3">MFA</th>
                                            <th className="py-3 px-3">Son Aktiflik</th>
                                            <th className="py-3 px-3 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {members.map(m => {
                                            const memberGroups = groups.filter(g => g.members.includes(m.id));
                                            return (
                                                <tr key={m.id} className="hover:bg-zinc-900/50 transition-colors">
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-rose-400 text-xs shrink-0">
                                                                {m.display_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white">{m.display_name}</p>
                                                                <span className="font-mono text-[11px] text-rose-300 font-semibold">
                                                                    @{m.username || m.email.split('@')[0]}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        {memberGroups.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {memberGroups.map(grp => (
                                                                    <span
                                                                        key={grp.id}
                                                                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 text-white shadow-xs"
                                                                        style={{ backgroundColor: `${grp.color}25`, borderLeft: `2.5px solid ${grp.color}` }}
                                                                    >
                                                                        {grp.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-zinc-500 italic text-[11px]">Bağımsız</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-zinc-300 font-medium">{m.email}</td>
                                                    <td className="py-3 px-3">
                                                        <select
                                                            value={m.role}
                                                            onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as WorkspaceRole)}
                                                            className="bg-zinc-900 border border-zinc-700/80 hover:border-rose-500 rounded-lg px-2.5 py-1 text-[11px] text-zinc-100 font-mono font-bold focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
                                                        >
                                                            <option value="super_admin">👑 super_admin</option>
                                                            <option value="workspace_admin">🛡️ workspace_admin</option>
                                                            <option value="editor">✍️ editor</option>
                                                            <option value="contributor">🤝 contributor</option>
                                                            <option value="viewer">👁️ viewer</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${m.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                        <span className="capitalize text-zinc-200 font-medium">{m.status}</span>
                                                    </td>
                                                    <td className="py-3 px-3 text-zinc-400 font-mono">
                                                        {m.mfa_enabled ? '✓ Açık' : '✕ Kapalı'}
                                                    </td>
                                                    <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                                                        {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString('tr-TR') : '-'}
                                                    </td>
                                                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNotesModalMember(m)}
                                                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs border border-zinc-800 hover:border-amber-700 transition-colors inline-flex items-center gap-1"
                                                            title="Ekip Notları & Yorum Yaz"
                                                        >
                                                            <span>📝</span>
                                                            {(m.member_notes?.length || 0) > 0 && (
                                                                <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-[10px] text-amber-300 border border-amber-800 font-bold font-mono">
                                                                    {m.member_notes?.length}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setPasswordModalMember(m);
                                                                setNewPasswordValue('');
                                                                setShowChangePasswordVal(false);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs border border-zinc-800 transition-colors"
                                                            title="Şifre Değiştir"
                                                        >
                                                            🔑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteMember(m.id, m.display_name)}
                                                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/70 text-rose-400 text-xs border border-zinc-800 hover:border-rose-900 transition-colors"
                                                            title="Üyeyi Sil"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 2. GRUP & EKİP AYARLARI TABI ── */}
                    {activeTab === 'groups' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-white">Komiteler ve Çalışma Grupları</h2>
                                <button
                                    type="button"
                                    onClick={() => setIsAddGroupOpen(true)}
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all"
                                >
                                    + Yeni Komite Oluştur
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Sol: Komite Kartları */}
                                <div className="space-y-2.5">
                                    {groups.map(grp => (
                                        <div
                                            key={grp.id}
                                            onClick={() => setSelectedGroup(grp)}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selectedGroup?.id === grp.id
                                                    ? 'bg-zinc-900 border-rose-500/80 shadow-md'
                                                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: grp.color }} />
                                                    <h3 className="text-xs font-bold text-white">{grp.name}</h3>
                                                </div>
                                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {grp.members.length} Üye
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-zinc-400 line-clamp-2">{grp.description}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Sağ: Seçili Komite Üye Yönetimi */}
                                {selectedGroup && (
                                    <div className="md:col-span-2 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedGroup.color }} />
                                                    {selectedGroup.name} — Üye Listesi
                                                </h3>
                                                <p className="text-xs text-zinc-400 mt-0.5">{selectedGroup.description}</p>
                                            </div>
                                        </div>

                                        {/* Canlı Üye Arama */}
                                        <input
                                            type="text"
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            placeholder="Üye ara (Ad veya E-posta)..."
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                                        />

                                        {/* Üye Eşleme Listesi */}
                                        <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                            {members
                                                .filter(m =>
                                                    m.display_name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                                                    m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                                                )
                                                .map(m => {
                                                    const isMemberOfGroup = selectedGroup.members.includes(m.id);
                                                    return (
                                                        <div
                                                            key={m.id}
                                                            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs"
                                                        >
                                                            <div>
                                                                <p className="font-semibold text-white">{m.display_name}</p>
                                                                <p className="text-[11px] text-zinc-400 font-mono">{m.email}</p>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleGroupMember(selectedGroup.id, m.id, !isMemberOfGroup)}
                                                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${isMemberOfGroup
                                                                        ? 'bg-rose-950/70 text-rose-300 border border-rose-800 hover:bg-rose-900'
                                                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                                    }`}
                                                            >
                                                                {isMemberOfGroup ? 'Komiteden Çıkar' : '+ Dahil Et'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── 3. YETKİ MATRİSİ TABI (RBAC) ── */}
                    {activeTab === 'roles' && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-semibold text-white">Rol Tabanlı Erişim Kontrolü (RBAC) Matrisi</h2>
                            <p className="text-xs text-zinc-400">
                                Kullanıcı rollerinin takvim ve etkinlik üzerindeki işlem yetkilerini belirleyin.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                                            <th className="py-2.5 px-3">Rol</th>
                                            <th className="py-2.5 px-2 text-center" title="Takvim ve etkinlikleri görüntüleme">Görüntüleme<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_view</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Yeni etkinlik oluşturma">Oluşturma<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_create</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Mevcut etkinlikleri güncelleme">Düzenleme<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_edit</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Etkinlikleri takvimden silme">Silme<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_delete</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Ek dosya ve afiş yükleme">Dosya<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_upload</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Etkinlikleri dışarı paylaşma">Paylaşım<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_share</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Etkinliklere ekip notu ve yorum yazma">Yorum & Not<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_comment</span></th>
                                            <th className="py-2.5 px-2 text-center" title="RSVP ve QR biletlerini yönetme">Katılım & Bilet<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_manage_rsvp</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Alt görev checklist ekleme/düzenleme">Görevler<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_manage_tasks</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Anlık acil duyuru ve bildirim yayını">Duyuru<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_broadcast</span></th>
                                            <th className="py-2.5 px-2 text-center" title="Katılımcı ve etkinlik verilerini CSV/JSON indirme">Dışa Aktar<br/><span className="text-[10px] text-zinc-500 font-mono font-normal">can_export</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {roles.map(r => (
                                            <tr key={r.role} className="hover:bg-zinc-900/40">
                                                <td className="py-3 px-3 font-bold text-white uppercase font-mono">{r.role}</td>
                                                {([
                                                    'can_view',
                                                    'can_create',
                                                    'can_edit',
                                                    'can_delete',
                                                    'can_upload',
                                                    'can_share',
                                                    'can_comment',
                                                    'can_manage_rsvp',
                                                    'can_manage_tasks',
                                                    'can_broadcast',
                                                    'can_export'
                                                ] as const).map(col => (
                                                    <td key={col} className="py-3 px-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTogglePermission(r.role, col)}
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${r[col]
                                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                                    : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
                                                                }`}
                                                            title={`${r.role} - ${col}: ${r[col] ? 'Açık' : 'Kapalı'}`}
                                                        >
                                                            {r[col] ? '✓' : '✕'}
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Üyeler ve Rol Ayarlama + Yorum/Not Yazma Bölümü */}
                            <div className="pt-6 border-t border-zinc-800 space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>👥</span>
                                        <span>Topluluk Üyeleri Rol Ayarlama & Ekip Değerlendirme Notları</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Üyelerin rollerini hızlıca değiştirin, üye profiline özel ekip değerlendirme ve iç notlar ekleyin.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {members.map(member => (
                                        <div key={member.id} className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-colors">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-white text-xs truncate">{member.display_name}</p>
                                                    <p className="text-[11px] text-zinc-400 font-mono truncate">{member.email}</p>
                                                    {member.username && (
                                                        <span className="text-[10px] text-rose-400 font-mono">@{member.username}</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setNotesModalMember(member)}
                                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                                                    title="Ekip / Admin Notları"
                                                >
                                                    <span>📝</span>
                                                    <span>Notlar {(member.member_notes && member.member_notes.length > 0) ? `(${member.member_notes.length})` : ''}</span>
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Rolü Değiştir:</label>
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as WorkspaceRole)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                                                >
                                                    <option value="super_admin">Super Admin (Tam Yetki)</option>
                                                    <option value="workspace_admin">Workspace Admin</option>
                                                    <option value="editor">Editor (Etkinlik Yönetimi)</option>
                                                    <option value="contributor">Contributor (Katkı/Yorum)</option>
                                                    <option value="viewer">Viewer (Salt Okunur)</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 4. KATILIM & LCV ANALİTİĞİ TABI ── */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-6">
                            {/* Başlık ve İşlem Butonları */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800">
                                <div>
                                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>🎯</span>
                                        <span>Etkinlik Katılım Analitiği</span>
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Topluluk üyelerinin takvim etkinliklerine katılım yanıtları, mazeret bildirimleri ve devam oranları.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleExportAttendanceCSV}
                                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
                                        title="Tüm filtrelenmiş katılım kayıtlarını CSV dosyası olarak dışa aktar"
                                    >
                                        <span>📥</span>
                                        <span>CSV Raporu İndir</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => loadData()}
                                        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-800"
                                    >
                                        <span>🔄</span>
                                        <span>Yenile</span>
                                    </button>
                                </div>
                            </div>

                            {/* KPI İstatistik Kartları */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                                    <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                                        <span>Toplam Geri Bildirim</span>
                                        <span className="text-base">📋</span>
                                    </div>
                                    <div className="text-2xl font-black text-white font-mono">
                                        {allAttendanceRecords.length}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-mono">
                                        İncelenen {events.length} etkinlik
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                                    <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
                                        <span>Katılanlar</span>
                                        <span className="text-base">✅</span>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-400 font-mono">
                                        {allAttendanceRecords.filter(r => r.status === 'attending').length}
                                    </div>
                                    <p className="text-[11px] text-emerald-300/80 font-mono">
                                        %{allAttendanceRecords.length > 0 ? Math.round((allAttendanceRecords.filter(r => r.status === 'attending').length / allAttendanceRecords.length) * 100) : 0} genel katılım oranı
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-950/40 space-y-1">
                                    <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
                                        <span>Katılamayanlar</span>
                                        <span className="text-base">❌</span>
                                    </div>
                                    <div className="text-2xl font-black text-rose-400 font-mono">
                                        {allAttendanceRecords.filter(r => r.status === 'declined').length}
                                    </div>
                                    <p className="text-[11px] text-rose-300/80 font-mono">
                                        {allAttendanceRecords.filter(r => r.status === 'declined' && r.reason).length} mazeret bildirildi
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-1">
                                    <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
                                        <span>Belirsiz / Düşünen</span>
                                        <span className="text-base">⏳</span>
                                    </div>
                                    <div className="text-2xl font-black text-amber-400 font-mono">
                                        {allAttendanceRecords.filter(r => r.status === 'maybe').length}
                                    </div>
                                    <p className="text-[11px] text-amber-300/80 font-mono">
                                        Geri dönüş bekleyenler
                                    </p>
                                </div>
                            </div>

                            {/* Mazeret Bildirimleri Vitrini (Declined Reasons Breakdown) */}
                            {allAttendanceRecords.some(r => r.status === 'declined' && r.reason && r.reason.trim().length > 0) && (
                                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                                    <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                                        <span>📝</span>
                                        <span>Son Mazeret Bildirimleri & Açıklamalar</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-mono">
                                            {allAttendanceRecords.filter(r => r.status === 'declined' && r.reason && r.reason.trim().length > 0).length} Bildirim
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {allAttendanceRecords
                                            .filter(r => r.status === 'declined' && r.reason && r.reason.trim().length > 0)
                                            .slice(0, 6)
                                            .map((r, idx) => (
                                                <div key={idx} className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center justify-between gap-1 text-[11px]">
                                                            <span className="font-semibold text-white truncate">{r.user_name}</span>
                                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">{r.role}</span>
                                                        </div>
                                                        <p className="text-[10px] text-rose-400/90 font-medium truncate mt-0.5">
                                                            📌 {r.event_title}
                                                        </p>
                                                        <p className="text-xs text-zinc-300 italic mt-1.5 pl-2 border-l-2 border-rose-500/50 leading-relaxed">
                                                            "{r.reason}"
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500 font-mono text-right">
                                                        {r.responded_at ? new Date(r.responded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Filtreleme ve Arama Araç Çubuğu */}
                            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Etkinlik Filtresi */}
                                    <select
                                        value={attendanceEventFilter}
                                        onChange={(e) => setAttendanceEventFilter(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                                    >
                                        <option value="all">Tüm Etkinlikler ({events.length})</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>
                                                {ev.title} ({new Date(ev.start_time).toLocaleDateString('tr-TR')})
                                            </option>
                                        ))}
                                    </select>

                                    {/* Durum Filtresi */}
                                    <select
                                        value={attendanceStatusFilter}
                                        onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                                        className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                                    >
                                        <option value="all">Tüm Durumlar</option>
                                        <option value="attending">🟢 Katılıyor</option>
                                        <option value="declined">🔴 Katılamıyor</option>
                                        <option value="maybe">🟡 Belirsiz</option>
                                    </select>

                                    {/* Arama Inputu */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={attendanceSearchQuery}
                                            onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                                            placeholder="Üye, etkinlik veya mazeret ara..."
                                            className="bg-zinc-950 border border-zinc-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 placeholder-zinc-500 w-52 sm:w-64"
                                        />
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[11px]">🔍</span>
                                    </div>
                                </div>

                                <div className="text-zinc-400 font-mono text-[11px]">
                                    {filteredAttendanceRecords.length} / {allAttendanceRecords.length} kayıt gösteriliyor
                                </div>
                            </div>

                            {/* Detaylı Katılım Tablosu */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-zinc-300">Detaylı Katılım ve Yanıt Kayıtları</h3>
                                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-semibold">
                                                <th className="py-2.5 px-3">Üye</th>
                                                <th className="py-2.5 px-3">Rol</th>
                                                <th className="py-2.5 px-3">Etkinlik</th>
                                                <th className="py-2.5 px-3">Katılım Durumu</th>
                                                <th className="py-2.5 px-3">Mazeret / Açıklama</th>
                                                <th className="py-2.5 px-3 text-right">Yanıt Zamanı</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900 bg-zinc-950">
                                            {filteredAttendanceRecords.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono text-xs">
                                                        Kriterlere uygun katılım kaydı bulunamadı.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAttendanceRecords.map((r, idx) => (
                                                    <tr key={`${r.event_id}_${r.user_id}_${idx}`} className="hover:bg-zinc-900/40 transition-colors">
                                                        <td className="py-2.5 px-3 font-semibold text-white">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-bold shrink-0">
                                                                    {r.user_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="truncate max-w-[140px]">{r.user_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                                                            {r.role}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-zinc-200">
                                                            <div>
                                                                <p className="font-medium text-white truncate max-w-xs">{r.event_title}</p>
                                                                <p className="text-[10px] text-zinc-500 font-mono">
                                                                    {new Date(r.event_date).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {r.status === 'attending' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-semibold text-[11px]">
                                                                    <span>✓</span> Katılıyor
                                                                </span>
                                                            )}
                                                            {r.status === 'declined' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-800 text-rose-300 font-semibold text-[11px]">
                                                                    <span>✕</span> Katılamıyor
                                                                </span>
                                                            )}
                                                            {r.status === 'maybe' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-800 text-amber-300 font-semibold text-[11px]">
                                                                    <span>?</span> Belirsiz
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-zinc-300 max-w-sm">
                                                            {r.reason ? (
                                                                <span className="text-zinc-200 italic font-normal text-xs" title={r.reason}>
                                                                    "{r.reason}"
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-600 font-mono text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-zinc-400">
                                                            {r.responded_at ? new Date(r.responded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Topluluk Üyeleri Katılım Karnesi & Devam Oranları */}
                            <div className="pt-4 border-t border-zinc-800 space-y-3">
                                <div>
                                    <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                                        <span>📊</span>
                                        <span>Topluluk Üyeleri Katılım Karnesi (Devam Oranları)</span>
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                        Kayıtlı üyelerin etkinliklere geri bildirim verme ve katılım sağlama oranları.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {memberParticipationSummary.map(ps => {
                                        const rateColor = ps.rate >= 70 ? 'text-emerald-400' : ps.rate >= 40 ? 'text-amber-400' : 'text-zinc-400';
                                        const barColor = ps.rate >= 70 ? 'bg-emerald-500' : ps.rate >= 40 ? 'bg-amber-500' : 'bg-rose-500';

                                        return (
                                            <div key={ps.member.id} className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2.5 hover:border-zinc-700 transition-colors">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-white text-xs truncate">{ps.member.display_name}</p>
                                                        <p className="text-[11px] text-zinc-400 font-mono truncate">{ps.member.email}</p>
                                                        {ps.member.username && (
                                                            <span className="text-[10px] text-rose-400 font-mono">@{ps.member.username}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className={`text-base font-black font-mono ${rateColor}`}>
                                                            %{ps.rate}
                                                        </div>
                                                        <span className="text-[10px] text-zinc-500 font-mono">Katılım</span>
                                                    </div>
                                                </div>

                                                {/* İlerleme Çubuğu */}
                                                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${barColor} transition-all duration-500`}
                                                        style={{ width: `${ps.rate}%` }}
                                                    />
                                                </div>

                                                {/* İstatistik Rozetleri */}
                                                <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-zinc-400 border-t border-zinc-800/60">
                                                    <span className="text-emerald-400">✓ {ps.attending} Katıldı</span>
                                                    <span className="text-rose-400">✕ {ps.declined} Katılamadı</span>
                                                    <span className="text-amber-400">? {ps.maybe} Belirsiz</span>
                                                    <span className="text-zinc-500">Top: {ps.total}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── 5. BİLDİRİM & DUYURU YÖNETİMİ TABI ── */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-5">
                            {/* Başlık ve Butonlar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <span>📢</span> Bildirim & Duyuru Yönetimi
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Aktif bildirimleri görüntüleyin, yayından kaldırın/pasife alın, geçmişi temizleyin veya hedef kitleye anlık duyuru dağıtın.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsClearNotifModalOpen(true)}
                                        className="px-3 py-1.5 rounded-xl border border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                                    >
                                        <span>🧹</span>
                                        <span>Geçmişi Temizle</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsBroadcastModalOpen(true)}
                                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                                    >
                                        <span>⚡</span>
                                        <span>Yeni Duyuru / Bildirim Dağıt</span>
                                    </button>
                                </div>
                            </div>

                            {/* KPI İstatistik Kartları */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
                                    <div className="text-[11px] font-medium text-zinc-400">Toplam Bildirim</div>
                                    <div className="text-xl font-bold text-white font-mono">{notifications.length}</div>
                                    <div className="text-[10px] text-zinc-500">Sistemdeki tüm kayıtlar</div>
                                </div>
                                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                                    <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Yayında (Aktif)
                                    </div>
                                    <div className="text-xl font-bold text-emerald-300 font-mono">
                                        {notifications.filter(n => n.is_active !== false).length}
                                    </div>
                                    <div className="text-[10px] text-emerald-500/80">Kullanıcılara görünenler</div>
                                </div>
                                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-1">
                                    <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Pasife Alınanlar
                                    </div>
                                    <div className="text-xl font-bold text-amber-300 font-mono">
                                        {notifications.filter(n => n.is_active === false).length}
                                    </div>
                                    <div className="text-[10px] text-amber-500/80">Yayından kaldırılmışlar</div>
                                </div>
                                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
                                    <div className="text-[11px] font-medium text-zinc-400">Okunma Sayısı</div>
                                    <div className="text-xl font-bold text-zinc-200 font-mono">
                                        {notifications.filter(n => n.is_read).length}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">Okundu işaretlenenler</div>
                                </div>
                            </div>

                            {/* Filtre ve Arama Çubuğu */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
                                <div className="relative flex-1 max-w-sm">
                                    <input
                                        type="text"
                                        placeholder="Başlık, içerik veya kullanıcı ara..."
                                        value={notifSearchQuery}
                                        onChange={(e) => setNotifSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                    />
                                    <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">🔍</span>
                                    {notifSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setNotifSearchQuery('')}
                                            className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-white text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    {[
                                        { key: 'all', label: `Tümü (${notifications.length})` },
                                        { key: 'active', label: `🟢 Yayında (${notifications.filter(n => n.is_active !== false).length})` },
                                        { key: 'passive', label: `⏸️ Pasif (${notifications.filter(n => n.is_active === false).length})` },
                                        { key: 'announcement', label: `📢 Duyurular (${notifications.filter(n => n.type === 'announcement').length})` },
                                        { key: 'reminder', label: `⏰ Hatırlatıcılar (${notifications.filter(n => n.type === 'reminder').length})` }
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            type="button"
                                            onClick={() => setNotifStatusFilter(f.key as any)}
                                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                                notifStatusFilter === f.key
                                                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toplu İşlem Çubuğu (Seçili bildirimler varsa) */}
                            {selectedNotifIds.length > 0 && (
                                <div className="p-2.5 px-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                                        <span className="font-semibold text-rose-200">
                                            {selectedNotifIds.length} bildirim seçildi
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={isBulkActionLoading}
                                            onClick={() => handleBulkToggleActive(false)}
                                            className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                            title="Seçilenleri kullanıcılardan gizle"
                                        >
                                            <span>⏸️</span> Seçilenleri Pasife Al
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isBulkActionLoading}
                                            onClick={() => handleBulkToggleActive(true)}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                            title="Seçilenleri yeniden yayına ver"
                                        >
                                            <span>▶️</span> Seçilenleri Yayına Al
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isBulkActionLoading}
                                            onClick={handleBulkDeleteNotifications}
                                            className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                            title="Kalıcı olarak sil"
                                        >
                                            <span>🗑️</span> Seçilenleri Sil
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedNotifIds([])}
                                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
                                            title="Seçimi İptal Et"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bildirimler Tablosu */}
                            <div className="overflow-x-auto rounded-xl border border-zinc-800">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-900/50">
                                            <th className="py-2.5 px-3 w-8">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        notifications.filter(n => {
                                                            if (notifStatusFilter === 'active' && n.is_active === false) return false;
                                                            if (notifStatusFilter === 'passive' && n.is_active !== false) return false;
                                                            if (notifStatusFilter === 'announcement' && n.type !== 'announcement') return false;
                                                            if (notifStatusFilter === 'reminder' && n.type !== 'reminder') return false;
                                                            if (notifSearchQuery.trim()) {
                                                                const q = notifSearchQuery.toLowerCase();
                                                                return (n.title || '').toLowerCase().includes(q) ||
                                                                       (n.message || '').toLowerCase().includes(q) ||
                                                                       (n.event_title || '').toLowerCase().includes(q) ||
                                                                       (n.user_id || '').toLowerCase().includes(q);
                                                            }
                                                            return true;
                                                        }).length > 0 &&
                                                        notifications.filter(n => {
                                                            if (notifStatusFilter === 'active' && n.is_active === false) return false;
                                                            if (notifStatusFilter === 'passive' && n.is_active !== false) return false;
                                                            if (notifStatusFilter === 'announcement' && n.type !== 'announcement') return false;
                                                            if (notifStatusFilter === 'reminder' && n.type !== 'reminder') return false;
                                                            if (notifSearchQuery.trim()) {
                                                                const q = notifSearchQuery.toLowerCase();
                                                                return (n.title || '').toLowerCase().includes(q) ||
                                                                       (n.message || '').toLowerCase().includes(q) ||
                                                                       (n.event_title || '').toLowerCase().includes(q) ||
                                                                       (n.user_id || '').toLowerCase().includes(q);
                                                            }
                                                            return true;
                                                        }).every(n => selectedNotifIds.includes(n.id))
                                                    }
                                                    onChange={(e) => {
                                                        const currentFiltered = notifications.filter(n => {
                                                            if (notifStatusFilter === 'active' && n.is_active === false) return false;
                                                            if (notifStatusFilter === 'passive' && n.is_active !== false) return false;
                                                            if (notifStatusFilter === 'announcement' && n.type !== 'announcement') return false;
                                                            if (notifStatusFilter === 'reminder' && n.type !== 'reminder') return false;
                                                            if (notifSearchQuery.trim()) {
                                                                const q = notifSearchQuery.toLowerCase();
                                                                return (n.title || '').toLowerCase().includes(q) ||
                                                                       (n.message || '').toLowerCase().includes(q) ||
                                                                       (n.event_title || '').toLowerCase().includes(q) ||
                                                                       (n.user_id || '').toLowerCase().includes(q);
                                                            }
                                                            return true;
                                                        });
                                                        if (e.target.checked) {
                                                            const newSet = new Set([...selectedNotifIds, ...currentFiltered.map(n => n.id)]);
                                                            setSelectedNotifIds(Array.from(newSet));
                                                        } else {
                                                            const filteredIds = new Set(currentFiltered.map(n => n.id));
                                                            setSelectedNotifIds(selectedNotifIds.filter(id => !filteredIds.has(id)));
                                                        }
                                                    }}
                                                    className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0"
                                                />
                                            </th>
                                            <th className="py-2.5 px-3">Durum & Tip</th>
                                            <th className="py-2.5 px-3">Başlık & Mesaj</th>
                                            <th className="py-2.5 px-3">Hedef Kitle</th>
                                            <th className="py-2.5 px-3">Tarih</th>
                                            <th className="py-2.5 px-3 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60">
                                        {notifications
                                            .filter(n => {
                                                if (notifStatusFilter === 'active' && n.is_active === false) return false;
                                                if (notifStatusFilter === 'passive' && n.is_active !== false) return false;
                                                if (notifStatusFilter === 'announcement' && n.type !== 'announcement') return false;
                                                if (notifStatusFilter === 'reminder' && n.type !== 'reminder') return false;
                                                if (notifSearchQuery.trim()) {
                                                    const q = notifSearchQuery.toLowerCase();
                                                    return (n.title || '').toLowerCase().includes(q) ||
                                                           (n.message || '').toLowerCase().includes(q) ||
                                                           (n.event_title || '').toLowerCase().includes(q) ||
                                                           (n.user_id || '').toLowerCase().includes(q);
                                                }
                                                return true;
                                            })
                                            .map((notif) => {
                                                const isSelected = selectedNotifIds.includes(notif.id);
                                                const isActive = notif.is_active !== false;
                                                const isLoading = actionLoadingId === notif.id;

                                                return (
                                                    <tr
                                                        key={notif.id}
                                                        className={`hover:bg-zinc-900/40 transition-colors ${
                                                            isSelected ? 'bg-rose-950/20' : ''
                                                        } ${!isActive ? 'opacity-70 bg-zinc-950/60' : ''}`}
                                                    >
                                                        <td className="py-2.5 px-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedNotifIds(prev => [...prev, notif.id]);
                                                                    } else {
                                                                        setSelectedNotifIds(prev => prev.filter(x => x !== notif.id));
                                                                    }
                                                                }}
                                                                className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                {/* Aktif / Pasif Badge */}
                                                                {isActive ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800/80 text-emerald-300">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                        Yayında
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 border border-amber-800/60 text-amber-300">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                                        Pasif
                                                                    </span>
                                                                )}

                                                                {/* Type badge */}
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                                                    notif.type === 'announcement' ? 'bg-purple-950/80 border border-purple-800 text-purple-300' :
                                                                    notif.type === 'reminder' ? 'bg-amber-950/80 border border-amber-800 text-amber-300' :
                                                                    notif.type === 'urgent' ? 'bg-rose-950/80 border border-rose-800 text-rose-300' :
                                                                    'bg-blue-950/80 border border-blue-800 text-blue-300'
                                                                }`}>
                                                                    {notif.type === 'announcement' ? '📢 Duyuru' :
                                                                     notif.type === 'reminder' ? '⏰ Hatırlatıcı' :
                                                                     notif.type === 'urgent' ? '🚨 Acil' : 'ℹ️ Bilgi'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 max-w-sm">
                                                            <div className="space-y-0.5">
                                                                <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                                                    <span>{notif.title}</span>
                                                                    {notif.event_title && (
                                                                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono truncate max-w-[150px]" title={notif.event_title}>
                                                                            📅 {notif.event_title}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                                                                    {notif.message}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {notif.user_id === 'all' ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-medium flex items-center gap-1 w-max">
                                                                    👥 Tüm Topluluk
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-mono flex items-center gap-1 w-max">
                                                                    👤 {members.find(m => m.id === notif.user_id)?.display_name || notif.user_id}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                                                            <div>{new Date(notif.created_at).toLocaleDateString('tr-TR')}</div>
                                                            <div className="text-[10px] text-zinc-500">{new Date(notif.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* Yayından Kaldır / Yayına Al Butonu */}
                                                                <button
                                                                    type="button"
                                                                    disabled={isLoading}
                                                                    onClick={() => handleToggleNotificationActive(notif.id, isActive)}
                                                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                                                        isActive
                                                                            ? 'bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-800/60'
                                                                            : 'bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60'
                                                                    }`}
                                                                    title={isActive ? 'Kullanıcı bildirim menüsünden gizle' : 'Yeniden yayına al'}
                                                                >
                                                                    <span>{isActive ? '⏸️ Pasife Al' : '▶️ Yayına Al'}</span>
                                                                </button>

                                                                {/* İncele */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setInspectNotification(notif)}
                                                                    className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[11px] transition-colors"
                                                                    title="Bildirim Detayı"
                                                                >
                                                                    🔍
                                                                </button>

                                                                {/* Sil */}
                                                                <button
                                                                    type="button"
                                                                    disabled={isLoading}
                                                                    onClick={() => handleDeleteNotification(notif.id)}
                                                                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-400 text-[11px] border border-zinc-800 transition-colors"
                                                                    title="Kalıcı Sil"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                        {notifications.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-xs text-zinc-500">
                                                    Henüz hiçbir bildirim veya duyuru kaydı bulunmuyor.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 6. AKTİF OTURUMLAR TABI ── */}
                    {activeTab === 'sessions' && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-semibold text-white">Aktif Workspace Oturumları</h2>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                                            <th className="py-2.5 px-3">E-Posta</th>
                                            <th className="py-2.5 px-3">Rol</th>
                                            <th className="py-2.5 px-3">IP Adresi</th>
                                            <th className="py-2.5 px-3">Tarayıcı</th>
                                            <th className="py-2.5 px-3">Son Etkinlik</th>
                                            <th className="py-2.5 px-3 text-right">Eylem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {sessions.map(s => (
                                            <tr key={s.id} className="hover:bg-zinc-900/40">
                                                <td className="py-3 px-3 font-semibold text-white">{s.email}</td>
                                                <td className="py-3 px-3 text-zinc-400 font-mono">{s.role}</td>
                                                <td className="py-3 px-3 font-mono text-zinc-300">{s.ip_address}</td>
                                                <td className="py-3 px-3 text-zinc-400 truncate max-w-xs">{s.user_agent}</td>
                                                <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                                                    {new Date(s.last_active_at).toLocaleString('tr-TR')}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRevokeSession(s.id)}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-semibold"
                                                    >
                                                        Oturumu Kapat
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 5. DENETİM İZİ TABI (AUDIT LOGS) ── */}
                    {activeTab === 'audit' && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Güvenlik ve Denetim İzi Kayıtları</h2>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Tüm sistem güvenlik olayları, girişler ve yetki değişiklikleri değişmez log olarak saklanır.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsClearAuditModalOpen(true)}
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                                >
                                    <span>🧹</span>
                                    <span>Denetim Geçmişini Temizle</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800">
                                        <tr className="text-zinc-400 font-semibold">
                                            <th className="py-2.5 px-3">Zaman Damgası</th>
                                            <th className="py-2.5 px-3">Kullanıcı</th>
                                            <th className="py-2.5 px-3">Eylem</th>
                                            <th className="py-2.5 px-3">Varlık Tipi</th>
                                            <th className="py-2.5 px-3">IP</th>
                                            <th className="py-2.5 px-3">Detaylar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {auditLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-zinc-500">
                                                    Kayıt bulunamadı. Denetim geçmişi temiz veya henüz işlem yapılmadı.
                                                </td>
                                            </tr>
                                        ) : (
                                            auditLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-zinc-900/40">
                                                    <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString('tr-TR')}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-medium text-zinc-300">{log.user_email}</td>
                                                    <td className="py-2.5 px-3">
                                                        <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-rose-400 font-mono text-[10px]">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-zinc-400 font-mono">{log.entity_type}</td>
                                                    <td className="py-2.5 px-3 font-mono text-zinc-500">{log.ip_address || '-'}</td>
                                                    <td className="py-2.5 px-3 text-zinc-300">{log.details || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 6. GÜVENLİK AYARLARI TABI ── */}
                    {activeTab === 'settings' && settings && (
                        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Sistem Güvenlik ve Depolama Politikaları</h2>
                                <p className="text-xs text-zinc-400 mt-0.5">Workspace dosya kotası, oturum ve iki adımlı doğrulama kuralları.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                        Maksimum Dosya Boyutu Sınırı (MB)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={settings.max_file_size_mb}
                                        onChange={(e) => setSettings({ ...settings, max_file_size_mb: Number(e.target.value) })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                        Oturum Zaman Aşımı (Dakika)
                                    </label>
                                    <input
                                        type="number"
                                        min="15"
                                        max="1440"
                                        value={settings.session_timeout_minutes}
                                        onChange={(e) => setSettings({ ...settings, session_timeout_minutes: Number(e.target.value) })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                <div>
                                    <p className="text-xs font-semibold text-white">Tüm Üyeler İçin Zorunlu MFA</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">İki faktörlü kimlik doğrulamayı zorunlu kılar.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.mfa_required}
                                    onChange={(e) => setSettings({ ...settings, mfa_required: e.target.checked })}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0 cursor-pointer"
                                />
                            </div>

                            {/* ── YENİ: MODÜL VE ÖZELLİK AÇ/KAPA (FEATURE FLAGS) ── */}
                            <div className="pt-4 border-t border-zinc-800 space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <span>⚙️</span>
                                        <span>Topluluk & Workspace Modül Kontrolleri</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Sitedeki ve çalışma alanındaki ana özellikleri bağımsız olarak etkinleştirin veya devre dışı bırakın.
                                    </p>
                                </div>

                                {/* 1. RSVP Kayıt Sistemi */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                    <div>
                                        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                                            <span>✍️</span>
                                            <span>Dahili Etkinlik Kayıt Sistemi (RSVP)</span>
                                        </p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            Öğrencilerin harici form yerine doğrudan siteden isim, e-posta ve öğrenci no ile kaydolmasını sağlar.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.rsvp_registration_enabled ?? true}
                                        onChange={(e) => setSettings({ ...settings, rsvp_registration_enabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0 cursor-pointer"
                                    />
                                </div>

                                {/* 2. QR Dijital Bilet */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                    <div>
                                        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                                            <span>📱</span>
                                            <span>QR Kodlu Dijital Bilet Üretimi</span>
                                        </p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            Kayıt olan öğrencilere etkinlik kapısında okutulabilir benzersiz QR dijital bilet üretir.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.rsvp_qr_enabled ?? true}
                                        onChange={(e) => setSettings({ ...settings, rsvp_qr_enabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0 cursor-pointer"
                                    />
                                </div>

                                {/* 3. Pano / Kanban Görünümü */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                    <div>
                                        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                                            <span>📋</span>
                                            <span>Workspace Pano / Kanban Görünümü</span>
                                        </p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            /workspace takviminde Sprint/Kanban pano modunu (Planlanan, Devam Eden, Tamamlanan) aktif eder.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.kanban_view_enabled ?? true}
                                        onChange={(e) => setSettings({ ...settings, kanban_view_enabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0 cursor-pointer"
                                    />
                                </div>

                                {/* 4. Topluluk Projeleri Vitrini */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                    <div>
                                        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                                            <span>🚀</span>
                                            <span>Açık Kaynak Projeler Vitrini (/projeler)</span>
                                        </p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            Topluluk üyelerinin geliştirdiği GitHub projelerini sergileyen vitrin sayfasını aktif kılar.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.showcase_projects_enabled ?? false}
                                        onChange={(e) => setSettings({ ...settings, showcase_projects_enabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0 cursor-pointer"
                                    />
                                </div>

                                {/* 5. Discord / Webhook Ayarı */}
                                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                                            <span>📢</span>
                                            <span>Discord / Meet Duyuru Botu Webhook Entegrasyonu</span>
                                        </p>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            Workspace'te planlanan etkinliklerin ve acil duyuruların otomatik düşeceği Discord kanal webhook URL'i.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Webhook URL</label>
                                            <input
                                                type="url"
                                                value={settings.webhook_url || ''}
                                                onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                                                placeholder="https://discord.com/api/webhooks/..."
                                                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Kanal Adı (Referans)</label>
                                            <input
                                                type="text"
                                                value={settings.webhook_channel || ''}
                                                onChange={(e) => setSettings({ ...settings, webhook_channel: e.target.value })}
                                                placeholder="#etkinlik-duyuru"
                                                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
                            >
                                Sistem Politikalarını ve Modülleri Kaydet
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Modal: Yeni Üye Ekle */}
            {isAddMemberOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>👤</span>
                                    <span>Yeni Çekirdek Ekip Üyesi Ekle</span>
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Üye bu bilgilerle <span className="text-rose-400 font-semibold">/workspace</span> takvimine giriş yapabilecektir.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddMemberOpen(false)}
                                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateMember} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Ad Soyad */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                                        Ad Soyad <span className="text-rose-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Örn: Selin Kaya"
                                        value={newMemberForm.display_name}
                                        onChange={(e) => handleDisplayNameChange(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-medium"
                                        autoFocus
                                    />
                                </div>

                                {/* Kullanıcı Adı (Giriş için) */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                                        Kullanıcı Adı <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-700/80 px-3 py-2 text-xs focus-within:border-rose-500">
                                        <span className="text-rose-400 font-mono font-bold mr-1">@</span>
                                        <input
                                            type="text"
                                            required
                                            value={newMemberForm.username}
                                            onChange={(e) => setNewMemberForm({ ...newMemberForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') })}
                                            placeholder="selin_kaya"
                                            className="w-full bg-transparent text-white focus:outline-none font-mono font-medium placeholder-zinc-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* E-Posta */}
                            <div>
                                <label className="block text-xs font-bold text-zinc-300 mb-1">
                                    E-Posta Adresi <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="selin@hsdmtu.site veya ornek@gmail.com"
                                    value={newMemberForm.email}
                                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono font-medium"
                                />
                            </div>

                            {/* Şifre & Rastgele Üret */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-zinc-300">
                                        Giriş Şifresi <span className="text-rose-400">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                                    >
                                        <span>🎲</span> Güçlü Şifre Üret
                                    </button>
                                </div>
                                <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-700/80 px-3 py-2 text-xs focus-within:border-rose-500">
                                    <input
                                        type={showNewMemberPassword ? 'text' : 'password'}
                                        required
                                        placeholder="••••••••"
                                        value={newMemberForm.password}
                                        onChange={(e) => setNewMemberForm({ ...newMemberForm, password: e.target.value })}
                                        className="w-full bg-transparent text-white focus:outline-none font-mono font-medium placeholder-zinc-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewMemberPassword(!showNewMemberPassword)}
                                        className="text-zinc-400 hover:text-white text-xs ml-2"
                                        title={showNewMemberPassword ? 'Gizle' : 'Göster'}
                                    >
                                        {showNewMemberPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            {/* Rol ve Komite Seçimi */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-300 mb-1">Rol Yetkisi</label>
                                    <select
                                        value={newMemberForm.role}
                                        onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as any })}
                                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                                    >
                                        <option value="editor">Editor (Etkinlik Yönetimi)</option>
                                        <option value="workspace_admin">Workspace Admin</option>
                                        <option value="super_admin">Super Admin (Tam Yetki)</option>
                                        <option value="contributor">Contributor (Yorum/Katkı)</option>
                                        <option value="viewer">Viewer (Salt Okunur)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-zinc-300 mb-1">Dahil Edileceği Komite</label>
                                    <select
                                        value={newMemberForm.group_id}
                                        onChange={(e) => setNewMemberForm({ ...newMemberForm, group_id: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                                    >
                                        <option value="">Bağımsız / Atanmamış</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
                                💡 Üye oluşturulduktan sonra hem <strong className="text-zinc-200">{newMemberForm.email || 'e-posta'}</strong> hem de <strong className="text-zinc-200">@{newMemberForm.username || 'kullanici_adi'}</strong> ile şifresini yazarak <strong className="text-rose-400">/workspace</strong> takvimine giriş yapabilir.
                            </div>

                            <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddMemberOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all"
                                >
                                    Üye Hesabı Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Şifre Değiştir */}
            {passwordModalMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="border-b border-zinc-800 pb-2.5">
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <span>🔑</span>
                                <span>Şifre Değiştir: {passwordModalMember.display_name}</span>
                            </h3>
                            <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                {passwordModalMember.email} {passwordModalMember.username && `(@${passwordModalMember.username})`}
                            </p>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-zinc-300">Yeni Şifre</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
                                            let pass = '';
                                            for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                            setNewPasswordValue(pass);
                                            setShowChangePasswordVal(true);
                                        }}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
                                    >
                                        🎲 Şifre Üret
                                    </button>
                                </div>
                                <div className="flex items-center rounded-xl bg-zinc-900 border border-zinc-700/80 px-3 py-2 text-xs focus-within:border-rose-500">
                                    <input
                                        type={showChangePasswordVal ? 'text' : 'password'}
                                        required
                                        placeholder="Yeni Güçlü Şifre..."
                                        value={newPasswordValue}
                                        onChange={(e) => setNewPasswordValue(e.target.value)}
                                        className="w-full bg-transparent text-white focus:outline-none font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowChangePasswordVal(!showChangePasswordVal)}
                                        className="text-zinc-400 hover:text-white text-xs ml-2"
                                    >
                                        {showChangePasswordVal ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalMember(null)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all"
                                >
                                    Şifreyi Güncelle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Yeni Komite Oluştur */}
            {isAddGroupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white">Yeni Çekirdek Komite Oluştur</h3>
                            <button onClick={() => setIsAddGroupOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Komite Adı</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Örn: Yapay Zeka Komitesi"
                                    value={newGroupForm.name}
                                    onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Grup Kodu</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="AI_COMMITTEE"
                                    value={newGroupForm.code}
                                    onChange={(e) => setNewGroupForm({ ...newGroupForm, code: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Renk</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={newGroupForm.color}
                                        onChange={(e) => setNewGroupForm({ ...newGroupForm, color: e.target.value })}
                                        className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono text-zinc-400">{newGroupForm.color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Açıklama</label>
                                <textarea
                                    rows={2}
                                    value={newGroupForm.description}
                                    onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddGroupOpen(false)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                                >
                                    Komiteyi Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Denetim Geçmişini Temizle Onayı */}
            {isClearAuditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-zinc-950 border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-400">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="text-base font-bold text-white">Denetim Geçmişini Temizle</h3>
                                <p className="text-xs text-rose-300/80">Kalıcı Güvenlik İşlemi</p>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            Tüm sistem denetim ve aktivite logları kalıcı olarak silinecektir. Bu işlem güvenlik denetim izini sıfırlar ve <strong className="text-rose-400">geri alınamaz</strong>. Onaylıyor musunuz?
                        </p>
                        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsClearAuditModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClearAuditLogs}
                                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all flex items-center gap-1.5"
                            >
                                <span>🧹</span>
                                <span>Evet, Geçmişi Temizle</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Üye Değerlendirme & Ekip Notları */}
            {notesModalMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span>📝</span>
                                    <span>Üye Ekip Değerlendirme Notları: {notesModalMember.display_name}</span>
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {notesModalMember.email} • Rol: <span className="text-rose-400 font-mono">{notesModalMember.role}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setNotesModalMember(null)}
                                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Yeni Not Ekleme Formu */}
                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                            <label className="block text-xs font-bold text-zinc-300">Yeni Ekip / Yönetici Değerlendirmesi Ekle</label>
                            <div className="flex gap-2">
                                <select
                                    value={noteCategory}
                                    onChange={(e) => setNoteCategory(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 shrink-0"
                                >
                                    <option value="Performans">Performans</option>
                                    <option value="Gözlem">Gözlem</option>
                                    <option value="Toplantı">Toplantı Notu</option>
                                    <option value="Özel">Özel Not</option>
                                </select>
                                <input
                                    type="text"
                                    value={newMemberNoteText}
                                    onChange={(e) => setNewMemberNoteText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddMemberNote(); }}
                                    placeholder="Üye hakkında değerlendirme veya ekip notu yazın..."
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleAddMemberNote()}
                                    disabled={isSavingNote}
                                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 transition-colors disabled:opacity-50"
                                >
                                    {isSavingNote ? 'Ekleniyor...' : 'Ekle'}
                                </button>
                            </div>
                        </div>

                        {/* Var Olan Notlar Listesi */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
                            {(!notesModalMember.member_notes || notesModalMember.member_notes.length === 0) ? (
                                <div className="text-center py-8 text-xs text-zinc-500">
                                    Bu üye için henüz eklenmiş bir değerlendirme notu bulunmuyor.
                                </div>
                            ) : (
                                (notesModalMember.member_notes || []).map((n) => (
                                    <div key={n.id} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs space-y-1.5 hover:border-zinc-700 transition-colors">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                                                    {n.category || 'Not'}
                                                </span>
                                                <span className="text-zinc-400 font-semibold">{n.author_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-zinc-500 text-[10px] font-mono">
                                                    {new Date(n.created_at).toLocaleString('tr-TR')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMemberNote(n.id)}
                                                    className="text-zinc-500 hover:text-rose-400 text-xs px-1"
                                                    title="Notu Sil"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-zinc-200 text-xs leading-relaxed">{n.content}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setNotesModalMember(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Bildirim Geçmişini Temizle */}
            {isClearNotifModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>🧹</span> Bildirim Geçmişini Temizle
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsClearNotifModalOpen(false)}
                                className="text-zinc-400 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Bildirim geçmişini filtreye göre topluca temizleyebilirsiniz. Bu işlem kalıcıdır ve geri alınamaz.
                        </p>

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-300">Temizleme Kapsamı:</label>
                            <div className="space-y-2">
                                {[
                                    {
                                        key: 'all',
                                        title: 'Tüm Bildirim Geçmişini Sıfırla',
                                        desc: `Sistemdeki tüm bildirimleri siler (${notifications.length} kayıt).`
                                    },
                                    {
                                        key: 'inactive',
                                        title: 'Sadece Pasif Bildirimleri Temizle',
                                        desc: `Yayından kaldırılmış pasif bildirimleri siler (${notifications.filter(n => n.is_active === false).length} kayıt).`
                                    },
                                    {
                                        key: 'read',
                                        title: 'Sadece Okunmuş Bildirimleri Temizle',
                                        desc: `Okunmuş durumdaki bildirimleri siler (${notifications.filter(n => n.is_read).length} kayıt).`
                                    }
                                ].map((opt) => (
                                    <label
                                        key={opt.key}
                                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                                            clearFilterChoice === opt.key
                                                ? 'bg-rose-950/30 border-rose-800 text-white'
                                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="clearFilterChoice"
                                            value={opt.key}
                                            checked={clearFilterChoice === opt.key}
                                            onChange={() => setClearFilterChoice(opt.key as any)}
                                            className="mt-0.5 text-rose-500 focus:ring-0"
                                        />
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-semibold">{opt.title}</div>
                                            <div className="text-[11px] text-zinc-500">{opt.desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/60 text-[11px] text-rose-300 leading-relaxed">
                            ⚠️ Seçilen kriterdeki bildirim kayıtları kalıcı olarak veritabanından silinecektir.
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setIsClearNotifModalOpen(false)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                disabled={isBulkActionLoading}
                                onClick={handleClearNotificationHistory}
                                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isBulkActionLoading ? 'Temizleniyor...' : 'Geçmişi Temizle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Yeni Duyuru / Bildirim Dağıt */}
            {isBroadcastModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>⚡</span> Anlık Duyuru & Bildirim Dağıtımı
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsBroadcastModalOpen(false)}
                                className="text-zinc-400 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleDispatchBroadcast} className="space-y-3.5 text-xs">
                            {/* Başlık */}
                            <div>
                                <label className="block text-zinc-400 font-semibold mb-1">Bildirim / Duyuru Başlığı *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Örn: Haftalık Genel Kurul Toplantısı"
                                    value={broadcastForm.title}
                                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
                                />
                            </div>

                            {/* Mesaj */}
                            <div>
                                <label className="block text-zinc-400 font-semibold mb-1">Duyuru Mesajı *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Topluluk üyelerine iletilecek detaylı mesaj..."
                                    value={broadcastForm.message}
                                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none"
                                />
                            </div>

                            {/* Tip & Etkinlik İlişkisi */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-zinc-400 font-semibold mb-1">Bildirim Tipi</label>
                                    <select
                                        value={broadcastForm.type}
                                        onChange={(e) => setBroadcastForm(prev => ({ ...prev, type: e.target.value as any }))}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
                                    >
                                        <option value="announcement">📢 Duyuru</option>
                                        <option value="reminder">⏰ Hatırlatıcı</option>
                                        <option value="info">ℹ️ Bilgilendirme</option>
                                        <option value="urgent">🚨 Acil</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-zinc-400 font-semibold mb-1">İlişkili Etkinlik (İsteğe Bağlı)</label>
                                    <select
                                        value={broadcastForm.eventId}
                                        onChange={(e) => {
                                            const selId = e.target.value;
                                            const selEvt = events.find(ev => ev.id === selId);
                                            setBroadcastForm(prev => ({
                                                ...prev,
                                                eventId: selId,
                                                eventTitle: selEvt?.title || ''
                                            }));
                                        }}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
                                    >
                                        <option value="">Seçilmedi (Genel Bildirim)</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Hedef Kitle */}
                            <div>
                                <label className="block text-zinc-400 font-semibold mb-1">Hedef Kitle</label>
                                <select
                                    value={broadcastForm.targetAudience}
                                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
                                >
                                    <option value="all">👥 Tüm Topluluk (Herkes)</option>
                                    <option value="group">🏢 Belirli Bir Komite / Ekip</option>
                                    <option value="role">🛡️ Belirli Bir Rol</option>
                                    <option value="selected">👤 Belirli Kullanıcılar</option>
                                </select>
                            </div>

                            {/* Komite Seçimi */}
                            {broadcastForm.targetAudience === 'group' && (
                                <div>
                                    <label className="block text-zinc-400 font-semibold mb-1">Komite Seçin</label>
                                    <select
                                        value={broadcastForm.targetGroupId}
                                        onChange={(e) => setBroadcastForm(prev => ({ ...prev, targetGroupId: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
                                    >
                                        <option value="">Komite Seçiniz...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Rol Seçimi */}
                            {broadcastForm.targetAudience === 'role' && (
                                <div>
                                    <label className="block text-zinc-400 font-semibold mb-1">Hedef Rol</label>
                                    <select
                                        value={broadcastForm.targetRole}
                                        onChange={(e) => setBroadcastForm(prev => ({ ...prev, targetRole: e.target.value as WorkspaceRole }))}
                                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-zinc-600"
                                    >
                                        <option value="super_admin">Kurucu / Süper Yönetici (super_admin)</option>
                                        <option value="workspace_admin">Workspace Yöneticisi (workspace_admin)</option>
                                        <option value="editor">Komite Lideri / Editör (editor)</option>
                                        <option value="contributor">Aktif Üye / Katkıcı (contributor)</option>
                                        <option value="viewer">Gözlemci / İzleyici (viewer)</option>
                                    </select>
                                </div>
                            )}

                            {/* Belirli Kullanıcılar */}
                            {broadcastForm.targetAudience === 'selected' && (
                                <div>
                                    <label className="block text-zinc-400 font-semibold mb-1">
                                        Hedef Üyeleri Seçin ({broadcastForm.targetUserIds.length} seçildi)
                                    </label>
                                    <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                        {members.map(m => {
                                            const isChecked = broadcastForm.targetUserIds.includes(m.id);
                                            return (
                                                <label key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800/60 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setBroadcastForm(prev => ({ ...prev, targetUserIds: [...prev.targetUserIds, m.id] }));
                                                            } else {
                                                                setBroadcastForm(prev => ({ ...prev, targetUserIds: prev.targetUserIds.filter(x => x !== m.id) }));
                                                            }
                                                        }}
                                                        className="rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-0"
                                                    />
                                                    <span className="text-zinc-200 font-medium">{m.display_name}</span>
                                                    <span className="text-[10px] text-zinc-500 font-mono">({m.email})</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setIsBroadcastModalOpen(false)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isBulkActionLoading}
                                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isBulkActionLoading ? 'Gönderiliyor...' : '⚡ Duyuruyu Dağıt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Bildirim Detay İnceleme */}
            {inspectNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>🔍</span> Bildirim Detayı
                            </h3>
                            <button
                                type="button"
                                onClick={() => setInspectNotification(null)}
                                className="text-zinc-400 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-500 font-mono">ID: {inspectNotification.id}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        inspectNotification.is_active !== false
                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                                    }`}>
                                        {inspectNotification.is_active !== false ? '🟢 Yayında' : '⏸️ Pasif'}
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-white">{inspectNotification.title}</h4>
                                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{inspectNotification.message}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                                    <div className="text-zinc-500">Hedef Kitle</div>
                                    <div className="font-semibold text-zinc-200 mt-0.5">
                                        {inspectNotification.user_id === 'all'
                                            ? '👥 Tüm Topluluk'
                                            : `👤 ${members.find(m => m.id === inspectNotification.user_id)?.display_name || inspectNotification.user_id}`}
                                    </div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                                    <div className="text-zinc-500">Bildirim Tipi</div>
                                    <div className="font-semibold text-zinc-200 mt-0.5 capitalize">{inspectNotification.type}</div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                                    <div className="text-zinc-500">Tarih</div>
                                    <div className="font-semibold text-zinc-200 mt-0.5">
                                        {new Date(inspectNotification.created_at).toLocaleString('tr-TR')}
                                    </div>
                                </div>
                                <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
                                    <div className="text-zinc-500">İlişkili Etkinlik</div>
                                    <div className="font-semibold text-zinc-200 mt-0.5">
                                        {inspectNotification.event_title || 'Yok'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={() => {
                                    handleToggleNotificationActive(inspectNotification.id, inspectNotification.is_active !== false);
                                    setInspectNotification(prev => prev ? { ...prev, is_active: prev.is_active === false } : null);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                    inspectNotification.is_active !== false
                                        ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800'
                                        : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                                }`}
                            >
                                <span>{inspectNotification.is_active !== false ? '⏸️ Yayından Kaldır (Pasife Al)' : '▶️ Yayına Al'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setInspectNotification(null)}
                                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
