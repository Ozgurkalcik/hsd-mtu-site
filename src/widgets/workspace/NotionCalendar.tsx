'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    WorkspaceEvent,
    WorkspaceCalendar,
    WorkspaceGroup,
    WorkspaceMember,
    WorkspaceNotification,
    RolePermissions
} from '@/shared/api/workspaceTypes';
import { useFrozen } from '@/shared/lib/FrozenSection';
import { createClient } from '@/shared/api/supabase';
import EventDrawer from './EventDrawer';
import WeeklyRsvpModal from './WeeklyRsvpModal';
import { playWorkspaceNotificationSound } from '@/shared/utils/sound';
import CustomCursor from '@/shared/ui/CustomCursor';

export type CalendarViewMode = 'ay' | '3ay' | '6ay' | 'hafta' | 'gun' | 'liste' | 'pano';

export const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAYS_SHORT_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

interface NotionCalendarProps {
    currentUser: WorkspaceMember | null;
    userPermissions: RolePermissions | null;
    onRequireLogin?: () => void;
    onLogout?: () => void;
    isAdmin?: boolean;
}

export default function NotionCalendar({
    currentUser,
    userPermissions,
    onRequireLogin,
    onLogout,
    isAdmin,
}: NotionCalendarProps) {
    const isFrozen = useFrozen();

    // Data States
    const [events, setEvents] = useState<WorkspaceEvent[]>([]);
    const [calendars, setCalendars] = useState<WorkspaceCalendar[]>([]);
    const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);

    // Navigation & View State
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<CalendarViewMode>('ay');

    // Filter States
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Notification Dropdown State & Filter
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [desktopNotifAllowed, setDesktopNotifAllowed] = useState(false);
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);
    const [notifFilter, setNotifFilter] = useState<'all' | 'committee' | 'reminder' | 'urgent'>('all');
    const knownNotifIdsRef = React.useRef<Set<string>>(new Set());
    const isFirstNotifLoadRef = React.useRef<boolean>(true);

    // Arka Plan Canlı Eşitleme (Background Sync) State
    const [isBackgroundSyncing, setIsBackgroundSyncing] = useState<boolean>(false);
    const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());

    // Workspace Light/Dark Theme (Only for /workspace)
    const [workspaceTheme, setWorkspaceTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hsd_workspace_theme');
            if (saved === 'light' || saved === 'dark') {
                setWorkspaceTheme(saved);
            }
        }
    }, []);

    // Pano / Kanban Özelliği Admin Aç/Kapa Durumu
    const [kanbanEnabled, setKanbanEnabled] = useState(true);

    useEffect(() => {
        fetch('/api/workspace/settings')
            .then(res => res.json())
            .then(data => {
                if (data.settings && typeof data.settings.kanban_view_enabled === 'boolean') {
                    setKanbanEnabled(data.settings.kanban_view_enabled);
                }
            })
            .catch(() => {});
    }, []);

    const handleToggleTheme = () => {
        const next = workspaceTheme === 'dark' ? 'light' : 'dark';
        setWorkspaceTheme(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem('hsd_workspace_theme', next);
        }
    };

    // Event Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<WorkspaceEvent | null>(null);
    const [initialTargetDate, setInitialTargetDate] = useState<Date | null>(null);

    // 🎯 Haftalık Katılım Modal State & Otomatik Bildirim
    const [isWeeklyRsvpOpen, setIsWeeklyRsvpOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<WorkspaceNotification | null>(null);

    // Önümüzdeki 7 gün içindeki etkinlikler (Genel Liste)
    const upcomingWeeklyEvents = useMemo(() => {
        const now = Date.now();
        const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;
        return events.filter(ev => {
            if (ev.status === 'cancelled') return false;
            try {
                const startMs = new Date(ev.start_time).getTime();
                return startMs >= now && startMs <= sevenDaysLater;
            } catch {
                return false;
            }
        });
    }, [events]);

    // Kullanıcının doğrudan katılması hedeflenen ve HENÜZ cevap vermediği etkinlikler
    const pendingWeeklyRsvpEvents = useMemo(() => {
        if (!currentUser) return [];
        const now = Date.now();
        const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;
        const isUserAdmin = currentUser.role === 'super_admin' || currentUser.role === 'workspace_admin';

        return events.filter(ev => {
            if (ev.status === 'cancelled') return false;
            // Etkinliği bizzat oluşturan kişiye (organizatöre) katılım popup'ı açma
            if (ev.created_by === currentUser.id) return false;

            // Eğer yönetici ise ve atanmışlar (assignees) listesinde açıkça yoksa admini gereksiz rahatsız etme
            if (isUserAdmin && (!ev.assignees || !ev.assignees.includes(currentUser.id))) {
                return false;
            }

            // Eğer kullanıcı bu etkinliğe zaten katılım bildirdiyse tekrar sorma
            const alreadyResponded = ev.member_attendance?.some(a => a.user_id === currentUser.id && a.status);
            if (alreadyResponded) return false;

            try {
                const startMs = new Date(ev.start_time).getTime();
                return startMs >= now && startMs <= sevenDaysLater;
            } catch {
                return false;
            }
        });
    }, [events, currentUser]);

    // Girişte sadece kullanıcının bekleyen ve cevaplamadığı etkinlik varsa popup'ı aç
    useEffect(() => {
        if (!currentUser || pendingWeeklyRsvpEvents.length === 0) return;
        const todayKey = `hsd_weekly_rsvp_prompt_${formatLocalDate(new Date())}`;
        const alreadyPrompted = sessionStorage.getItem(todayKey);
        if (!alreadyPrompted) {
            setIsWeeklyRsvpOpen(true);
            sessionStorage.setItem(todayKey, 'true');
        }
    }, [currentUser, pendingWeeklyRsvpEvents.length]);

    // User Profile Dropdown Menu State
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // Otomatik Profil Fotoğrafı Eşleştirme (/ekip -> team_members)
    const [teamAvatarUrl, setTeamAvatarUrl] = useState<string | null>(null);
    const [teamRoleTitle, setTeamRoleTitle] = useState<string | null>(null);
    const [isTeamMatched, setIsTeamMatched] = useState<boolean>(false);

    useEffect(() => {
        if (!currentUser) return;

        let isMounted = true;
        const scanTeamMembers = async () => {
            try {
                const supabase = createClient();
                const { data: teamList } = await supabase
                    .from('team_members')
                    .select('full_name, role_title, image_url, is_active')
                    .eq('is_active', true);

                if (!isMounted || !teamList || teamList.length === 0) return;

                const normalize = (str: string) => {
                    if (!str) return '';
                    return str
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
                };

                const userNorm = normalize(currentUser.display_name || '');
                const usernameNorm = normalize(currentUser.username || '');
                const emailPrefixNorm = normalize((currentUser.email || '').split('@')[0]);

                for (const tm of teamList) {
                    if (!tm.full_name) continue;
                    const tmNorm = normalize(tm.full_name);

                    const isDirectMatch =
                        tmNorm === userNorm ||
                        (userNorm.length >= 3 && tmNorm.includes(userNorm)) ||
                        (tmNorm.length >= 3 && userNorm.includes(tmNorm)) ||
                        (usernameNorm.length >= 3 && tmNorm.includes(usernameNorm)) ||
                        (emailPrefixNorm.length >= 3 && tmNorm.includes(emailPrefixNorm));

                    const tmWords: string[] = tm.full_name.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
                    const userWords: string[] = (currentUser.display_name || '').toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
                    const wordMatch = tmWords.length > 0 && userWords.some((uw: string) => tmWords.some((tw: string) => normalize(tw) === normalize(uw)));

                    if (isDirectMatch || wordMatch) {
                        if (tm.image_url) {
                            setTeamAvatarUrl(tm.image_url);
                        }
                        if (tm.role_title) {
                            setTeamRoleTitle(tm.role_title);
                        }
                        setIsTeamMatched(true);
                        break;
                    }
                }
            } catch (err) {
                console.warn('Ekip üyeleri otomatik eşleme uyarısı:', err);
            }
        };

        scanTeamMembers();
        return () => { isMounted = false; };
    }, [currentUser?.display_name, currentUser?.username, currentUser?.email]);

    const activeAvatar = teamAvatarUrl || currentUser?.avatar_url || null;

    // Drag-and-drop feedback
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

    // Initial Data Fetch
    const fetchInitialData = useCallback(async () => {
        try {
            const promises: Promise<Response | null>[] = [
                fetch('/api/workspace/events'),
                fetch('/api/workspace/notifications'),
            ];

            if (isAdmin) {
                promises.push(fetch('/api/workspace/admin/members').catch(() => null));
            }

            const [evRes, notifRes, memRes] = await Promise.all(promises);

            if (evRes && evRes.ok) {
                const data = await evRes.json();
                setEvents(data.events || []);
                setCalendars(data.calendars || []);
                setGroups(data.groups || []);
                if (data.members && data.members.length > 0) {
                    setMembers(data.members);
                }
                if (data.calendars && selectedCalendarIds.length === 0) {
                    setSelectedCalendarIds(data.calendars.map((c: WorkspaceCalendar) => c.id));
                }
            }

            if (notifRes && notifRes.ok) {
                const notifData = await notifRes.json();
                handleIncomingNotifications(notifData.notifications || []);
            }

            if (memRes && memRes.ok) {
                const memData = await memRes.json();
                if (memData.members && memData.members.length > 0) {
                    setMembers(memData.members);
                }
            }
        } catch (err) {
            console.error('Workspace verileri yüklenirken hata:', err);
        }
    }, [selectedCalendarIds.length, isAdmin]);

    // Gelen Bildirimleri İşleme, Ses Çalma ve Masaüstü Bildirimi Gönderme
    const handleIncomingNotifications = useCallback((incoming: WorkspaceNotification[]) => {
        if (isFirstNotifLoadRef.current) {
            incoming.forEach(n => knownNotifIdsRef.current.add(n.id));
            isFirstNotifLoadRef.current = false;
            setNotifications(incoming);
            return;
        }

        const newUnread = incoming.filter(n => !n.is_read && !knownNotifIdsRef.current.has(n.id));
        if (newUnread.length > 0) {
            // 🔊 Tescilli Web Audio API Bildirim Zilini Çal
            playWorkspaceNotificationSound(0.2);

            // 💻 Masaüstü OS Bildirimi Tetikle
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const latest = newUnread[0];
                try {
                    const osNotif = new Notification(latest.title || 'HSD MTÜ Topluluk Bildirimi', {
                        body: latest.message,
                        icon: '/icon.png',
                        tag: latest.id,
                    });
                    osNotif.onclick = () => {
                        window.focus();
                        setIsNotifOpen(true);
                    };
                } catch {
                    // Tarayıcı bildirim sessiz hatasını yut
                }
            }
        }

        incoming.forEach(n => knownNotifIdsRef.current.add(n.id));
        setNotifications(incoming);
    }, []);

    // Arka Plan Veri Senkronizasyonu (Background Sync Service)
    const syncWorkspaceData = useCallback(async (silent = true) => {
        if (!silent) setIsBackgroundSyncing(true);
        try {
            await fetchInitialData();
            setLastSyncedTime(new Date());
        } finally {
            if (!silent) {
                setTimeout(() => setIsBackgroundSyncing(false), 450);
            }
        }
    }, [fetchInitialData]);

    useEffect(() => {
        syncWorkspaceData(true);
    }, [syncWorkspaceData]);

    // Check Notification Permission & Prompt gracefully for permanent device permission
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const currentPerm = Notification.permission;
            setDesktopNotifAllowed(currentPerm === 'granted');

            // Kullanıcı henüz izin vermediyse veya default ise kalıcı izin istemek için bildirim banner'ı hazırla
            const hasDismissed = localStorage.getItem('hsd_notif_banner_dismissed_v1');
            if (currentPerm === 'default' && !hasDismissed) {
                const timer = setTimeout(() => {
                    setShowPermissionBanner(true);
                }, 1200);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    // Hızlı Polling (10 saniye) ve Sekmeye Odaklanıldığında Anında Kontrol (respects useFrozen)
    useEffect(() => {
        if (isFrozen) return; // Background Throttling: Pause polling when section is frozen

        const checkLatestNotifications = async () => {
            if (document.hidden) return; // Pause when tab is hidden
            try {
                const res = await fetch('/api/workspace/notifications');
                if (res.ok) {
                    const data = await res.json();
                    handleIncomingNotifications(data.notifications || []);
                }
            } catch {
                // Silently ignore network hiccups during background sync
            }
        };

        const interval = setInterval(() => {
            checkLatestNotifications();
            // Düzenli 30 saniyelik arka plan takvim/veri eşitlemesi
            syncWorkspaceData(true);
        }, 30000);

        // 10 saniyelik hafif bildirim kontrolü
        const notifInterval = setInterval(checkLatestNotifications, 10000);

        // Sekmeye dönüldüğünde veya pencere odaklandığında gecikmesiz anında senkronize et
        const onFocus = () => {
            checkLatestNotifications();
            syncWorkspaceData(true);
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);

        return () => {
            clearInterval(interval);
            clearInterval(notifInterval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onFocus);
        };
    }, [isFrozen, handleIncomingNotifications, syncWorkspaceData]);

    // Request Desktop Notification Permission (Kalıcı Cihaz İzni)
    const requestNotificationPermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const perm = await Notification.requestPermission();
                const isGranted = perm === 'granted';
                setDesktopNotifAllowed(isGranted);
                setShowPermissionBanner(false);
                localStorage.setItem('hsd_notif_banner_dismissed_v1', 'true');
                if (isGranted) {
                    new Notification('HSD MTÜ Topluluk Takvimi', {
                        body: 'Masaüstü bildirimleri cihazınızda kalıcı olarak etkinleştirildi. Toplantı ve duyurular anında iletilecek.',
                        icon: '/icon.png',
                    });
                }
            } catch (err) {
                console.warn('Bildirim izni istenirken hata:', err);
            }
        }
    };

    // Mark notifications as read
    const handleMarkAllNotificationsRead = async () => {
        try {
            const res = await fetch('/api/workspace/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mark_all: true }),
            });
            if (res.ok) {
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            }
        } catch (err) {
            console.error('Bildirim okundu işaretleme hatası:', err);
        }
    };

    const handleMarkNotificationRead = async (id: string) => {
        try {
            await fetch('/api/workspace/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, mark_read: true }),
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Bildirim okundu işaretleme hatası:', err);
        }
    };

    // Smart Navigation Handler
    const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const delta = direction === 'next' ? 1 : -1;
        const newD = new Date(currentDate);

        switch (viewMode) {
            case 'ay':
                newD.setMonth(newD.getMonth() + delta);
                break;
            case '3ay':
                newD.setMonth(newD.getMonth() + delta * 3);
                break;
            case '6ay':
                newD.setMonth(newD.getMonth() + delta * 6);
                break;
            case 'hafta':
                newD.setDate(newD.getDate() + delta * 7);
                break;
            case 'gun':
                newD.setDate(newD.getDate() + delta);
                break;
            case 'liste':
                newD.setMonth(newD.getMonth() + delta);
                break;
        }

        setCurrentDate(newD);
    };

    // Navigation Period Title Formatter
    const periodTitle = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        switch (viewMode) {
            case 'ay':
                return `${MONTHS_TR[month]} ${year}`;
            case '3ay': {
                const endMonth = (month + 2) % 12;
                const endYear = month + 2 > 11 ? year + 1 : year;
                return `${MONTHS_TR[month]} - ${MONTHS_TR[endMonth]} ${endYear}`;
            }
            case '6ay': {
                const endMonth = (month + 5) % 12;
                const endYear = month + 5 > 11 ? year + 1 : year;
                return `${MONTHS_TR[month]} - ${MONTHS_TR[endMonth]} ${endYear}`;
            }
            case 'hafta': {
                // Pazartesi'den Pazara
                const d = new Date(currentDate);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diff));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                return `${monday.getDate()} ${MONTHS_TR[monday.getMonth()]} - ${sunday.getDate()} ${MONTHS_TR[sunday.getMonth()]} ${year}`;
            }
            case 'gun':
                return `${currentDate.getDate()} ${MONTHS_TR[month]} ${year}, ${DAYS_TR[(currentDate.getDay() + 6) % 7]}`;
            case 'liste':
                return `${MONTHS_TR[month]} ${year} Ajandası`;
        }
    }, [currentDate, viewMode]);

    // Filtered Events
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // Calendar filter
            if (selectedCalendarIds.length > 0 && !selectedCalendarIds.includes(event.calendar_id)) {
                return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = event.title.toLowerCase().includes(q);
                const matchDesc = (event.description || '').toLowerCase().includes(q);
                const matchCat = (event.category || '').toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchCat) return false;
            }

            return true;
        });
    }, [events, selectedCalendarIds, searchQuery]);

    // Drag and Drop: Drop event on date
    const handleDropOnDate = async (targetDateStr: string) => {
        if (!draggedEventId) return;

        const ev = events.find(e => e.id === draggedEventId);
        if (!ev) return;

        try {
            const oldStart = new Date(ev.start_time);
            const oldEnd = new Date(ev.end_time);
            const durationMs = Math.max(15 * 60 * 1000, oldEnd.getTime() - oldStart.getTime());

            const [y, m, d] = targetDateStr.split('-').map(Number);
            const newStart = new Date(y, m - 1, d, oldStart.getHours(), oldStart.getMinutes(), 0);
            const newEnd = new Date(newStart.getTime() + durationMs);

            // Optimistic Update
            const updatedEv: WorkspaceEvent = {
                ...ev,
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString(),
            };
            setEvents(events.map(e => e.id === ev.id ? updatedEv : e));

            // Server Update with Concurrency Lock & Automatic Notification
            const res = await fetch(`/api/workspace/events/${ev.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_time: newStart.toISOString(),
                    end_time: newEnd.toISOString(),
                    version: ev.version,
                    change_summary: `Tarih taşındı: ${formatLocalDate(newStart)}`,
                }),
            });

            if (!res.ok) {
                // Revert on error
                setEvents(events);
                const errData = await res.json();
                alert(`Tarih güncellenemedi: ${errData.error || 'Hata'}`);
            } else {
                const resData = await res.json();
                if (resData.event) {
                    setEvents(events.map(e => e.id === ev.id ? resData.event : e));
                }
            }
        } catch (err) {
            console.error('Drag drop error:', err);
        } finally {
            setDraggedEventId(null);
        }
    };

    // Open Event Drawer for New or Edit
    const handleOpenNewEvent = (targetDate?: Date) => {
        setEditingEvent(null);
        setInitialTargetDate(targetDate || new Date());
        setIsDrawerOpen(true);
    };

    const handleOpenEditEvent = (ev: WorkspaceEvent) => {
        setEditingEvent(ev);
        setInitialTargetDate(new Date(ev.start_time));
        setIsDrawerOpen(true);
    };

    // Bildirime Tıklama Yöneticisi (Etkinliği Aç veya Duyuruyu Göster)
    const handleNotificationClick = async (n: WorkspaceNotification) => {
        if (!n.is_read) {
            handleMarkNotificationRead(n.id);
        }
        setIsNotifOpen(false);

        const targetEventId = n.event_id || (n as any).eventId;
        if (targetEventId) {
            const foundEvent = events.find(e => e.id === targetEventId);
            if (foundEvent) {
                handleOpenEditEvent(foundEvent);
                return;
            } else {
                try {
                    const res = await fetch(`/api/workspace/events/${targetEventId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.event) {
                            handleOpenEditEvent(data.event);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn('Bildirim etkinliği yüklenemedi:', e);
                }
            }
        }

        setSelectedAnnouncement(n);
    };

    // Android & iOS Safari (PWA) Service Worker Kaydı
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.warn('HSD Service Worker kaydı yapılamadı:', err);
            });

            const handleSwMessage = (e: MessageEvent) => {
                if (e.data?.type === 'NOTIFICATION_CLICKED' && e.data?.eventId) {
                    const target = events.find(ev => ev.id === e.data.eventId);
                    if (target) {
                        handleOpenEditEvent(target);
                    }
                }
            };
            navigator.serviceWorker.addEventListener('message', handleSwMessage);
            return () => {
                navigator.serviceWorker.removeEventListener('message', handleSwMessage);
            };
        }
    }, [events]);

    // Unread notifications count & filtering
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const filteredNotifications = useMemo(() => {
        if (notifFilter === 'all') return notifications;
        if (notifFilter === 'urgent') return notifications.filter(n => n.type === 'urgent');
        if (notifFilter === 'reminder') return notifications.filter(n => n.type === 'reminder' || n.title.includes('Hatırlatıcı'));
        if (notifFilter === 'committee') return notifications.filter(n => n.type === 'committee' || n.title.includes('Komite') || n.target_group_id);
        return notifications;
    }, [notifications, notifFilter]);

    return (
        <div className={`flex flex-col h-[calc(100vh-2rem)] min-h-[750px] rounded-2xl border shadow-2xl overflow-hidden font-sans transition-colors duration-200 ${
            workspaceTheme === 'light'
                ? 'workspace-light-mode bg-slate-50 text-slate-900 border-slate-200 shadow-slate-200/50'
                : 'bg-zinc-950 text-zinc-100 border-zinc-800/80 shadow-2xl'
        }`}>
            {/* 🎯 Manyetik Custom Cursor */}
            <CustomCursor />
            {workspaceTheme === 'light' && (
                <style jsx global>{`
                    .workspace-light-mode {
                        background-color: #f8fafc !important;
                        color: #0f172a !important;
                        border-color: #e2e8f0 !important;
                    }
                    .workspace-light-mode header {
                        background-color: rgba(255, 255, 255, 0.96) !important;
                        border-color: #e2e8f0 !important;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
                    }
                    .workspace-light-mode aside {
                        background-color: #ffffff !important;
                        border-color: #e2e8f0 !important;
                    }
                    .workspace-light-mode main {
                        background-color: #f8fafc !important;
                    }
                    .workspace-light-mode .text-white {
                        color: #0f172a !important;
                    }
                    .workspace-light-mode .text-zinc-100,
                    .workspace-light-mode .text-zinc-200 {
                        color: #1e293b !important;
                    }
                    .workspace-light-mode .text-zinc-300,
                    .workspace-light-mode .text-zinc-400 {
                        color: #475569 !important;
                    }
                    .workspace-light-mode .text-zinc-500 {
                        color: #64748b !important;
                    }
                    .workspace-light-mode .bg-zinc-950,
                    .workspace-light-mode .bg-zinc-950\/90,
                    .workspace-light-mode .bg-zinc-950\/70,
                    .workspace-light-mode .bg-zinc-950\/40 {
                        background-color: #ffffff !important;
                    }
                    .workspace-light-mode .bg-zinc-900,
                    .workspace-light-mode .bg-zinc-900\/90,
                    .workspace-light-mode .bg-zinc-900\/70,
                    .workspace-light-mode .bg-zinc-900\/50,
                    .workspace-light-mode .bg-zinc-900\/40 {
                        background-color: #f1f5f9 !important;
                    }
                    .workspace-light-mode .bg-zinc-800,
                    .workspace-light-mode .bg-zinc-800\/80,
                    .workspace-light-mode .bg-zinc-800\/50 {
                        background-color: #e2e8f0 !important;
                    }
                    .workspace-light-mode .border-zinc-800,
                    .workspace-light-mode .border-zinc-800\/80,
                    .workspace-light-mode .border-zinc-800\/90,
                    .workspace-light-mode .border-zinc-700,
                    .workspace-light-mode .border-zinc-900 {
                        border-color: #e2e8f0 !important;
                    }
                    .workspace-light-mode .hover\:bg-zinc-800:hover,
                    .workspace-light-mode .hover\:bg-zinc-900\/70:hover {
                        background-color: #e2e8f0 !important;
                    }
                `}</style>
            )}
            {/* ── TOP HEADER / TOOLBAR (PROFESYONEL PRO GLASSMORPHIC TASARIM) ── */}
            <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 px-4 sm:px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-2xl sticky top-0 z-40 transition-all select-none">
                {/* 1. Sol Alan: Ana Sayfa Bağlantısı, Marka & Akıllı Tarih Navigasyonu */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Ana Sayfaya Dön Butonu */}
                    <Link
                        href="/"
                        className="group px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/90 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium shrink-0 shadow-sm"
                        title="Ana Sayfaya Dön"
                    >
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        <span className="hidden sm:inline">Ana Sayfa</span>
                    </Link>

                    <div className="h-4 w-px bg-zinc-800/80 shrink-0" />

                    {/* Logo & Marka Rozeti */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-600 to-red-500 flex items-center justify-center shadow-md shadow-rose-950/60 text-white font-extrabold text-[11px] tracking-tight border border-rose-400/30">
                                HSD
                            </div>
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-400 rounded-full animate-ping opacity-75" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                                Topluluk Takvimi
                            </span>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-zinc-800/80 shrink-0 hidden sm:block" />

                    {/* Akıllı Periyot Gezgini (Prev / Bugün / Next) */}
                    <div className="flex items-center gap-0.5 bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-0.5 shrink-0 shadow-inner">
                        <button
                            type="button"
                            onClick={() => handleNavigate('prev')}
                            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Önceki Periyot"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNavigate('today')}
                            className="px-2.5 py-0.5 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            Bugün
                        </button>
                        <button
                            type="button"
                            onClick={() => handleNavigate('next')}
                            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Sonraki Periyot"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    {/* Dinamik Dönem Başlığı */}
                    <div className="flex items-center gap-1.5 pl-1 shrink-0">
                        <span className="text-zinc-500 text-xs">📅</span>
                        <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                            {periodTitle}
                        </span>
                    </div>
                </div>

                {/* 2. Orta Bölüm: Segmented View & Arama */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Görünüm Modları (Segmented Control) */}
                    <div className="flex items-center bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-0.5 text-xs font-medium shrink-0 shadow-inner">
                        {(([
                            'ay',
                            '3ay',
                            '6ay',
                            'hafta',
                            'gun',
                            'liste',
                            ...(kanbanEnabled ? ['pano'] : [])
                        ]) as CalendarViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                                    viewMode === mode
                                        ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold shadow-md shadow-rose-950/50'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                                }`}
                            >
                                {mode === 'ay' ? 'Ay' :
                                 mode === '3ay' ? '3 Ay' :
                                 mode === '6ay' ? '6 Ay' :
                                 mode === 'hafta' ? 'Hafta' :
                                 mode === 'gun' ? 'Gün' :
                                 mode === 'liste' ? 'Liste' : '📋 Pano'}
                            </button>
                        ))}
                    </div>

                    {/* Arama Inputu */}
                    <div className="relative hidden lg:block">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Etkinlik veya kişi..."
                            className="w-36 xl:w-44 bg-zinc-900/90 border border-zinc-800/90 rounded-xl pl-7 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-all font-medium"
                        />
                        <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1.5 text-zinc-500 hover:text-white text-xs cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Sağ Bölüm: İşlem Butonları & HER ZAMAN EN SAĞ ÜSTTE SABİT PROFİL ADASI */}
                <div className="ml-auto flex items-center gap-2 shrink-0 flex-wrap">
                    {/* 🎯 Haftalık Katılım Butonu (Pop-up Açıcı) */}
                    <button
                        type="button"
                        onClick={() => setIsWeeklyRsvpOpen(true)}
                        className={`p-1.5 px-3 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 text-xs font-bold shrink-0 ${
                            upcomingWeeklyEvents.length > 0
                                ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white border-rose-500 hover:brightness-110 shadow-rose-950/40 animate-pulse'
                                : workspaceTheme === 'light'
                                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                        title="Önümüzdeki 7 gün içindeki etkinliklere katılım bildirimi yapın veya tercihlerinizi güncelleyin"
                    >
                        <span>🎯</span>
                        <span className="hidden sm:inline">Haftalık Katılım</span>
                        {upcomingWeeklyEvents.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 text-white font-bold">
                                {upcomingWeeklyEvents.length}
                            </span>
                        )}
                    </button>

                    {/* Aydınlık / Karanlık Tema Düğmesi (Sadece /workspace) */}
                    <button
                        type="button"
                        onClick={handleToggleTheme}
                        className={`p-1.5 px-2.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                            workspaceTheme === 'light'
                                ? 'bg-amber-100/90 border-amber-300 text-amber-900 hover:bg-amber-200/90 shadow-amber-950/10'
                                : 'bg-zinc-900/90 border-zinc-800/90 text-zinc-300 hover:text-white hover:border-zinc-700'
                        }`}
                        title={workspaceTheme === 'light' ? 'Karanlık Temaya Geç' : 'Aydınlık Temaya Geç (Notion / Linear Görünümü)'}
                    >
                        <span>{workspaceTheme === 'light' ? '☀️' : '🌙'}</span>
                        <span className="hidden sm:inline font-mono text-[11px]">{workspaceTheme === 'light' ? 'Aydınlık' : 'Karanlık'}</span>
                    </button>

                    {/* Kurumsal Bildirim Çanı */}
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="relative p-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer shadow-sm"
                            title="Bildirimler"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-rose-950/80 animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Açılır Profesyonel Bildirim Paneli */}
                        {isNotifOpen && (
                            <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-2xl border ${
                                workspaceTheme === 'light'
                                    ? 'bg-white/98 border-slate-200 text-slate-900 shadow-slate-300/60 ring-1 ring-slate-900/5'
                                    : 'bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-2xl'
                            }`}>
                                <div className={`flex items-center justify-between border-b pb-2.5 mb-2.5 ${
                                    workspaceTheme === 'light' ? 'border-slate-100' : 'border-zinc-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                            workspaceTheme === 'light' ? 'text-slate-900' : 'text-white'
                                        }`}>
                                            <span>🔔</span>
                                            <span>Bildirimler</span>
                                        </h3>
                                        {unreadCount > 0 && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                                                workspaceTheme === 'light'
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                                            }`}>
                                                {unreadCount} yeni
                                            </span>
                                        )}
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleMarkAllNotificationsRead}
                                            className={`text-[11px] transition-colors font-medium cursor-pointer ${
                                                workspaceTheme === 'light' ? 'text-slate-500 hover:text-rose-600' : 'text-zinc-400 hover:text-rose-400'
                                            }`}
                                        >
                                            Tümünü Okundu Say
                                        </button>
                                    )}
                                </div>

                                {/* Bildirim Kategori Filtre Sekmeleri */}
                                <div className="grid grid-cols-4 gap-1 mb-3">
                                    {[
                                        { id: 'all', label: 'Tümü' },
                                        { id: 'committee', label: '📢 Komite' },
                                        { id: 'reminder', label: '⏰ Hatırlatıcı' },
                                        { id: 'urgent', label: '⚡ Acil' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setNotifFilter(tab.id as any)}
                                            className={`px-1.5 py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                                                notifFilter === tab.id
                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                    : workspaceTheme === 'light'
                                                        ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-200/60'
                                                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {!desktopNotifAllowed ? (
                                    <div className={`p-2.5 mb-3 rounded-xl border flex items-center justify-between text-xs ${
                                        workspaceTheme === 'light'
                                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                                            : 'bg-rose-950/30 border border-rose-900/50 text-rose-200'
                                    }`}>
                                        <span className={`text-[11px] font-medium ${workspaceTheme === 'light' ? 'text-rose-900' : 'text-rose-200'}`}>
                                            Masaüstü & Telefon Bildirimleri
                                        </span>
                                        <button
                                            type="button"
                                            onClick={requestNotificationPermission}
                                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-500 transition-colors text-[11px] cursor-pointer shadow-xs active:scale-95"
                                        >
                                            İzin Ver
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`p-2 mb-3 rounded-xl border flex items-center justify-between text-[11px] ${
                                        workspaceTheme === 'light'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            : 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-300'
                                    }`}>
                                        <span className="flex items-center gap-1 font-medium">
                                            <span>✓</span> Cihaz bildirimleri aktif
                                        </span>
                                        <span className="text-[10px] opacity-75 font-mono">Kalıcı</span>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                    {filteredNotifications.length > 0 ? (
                                        filteredNotifications.map(n => {
                                            const icon = n.type === 'urgent'
                                                ? '⚡'
                                                : n.type === 'committee' || n.title.includes('Komite')
                                                    ? '📢'
                                                    : n.type === 'reminder' || n.title.includes('Hatırlatıcı')
                                                        ? '⏰'
                                                        : '📌';

                                            const hasEvent = Boolean(n.event_id || (n as any).eventId || n.event_title);

                                            return (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 cursor-pointer group hover:scale-[1.01] active:scale-[0.99] ${
                                                        n.is_read
                                                            ? workspaceTheme === 'light'
                                                                ? 'bg-slate-50/70 border-slate-200/80 text-slate-500 hover:bg-slate-100/90'
                                                                : 'bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:bg-zinc-900/80'
                                                            : workspaceTheme === 'light'
                                                                ? 'bg-white border-rose-300 text-slate-800 shadow-xs ring-1 ring-rose-500/10 hover:border-rose-400'
                                                                : 'bg-zinc-900/90 border-zinc-800 text-zinc-200 shadow-xs hover:border-zinc-700'
                                                    }`}
                                                    title={hasEvent ? 'Etkinliği açmak için tıklayın' : 'Bildirim detayını görmek için tıklayın'}
                                                >
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className={`font-semibold flex items-center gap-1.5 truncate ${
                                                            workspaceTheme === 'light' ? 'text-slate-900' : 'text-white'
                                                        }`}>
                                                            <span className="shrink-0">{icon}</span>
                                                            <span className="truncate">{n.title}</span>
                                                        </span>
                                                        <span className={`text-[10px] font-mono shrink-0 ${
                                                            workspaceTheme === 'light' ? 'text-slate-400' : 'text-zinc-500'
                                                        }`}>
                                                            {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    <p className={`leading-relaxed text-[11px] ${
                                                        workspaceTheme === 'light' ? 'text-slate-600' : 'text-zinc-300'
                                                    }`}>{n.message}</p>
                                                    <div className="flex items-center justify-between pt-1">
                                                        {n.event_title ? (
                                                            <div className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium border ${
                                                                workspaceTheme === 'light'
                                                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                                            }`}>
                                                                📅 {n.event_title}
                                                            </div>
                                                        ) : <span />}
                                                        <span className="text-[10px] text-rose-500 font-semibold group-hover:underline flex items-center gap-0.5">
                                                            {hasEvent ? 'Etkinliği Aç ↗' : 'Detayı Gör ↗'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className={`text-center text-xs py-6 italic ${
                                            workspaceTheme === 'light' ? 'text-slate-400' : 'text-zinc-500'
                                        }`}>
                                            {notifFilter !== 'all' ? 'Bu kategoride bildirim bulunmuyor.' : 'Yeni bildirim bulunmuyor.'}
                                        </p>
                                    )}
                                </div>

                                {/* Mobil Bildirim Bilgi Kartı */}
                                <div className={`mt-2 p-2 rounded-xl text-[10px] border flex items-center gap-1.5 ${
                                    workspaceTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                                }`}>
                                    <span>📱</span>
                                    <span><strong>Mobil Bildirim:</strong> Android'de aktif; iPhone'da Safari'den <em>Paylaş &gt; Ana Ekrana Ekle</em> yaparak telefonunuza bildirim alabilirsiniz.</span>
                                </div>

                                {/* Bildirim Sesi Test & Masaüstü İzin Çubuğu */}
                                <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 text-[11px] ${
                                    workspaceTheme === 'light' ? 'border-slate-100 text-slate-500' : 'border-zinc-800 text-zinc-400'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => playWorkspaceNotificationSound(0.25)}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer font-medium"
                                        title="HSD Özel Bildirim Sesini Çal"
                                    >
                                        <span>🔊</span>
                                        <span>Bildirim Sesini Test Et</span>
                                    </button>

                                    {!desktopNotifAllowed ? (
                                        <button
                                            type="button"
                                            onClick={requestNotificationPermission}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-bold transition-all cursor-pointer"
                                            title="Tarayıcı Masaüstü Bildirim İzni İste"
                                        >
                                            <span>💻</span>
                                            <span>Masaüstü İzni Ver</span>
                                        </button>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                                            <span>✓</span>
                                            <span>Masaüstü Aktif</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 🔄 Arka Plan Canlı Senkronizasyon Göstergesi */}
                    <button
                        type="button"
                        onClick={() => syncWorkspaceData(false)}
                        disabled={isBackgroundSyncing}
                        className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                            isBackgroundSyncing
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                : workspaceTheme === 'light'
                                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                        }`}
                        title={`Son Eşitleme: ${lastSyncedTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - Tıklayarak anında yenileyin`}
                    >
                        <span className={`text-xs ${isBackgroundSyncing ? 'animate-spin inline-block' : ''}`}>
                            {isBackgroundSyncing ? '🔄' : '🟢'}
                        </span>
                        <span className="hidden md:inline text-[11px] font-medium">
                            {isBackgroundSyncing ? 'Eşitleniyor...' : 'Senkronize'}
                        </span>
                    </button>

                    {/* "+ Yeni Etkinlik" Butonu */}
                    <button
                        type="button"
                        onClick={() => handleOpenNewEvent(new Date())}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-950/50 transition-all shrink-0 cursor-pointer border border-rose-500/30 active:scale-95"
                    >
                        <span className="font-bold text-sm leading-none">+</span>
                        <span className="hidden sm:inline">Yeni Etkinlik</span>
                    </button>

                    {/* ── PROFESYONEL SEVİYE KULLANICI PROFİLİ (BAR PP & HESAP ADASI) ── */}
                    {currentUser ? (
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className={`flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                                    workspaceTheme === 'light'
                                        ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                                        : 'bg-zinc-900/90 border-zinc-800 hover:border-rose-500/50 hover:bg-zinc-850/90 text-zinc-100'
                                }`}
                                title="Kullanıcı Menüsü"
                            >
                                {/* PP: /ekip Eşleşen Fotoğrafı veya Monogram Baş Harfi */}
                                <div className="relative shrink-0">
                                    {activeAvatar ? (
                                        <img
                                            src={activeAvatar}
                                            alt={currentUser.display_name}
                                            className={`w-7 h-7 rounded-xl object-cover shadow-sm ${
                                                workspaceTheme === 'light'
                                                    ? 'border border-slate-200 group-hover:border-rose-400'
                                                    : 'border border-zinc-700/80 group-hover:border-rose-500/70'
                                            }`}
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-rose-400/30">
                                            {currentUser.display_name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    {/* Çevrimiçi Durum Göstergesi */}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 rounded-full ${
                                        workspaceTheme === 'light' ? 'border-white' : 'border-zinc-950'
                                    }`} />
                                </div>

                                <div className="flex flex-col items-start text-left leading-tight hidden sm:flex">
                                    <span className={`text-xs font-semibold transition-colors max-w-[110px] truncate ${
                                        workspaceTheme === 'light'
                                            ? 'text-slate-900 group-hover:text-rose-600'
                                            : 'text-zinc-100 group-hover:text-white'
                                    }`}>
                                        {currentUser.display_name}
                                    </span>
                                    <span className={`text-[10px] font-mono flex items-center gap-1 ${
                                        workspaceTheme === 'light' ? 'text-slate-500' : 'text-zinc-400'
                                    }`}>
                                        {isTeamMatched ? (
                                            <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                                                <span>✓</span> Ekip
                                            </span>
                                        ) : currentUser.role === 'super_admin' ? (
                                            <span className="text-amber-500 font-medium">👑 Admin</span>
                                        ) : currentUser.role === 'workspace_admin' ? (
                                            <span className="text-rose-500 font-medium">🛡️ Yönetici</span>
                                        ) : currentUser.role === 'editor' ? (
                                            <span className="text-blue-500 font-medium">✍️ Editör</span>
                                        ) : (
                                            'Üye'
                                        )}
                                    </span>
                                </div>

                                <svg
                                    className={`w-3.5 h-3.5 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''} ${
                                        workspaceTheme === 'light' ? 'text-slate-400 group-hover:text-slate-600' : 'text-zinc-400'
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Açılır Kullanıcı Menüsü Popover */}
                            {isUserMenuOpen && (
                                <div className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-2xl border ${
                                    workspaceTheme === 'light'
                                        ? 'bg-white/98 border-slate-200 text-slate-900'
                                        : 'bg-zinc-950/95 border-zinc-800 text-zinc-100'
                                }`}>
                                    {/* Profil Başlığı */}
                                    <div className={`flex items-center gap-3 pb-3 border-b ${
                                        workspaceTheme === 'light' ? 'border-slate-100' : 'border-zinc-800/80'
                                    }`}>
                                        <div className="relative shrink-0">
                                            {activeAvatar ? (
                                                <img
                                                    src={activeAvatar}
                                                    alt={currentUser.display_name}
                                                    className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-500/50 shadow-md"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-sm font-bold text-white shadow-md border border-rose-400/40">
                                                    {currentUser.display_name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 rounded-full ${
                                                workspaceTheme === 'light' ? 'border-white' : 'border-zinc-950'
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-bold truncate flex items-center gap-1.5 ${
                                                workspaceTheme === 'light' ? 'text-slate-900' : 'text-white'
                                            }`}>
                                                <span>{currentUser.display_name}</span>
                                                {isTeamMatched && (
                                                    <span className="text-[10px] text-emerald-500 font-bold" title="Ekip Listesiyle Eşleşti">✓</span>
                                                )}
                                            </h4>
                                            <p className={`text-[11px] font-mono truncate ${
                                                workspaceTheme === 'light' ? 'text-slate-500' : 'text-zinc-400'
                                            }`}>
                                                {currentUser.email}
                                            </p>
                                            {teamRoleTitle ? (
                                                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium truncate max-w-[190px] ${
                                                    workspaceTheme === 'light'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                                }`}>
                                                    {teamRoleTitle}
                                                </span>
                                            ) : (
                                                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                    workspaceTheme === 'light'
                                                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                                                }`}>
                                                    {currentUser.role === 'super_admin' ? '👑 Süper Yönetici' :
                                                     currentUser.role === 'workspace_admin' ? '🛡️ Topluluk Yöneticisi' :
                                                     currentUser.role === 'editor' ? '✍️ Çekirdek Editör' : '👥 Topluluk Üyesi'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Kısayol Menü Linkleri */}
                                    <div className="py-2 space-y-1">
                                        <Link
                                            href="/ekip"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                                                workspaceTheme === 'light'
                                                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                                                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                                            }`}
                                        >
                                            <span className="text-sm">🌟</span>
                                            <span>HSD Ekip Sayfası (/ekip)</span>
                                        </Link>

                                        {isAdmin && (
                                            <>
                                                <Link
                                                    href="/admin/workspace"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                                                        workspaceTheme === 'light'
                                                            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                                                            : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                                                    }`}
                                                >
                                                    <span className="text-sm">⚙️</span>
                                                    <span>Workspace Yönetim Paneli</span>
                                                </Link>
                                                <Link
                                                    href="/admin/ekip"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                                                        workspaceTheme === 'light'
                                                            ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                                                            : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                                                    }`}
                                                >
                                                    <span className="text-sm">👥</span>
                                                    <span>Ekip Üyeleri (Profil Fotoğrafları)</span>
                                                </Link>
                                            </>
                                        )}
                                    </div>

                                    {/* Çıkış Yap Butonu */}
                                    {onLogout && (
                                        <div className={`pt-2 border-t ${
                                            workspaceTheme === 'light' ? 'border-slate-100' : 'border-zinc-800/80'
                                        }`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    onLogout();
                                                }}
                                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                                    workspaceTheme === 'light'
                                                        ? 'text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200'
                                                        : 'text-rose-400 hover:text-white hover:bg-rose-950/50 border border-rose-900/40'
                                                }`}
                                            >
                                                <span>⎋</span>
                                                <span>Güvenli Çıkış Yap</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : onRequireLogin && (
                        <button
                            type="button"
                            onClick={onRequireLogin}
                            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>🔒</span>
                            <span>Giriş Yap</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Kalıcı Masaüstü/Cihaz Bildirim İzni İsteme Bildirimi */}
            {showPermissionBanner && (
                <div className={`px-4 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    workspaceTheme === 'light'
                        ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border-amber-200 text-amber-900'
                        : 'bg-gradient-to-r from-amber-950/40 via-rose-950/30 to-zinc-950 border-amber-800/40 text-amber-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 text-base shadow-sm">
                            🔔
                        </div>
                        <div>
                            <p className="text-xs font-bold leading-snug">
                                Etkinlik ve Komite Bildirimlerini Cihazınızda Kalıcı Olarak Alın
                            </p>
                            <p className="text-[11px] opacity-80 leading-snug">
                                Yeni etkinlik eklendiğinde veya görevler güncellendiğinde tarayıcı bildirimleriyle anında haberdar olun.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                            type="button"
                            onClick={requestNotificationPermission}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>İzin Ver</span>
                            <span>✓</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowPermissionBanner(false);
                                localStorage.setItem('hsd_notif_banner_dismissed', 'true');
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                workspaceTheme === 'light'
                                    ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                            }`}
                        >
                            Daha Sonra
                        </button>
                    </div>
                </div>
            )}

            {/* ── WORKSPACE BODY (SIDEBAR + MAIN CALENDAR VIEW) ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sol Filtre Sidebar */}
                <aside className={`w-64 border-r p-4 space-y-6 hidden lg:block overflow-y-auto transition-colors ${
                    workspaceTheme === 'light'
                        ? 'border-slate-200 bg-white'
                        : 'border-zinc-800/80 bg-zinc-950'
                }`}>
                    {/* Takvimler Toggle Listesi */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1">
                            <span className={`text-xs font-bold uppercase tracking-wider block ${
                                workspaceTheme === 'light' ? 'text-slate-600' : 'text-zinc-300'
                            }`}>
                                Topluluk Takvimleri
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedCalendarIds.length === calendars.length) {
                                        setSelectedCalendarIds([]);
                                    } else {
                                        setSelectedCalendarIds(calendars.map(c => c.id));
                                    }
                                }}
                                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                                    workspaceTheme === 'light'
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                                }`}
                            >
                                {selectedCalendarIds.length === calendars.length ? 'Temizle' : 'Tümü'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {calendars.map(cal => {
                                const isChecked = selectedCalendarIds.includes(cal.id);
                                const calEventCount = events.filter(e => e.calendar_id === cal.id).length;
                                return (
                                    <div
                                        key={cal.id}
                                        onClick={() => {
                                            if (isChecked) {
                                                setSelectedCalendarIds(selectedCalendarIds.filter(id => id !== cal.id));
                                            } else {
                                                setSelectedCalendarIds([...selectedCalendarIds, cal.id]);
                                            }
                                        }}
                                        className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-200 text-xs select-none border ${
                                            isChecked
                                                ? workspaceTheme === 'light'
                                                    ? 'bg-white border-slate-300/90 shadow-sm translate-x-1'
                                                    : 'bg-zinc-900/90 border-zinc-700/80 shadow-md translate-x-1'
                                                : workspaceTheme === 'light'
                                                    ? 'bg-slate-50/60 border-slate-200/60 opacity-60 hover:opacity-100 hover:translate-x-0.5'
                                                    : 'bg-zinc-950/40 border-zinc-900 opacity-50 hover:opacity-100 hover:translate-x-0.5'
                                        }`}
                                    >
                                        {/* Renkli Sol Glow Çubuğu */}
                                        <div
                                            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-all duration-200"
                                            style={{
                                                backgroundColor: cal.color,
                                                boxShadow: isChecked ? `0 0 10px ${cal.color}` : 'none'
                                            }}
                                        />

                                        <div className="flex items-center gap-2.5 pl-2 overflow-hidden">
                                            <span
                                                className={`w-3 h-3 rounded-full shrink-0 transition-transform duration-200 ${
                                                    isChecked ? 'scale-110 ring-2 ring-white/20' : 'scale-90 opacity-60'
                                                }`}
                                                style={{ backgroundColor: cal.color }}
                                            />
                                            <span className={`font-semibold truncate ${
                                                isChecked
                                                    ? (workspaceTheme === 'light' ? 'text-slate-900 font-bold' : 'text-zinc-100 font-bold')
                                                    : (workspaceTheme === 'light' ? 'text-slate-400' : 'text-zinc-500')
                                            }`}>
                                                {cal.title}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {calEventCount > 0 && (
                                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                                                    isChecked
                                                        ? workspaceTheme === 'light'
                                                            ? 'bg-slate-100 border-slate-300 text-slate-700'
                                                            : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                                        : 'bg-transparent border-transparent opacity-40 text-zinc-500'
                                                }`}>
                                                    {calEventCount}
                                                </span>
                                            )}

                                            {/* Modern Switch / Toggle Pill */}
                                            <div
                                                className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                                                    isChecked ? 'bg-rose-600 justify-end' : (workspaceTheme === 'light' ? 'bg-slate-300 justify-start' : 'bg-zinc-800 justify-start')
                                                }`}
                                            >
                                                <div className="w-3 h-3 rounded-full bg-white shadow-xs transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Komiteler (Core Team) Bilgilendirme */}
                    <div className="space-y-2.5">
                        <span className={`text-xs font-semibold uppercase tracking-wider block ${
                            workspaceTheme === 'light' ? 'text-slate-500' : 'text-zinc-400'
                        }`}>
                            Çekirdek Komiteler
                        </span>
                        <div className="space-y-2">
                            {groups.map(grp => (
                                <div
                                    key={grp.id}
                                    className={`p-2.5 rounded-xl text-xs space-y-1 border transition-colors ${
                                        workspaceTheme === 'light'
                                            ? 'bg-slate-50 border-slate-200/80 text-slate-800'
                                            : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: grp.color }} />
                                        <span className={`font-semibold ${workspaceTheme === 'light' ? 'text-slate-800' : 'text-zinc-200'}`}>
                                            {grp.name}
                                        </span>
                                    </div>
                                    <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                                        workspaceTheme === 'light' ? 'text-slate-500' : 'text-zinc-500'
                                    }`}>
                                        {grp.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Ana Takvim Görünüm Alanı */}
                <main className={`flex-1 flex flex-col overflow-y-auto p-4 transition-colors ${
                    workspaceTheme === 'light' ? 'bg-slate-100/70' : 'bg-zinc-950/70'
                }`}>
                    {viewMode === 'ay' && (
                        <MonthView
                            currentDate={currentDate}
                            events={filteredEvents}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                            onDayClick={(dateStr) => {
                                const todayStr = formatLocalDate(new Date());
                                const isPast = dateStr < todayStr;
                                const canCreatePast = isAdmin || currentUser?.role === 'super_admin' || currentUser?.role === 'workspace_admin';

                                if (isPast && !canCreatePast) {
                                    alert(`Geçmiş bir tarihe (${dateStr}) yeni etkinlik eklenemez. Yalnızca geçmiş etkinlikleri inceleyebilirsiniz.`);
                                    return;
                                }

                                const [y, m, d] = dateStr.split('-');
                                const clickedDate = new Date(Number(y), Number(m) - 1, Number(d), 10, 0);
                                setCurrentDate(clickedDate);
                                handleOpenNewEvent(clickedDate);
                            }}
                            onDropOnDate={handleDropOnDate}
                            onDragStart={(id) => setDraggedEventId(id)}
                        />
                    )}

                    {viewMode === '3ay' && (
                        <MultiMonthView
                            startDate={currentDate}
                            monthsCount={3}
                            events={filteredEvents}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                            onDaySelect={(d) => {
                                setCurrentDate(d);
                                setViewMode('gun');
                            }}
                        />
                    )}

                    {viewMode === '6ay' && (
                        <MultiMonthView
                            startDate={currentDate}
                            monthsCount={6}
                            events={filteredEvents}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                            onDaySelect={(d) => {
                                setCurrentDate(d);
                                setViewMode('gun');
                            }}
                        />
                    )}

                    {viewMode === 'hafta' && (
                        <WeekView
                            currentDate={currentDate}
                            events={filteredEvents}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                            onDropOnDate={handleDropOnDate}
                            onDragStart={(id) => setDraggedEventId(id)}
                        />
                    )}

                    {viewMode === 'gun' && (
                        <DayView
                            currentDate={currentDate}
                            events={filteredEvents}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                        />
                    )}

                    {viewMode === 'liste' && (
                        <ListView
                            currentDate={currentDate}
                            events={filteredEvents}
                            members={members}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                        />
                    )}

                    {viewMode === 'pano' && (
                        <KanbanView
                            events={filteredEvents}
                            calendars={calendars}
                            theme={workspaceTheme}
                            onEventClick={handleOpenEditEvent}
                            onUpdateStatus={async (eventId, newStatus) => {
                                setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
                                try {
                                    await fetch(`/api/workspace/events/${eventId}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: newStatus }),
                                    });
                                } catch (err) {
                                    console.error('Pano durum güncelleme hatası:', err);
                                }
                            }}
                        />
                    )}
                </main>
            </div>

            {/* Event Drawer Modal */}
            <EventDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                event={editingEvent}
                initialDate={initialTargetDate}
                calendars={calendars}
                groups={groups}
                members={members}
                currentMember={currentUser}
                userPermissions={userPermissions}
                theme={workspaceTheme}
                onEventSaved={(savedEv) => {
                    const idx = events.findIndex(e => e.id === savedEv.id);
                    if (idx >= 0) {
                        setEvents(events.map(e => e.id === savedEv.id ? savedEv : e));
                    } else {
                        setEvents([savedEv, ...events]);
                    }
                }}
                onEventDeleted={(deletedId) => {
                    setEvents(events.filter(e => e.id !== deletedId));
                }}
            />

            {/* 🎯 Haftalık Katılım Bildirimi (Açılır Şık Menü) */}
            <WeeklyRsvpModal
                isOpen={isWeeklyRsvpOpen}
                onClose={() => setIsWeeklyRsvpOpen(false)}
                events={events}
                currentUser={currentUser}
                theme={workspaceTheme}
                onEventUpdated={(updatedEv) => {
                    setEvents(prev => prev.map(e => e.id === updatedEv.id ? updatedEv : e));
                }}
            />

            {/* 📢 Duyuru & Bildirim Detay Modalı */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div 
                        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative transition-all ${
                            workspaceTheme === 'light'
                                ? 'bg-white border-slate-200 text-slate-800'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        }`}
                        role="dialog"
                        aria-modal="true"
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedAnnouncement(null)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                            aria-label="Kapat"
                        >
                            ✕
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-xl shrink-0 font-bold">
                                📢
                            </span>
                            <div>
                                <h3 className="font-bold text-base leading-snug">
                                    {selectedAnnouncement.title}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {new Date(selectedAnnouncement.created_at).toLocaleDateString('tr-TR', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border text-sm leading-relaxed mb-6 whitespace-pre-wrap ${
                            workspaceTheme === 'light'
                                ? 'bg-slate-50 border-slate-200 text-slate-700'
                                : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300'
                        }`}>
                            {selectedAnnouncement.message}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedAnnouncement(null)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                    workspaceTheme === 'light'
                                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                                }`}
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

// ==============================================================================
// 1. AY GÖRÜNÜMÜ (MONTH VIEW)
// ==============================================================================
interface MonthViewProps {
    currentDate: Date;
    events: WorkspaceEvent[];
    theme?: 'light' | 'dark';
    onEventClick: (event: WorkspaceEvent) => void;
    onDayClick: (dateStr: string) => void;
    onDropOnDate: (dateStr: string) => void;
    onDragStart: (id: string) => void;
}

function MonthView({
    currentDate,
    events,
    theme = 'dark',
    onEventClick,
    onDayClick,
    onDropOnDate,
    onDragStart,
}: MonthViewProps) {
    const isLight = theme === 'light';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Month grid generator
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday index: 0

    const prevMonthDays = new Date(year, month, 0).getDate();

    const calendarCells = useMemo(() => {
        const cells: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }> = [];
        const todayStr = formatLocalDate(new Date());

        // Previous month filler
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const d = prevMonthDays - i;
            const pmDate = new Date(year, month - 1, d);
            const dateStr = formatLocalDate(pmDate);
            cells.push({ dateStr, dayNum: d, isCurrentMonth: false, isToday: dateStr === todayStr });
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const mDate = new Date(year, month, d);
            const dateStr = formatLocalDate(mDate);
            cells.push({ dateStr, dayNum: d, isCurrentMonth: true, isToday: dateStr === todayStr });
        }

        // Next month filler to complete 35 or 42 cells
        const total = cells.length > 35 ? 42 : 35;
        let nextD = 1;
        while (cells.length < total) {
            const nmDate = new Date(year, month + 1, nextD);
            const dateStr = formatLocalDate(nmDate);
            cells.push({ dateStr, dayNum: nextD, isCurrentMonth: false, isToday: dateStr === todayStr });
            nextD++;
        }

        return cells;
    }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

    // Map events by date YYYY-MM-DD
    const eventsByDate = useMemo(() => {
        const map = new Map<string, WorkspaceEvent[]>();
        events.forEach(e => {
            try {
                const dateKey = formatLocalDate(new Date(e.start_time));
                const list = map.get(dateKey) || [];
                list.push(e);
                map.set(dateKey, list);
            } catch {
                const fallback = e.start_time.split('T')[0];
                const list = map.get(fallback) || [];
                list.push(e);
                map.set(fallback, list);
            }
        });
        return map;
    }, [events]);

    return (
        <div className={`flex-1 flex flex-col h-full rounded-2xl overflow-hidden transition-colors ${
            isLight
                ? 'bg-white border border-slate-200 shadow-sm'
                : 'bg-zinc-900/30 border border-zinc-800/80 shadow-inner'
        }`}>
            {/* Day of Week Headers (Yüksek Kontrast & Göz Yormayan) */}
            <div className={`grid grid-cols-7 border-b py-3 text-center uppercase tracking-wider text-xs font-bold ${
                isLight
                    ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
            }`}>
                {DAYS_SHORT_TR.map(d => (
                    <div key={d} className={isLight ? 'text-slate-700 font-bold tracking-wider' : 'text-zinc-200'}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className={`grid grid-cols-7 flex-1 grid-rows-5 md:grid-rows-6 divide-x divide-y ${
                isLight
                    ? 'divide-slate-200/80 bg-white'
                    : 'divide-zinc-800/60 bg-zinc-950/40'
            }`}>
                {calendarCells.map((cell) => {
                    const cellEvents = eventsByDate.get(cell.dateStr) || [];

                    return (
                        <div
                            key={cell.dateStr}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropOnDate(cell.dateStr)}
                            onClick={() => onDayClick(cell.dateStr)}
                            className={`min-h-[96px] p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                                cell.isCurrentMonth
                                    ? (isLight ? 'bg-white hover:bg-slate-50' : 'bg-transparent hover:bg-zinc-900/50')
                                    : (isLight ? 'bg-slate-50/70 opacity-60' : 'bg-zinc-950/80 opacity-40')
                            }`}
                        >
                            {/* Day Header */}
                            <div className="flex items-center justify-between">
                                <span
                                    className={`text-xs w-6 h-6 rounded-full flex items-center justify-center transition-all ${cell.isToday
                                            ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-950/80 ring-2 ring-rose-400/30'
                                            : cell.isCurrentMonth
                                                ? (isLight ? 'text-slate-800 font-bold group-hover:text-rose-600' : 'text-zinc-200 font-semibold group-hover:text-white')
                                                : (isLight ? 'text-slate-400 font-medium' : 'text-zinc-600 font-medium')
                                        }`}
                                >
                                    {cell.dayNum}
                                </span>
                                {cellEvents.length > 3 && (
                                    <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                        isLight ? 'bg-slate-100 text-rose-600 border border-slate-200' : 'bg-zinc-800/80 text-rose-300'
                                    }`}>
                                        +{cellEvents.length - 3}
                                    </span>
                                )}
                            </div>

                            {/* Event Pills (Yüksek Kontrast & Kolay Okunabilir) */}
                            <div className="space-y-1.5 my-1 overflow-hidden">
                                {cellEvents.slice(0, 3).map(ev => (
                                    <div
                                        key={ev.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.stopPropagation();
                                            onDragStart(ev.id);
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick(ev);
                                        }}
                                        className="px-2 py-1 rounded-lg text-xs font-semibold truncate cursor-grab active:cursor-grabbing hover:brightness-125 shadow-xs flex items-center justify-between gap-1.5 transition-all hover:scale-[1.02] border border-zinc-800/80"
                                        style={{
                                            backgroundColor: `${ev.color}28`,
                                            borderLeft: `3.5px solid ${ev.color}`,
                                            color: '#ffffff',
                                        }}
                                        title={`${ev.title} (${ev.start_time.substring(11, 16)} - ${ev.end_time.substring(11, 16)})`}
                                    >
                                        <span className="truncate font-semibold text-white drop-shadow-xs">{ev.title}</span>
                                        {!ev.is_all_day && (
                                            <span className="text-[10px] font-mono text-zinc-300 shrink-0 font-medium opacity-90">
                                                {ev.start_time.substring(11, 16)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="h-1" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==============================================================================
// 2. ÇOKLU AY GÖRÜNÜMÜ (3 AY & 6 AY - QUARTERLY & HALF-YEAR)
// ==============================================================================
interface MultiMonthViewProps {
    startDate: Date;
    monthsCount: 3 | 6;
    events: WorkspaceEvent[];
    theme?: 'light' | 'dark';
    onEventClick: (event: WorkspaceEvent) => void;
    onDaySelect: (date: Date) => void;
}

function MultiMonthView({
    startDate,
    monthsCount,
    events,
    theme = 'dark',
    onEventClick,
    onDaySelect,
}: MultiMonthViewProps) {
    const isLight = theme === 'light';
    const monthOffsets = Array.from({ length: monthsCount }, (_, i) => i);

    return (
        <div className={`grid grid-cols-1 ${monthsCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4 h-full overflow-y-auto pr-1`}>
            {monthOffsets.map(offset => {
                const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + offset, 1);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDayIndex = (targetDate.getDay() + 6) % 7;

                // Month's events
                const monthEvents = events.filter(e => {
                    const d = new Date(e.start_time);
                    return d.getFullYear() === year && d.getMonth() === month;
                });

                return (
                    <div
                        key={`${year}-${month}`}
                        className={`p-4 rounded-2xl flex flex-col justify-between shadow-sm transition-colors ${
                            isLight
                                ? 'bg-white border border-slate-200 shadow-xs'
                                : 'bg-zinc-900/40 border border-zinc-800'
                        }`}
                    >
                        <div>
                            <div className={`flex items-center justify-between mb-3 pb-2 border-b ${
                                isLight ? 'border-slate-100' : 'border-zinc-800/80'
                            }`}>
                                <h3 className={`text-sm font-bold tracking-tight ${
                                    isLight ? 'text-slate-800' : 'text-white'
                                }`}>
                                    {MONTHS_TR[month]} {year}
                                </h3>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                                    isLight ? 'bg-slate-100 text-slate-600' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                    {monthEvents.length} Etkinlik
                                </span>
                            </div>

                            {/* Mini Day Header */}
                            <div className={`grid grid-cols-7 text-[10px] font-semibold text-center mb-1 ${
                                isLight ? 'text-slate-500 font-bold' : 'text-zinc-500'
                            }`}>
                                {DAYS_SHORT_TR.map(d => <span key={d}>{d[0]}</span>)}
                            </div>

                            {/* Mini Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-[11px] text-center">
                                {Array.from({ length: firstDayIndex }).map((_, i) => (
                                    <span key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayEvents = monthEvents.filter(e => {
                                        try {
                                            return formatLocalDate(new Date(e.start_time)) === dayStr;
                                        } catch {
                                            return e.start_time.startsWith(dayStr);
                                        }
                                    });
                                    const hasEvent = dayEvents.length > 0;

                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => onDaySelect(new Date(year, month, day))}
                                            className={`h-7 rounded-lg flex flex-col items-center justify-center font-medium transition-all ${hasEvent
                                                    ? 'bg-rose-950/60 text-rose-200 border border-rose-800/80 font-bold hover:scale-105'
                                                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                                                }`}
                                        >
                                            <span>{day}</span>
                                            {hasEvent && (
                                                <span className="w-1 h-1 rounded-full bg-rose-500 mt-0.5" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Events List for this month */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-1.5 max-h-28 overflow-y-auto">
                            {monthEvents.slice(0, 3).map(ev => (
                                <div
                                    key={ev.id}
                                    onClick={() => onEventClick(ev)}
                                    className="p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-colors"
                                >
                                    <span className="truncate font-medium text-zinc-200">{ev.title}</span>
                                    <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-1">
                                        {new Date(ev.start_time).getDate()} {MONTHS_TR[month].substring(0, 3)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ==============================================================================
// 3. HAFTA GÖRÜNÜMÜ (WEEK TIMELINE VIEW)
// ==============================================================================
interface WeekViewProps {
    currentDate: Date;
    events: WorkspaceEvent[];
    theme?: 'light' | 'dark';
    onEventClick: (event: WorkspaceEvent) => void;
    onDropOnDate: (dateStr: string) => void;
    onDragStart: (id: string) => void;
}

function WeekView({
    currentDate,
    events,
    theme = 'dark',
    onEventClick,
    onDropOnDate,
    onDragStart,
}: WeekViewProps) {
    const isLight = theme === 'light';
    const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

    // Get 7 days of the week starting from Monday
    const weekDays = useMemo(() => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));

        return Array.from({ length: 7 }, (_, i) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            const dateStr = formatLocalDate(dayDate);
            return {
                name: DAYS_SHORT_TR[i],
                dateStr,
                dayNum: dayDate.getDate(),
                dateObj: dayDate,
            };
        });
    }, [currentDate]);

    return (
        <div className={`flex-1 flex flex-col h-full rounded-2xl overflow-hidden transition-colors ${
            isLight
                ? 'bg-white border border-slate-200 shadow-sm'
                : 'bg-zinc-900/30 border border-zinc-800 shadow-inner'
        }`}>
            {/* Week Headers (Yüksek Kontrast & Göz Yormayan) */}
            <div className={`grid grid-cols-8 border-b py-3 text-xs font-bold ${
                isLight
                    ? 'bg-slate-100/90 border-slate-200 text-slate-700'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-200'
            }`}>
                <div className={`text-center font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Saat</div>
                {weekDays.map(w => (
                    <div key={w.dateStr} className="text-center">
                        <span className={`block text-[11px] uppercase tracking-wider font-semibold ${
                            isLight ? 'text-slate-500' : 'text-zinc-300'
                        }`}>{w.name}</span>
                        <span className={`font-extrabold text-sm ${
                            isLight ? 'text-slate-900' : 'text-white'
                        }`}>{w.dayNum}</span>
                    </div>
                ))}
            </div>

            {/* Time Grid */}
            <div className={`flex-1 overflow-y-auto divide-y ${
                isLight ? 'divide-slate-200/80 bg-white' : 'divide-zinc-800/40'
            }`}>
                {hours.map(h => (
                    <div key={h} className={`grid grid-cols-8 min-h-[58px] divide-x ${
                        isLight ? 'divide-slate-200/80' : 'divide-zinc-800/40'
                    }`}>
                        {/* Time Ruler */}
                        <div className={`text-xs font-mono font-bold flex items-start justify-center pt-2 ${
                            isLight ? 'text-slate-500 bg-slate-50/50' : 'text-zinc-400 bg-zinc-950/40'
                        }`}>
                            {String(h).padStart(2, '0')}:00
                        </div>

                        {/* 7 Columns */}
                        {weekDays.map(w => {
                            const matchingEvents = events.filter(e => {
                                if (!e.start_time.startsWith(w.dateStr)) return false;
                                const evHour = new Date(e.start_time).getHours();
                                return evHour === h;
                            });

                            return (
                                <div
                                    key={w.dateStr}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => onDropOnDate(w.dateStr)}
                                    className="p-1.5 hover:bg-zinc-900/40 transition-colors relative"
                                >
                                    {matchingEvents.map(ev => (
                                        <div
                                            key={ev.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.stopPropagation();
                                                onDragStart(ev.id);
                                            }}
                                            onClick={() => onEventClick(ev)}
                                            className="p-2 rounded-xl text-xs font-semibold truncate cursor-grab shadow-sm mb-1 hover:brightness-125 border border-zinc-800/80 transition-all hover:scale-[1.02]"
                                            style={{
                                                backgroundColor: `${ev.color}28`,
                                                borderLeft: `3.5px solid ${ev.color}`,
                                                color: '#ffffff',
                                            }}
                                        >
                                            <p className="truncate font-bold text-white">{ev.title}</p>
                                            <div className="flex items-center justify-between text-[10px] text-zinc-300 font-mono mt-0.5">
                                                <span>{ev.start_time.substring(11, 16)}</span>
                                                <span className="truncate max-w-[65px] opacity-80">{ev.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ==============================================================================
// 4. GÜN GÖRÜNÜMÜ (DAY VIEW)
// ==============================================================================
interface DayViewProps {
    currentDate: Date;
    events: WorkspaceEvent[];
    theme?: 'light' | 'dark';
    onEventClick: (event: WorkspaceEvent) => void;
}

function DayView({ currentDate, events, theme = 'dark', onEventClick }: DayViewProps) {
    const isLight = theme === 'light';
    const dateStr = formatLocalDate(currentDate);
    const dayEvents = events.filter(e => {
        try {
            return formatLocalDate(new Date(e.start_time)) === dateStr;
        } catch {
            return e.start_time.startsWith(dateStr);
        }
    });
    const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00 - 23:00

    return (
        <div className={`flex-1 flex flex-col h-full rounded-2xl overflow-hidden transition-colors ${
            isLight
                ? 'bg-white border border-slate-200 shadow-sm'
                : 'bg-zinc-900/30 border border-zinc-800 shadow-inner'
        }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isLight ? 'border-slate-200 bg-slate-50/80' : 'border-zinc-800 bg-zinc-900/70'
            }`}>
                <div>
                    <h2 className={`text-base sm:text-lg font-bold tracking-tight ${
                        isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                        {currentDate.getDate()} {MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <p className={`text-xs font-medium mt-0.5 ${
                        isLight ? 'text-slate-500' : 'text-zinc-300'
                    }`}>
                        {DAYS_TR[(currentDate.getDay() + 6) % 7]} • <span className="text-rose-500 font-bold">{dayEvents.length}</span> Planlı Etkinlik
                    </p>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto divide-y p-4 space-y-2.5 ${
                isLight ? 'divide-slate-200/80' : 'divide-zinc-800/40'
            }`}>
                {hours.map(h => {
                    const hourEvents = dayEvents.filter(e => new Date(e.start_time).getHours() === h);

                    return (
                        <div key={h} className="flex gap-4 min-h-[64px] pt-2">
                            <span className={`w-16 text-xs font-mono font-bold pt-1 shrink-0 ${
                                isLight ? 'text-slate-400' : 'text-zinc-400'
                            }`}>
                                {String(h).padStart(2, '0')}:00
                            </span>

                            <div className="flex-1 space-y-2">
                                {hourEvents.map(ev => (
                                    <div
                                        key={ev.id}
                                        onClick={() => onEventClick(ev)}
                                        className={`p-3.5 rounded-2xl cursor-pointer shadow-sm flex items-start justify-between transition-all hover:scale-[1.01] ${
                                            isLight
                                                ? 'bg-slate-50/80 border border-slate-200 hover:border-slate-300'
                                                : 'bg-zinc-900/95 border border-zinc-700/80 hover:border-zinc-500'
                                        }`}
                                        style={{ borderLeft: `4px solid ${ev.color}` }}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{ev.title}</span>
                                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                                    isLight ? 'bg-white text-rose-600 border-slate-200' : 'bg-zinc-800 text-rose-300 border-zinc-700'
                                                }`}>
                                                    {ev.category}
                                                </span>
                                            </div>
                                            {ev.description && (
                                                <p className={`text-xs line-clamp-1 font-medium ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>{ev.description}</p>
                                            )}
                                        </div>

                                        <div className={`text-right shrink-0 text-xs font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                                            {ev.start_time.substring(11, 16)} - {ev.end_time.substring(11, 16)}
                                            {ev.location && (
                                                <p className={`text-[11px] font-sans mt-0.5 font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{ev.location}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==============================================================================
// 5. LİSTE / AJANDA GÖRÜNÜMÜ (LIST VIEW)
// ==============================================================================
interface ListViewProps {
    currentDate: Date;
    events: WorkspaceEvent[];
    members?: WorkspaceMember[];
    theme?: 'light' | 'dark';
    onEventClick: (event: WorkspaceEvent) => void;
}

function ListView({ currentDate, events, members = [], theme = 'dark', onEventClick }: ListViewProps) {
    const isLight = theme === 'light';
    const sorted = [...events].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return (
        <div className={`flex-1 flex flex-col h-full rounded-2xl overflow-hidden p-5 transition-colors ${
            isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-zinc-900/30 border border-zinc-800 shadow-inner'
        }`}>
            <h2 className={`text-sm font-bold uppercase tracking-wider mb-4 border-b pb-2 flex items-center justify-between ${
                isLight ? 'text-slate-800 border-slate-200' : 'text-zinc-200 border-zinc-800'
            }`}>
                <span>Tüm Topluluk Etkinlikleri & Ajanda</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-zinc-800 text-rose-400'
                }`}>
                    {sorted.length} Etkinlik
                </span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-2">
                {sorted.length > 0 ? (
                    sorted.map(ev => {
                        const s = new Date(ev.start_time);
                        const creator = members.find(m => m.id === ev.created_by);
                        const creatorName = creator?.display_name || creator?.full_name || ev.created_by || 'Topluluk Üyesi';
                        const historyCount = ev.edit_history?.length || 0;

                        return (
                            <div
                                key={ev.id}
                                onClick={() => onEventClick(ev)}
                                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:scale-[1.005] ${
                                    isLight
                                        ? 'bg-slate-50/90 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm'
                                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 shadow-md'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono text-xs font-extrabold text-white shrink-0 shadow-md ring-1 ring-white/20"
                                        style={{ backgroundColor: ev.color }}
                                    >
                                        <span className="text-sm">{s.getDate()}</span>
                                        <span className="text-[10px] uppercase tracking-wider">{MONTHS_TR[s.getMonth()].substring(0, 3)}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                {ev.title}
                                            </h3>
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                                                isLight
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-zinc-800 text-rose-300 border-zinc-700'
                                            }`}>
                                                {ev.category}
                                            </span>
                                            {/* Ekleyen Üye Rozeti */}
                                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
                                                isLight
                                                    ? 'bg-white text-slate-700 border-slate-200'
                                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                                            }`}>
                                                <span>👤</span>
                                                <span>Ekleyen: <strong>{creatorName}</strong></span>
                                            </span>
                                            {/* Düzenleme Geçmişi Rozeti */}
                                            {historyCount > 0 && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${
                                                    isLight
                                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                        : 'bg-amber-950/40 text-amber-300 border-amber-850/40'
                                                }`}>
                                                    <span>✎</span>
                                                    <span>{historyCount} düzenleme</span>
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs line-clamp-1 font-medium ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                                            {ev.description || 'Açıklama belirtilmedi'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs sm:text-right shrink-0">
                                    <div>
                                        <p className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                                            {ev.is_all_day ? 'Tüm Gün' : `${s.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
                                        </p>
                                        {ev.location && (
                                            <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                {ev.location}
                                            </p>
                                        )}
                                    </div>
                                    <span className={`font-bold text-base ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>→</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className={`text-center text-sm py-12 italic font-medium ${isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
                        Filtrelere uygun etkinlik bulunamadı.
                    </p>
                )}
            </div>
        </div>
    );
}

// ── 7. KANBAN / NOTION PANO GÖRÜNÜMÜ (SPRINT BOARD) ──
interface KanbanViewProps {
    events: WorkspaceEvent[];
    calendars?: WorkspaceCalendar[];
    theme?: 'light' | 'dark';
    onEventClick: (event: WorkspaceEvent) => void;
    onUpdateStatus: (eventId: string, status: 'scheduled' | 'in_progress' | 'completed') => void;
}

function KanbanView({
    events,
    calendars = [],
    theme = 'dark',
    onEventClick,
    onUpdateStatus,
}: KanbanViewProps) {
    const isLight = theme === 'light';

    const columns: Array<{
        id: 'scheduled' | 'in_progress' | 'completed';
        title: string;
        icon: string;
        badgeColor: string;
        headerBorder: string;
    }> = [
        {
            id: 'scheduled',
            title: 'Planlanan',
            icon: '🗓️',
            badgeColor: isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-950/60 text-blue-300 border-blue-800',
            headerBorder: 'border-blue-500/50',
        },
        {
            id: 'in_progress',
            title: 'Devam Eden (Sprint)',
            icon: '⚡',
            badgeColor: isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-950/60 text-amber-300 border-amber-800',
            headerBorder: 'border-amber-500/50',
        },
        {
            id: 'completed',
            title: 'Tamamlanan',
            icon: '✓',
            badgeColor: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
            headerBorder: 'border-emerald-500/50',
        },
    ];

    const handleDragStart = (e: React.DragEvent, eventId: string) => {
        e.dataTransfer.setData('text/plain', eventId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetStatus: 'scheduled' | 'in_progress' | 'completed') => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('text/plain');
        if (eventId) {
            onUpdateStatus(eventId, targetStatus);
        }
    };

    return (
        <div className={`flex-1 flex flex-col h-full rounded-2xl overflow-hidden p-4 sm:p-5 transition-colors ${
            isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-zinc-900/30 border border-zinc-800 shadow-inner'
        }`}>
            {/* Header */}
            <div className={`mb-4 pb-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                isLight ? 'border-slate-200' : 'border-zinc-800'
            }`}>
                <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <h2 className={`text-sm font-bold uppercase tracking-wider ${
                        isLight ? 'text-slate-800' : 'text-zinc-200'
                    }`}>
                        Sprint & Görev Panosu (Kanban)
                    </h2>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-lg border font-mono ${
                    isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                }`}>
                    Kartları sürükleyip bırakarak veya hızlı butonlarla durumu güncelleyin
                </div>
            </div>

            {/* Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
                {columns.map(col => {
                    const colEvents = events.filter(e => (e.status || 'scheduled') === col.id);

                    return (
                        <div
                            key={col.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className={`flex flex-col rounded-2xl border p-3 min-h-[380px] transition-colors ${
                                isLight
                                    ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                                    : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                            }`}
                        >
                            {/* Column Header */}
                            <div className={`flex items-center justify-between pb-2.5 mb-3 border-b-2 ${col.headerBorder}`}>
                                <div className="flex items-center gap-2">
                                    <span>{col.icon}</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-slate-800' : 'text-zinc-200'
                                    }`}>
                                        {col.title}
                                    </span>
                                </div>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${col.badgeColor}`}>
                                    {colEvents.length}
                                </span>
                            </div>

                            {/* Cards list */}
                            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                {colEvents.length === 0 ? (
                                    <div className={`p-6 text-center text-xs italic rounded-xl border border-dashed ${
                                        isLight ? 'border-slate-300 text-slate-400' : 'border-zinc-800 text-zinc-600'
                                    }`}>
                                        Bu sütunda etkinlik yok
                                    </div>
                                ) : (
                                    colEvents.map(ev => {
                                        const s = new Date(ev.start_time);
                                        const subtasks = ev.subtasks || [];
                                        const completedSubtasks = subtasks.filter(st => st.is_completed).length;
                                        const subtaskPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
                                        const cal = calendars.find(c => c.id === ev.calendar_id);

                                        return (
                                            <div
                                                key={ev.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, ev.id)}
                                                className={`p-3.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] hover:shadow-md ${
                                                    isLight
                                                        ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                                                        : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 shadow-md'
                                                }`}
                                            >
                                                {/* Header tags */}
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                                            style={{ backgroundColor: ev.color || cal?.color || '#dc2626' }}
                                                        />
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                            isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                                        }`}>
                                                            {ev.category}
                                                        </span>
                                                        {ev.is_showcase && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white shadow-xs">
                                                                🌟 Vitrin
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                                                        {s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>

                                                {/* Card Title */}
                                                <h4
                                                    onClick={() => onEventClick(ev)}
                                                    className={`text-xs font-bold leading-snug cursor-pointer transition-colors ${
                                                        isLight ? 'text-slate-900 hover:text-rose-600' : 'text-zinc-100 hover:text-rose-400'
                                                    }`}
                                                >
                                                    {ev.title}
                                                </h4>

                                                {/* Subtasks Progress */}
                                                {subtasks.length > 0 && (
                                                    <div className="mt-2.5 space-y-1">
                                                        <div className="flex items-center justify-between text-[10px] font-semibold">
                                                            <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>
                                                                Alt Görevler ({completedSubtasks}/{subtasks.length})
                                                            </span>
                                                            <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>
                                                                %{subtaskPercent}
                                                            </span>
                                                        </div>
                                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                                            isLight ? 'bg-slate-200' : 'bg-zinc-800'
                                                        }`}>
                                                            <div
                                                                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                                                                style={{ width: `${subtaskPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Location / Meeting */}
                                                {(ev.location || ev.meeting_link) && (
                                                    <div className={`mt-2 flex items-center gap-1.5 text-[10px] truncate ${
                                                        isLight ? 'text-slate-500' : 'text-zinc-400'
                                                    }`}>
                                                        <span>{ev.meeting_link ? '📹' : '📍'}</span>
                                                        <span className="truncate">{ev.location || 'Online Toplantı'}</span>
                                                    </div>
                                                )}

                                                {/* Action controls */}
                                                <div className={`mt-3 pt-2 border-t flex items-center justify-between gap-1 text-[10px] ${
                                                    isLight ? 'border-slate-100' : 'border-zinc-800'
                                                }`}>
                                                    {col.id !== 'scheduled' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdateStatus(ev.id, col.id === 'completed' ? 'in_progress' : 'scheduled')}
                                                            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                                                                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                                            }`}
                                                        >
                                                            ◀ {col.id === 'completed' ? 'Devam Eden' : 'Planlanan'}
                                                        </button>
                                                    ) : <div />}

                                                    {col.id !== 'completed' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdateStatus(ev.id, col.id === 'scheduled' ? 'in_progress' : 'completed')}
                                                            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                                                                col.id === 'scheduled'
                                                                    ? isLight ? 'bg-amber-100 hover:bg-amber-200 text-amber-800' : 'bg-amber-950/60 hover:bg-amber-900 text-amber-300'
                                                                    : isLight ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300'
                                                            }`}
                                                        >
                                                            {col.id === 'scheduled' ? 'Başlat ⚡' : 'Tamamla ✓'}
                                                        </button>
                                                    ) : <div />}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

