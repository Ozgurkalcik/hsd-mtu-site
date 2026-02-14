"use client";

import ScrollReveal from "@/components/ScrollReveal/ScrollReveal";
import Image from "next/image";
import { motion, useAnimationFrame, useMotionValue, useTransform, wrap, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import SplashCursor from "@/components/SplashCursor/SplashCursor";
import { createClient } from "@/shared/api/supabase";

const COLOR_PALETTE = [
    "from-rose-500 to-red-600",
    "from-blue-500 to-cyan-600",
    "from-purple-500 to-indigo-600",
    "from-green-500 to-emerald-600",
    "from-orange-500 to-amber-600",
];

interface Announcement {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    image_url?: string;
    is_pinned: boolean;
    created_at: string;
    color: string;
    date: string;
}

export default function Announcements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('announcements')
            .select('id, title, content, excerpt, image_url, is_pinned, created_at')
            .eq('is_active', true)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => {
                if (data && data.length > 0) {
                    setAnnouncements(data.map((item, i) => ({
                        ...item,
                        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
                        date: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(item.created_at)),
                    })));
                }
            });
    }, []);

    // We use a motion value for x position
    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate total width of one set of items
    // Card width (350px mobile / 450px desktop) + Gap (32px)
    // We'll approximate or measure. For smoother logic, let's assume a fixed width per item for calculation
    // or just use percentage wrapping if we are careful.
    // Better approach: Move by pixels.
    // 5 items * (450px + 32px) = ~2410px.
    // Let's use a ref to measure, but for simplicity and robustness in SSR, we can use a large enough wrap.

    // useAnimationFrame moved to CarouselContent to handle wrapping logic correctly
    // and avoid conflicting updates to 'x'.

    // Wrap logic:
    // We have 3 sets of items.
    // We want to wrap when we've scrolled past the first set.
    // The first set width is roughly: 5 items * (450px + 32px gap) = 2410px (on desktop).
    // On mobile: 5 * (350px + 32px) = 1910px.
    // To be safe and responsive, we can wrap based on percentage of the TOTAL width of the container.
    // The container holds 3 sets. So we wrap every 33.33%.

    const xInput = [-100, 0];
    // This is tricky without exact width. 
    // Let's try a different approach: Render a VERY long list and just reset.
    // Or use the `wrap` utility from framer-motion if we mapped it to an index.

    // Simplest Robust "Infinite" Drag:
    // Render the list twice.
    // Animate x from 0 to -50%.
    // When it hits -50%, reset to 0.
    // Dragging adds to x.

    // Let's use the percentage approach on the motion style.
    // We need to know the width of the content to wrap correctly.
    // However, we can just check the x value in the animation frame.

    // Let's assume a safe wrap point.
    // If we render 3 sets, we can wrap when we pass 1 set.
    // 1 set is 1/3 of the total width.
    // So we wrap between 0% and -33.33%.

    // We need to apply this wrap to the x value *before* rendering.
    // But x is a motion value.
    // We can use useTransform for the display value.

    // Actually, simpler:
    // Just update x.
    // If x < -33.33%, add 33.33%.
    // If x > 0, subtract 33.33%.
    // This works for pixels too if we knew the pixel width.
    // Let's try to use a percentage-based translation on the div.

    return (
        <section id="duyurular" className="relative py-24 bg-black overflow-hidden z-10">
            {/* SplashCursor Effect - Scoped to Announcements Section - Desktop Only */}
            <div className="hidden md:block absolute top-0 left-0 w-full h-full pointer-events-none z-5">
                <SplashCursor />
            </div>

            <div className="container mx-auto px-4 mb-16 relative z-20">
                <div className="max-w-4xl mx-auto text-center">
                    <ScrollReveal
                        baseOpacity={0}
                        enableBlur={true}
                        baseRotation={5}
                        blurStrength={10}
                        textClassName="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
                    >
                        Duyurular ve Haberler
                    </ScrollReveal>

                    <ScrollReveal
                        baseOpacity={0}
                        enableBlur={true}
                        baseRotation={3}
                        blurStrength={5}
                        textClassName="text-xl text-gray-400 max-w-2xl mx-auto font-normal"
                    >
                        Topluluğumuzdan en güncel haberler, yaklaşan etkinlikler ve önemli duyurular.
                    </ScrollReveal>
                </div>
            </div>

            {/* Draggable Carousel */}
            <div
                className="relative w-full overflow-hidden py-20 z-20 cursor-grab active:cursor-grabbing"
            >
                {/* Gradient Masks */}
                <div className="absolute left-0 top-20 bottom-20 w-8 md:w-16 bg-gradient-to-r from-black to-transparent z-30 pointer-events-none" />
                <div className="absolute right-0 top-20 bottom-20 w-8 md:w-16 bg-gradient-to-l from-black to-transparent z-30 pointer-events-none" />

                <motion.div
                    className="flex gap-8 w-max"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{ x }}
                    drag="x"
                    dragConstraints={{ left: -10000, right: 10000 }} // Allow free dragging
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={() => setIsDragging(false)}
                    onUpdate={(latest) => {
                        // Logic to wrap the coordinates
                        // We need the width of one set of items.
                        // Let's approximate for now or use a ref in a real implementation.
                        // 5 items * (450 + 32) = 2410px.
                        const singleSetWidth = 2410;
                        // Note: This hardcoded width is a risk if screen size changes (mobile vs desktop).
                        // But for a quick "wow" factor it might work if we set min-width on cards.
                        // Better: Use a ref to get the actual width.
                    }}
                >
                    {/* 
              We need a wrapper component to handle the measuring and wrapping logic properly.
              Since I can't easily create a new file and import it without breaking flow,
              I will implement a "dumb" wrap here:
              I will render enough items (e.g. 10 sets) so user never reaches the end easily,
              and just auto-scroll.
              
              BUT the user asked for "infinite".
              
              Let's use the "percentage" trick.
              If we set the width of the container to be exactly 300% (for 3 sets),
              we can wrap at -33.33%.
           */}
                    <CarouselContent
                        x={x}
                        isHovered={isHovered}
                        isDragging={isDragging}
                        isModalOpen={!!selectedAnnouncement}
                        onSelect={setSelectedAnnouncement}
                        items={announcements}
                    />
                </motion.div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedAnnouncement && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedAnnouncement(null)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md cursor-pointer"
                        />

                        {/* Modal Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-4xl bg-gray-900/80 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl z-10"
                        >
                            {/* Ambient Glow */}
                            <div className={`absolute -inset-full bg-gradient-to-br ${selectedAnnouncement.color} opacity-20 blur-3xl pointer-events-none`} />

                            {/* Content Container */}
                            <div className="relative flex flex-col md:flex-row h-full">

                                {/* Left Side: Visuals (Mobile: Top) */}
                                <div className="relative h-48 md:h-auto md:w-2/5 overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${selectedAnnouncement.color} opacity-20`} />
                                    <div className="absolute inset-0 flex items-center justify-center p-8">
                                        <div className="relative w-full h-full opacity-100">
                                            <Image
                                                src="/assets/image/hsd-logo-white.png"
                                                alt="HSD Logo"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                    {/* Decorative Circles */}
                                    <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-br ${selectedAnnouncement.color} blur-2xl opacity-40`} />
                                    <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${selectedAnnouncement.color} blur-2xl opacity-40`} />
                                </div>

                                {/* Right Side: Content */}
                                <div className="relative flex-1 p-8 md:p-12 flex flex-col bg-black/40 backdrop-blur-sm">

                                    {/* Close Button */}
                                    <button
                                        onClick={() => setSelectedAnnouncement(null)}
                                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all z-20"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>

                                    {/* Header */}
                                    <div className="mb-8">
                                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6`}>
                                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${selectedAnnouncement.color} mr-3 animate-pulse`} />
                                            <span className="text-sm font-bold text-gray-300 tracking-wider uppercase">
                                                {selectedAnnouncement.date}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                                            {selectedAnnouncement.title}
                                        </h2>
                                        <div className={`h-1 w-20 bg-gradient-to-r ${selectedAnnouncement.color} rounded-full`} />
                                    </div>

                                    {/* Body */}
                                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                                        <p className="text-lg text-gray-300 leading-relaxed font-medium">
                                            {selectedAnnouncement.content}
                                        </p>
                                        <p className="mt-6 text-gray-400 leading-relaxed">
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-500">HSD Malatya Turgut Özal</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}

function CarouselContent({ x, isHovered, isDragging, isModalOpen, onSelect, items }: { x: any, isHovered: boolean, isDragging: boolean, isModalOpen: boolean, onSelect: (item: any) => void, items: Announcement[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [contentWidth, setContentWidth] = useState(0);

    useAnimationFrame((t, delta) => {
        if (!containerRef.current) return;

        // Measure width once or if 0
        if (contentWidth === 0) {
            // The width of ONE set. We render 3 sets.
            // So total scrollWidth / 3.
            setContentWidth(containerRef.current.scrollWidth / 3);
            return;
        }

        if (isHovered || isDragging || isModalOpen) return;

        const moveBy = 0.8 * (delta / 16); // Speed (Positive = Right)
        let newX = x.get() + moveBy;

        // Wrap logic
        if (newX <= -contentWidth) {
            newX += contentWidth;
        } else if (newX > 0) {
            newX -= contentWidth;
        }

        x.set(newX);
    });

    return (
        <div ref={containerRef} className="flex gap-8">
            {/* 3 Sets of Items */}
            {[...items, ...items, ...items].map((item, index) => (
                <div
                    key={`${item.id}-${index}`}
                    className="relative w-[350px] md:w-[450px] h-[320px] group perspective-1000 flex-shrink-0 cursor-pointer"
                    onPointerUp={() => {
                        if (!isDragging) onSelect(item);
                    }}
                >
                    {/* Ambient Glow (Behind Card) - Refined for elegance */}
                    <div className={`absolute -inset-4 bg-gradient-to-r ${item.color} rounded-[2rem] opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-700`} />

                    {/* Card Container */}
                    <div className="relative h-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-500 group-hover:-translate-y-2 group-hover:border-white/20">

                        {/* Neon Border Gradient (Animated) - Subtler */}
                        <div className={`absolute inset-0 p-[1px] rounded-[2rem] bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-30 group-hover:opacity-70 transition-opacity duration-500`} />

                        {/* Watermark Image (Huge Background) */}
                        <div className="absolute -right-12 -bottom-12 w-64 h-64 opacity-5 transform rotate-12 group-hover:rotate-0 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700 ease-out pointer-events-none grayscale">
                            <Image
                                src="/assets/image/hsd-logo-white.png"
                                alt="HSD Logo"
                                fill
                                className="object-contain"
                            />
                        </div>

                        {/* Inner Content */}
                        <div className="relative h-full p-8 flex flex-col z-10">

                            {/* Top Row: Date Badge (Icon Removed) */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md group-hover:border-white/30 transition-colors`}>
                                    <span className="text-xs font-bold text-gray-300 tracking-wider uppercase">
                                        {item.date}
                                    </span>
                                </div>
                            </div>

                            {/* Main Text */}
                            <div className="flex-grow space-y-4">
                                <h3 className={`text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 group-hover:from-white group-hover:to-gray-200 transition-all duration-300`}>
                                    {item.title}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed font-medium line-clamp-3 group-hover:text-gray-300 transition-colors">
                                    {item.content}
                                </p>
                            </div>

                            {/* Bottom Action */}
                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between group/btn">
                                <span className={`text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${item.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                                    Detayları İncele
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:border-white transition-all duration-300`}>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-black transform group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
