'use client';
import React, { useState, useRef, useEffect } from 'react';
import LiquidChrome from '@/shared/ui/animations/LiquidChrome/LiquidChrome';
import SplitText from '@/shared/ui/animations/SplitText';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { createClient } from '@/shared/api/supabase';

// --- Icons ---
const Icons = {
    Calendar: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    Clock: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    MapPin: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    ),
    Close: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
    ArrowRight: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    )
};

// --- Color & Layout Helpers ---
const COLOR_PALETTE = [
    "from-purple-500 via-fuchsia-500 to-pink-500",
    "from-blue-500 to-cyan-400",
    "from-orange-500 to-amber-400",
    "from-green-500 to-emerald-400",
];

const SPAN_PATTERNS = [
    "md:col-span-2 md:row-span-2",
    "md:col-span-1 md:row-span-1",
    "md:col-span-1 md:row-span-1",
    "md:col-span-2 md:row-span-1",
];

const CATEGORY_NAMES = ["Hackathon", "Workshop", "Tech Talk", "Game Jam", "Seminer", "Etkinlik"];

interface EventItem {
    id: string;
    title: string;
    description: string;
    event_date: string;
    end_date?: string;
    category?: string;
    location?: string;
    image_url?: string;
    join_link?: string;
    is_active: boolean;
    is_showcase?: boolean;
    rsvp_enabled?: boolean;
    rsvp_qr_enabled?: boolean;
    rsvp_capacity?: number;
    attendee_count?: number;
    // computed
    date: string;
    time: string;
    color: string;
    span: string;
    image: string;
    status: string;
    statusColor: string;
}

// 🗓️ Google Calendar URL Üreteci
const getGoogleCalendarUrl = (ev: EventItem) => {
    try {
        const s = new Date(ev.event_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const e = new Date(ev.end_date || ev.event_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const url = new URL('https://calendar.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', ev.title);
        url.searchParams.set('dates', `${s}/${e}`);
        if (ev.description) url.searchParams.set('details', ev.description);
        if (ev.location || ev.join_link) url.searchParams.set('location', ev.location || ev.join_link || '');
        return url.toString();
    } catch {
        return 'https://calendar.google.com';
    }
};

// 📥 Apple & Outlook .ICS İndir
const handleDownloadICS = (ev: EventItem) => {
    try {
        const s = new Date(ev.event_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const e = new Date(ev.end_date || ev.event_date).toISOString().replace(/-|:|\.\d\d\d/g, '');
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//HSD MTU//Topluluk Vitrini//TR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `SUMMARY:${ev.title}`,
            `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
            `LOCATION:${ev.location || ev.join_link || 'MTÜ Kampüsü'}`,
            `DTSTART:${s}`,
            `DTEND:${e}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `${ev.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('ICS oluşturma hatası:', err);
    }
};

// --- Components ---

function SpotlightCard({ children, className = "", onClick, variants }: { children: React.ReactNode, className?: string, onClick?: () => void, variants?: any }) {
    return (
        <motion.div
            variants={variants}
            className={`group relative border border-white/20 bg-[#1c0404]/80 overflow-hidden rounded-3xl shadow-xl ${className}`}
            onClick={onClick}
            whileHover={{ scale: 0.995, borderColor: "rgba(255,255,255,0.4)" }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="relative h-full">{children}</div>
        </motion.div>
    );
}

// --- Constants ---
const CHROME_BASE_COLOR: [number, number, number] = [0.1, 0.05, 0.05];

export default function Events() {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

    // RSVP Registration States
    const [isRegistering, setIsRegistering] = useState(false);
    const [rsvpFullName, setRsvpFullName] = useState('');
    const [rsvpEmail, setRsvpEmail] = useState('');
    const [rsvpStudentNo, setRsvpStudentNo] = useState('');
    const [rsvpDept, setRsvpDept] = useState('');
    const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
    const [rsvpTicket, setRsvpTicket] = useState<any | null>(null);
    const [rsvpError, setRsvpError] = useState<string | null>(null);

    useEffect(() => {
        // 🚀 Tek Tıkla Vitrine Taşıma: /api/events/public hem workspace_events vitrinini hem events tablosunu çeker
        fetch('/api/events/public')
            .then(res => res.json())
            .then(data => {
                const list = data.events || [];
                if (list.length > 0) {
                    const now = new Date();
                    setEvents(list.map((item: any, i: number) => {
                        const eventDate = new Date(item.event_date);
                        const isPast = eventDate < now;
                        return {
                            ...item,
                            category: item.category || 'Etkinlik',
                            date: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(eventDate),
                            time: new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(eventDate),
                            color: COLOR_PALETTE[i % COLOR_PALETTE.length],
                            span: SPAN_PATTERNS[i % SPAN_PATTERNS.length],
                            image: item.image_url || `https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop`,
                            status: isPast ? "Geçmiş Etkinlik" : "Aktif",
                            statusColor: isPast ? "bg-red-500" : "bg-green-500",
                        };
                    }));
                }
            })
            .catch(err => {
                console.error('[Events] API fetch error:', err);
            });
    }, []);

    // Reset RSVP state on modal close or change
    useEffect(() => {
        setIsRegistering(false);
        setRsvpTicket(null);
        setRsvpError(null);
        setRsvpFullName('');
        setRsvpEmail('');
        setRsvpStudentNo('');
        setRsvpDept('');
    }, [selectedEvent]);

    const handleRsvpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent) return;
        setRsvpError(null);

        if (!rsvpFullName.trim() || !rsvpEmail.trim()) {
            setRsvpError('Lütfen ad soyad ve e-posta adresinizi girin.');
            return;
        }

        setIsSubmittingRsvp(true);
        try {
            const res = await fetch('/api/workspace/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: selectedEvent.id,
                    full_name: rsvpFullName.trim(),
                    email: rsvpEmail.trim(),
                    student_number: rsvpStudentNo.trim(),
                    department: rsvpDept.trim(),
                }),
            });
            const data = await res.json();
            if (res.ok && data.attendee) {
                setRsvpTicket(data.attendee);
                setIsRegistering(false);
            } else {
                setRsvpError(data.error || 'Kayıt işlemi gerçekleştirilemedi.');
            }
        } catch {
            setRsvpError('Bağlantı hatası oluştu.');
        } finally {
            setIsSubmittingRsvp(false);
        }
    };

    // Body scroll lock
    useEffect(() => {
        if (selectedEvent) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedEvent]);

    return (
        <section id="etkinlikler" className="relative min-h-screen flex flex-col items-center justify-center py-24 overflow-hidden bg-black">
            {/* Background */}
            <div className="absolute inset-0 w-full h-full z-0 opacity-40">
                <LiquidChrome
                    baseColor={CHROME_BASE_COLOR}
                    speed={0.07}
                    amplitude={0.5}
                    frequencyX={2}
                    frequencyY={2}
                    interactive={true}
                />
            </div>

            {/* Noise Texture Removed */}

            <div className="relative z-10 container mx-auto px-4 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-white to-rose-200 bg-clip-text text-transparent tracking-tighter mb-2"
                        >
                            Etkinlikler
                        </motion.h2>
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "100px" }}
                            viewport={{ once: true }}
                            className="h-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-full"
                        />
                    </div>
                    <div className="max-w-sm text-right md:text-right">
                        <SplitText
                            text="Geleceği şekillendiren etkinliklerimize katılın."
                            className="text-gray-400 text-lg"
                            delay={150}
                            duration={0.6}
                            ease="power3.out"
                            splitType="words"
                            from={{ opacity: 0, y: 20 }}
                            to={{ opacity: 1, y: 0 }}
                            threshold={0.1}
                            rootMargin="-50px"
                            textAlign="right"
                            tag="p"
                        />
                    </div>
                </div>

                {/* Bento Grid */}
                {events.length > 0 ? (
                    <motion.div
                        key={events.length}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.15
                                }
                            }
                        }}
                        className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[600px]"
                    >
                        {events.map((event, index) => (
                            <SpotlightCard
                                key={event.id}
                                className={`cursor-pointer backdrop-blur-md ${event.span}`}
                                onClick={() => setSelectedEvent(event)}
                                variants={{
                                    hidden: { opacity: 0, y: 30 },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                            type: "spring",
                                            damping: 25,
                                            stiffness: 100
                                        }
                                    }
                                }}
                            >
                                <div className="h-full flex flex-col p-6 justify-end relative">
                                    {/* Background Image for ALL cards */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-700 group-hover:scale-110"
                                        style={{ backgroundImage: `url(${event.image})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0202]/90 via-[#0f0202]/40 to-transparent" />

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                                        <span className={`w-2 h-2 rounded-full ${event.statusColor} ${event.status === 'Aktif' ? 'animate-pulse' : ''}`} />
                                        <span className="text-xs font-bold text-white tracking-wide">{event.status}</span>
                                    </div>

                                    {/* Content */}
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-4xl font-black text-white/40 font-mono select-none drop-shadow-md">
                                                0{index + 1}
                                            </div>
                                        </div>

                                        <div>
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 text-white border border-white/10 backdrop-blur-sm mb-3`}>
                                                {event.category}
                                            </span>
                                            <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-300 font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <Icons.Calendar />
                                                    {event.date}
                                                </div>
                                                {!event.span.includes('col-span-2') && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Icons.Clock />
                                                        {event.time}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover Indicator */}
                                    <div className="absolute bottom-6 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center">
                                            <Icons.ArrowRight />
                                        </div>
                                    </div>
                                </div>
                            </SpotlightCard>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <p className="text-gray-400 text-lg">Henüz etkinlik eklenmemiştir.</p>
                        <p className="text-gray-600 text-sm mt-2">Yeni etkinlikler yakında burada görünecek.</p>
                    </motion.div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvent(null)}
                            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-y-auto max-w-3xl w-full max-h-[90vh] shadow-2xl relative custom-scrollbar"
                            >
                                {/* Header Image/Gradient */}
                                <div className="h-64 w-full relative overflow-hidden">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${selectedEvent.image})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                                    {/* Modal Status Badge */}
                                    <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                                        <span className={`w-2.5 h-2.5 rounded-full ${selectedEvent.statusColor} ${selectedEvent.status === 'Aktif' ? 'animate-pulse' : ''}`} />
                                        <span className="text-sm font-bold text-white tracking-wide">{selectedEvent.status}</span>
                                    </div>

                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        className="absolute top-6 right-6 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all border border-white/10"
                                    >
                                        <Icons.Close />
                                    </button>
                                </div>

                                <div className="p-8 md:p-10 -mt-20 relative z-10">
                                    <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                                        {selectedEvent.title}
                                    </h3>

                                    <div className="flex flex-wrap gap-3 mb-6">
                                        <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs sm:text-sm flex items-center gap-2">
                                            <Icons.Calendar />
                                            {selectedEvent.date}
                                        </div>
                                        <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs sm:text-sm flex items-center gap-2">
                                            <Icons.Clock />
                                            {selectedEvent.time}
                                        </div>
                                        {selectedEvent.location && (
                                            <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs sm:text-sm flex items-center gap-2">
                                                <Icons.MapPin />
                                                {selectedEvent.location}
                                            </div>
                                        )}
                                    </div>

                                    {/* 📅 Takvime Ekle Butonları */}
                                    <div className="flex flex-wrap items-center gap-2 mb-6">
                                        <a
                                            href={getGoogleCalendarUrl(selectedEvent)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-2 transition-all"
                                        >
                                            <span>📅</span>
                                            <span>Google Takvim'e Ekle</span>
                                        </a>

                                        <button
                                            type="button"
                                            onClick={() => handleDownloadICS(selectedEvent)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
                                        >
                                            <span>📥</span>
                                            <span>Apple / Outlook (.ics İndir)</span>
                                        </button>
                                    </div>

                                    <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-8 border-l-2 border-rose-500/50 pl-6">
                                        {selectedEvent.description}
                                    </p>

                                    {/* 🎟️ Bilet & Kayıt Bölümü */}
                                    {rsvpTicket ? (
                                        <div className="p-6 rounded-2xl bg-gradient-to-b from-rose-950/40 via-black to-black border border-rose-500/30 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                                                <span>✓</span>
                                                <span>Kaydınız Başarıyla Alındı!</span>
                                            </div>

                                            <div className="border border-white/10 rounded-xl p-5 bg-black/60 max-w-sm mx-auto space-y-3">
                                                <div className="border-b border-white/10 pb-2">
                                                    <span className="text-[10px] tracking-widest uppercase font-mono text-gray-400">HSD MTÜ DİJİTAL ETKİNLİK BİLETİ</span>
                                                    <h4 className="text-base font-bold text-white mt-0.5">{selectedEvent.title}</h4>
                                                </div>

                                                <div className="text-xs text-left space-y-1 text-gray-300 font-medium">
                                                    <p>👤 <strong>Katılımcı:</strong> {rsvpTicket.full_name}</p>
                                                    <p>📅 <strong>Tarih:</strong> {selectedEvent.date} ({selectedEvent.time})</p>
                                                    <p>📍 <strong>Konum:</strong> {selectedEvent.location || 'MTÜ Kampüsü'}</p>
                                                </div>

                                                {selectedEvent.rsvp_qr_enabled && (
                                                    <div className="py-2">
                                                        <img
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(rsvpTicket.ticket_code)}`}
                                                            alt={`Bilet QR Kodu: ${rsvpTicket.ticket_code}`}
                                                            className="w-36 h-36 mx-auto rounded-xl bg-white p-2 border border-white/20 shadow-lg"
                                                        />
                                                    </div>
                                                )}

                                                <div className="pt-2 border-t border-white/10">
                                                    <span className="text-[11px] font-mono font-bold px-3 py-1 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40">
                                                        BİLET KODU: {rsvpTicket.ticket_code}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                                Lütfen bu ekranın ekran görüntüsünü alınız veya etkinlik girişinde görevliye bu bilet kodunu gösteriniz.
                                            </p>
                                        </div>
                                    ) : isRegistering ? (
                                        <form onSubmit={handleRsvpSubmit} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4 animate-in fade-in">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                                <h4 className="text-base font-bold text-white flex items-center gap-2">
                                                    <span>🎟️</span>
                                                    <span>Etkinlik Kayıt Formu</span>
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRegistering(false)}
                                                    className="text-xs text-gray-400 hover:text-white"
                                                >
                                                    ✕ Kapat
                                                </button>
                                            </div>

                                            {rsvpError && (
                                                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold">
                                                    {rsvpError}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Ad Soyad *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={rsvpFullName}
                                                        onChange={(e) => setRsvpFullName(e.target.value)}
                                                        placeholder="Örn: Mustafa Zahter"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-300 mb-1">E-posta Adresi *</label>
                                                    <input
                                                        type="email"
                                                        required
                                                        value={rsvpEmail}
                                                        onChange={(e) => setRsvpEmail(e.target.value)}
                                                        placeholder="Örn: ornek@ogr.ozal.edu.tr"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Öğrenci Numarası</label>
                                                    <input
                                                        type="text"
                                                        value={rsvpStudentNo}
                                                        onChange={(e) => setRsvpStudentNo(e.target.value)}
                                                        placeholder="Örn: 220101010"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Bölüm / Fakülte</label>
                                                    <input
                                                        type="text"
                                                        value={rsvpDept}
                                                        onChange={(e) => setRsvpDept(e.target.value)}
                                                        placeholder="Örn: Yazılım Mühendisliği"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-rose-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingRsvp}
                                                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg shadow-rose-950/50 disabled:opacity-50"
                                                >
                                                    {isSubmittingRsvp ? 'Kaydediliyor...' : 'Kaydı Tamamla & QR Bileti Al 🎟️'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRegistering(false)}
                                                    className="px-4 py-3 rounded-xl font-bold text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10"
                                                >
                                                    Vazgeç
                                                </button>
                                            </div>
                                        </form>
                                    ) : selectedEvent.status === 'Geçmiş Etkinlik' ? (
                                        <button disabled className="w-full py-4 rounded-xl font-bold text-lg text-white/50 bg-white/5 border border-white/10 cursor-not-allowed transition-all shadow-lg shadow-white/5">
                                            Geçmiş Etkinlik
                                        </button>
                                    ) : selectedEvent.rsvp_enabled ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsRegistering(true)}
                                            className="w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 transition-all shadow-lg shadow-rose-950/50 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <span>🎟️</span>
                                            <span>Etkinliğe Kayıt Ol & Bilet Al</span>
                                        </button>
                                    ) : selectedEvent.join_link ? (
                                        <a 
                                            href={selectedEvent.join_link} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className={`block text-center w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r ${selectedEvent.color} hover:opacity-90 transition-all shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98]`}
                                        >
                                            Etkinliğe Katıl
                                        </a>
                                    ) : (
                                        <button disabled className="w-full py-4 rounded-xl font-bold text-lg text-white/50 bg-white/5 border border-white/10 cursor-not-allowed transition-all shadow-lg shadow-white/5">
                                            Kayıtlar Yakında
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </section >
    );
}
