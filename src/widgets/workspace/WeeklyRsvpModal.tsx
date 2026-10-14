'use client';

import React, { useState, useMemo } from 'react';
import { WorkspaceEvent, WorkspaceMember, MemberAttendance } from '@/shared/api/workspaceTypes';

interface WeeklyRsvpModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: WorkspaceEvent[];
    currentUser: WorkspaceMember | null;
    theme?: 'light' | 'dark';
    onEventUpdated?: (updatedEvent: WorkspaceEvent) => void;
}

const REASON_PRESETS = [
    '📚 Ders / Sınav Çakışması',
    '🚗 Şehir Dışındayım',
    '💼 İş / Staj Yoğunluğu',
    '🏥 Sağlık Durumu',
    '⏳ Başka Bir Toplantı'
];

export default function WeeklyRsvpModal({
    isOpen,
    onClose,
    events,
    currentUser,
    theme = 'dark',
    onEventUpdated,
}: WeeklyRsvpModalProps) {
    const isLight = theme === 'light';

    // State for per-event pending answers & reasons
    // eventId -> { status, reason, isSubmitting, feedback }
    const [responses, setResponses] = useState<Record<string, {
        status?: 'attending' | 'declined' | 'maybe';
        reason?: string;
        isSubmitting?: boolean;
        feedback?: string;
    }>>({});

    // Filter events happening within the next 7 days from now
    const upcomingEvents = useMemo(() => {
        const now = Date.now();
        const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000;

        return events
            .filter(ev => {
                if (ev.status === 'cancelled') return false;
                try {
                    const startMs = new Date(ev.start_time).getTime();
                    return startMs >= now && startMs <= sevenDaysLater;
                } catch {
                    return false;
                }
            })
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [events]);

    if (!isOpen) return null;

    // Get current attendance record for this user from an event
    const getUserAttendance = (event: WorkspaceEvent): MemberAttendance | undefined => {
        if (!currentUser || !event.member_attendance) return undefined;
        return event.member_attendance.find(a => a.user_id === currentUser.id);
    };

    // Submit RSVP handler
    const handleSendRsvp = async (
        event: WorkspaceEvent,
        status: 'attending' | 'declined' | 'maybe',
        reasonText?: string
    ) => {
        if (!currentUser) return;

        setResponses(prev => ({
            ...prev,
            [event.id]: {
                ...prev[event.id],
                status,
                reason: reasonText !== undefined ? reasonText : prev[event.id]?.reason,
                isSubmitting: true,
                feedback: undefined
            }
        }));

        try {
            const finalReason = reasonText !== undefined ? reasonText : responses[event.id]?.reason;
            const res = await fetch(`/api/workspace/events/${event.id}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status,
                    reason: (status === 'declined' || status === 'maybe') ? finalReason : undefined
                })
            });

            const data = await res.json();
            if (res.ok && data.success && data.event) {
                setResponses(prev => ({
                    ...prev,
                    [event.id]: {
                        ...prev[event.id],
                        isSubmitting: false,
                        feedback: status === 'attending' 
                            ? '✅ Katılımınız kaydedildi! Adminlere iletildi.'
                            : status === 'declined'
                                ? '❌ Katılamayacağınız adminlere gerekçenizle iletildi.'
                                : '🟡 Kararsızlık durumunuz iletildi.'
                    }
                }));

                if (onEventUpdated) {
                    onEventUpdated(data.event);
                }
            } else {
                setResponses(prev => ({
                    ...prev,
                    [event.id]: {
                        ...prev[event.id],
                        isSubmitting: false,
                        feedback: `⚠️ Hata: ${data.error || 'Kaydedilemedi'}`
                    }
                }));
            }
        } catch (err: any) {
            setResponses(prev => ({
                ...prev,
                [event.id]: {
                    ...prev[event.id],
                    isSubmitting: false,
                    feedback: `⚠️ Bağlantı hatası: ${err.message}`
                }
            }));
        }
    };

    // Format start time
    const formatEventDateTime = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return iso;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            {/* Backdrop Blur */}
            <div
                className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 ${
                isLight 
                    ? 'bg-white border-slate-200 text-slate-900 shadow-rose-950/10' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-rose-950/40'
            }`}>
                {/* ── HEADER ── */}
                <div className={`relative px-6 py-5 border-b shrink-0 overflow-hidden ${
                    isLight 
                        ? 'bg-gradient-to-r from-rose-50 via-white to-amber-50/40 border-slate-200' 
                        : 'bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-rose-950/30 border-zinc-800'
                }`}>
                    {/* Background Glow */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-rose-500/30 shrink-0 border border-white/20 animate-pulse">
                                🎯
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                        Haftalık Etkinlik Katılım Bildirimi (LCV)
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-rose-500/10 border border-rose-500/30 text-rose-500">
                                        Önümüzdeki 7 Gün
                                    </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                                    Merhaba <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentUser?.display_name || 'Topluluk Üyesi'}</strong>, bu hafta planlanan etkinlikler için katılım durumunuzu bildirebilirsiniz.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-colors shrink-0 ${
                                isLight 
                                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' 
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                            title="Kapat"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── SCROLLABLE LIST OF EVENTS ── */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
                    {upcomingEvents.length === 0 ? (
                        <div className={`p-8 text-center rounded-2xl border space-y-2 ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/40 border-zinc-800'
                        }`}>
                            <div className="text-3xl">🎉</div>
                            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                                Önümüzdeki 7 Gün İçinde Planlanmış Etkinlik Yok
                            </h3>
                            <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                Bu hafta için katılım bildirimi beklenen aktif bir etkinlik bulunmuyor. Yeni bir etkinlik planlandığında buradan katılım sağlayabilirsiniz.
                            </p>
                        </div>
                    ) : (
                        upcomingEvents.map(event => {
                            const userAtt = getUserAttendance(event);
                            const currentResp = responses[event.id];
                            const activeStatus = currentResp?.status || userAtt?.status;
                            const isSubmitting = currentResp?.isSubmitting;
                            const feedback = currentResp?.feedback;
                            const activeReason = currentResp?.reason !== undefined ? currentResp.reason : (userAtt?.reason || '');

                            return (
                                <div
                                    key={event.id}
                                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                        isLight 
                                            ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' 
                                            : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700/80'
                                    }`}
                                >
                                    {/* Event Top Meta */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                                style={{ backgroundColor: event.color || '#dc2626' }}
                                            />
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border font-mono ${
                                                isLight 
                                                    ? 'bg-slate-100 border-slate-200 text-slate-700' 
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                            }`}>
                                                {event.category || 'Topluluk'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500">
                                            <span>📅</span>
                                            <span>{formatEventDateTime(event.start_time)}</span>
                                        </div>
                                    </div>

                                    {/* Event Title */}
                                    <h3 className={`text-sm sm:text-base font-bold tracking-tight mb-1 ${
                                        isLight ? 'text-slate-900' : 'text-white'
                                    }`}>
                                        {event.title}
                                    </h3>

                                    {/* Location / Meeting Link */}
                                    {(event.location || event.meeting_link) && (
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            {event.location && (
                                                <span className={`text-xs inline-flex items-center gap-1 ${
                                                    isLight ? 'text-slate-600' : 'text-zinc-400'
                                                }`}>
                                                    <span>📍</span>
                                                    <span>{event.location}</span>
                                                </span>
                                            )}
                                            {event.meeting_link && (
                                                <a
                                                    href={event.meeting_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-sky-500 hover:underline inline-flex items-center gap-1 font-mono"
                                                >
                                                    <span>💻</span>
                                                    <span>Online Toplantı</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Short Description */}
                                    {event.description && (
                                        <p className={`text-xs line-clamp-2 mb-4 leading-relaxed ${
                                            isLight ? 'text-slate-600' : 'text-zinc-400'
                                        }`}>
                                            {event.description.replace(/#{1,6}\s?/g, '').substring(0, 150)}...
                                        </p>
                                    )}

                                    {/* RSVP Buttons Panel */}
                                    <div className={`p-3.5 rounded-xl border space-y-3 ${
                                        isLight 
                                            ? 'bg-slate-50/70 border-slate-200' 
                                            : 'bg-zinc-950/80 border-zinc-800/80'
                                    }`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                                                Bu etkinliğe katılacak mısınız?
                                            </span>

                                            {activeStatus && (
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border font-mono ${
                                                    activeStatus === 'attending'
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                        : activeStatus === 'declined'
                                                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                                            : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                                }`}>
                                                    {activeStatus === 'attending' ? 'Katılıyorsunuz ✓' : activeStatus === 'declined' ? 'Katılmıyorsunuz ✕' : 'Kararsızsınız ?'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Button Group */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {/* 🟢 Evet */}
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => handleSendRsvp(event, 'attending')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border disabled:opacity-50 ${
                                                    activeStatus === 'attending'
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                                                        : isLight
                                                            ? 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-300 hover:border-emerald-400'
                                                            : 'bg-zinc-900 hover:bg-emerald-950/40 text-zinc-300 hover:text-emerald-300 border-zinc-700 hover:border-emerald-600'
                                                }`}
                                            >
                                                <span>✓</span>
                                                <span>Evet, Katılacağım</span>
                                            </button>

                                            {/* 🔴 Hayır */}
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => {
                                                    setResponses(prev => ({
                                                        ...prev,
                                                        [event.id]: {
                                                            ...prev[event.id],
                                                            status: 'declined',
                                                            reason: prev[event.id]?.reason || userAtt?.reason || ''
                                                        }
                                                    }));
                                                }}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border disabled:opacity-50 ${
                                                    activeStatus === 'declined'
                                                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                                                        : isLight
                                                            ? 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300 hover:border-rose-400'
                                                            : 'bg-zinc-900 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border-zinc-700 hover:border-rose-600'
                                                }`}
                                            >
                                                <span>✕</span>
                                                <span>Hayır, Katılamam</span>
                                            </button>

                                            {/* 🟡 Belki */}
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => {
                                                    setResponses(prev => ({
                                                        ...prev,
                                                        [event.id]: {
                                                            ...prev[event.id],
                                                            status: 'maybe',
                                                            reason: prev[event.id]?.reason || userAtt?.reason || ''
                                                        }
                                                    }));
                                                }}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border disabled:opacity-50 ${
                                                    activeStatus === 'maybe'
                                                        ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/40'
                                                        : isLight
                                                            ? 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-300 hover:border-amber-400'
                                                            : 'bg-zinc-900 hover:bg-amber-950/40 text-zinc-300 hover:text-amber-300 border-zinc-700 hover:border-amber-600'
                                                }`}
                                            >
                                                <span>?</span>
                                                <span>Belki / Kararsızım</span>
                                            </button>
                                        </div>

                                        {/* Reason Input (Visible when 'declined' or 'maybe' selected) */}
                                        {(activeStatus === 'declined' || activeStatus === 'maybe') && (
                                            <div className="pt-2 border-t border-zinc-800/60 space-y-2 animate-in fade-in duration-150">
                                                <label className={`block text-[11px] font-bold ${
                                                    activeStatus === 'declined' ? 'text-rose-400' : 'text-amber-400'
                                                }`}>
                                                    {activeStatus === 'declined' ? 'Katılamama Gerekçeniz:' : 'Belirsizlik Nedeni:'} (Adminlere bildirilir)
                                                </label>

                                                {/* Preset Tags */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {REASON_PRESETS.map((preset, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                handleSendRsvp(event, activeStatus, preset);
                                                            }}
                                                            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                                                                activeReason === preset
                                                                    ? 'bg-rose-500 text-white border-rose-400'
                                                                    : isLight
                                                                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                                                            }`}
                                                        >
                                                            {preset}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={activeReason}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setResponses(prev => ({
                                                                ...prev,
                                                                [event.id]: {
                                                                    ...prev[event.id],
                                                                    status: activeStatus,
                                                                    reason: val
                                                                }
                                                            }));
                                                        }}
                                                        placeholder="Örn: Vize sınavım var, şehir dışındayım..."
                                                        className={`flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-rose-500 ${
                                                            isLight
                                                                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                                                                : 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => handleSendRsvp(event, activeStatus, activeReason)}
                                                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
                                                    >
                                                        {isSubmitting ? 'İletiliyor...' : 'Onayla & Gönder'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Feedback Notification */}
                                        {feedback && (
                                            <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs font-semibold text-zinc-200 animate-in fade-in">
                                                {feedback}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── FOOTER ── */}
                <div className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
                }`}>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-500 font-bold">📢 Bilgi:</span>
                        <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>
                            Seçimleriniz anında topluluk yöneticilerine ve organizasyon ekibine aktarılır.
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-950/40 transition-all cursor-pointer ml-auto"
                    >
                        Tamamlandı & Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
