'use client';
import React, { useState, useRef, useEffect } from 'react';
import LiquidChrome from './LiquidChrome/LiquidChrome';
import SplitText from './SplitText';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';

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

// --- Data ---
const events = [
    {
        id: 1,
        title: "Smart Cities Hackathon",
        date: "20-22 Kasım",
        time: "48 Saat",
        location: "Teknopark",
        description: "Şehrin geleceğini kodla. 48 saatlik kesintisiz inovasyon maratonu.",
        category: "Hackathon",
        color: "from-purple-500 via-fuchsia-500 to-pink-500",
        span: "md:col-span-2 md:row-span-2", // Large card
        image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop",
        status: "Aktif",
        statusColor: "bg-green-500"
    },
    {
        id: 2,
        title: "AI Workshop",
        date: "15 Ekim",
        time: "14:00",
        location: "B-204",
        description: "Yapay zeka modelleri geliştirme atölyesi.",
        category: "Workshop",
        color: "from-blue-500 to-cyan-400",
        span: "md:col-span-1 md:row-span-1",
        image: "https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=2032&auto=format&fit=crop",
        status: "Geçmiş Etkinlik",
        statusColor: "bg-red-500"
    },
    {
        id: 3,
        title: "Cloud Talks",
        date: "5 Aralık",
        time: "13:00",
        location: "Online",
        description: "Bulut bilişimin geleceği.",
        category: "Tech Talk",
        color: "from-orange-500 to-amber-400",
        span: "md:col-span-1 md:row-span-1",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
        status: "Geçmiş Etkinlik",
        statusColor: "bg-red-500"
    },
    {
        id: 4,
        title: "Game Jam",
        date: "15 Aralık",
        time: "24 Saat",
        location: "Öğrenci Merkezi",
        description: "24 saatte oyun geliştir.",
        category: "Game Jam",
        color: "from-green-500 to-emerald-400",
        span: "md:col-span-2 md:row-span-1", // Wide card
        image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop",
        status: "Geçmiş Etkinlik",
        statusColor: "bg-red-500"
    }
];

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
    const [selectedEvent, setSelectedEvent] = useState<typeof events[0] | null>(null);

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
                <motion.div
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
                                    className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-700 group-hover:scale-110"
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
                                        <div className="text-4xl font-black text-white/10 font-mono select-none">
                                            0{event.id}
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
                            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden max-w-3xl w-full shadow-2xl relative"
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

                                    <div className="flex flex-wrap gap-4 mb-8">
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 flex items-center gap-2">
                                            <Icons.Calendar />
                                            {selectedEvent.date}
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 flex items-center gap-2">
                                            <Icons.Clock />
                                            {selectedEvent.time}
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 flex items-center gap-2">
                                            <Icons.MapPin />
                                            {selectedEvent.location}
                                        </div>
                                    </div>

                                    <p className="text-gray-400 text-lg leading-relaxed mb-10 border-l-2 border-white/10 pl-6">
                                        {selectedEvent.description}
                                    </p>

                                    <button className={`w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r ${selectedEvent.color} hover:opacity-90 transition-all shadow-lg shadow-white/5 hover:scale-[1.02] active:scale-[0.98]`}>
                                        Etkinliğe Katıl
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </section >
    );
}
