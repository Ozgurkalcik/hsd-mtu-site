'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFrozen } from '@/shared/lib/FrozenSection';

export default function CustomCursor() {
    const isFrozen = useFrozen();
    const dotRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);

    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        // Dokunmatik cihazlarda custom cursor'ı tamamen kapat
        if (typeof window !== 'undefined') {
            const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
            const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
            if (hasTouch || isCoarse) {
                setIsTouch(true);
                return;
            }
        }

        let mouseX = -100;
        let mouseY = -100;
        let ringX = -100;
        let ringY = -100;
        let rafId: number;

        const onMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isVisible) setIsVisible(true);

            // Noktayı anında taşı (sıfır gecikme)
            if (dotRef.current) {
                dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
            }

            // Tıklanabilir öğe algılama
            const target = e.target as HTMLElement | null;
            if (target) {
                const isInteractive = Boolean(
                    target.closest('button, a, input, select, textarea, [role="button"], label, .cursor-pointer')
                );
                setIsHovered(isInteractive);
            }
        };

        const onMouseLeave = () => {
            setIsVisible(false);
        };

        const onMouseEnter = () => {
            setIsVisible(true);
        };

        // Yumuşak takip eden dış halka animasyon döngüsü
        const renderLoop = () => {
            // sys-rule.md: Arka planda veya dondurulmuşsa render döngüsünü durdur
            if (document.hidden || isFrozen) {
                rafId = requestAnimationFrame(renderLoop);
                return;
            }

            // Hafif yaylanmalı takip (lerp)
            const speed = 0.22;
            ringX += (mouseX - ringX) * speed;
            ringY += (mouseY - ringY) * speed;

            if (ringRef.current) {
                ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
            }

            rafId = requestAnimationFrame(renderLoop);
        };

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseleave', onMouseLeave);
        document.addEventListener('mouseenter', onMouseEnter);

        rafId = requestAnimationFrame(renderLoop);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseleave', onMouseLeave);
            document.removeEventListener('mouseenter', onMouseEnter);
            cancelAnimationFrame(rafId);
        };
    }, [isFrozen, isVisible]);

    if (isTouch || !isVisible) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden select-none">
            {/* Manyetik Merkez Nokta */}
            <div
                ref={dotRef}
                className="fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-opacity duration-150 will-change-transform pointer-events-none"
            />

            {/* Yumuşak Takip Eden Dış Halka */}
            <div
                ref={ringRef}
                className={`fixed top-0 left-0 rounded-full border border-rose-500/60 pointer-events-none will-change-transform transition-[width,height,margin,background-color,border-color] duration-200 ease-out ${
                    isHovered
                        ? '-ml-5 -mt-5 w-10 h-10 bg-rose-500/15 border-rose-400 scale-110 shadow-[0_0_16px_rgba(244,63,94,0.35)]'
                        : '-ml-3.5 -mt-3.5 w-7 h-7 bg-transparent border-rose-500/40 shadow-none'
                }`}
            />
        </div>
    );
}
