import React, { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

export default function SeeAllButton() {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Magnetic Effect Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth springs for the movement
    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    // Text parallax effect
    const textX = useTransform(springX, (curr) => curr * 0.5);
    const textY = useTransform(springY, (curr) => curr * 0.5);

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        x.set(distanceX * 0.4); // Magnetic strength
        y.set(distanceY * 0.4);
    }

    function handleMouseLeave() {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    }

    return (
        <div className="relative p-10 flex items-center justify-center">
            {/* Rotating Cosmic Glow Background - Only visible on hover */}
            <div className={`absolute inset-0 bg-gradient-to-r from-red-600 via-purple-600 to-red-600 blur-[60px] opacity-0 transition-opacity duration-700 ${isHovered ? 'opacity-40' : ''}`} />

            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleMouseLeave}
                style={{ x: springX, y: springY }}
                className="relative cursor-pointer group"
            >
                {/* Button Container */}
                <div className="relative px-10 py-5 bg-black rounded-full overflow-hidden border border-white/10 shadow-2xl transition-all duration-300">

                    {/* Moving Gradient Border (Snake Effect) */}
                    <div className="absolute inset-[-4px] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#3366FF_50%,#FF3333)] animate-spin-slow will-change-transform opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Inner Black Background to hide center of gradient border */}
                    <div className="absolute inset-[1px] bg-neutral-900 rounded-full z-0" />

                    {/* Content Layer */}
                    <motion.div
                        style={{ x: textX, y: textY }}
                        className="relative z-10 flex items-center gap-4"
                    >
                        <span className="text-sm font-bold tracking-[0.25em] text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-red-400 group-hover:to-purple-400 transition-all duration-300">
                            TÜM EKİBİ GÖR
                        </span>

                        {/* Animated Icon Circle */}
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                            <motion.svg
                                width="24" height="24" viewBox="0 0 24 24" fill="none"
                                className="w-4 h-4 text-white"
                                animate={{ x: isHovered ? 4 : 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.svg>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
