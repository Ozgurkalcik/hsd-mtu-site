'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    WorkspaceMember,
    WorkspaceGroup,
    RolePermissions,
    ActiveSession,
    AuditLogRecord,
    WorkspaceSecuritySettings,
    WorkspaceRole
} from '@/shared/api/workspaceTypes';

type AdminTab = 'members' | 'groups' | 'roles' | 'sessions' | 'audit' | 'settings';

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
            const [memRes, grpRes, rolRes, sesRes, audRes, setRes] = await Promise.all([
                fetch('/api/workspace/admin/members').catch(() => null),
                fetch('/api/workspace/admin/groups').catch(() => null),
                fetch('/api/workspace/admin/roles').catch(() => null),
                fetch('/api/workspace/admin/sessions').catch(() => null),
                fetch('/api/workspace/admin/audit-logs').catch(() => null),
                fetch('/api/workspace/admin/settings').catch(() => null),
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

            {/* 6 Tabs Navigation */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
                {[
                    { key: 'members', label: 'Üyeler', count: members.length },
                    { key: 'groups', label: 'Komite & Ekip Ayarları', count: groups.length },
                    { key: 'roles', label: 'Yetki Matrisi (RBAC)' },
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
                                                        <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[10px] font-bold">
                                                            {m.role}
                                                        </span>
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
                                            <th className="py-2.5 px-3 text-center">Görüntüleme (can_view)</th>
                                            <th className="py-2.5 px-3 text-center">Oluşturma (can_create)</th>
                                            <th className="py-2.5 px-3 text-center">Düzenleme (can_edit)</th>
                                            <th className="py-2.5 px-3 text-center">Silme (can_delete)</th>
                                            <th className="py-2.5 px-3 text-center">Dosya Yükleme (can_upload)</th>
                                            <th className="py-2.5 px-3 text-center">Paylaşım (can_share)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {roles.map(r => (
                                            <tr key={r.role} className="hover:bg-zinc-900/40">
                                                <td className="py-3 px-3 font-bold text-white uppercase font-mono">{r.role}</td>
                                                {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_upload', 'can_share'] as const).map(col => (
                                                    <td key={col} className="py-3 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTogglePermission(r.role, col)}
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${r[col]
                                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                                    : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
                                                                }`}
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
                        </div>
                    )}

                    {/* ── 4. AKTİF OTURUMLAR TABI ── */}
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
                            <h2 className="text-sm font-semibold text-white">Güvenlik ve Denetim İzi Kayıtları</h2>

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
                                        {auditLogs.map(log => (
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 6. GÜVENLİK AYARLARI TABI ── */}
                    {activeTab === 'settings' && settings && (
                        <form onSubmit={handleSaveSettings} className="space-y-5 max-w-xl">
                            <h2 className="text-sm font-semibold text-white">Sistem Güvenlik ve Depolama Politikaları</h2>

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

                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                                <div>
                                    <p className="text-xs font-semibold text-white">Tüm Üyeler İçin Zorunlu MFA</p>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">İki faktörlü kimlik doğrulamayı zorunlu kılar.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.mfa_required}
                                    onChange={(e) => setSettings({ ...settings, mfa_required: e.target.checked })}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-rose-600 focus:ring-0"
                                />
                            </div>

                            <button
                                type="submit"
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition-all"
                            >
                                Güvenlik Politikalarını Kaydet
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
        </div>
    );
}
