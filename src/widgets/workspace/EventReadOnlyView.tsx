'use client';

import React, { useState } from 'react';
import {
    WorkspaceEvent,
    WorkspaceMember,
    WorkspaceSubtask,
    WorkspaceComment,
    WorkspaceAttachment
} from '@/shared/api/workspaceTypes';

interface EventReadOnlyViewProps {
    event: WorkspaceEvent;
    currentMember: WorkspaceMember | null;
    members: WorkspaceMember[];
    isLight: boolean;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    isAllDay: boolean;
    calculatedDurationStr: string | null;
    location: string;
    meetingLink: string;
    description: string;
    subtasks: WorkspaceSubtask[];
    attachments: WorkspaceAttachment[];
    comments: WorkspaceComment[];
    myAttendanceStatus: 'attending' | 'declined' | 'maybe' | null;
    myAttendanceReason: string;
    isSubmittingMyRsvp: boolean;
    myRsvpFeedback: string | null;
    onMyRsvp: (status: 'attending' | 'declined' | 'maybe', reason?: string) => void;
    canComment: boolean;
    newCommentText: string;
    onNewCommentTextChange: (text: string) => void;
    onAddComment: () => void;
}

const REASON_PRESETS = [
    '📚 Ders / Sınav Çakışması',
    '🚗 Şehir Dışındayım',
    '💼 İş / Staj Yoğunluğu',
    '🏥 Sağlık Durumu',
    '⏳ Başka Bir Toplantı'
];

export default function EventReadOnlyView({
    event,
    currentMember,
    members,
    isLight,
    startDate,
    startTime,
    endDate,
    endTime,
    isAllDay,
    calculatedDurationStr,
    location,
    meetingLink,
    description,
    subtasks,
    attachments,
    comments,
    myAttendanceStatus,
    myAttendanceReason,
    isSubmittingMyRsvp,
    myRsvpFeedback,
    onMyRsvp,
    canComment,
    newCommentText,
    onNewCommentTextChange,
    onAddComment
}: EventReadOnlyViewProps) {
    const [customReason, setCustomReason] = useState(myAttendanceReason || '');

    const creator = members.find(m => m.id === event.created_by);
    const completedSubtasksCount = subtasks.filter(s => s.is_completed).length;
    const progressPercent = subtasks.length > 0
        ? Math.round((completedSubtasksCount / subtasks.length) * 100)
        : 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* ── 1. HERO BAŞLIK & ETKİNLİK SAHİBİ ── */}
            <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            } space-y-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                        event.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : event.status === 'in_progress'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                : event.status === 'cancelled'
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400 line-through'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    }`}>
                        {event.status === 'scheduled' ? '🗓️ Planlandı' : event.status === 'in_progress' ? '⚡ Devam Ediyor' : event.status === 'completed' ? '✓ Tamamlandı' : '✕ İptal Edildi'}
                    </span>

                    {creator && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className={isLight ? 'text-slate-500' : 'text-zinc-400'}>Düzenleyen:</span>
                            {creator.avatar_url && (
                                <img src={creator.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                            )}
                            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                                {creator.display_name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-800 text-zinc-400'}`}>
                                {creator.role}
                            </span>
                        </div>
                    )}
                </div>

                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                }`}>
                    {event.title}
                </h1>
            </div>

            {/* ── 2. ZAMANLAMA, SÜRE & KONUM ── */}
            <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/40 border-zinc-800'
            } space-y-4`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <span className="text-xl p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">📅</span>
                        <div>
                            <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                Tarih & Zaman
                            </span>
                            <span className={`text-xs sm:text-sm font-bold block ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                                {startDate} {isAllDay ? '(Tüm Gün)' : `• ${startTime} - ${endTime}`}
                            </span>
                            {calculatedDurationStr && !isAllDay && (
                                <span className="text-[11px] text-rose-500 font-mono font-semibold mt-0.5 block">
                                    ⏱️ Süre: {calculatedDurationStr}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <span className="text-xl p-2 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">📍</span>
                        <div>
                            <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                Konum & Katılım
                            </span>
                            <span className={`text-xs sm:text-sm font-bold block ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                                {location || (meetingLink ? 'Online Toplantı' : 'Konum belirtilmedi')}
                            </span>
                            {meetingLink && (
                                <a
                                    href={meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-950/40 transition-all cursor-pointer"
                                >
                                    <span>💻</span>
                                    <span>Toplantı Bağlantısına Katıl</span>
                                    <span className="text-[10px]">↗</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 3. BİREYSEL LCV KATILIM PANELİ ── */}
            {currentMember && (
                <div className={`p-5 rounded-2xl border ${
                    isLight 
                        ? 'bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 border-rose-200 shadow-sm' 
                        : 'bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-rose-950/20 border-zinc-800'
                } space-y-3.5`}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎯</span>
                            <h3 className={`text-xs sm:text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                Katılım Durumunuz (LCV)
                            </h3>
                        </div>
                        {myAttendanceStatus && (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border font-mono ${
                                myAttendanceStatus === 'attending'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                    : myAttendanceStatus === 'declined'
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            }`}>
                                {myAttendanceStatus === 'attending' ? 'Katılıyorsunuz ✓' : myAttendanceStatus === 'declined' ? 'Katılmıyorsunuz ✕' : 'Kararsızsınız ?'}
                            </span>
                        )}
                    </div>

                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        Bu etkinliğe katılım durumunuzu bildirerek toplantı salonu ve kontenjan planlamasına katkıda bulunabilirsiniz.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button
                            type="button"
                            disabled={isSubmittingMyRsvp}
                            onClick={() => onMyRsvp('attending')}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border disabled:opacity-50 cursor-pointer ${
                                myAttendanceStatus === 'attending'
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                                    : isLight
                                        ? 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-300'
                                        : 'bg-zinc-900 hover:bg-emerald-950/40 text-zinc-300 hover:text-emerald-300 border-zinc-700'
                            }`}
                        >
                            <span>✓</span>
                            <span>Evet, Katılacağım</span>
                        </button>

                        <button
                            type="button"
                            disabled={isSubmittingMyRsvp}
                            onClick={() => onMyRsvp('declined', customReason)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border disabled:opacity-50 cursor-pointer ${
                                myAttendanceStatus === 'declined'
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                                    : isLight
                                        ? 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300'
                                        : 'bg-zinc-900 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 border-zinc-700'
                            }`}
                        >
                            <span>✕</span>
                            <span>Katılamayacağım</span>
                        </button>

                        <button
                            type="button"
                            disabled={isSubmittingMyRsvp}
                            onClick={() => onMyRsvp('maybe', customReason)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border disabled:opacity-50 cursor-pointer ${
                                myAttendanceStatus === 'maybe'
                                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/40'
                                    : isLight
                                        ? 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-300'
                                        : 'bg-zinc-900 hover:bg-amber-950/40 text-zinc-300 hover:text-amber-300 border-zinc-700'
                            }`}
                        >
                            <span>?</span>
                            <span>Kararsızım</span>
                        </button>
                    </div>

                    {(myAttendanceStatus === 'declined' || myAttendanceStatus === 'maybe') && (
                        <div className="pt-2 space-y-2 animate-in fade-in">
                            <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                Hızlı Gerekçe Seçimi veya Yazın:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {REASON_PRESETS.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => {
                                            setCustomReason(preset);
                                            onMyRsvp(myAttendanceStatus, preset);
                                        }}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                                            customReason === preset
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
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Gerekçenizi detaylandırın..."
                                    className={`flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-rose-500 ${
                                        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                                    }`}
                                />
                                <button
                                    type="button"
                                    disabled={isSubmittingMyRsvp}
                                    onClick={() => onMyRsvp(myAttendanceStatus, customReason)}
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    )}

                    {myRsvpFeedback && (
                        <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-xs font-semibold text-zinc-200 animate-in fade-in">
                            {myRsvpFeedback}
                        </div>
                    )}
                </div>
            )}

            {/* ── 4. AÇIKLAMA & GÜNDEM ── */}
            {description && (
                <div className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/40 border-zinc-800'
                } space-y-2`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        📖 Etkinlik Detayları & Gündem
                    </h3>
                    <div className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isLight ? 'text-slate-700' : 'text-zinc-300'
                    }`}>
                        {description}
                    </div>
                </div>
            )}

            {/* ── 5. GÖREVLER & KONTROL LİSTESİ ── */}
            {subtasks.length > 0 && (
                <div className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/40 border-zinc-800'
                } space-y-3`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                            ✅ Kontrol Listesi ({completedSubtasksCount}/{subtasks.length})
                        </h3>
                        <span className="text-xs font-mono font-bold text-rose-500">%{progressPercent}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-1.5 transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="space-y-1.5 pt-1">
                        {subtasks.map(st => (
                            <div key={st.id} className="flex items-center gap-2 text-xs">
                                <span className={st.is_completed ? 'text-emerald-500 font-bold' : 'text-zinc-500'}>
                                    {st.is_completed ? '✓' : '○'}
                                </span>
                                <span className={st.is_completed ? 'line-through opacity-60' : ''}>
                                    {st.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 6. EKLER VE DÖKÜMANLAR ── */}
            {attachments.length > 0 && (
                <div className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/40 border-zinc-800'
                } space-y-3`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        📎 Ekler ve Dökümanlar ({attachments.length})
                    </h3>
                    <div className="space-y-2">
                        {attachments.map(att => (
                            <a
                                key={att.id}
                                href={att.file_path || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                    isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800'
                                }`}
                            >
                                <span className="font-medium truncate">{att.file_name}</span>
                                <span className="text-[10px] text-sky-500 font-bold shrink-0 ml-2">İndir ↗</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* ── 7. YORUMLAR & SORULAR (Contributor+ Yorum Yapabilir) ── */}
            <div className={`p-5 rounded-2xl border ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/40 border-zinc-800'
            } space-y-3`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    💬 Yorumlar & Sorular ({comments.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {comments.length === 0 ? (
                        <p className={`text-xs italic ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                            Henüz bir soru veya yorum eklenmemiş.
                        </p>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className={`p-3 rounded-xl border text-xs space-y-1 ${
                                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-900/70 border-zinc-800 text-zinc-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold">{c.user_name}</span>
                                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                                        {new Date(c.created_at).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                                <p className="leading-relaxed">{c.content}</p>
                            </div>
                        ))
                    )}
                </div>

                {canComment && (
                    <div className="pt-2 flex gap-2">
                        <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => onNewCommentTextChange(e.target.value)}
                            placeholder="Bir soru sorun veya yorum yazın..."
                            className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 ${
                                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-zinc-900 border-zinc-700 text-zinc-100'
                            }`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onAddComment();
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={onAddComment}
                            disabled={!newCommentText.trim()}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                            Gönder
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
