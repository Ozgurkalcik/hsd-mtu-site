'use client';
import React, { useRef, useEffect, useMemo, CSSProperties, useId } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './StickerPeel.css';
import { useFrozen } from '@/shared/lib/FrozenSection';

// Register standard Draggable
if (typeof window !== 'undefined') {
    gsap.registerPlugin(Draggable);
}

interface StickerPeelProps {
    imageSrc: string;
    rotate?: number;
    peelBackHoverPct?: number;
    peelBackActivePct?: number;
    peelEasing?: string;
    peelHoverEasing?: string;
    width?: number;
    shadowIntensity?: number;
    lightingIntensity?: number;
    initialPosition?: 'center' | 'random' | { x: number; y: number };
    peelDirection?: number;
    className?: string;
}

interface CSSVars extends CSSProperties {
    '--sticker-rotate'?: string;
    '--sticker-p'?: string;
    '--sticker-peelback-hover'?: string;
    '--sticker-peelback-active'?: string;
    '--sticker-peel-easing'?: string;
    '--sticker-peel-hover-easing'?: string;
    '--sticker-width'?: string;
    '--sticker-shadow-opacity'?: number;
    '--sticker-lighting-constant'?: number;
    '--peel-direction'?: string;
}

const StickerPeel: React.FC<StickerPeelProps> = ({
    imageSrc,
    rotate = 30,
    peelBackHoverPct = 30,
    peelBackActivePct = 40,
    peelEasing = 'power3.out',
    peelHoverEasing = 'power2.out',
    width = 200,
    shadowIntensity = 0.6,
    lightingIntensity = 0.1,
    initialPosition = 'center',
    peelDirection = 0,
    className = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragTargetRef = useRef<HTMLDivElement>(null);
    const draggableInstanceRef = useRef<Draggable | null>(null);
    const isFrozen = useFrozen(); // Consume context

    const defaultPadding = 10;

    // 1. Initial Position Effect - Frozen Aware
    useEffect(() => {
        if (isFrozen) return; // Skip if frozen

        const target = dragTargetRef.current;
        if (!target) return;

        let startX = 0,
            startY = 0;

        if (initialPosition === 'center') {
            // Center logic handled by CSS or parent layout usually, but here we init at 0,0 relative
        }

        if (typeof initialPosition === 'object' && initialPosition.x !== undefined && initialPosition.y !== undefined) {
            startX = initialPosition.x;
            startY = initialPosition.y;
        }

        gsap.set(target, { x: startX, y: startY });
    }, [initialPosition, isFrozen]);

    // 2. Draggable & Resize Logic - Frozen Aware
    useEffect(() => {
        // FROZEN OPTIMIZATION:
        // If frozen, do not create draggable, do not listen to resize.
        // Cleanup function will kill existing instances.
        if (isFrozen) return;

        const target = dragTargetRef.current;
        if (!target) return;

        const boundsEl = target.parentNode as HTMLElement;

        const draggable = Draggable.create(target, {
            type: 'x,y',
            bounds: boundsEl,
            inertia: true,
            onDrag(this: Draggable) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rot = gsap.utils.clamp(-24, 24, (this as any).deltaX * 0.4);
                gsap.to(target, { rotation: rot, duration: 0.15, ease: 'power1.out' });
            },
            onDragEnd() {
                const rotationEase = 'power2.out';
                const duration = 0.8;
                gsap.to(target, { rotation: 0, duration, ease: rotationEase });
            }
        });

        draggableInstanceRef.current = draggable[0];

        const handleResize = () => {
            if (isFrozen) return; // Double check inside logic

            if (draggableInstanceRef.current) {
                draggableInstanceRef.current.update();

                const currentX = gsap.getProperty(target, 'x') as number;
                const currentY = gsap.getProperty(target, 'y') as number;

                const boundsRect = boundsEl.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();

                const maxX = boundsRect.width - targetRect.width;
                const maxY = boundsRect.height - targetRect.height;

                const newX = Math.max(0, Math.min(currentX, maxX));
                const newY = Math.max(0, Math.min(currentY, maxY));

                if (newX !== currentX || newY !== currentY) {
                    gsap.to(target, {
                        x: newX,
                        y: newY,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                }
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if (draggableInstanceRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (draggableInstanceRef.current as any).kill();
                draggableInstanceRef.current = null;
            }
        };
    }, [isFrozen]); // Depends on isFrozen

    // 3. Touch & Hover Handling - Frozen Aware
    useEffect(() => {
        if (isFrozen) return;

        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = () => {
            container.classList.add('touch-active');
        };

        const handleTouchEnd = () => {
            container.classList.remove('touch-active');
        };

        // JS-based hover: GSAP Draggable mousedown'ı CSS :hover'ı bozuyor
        const handleMouseEnter = () => {
            container.classList.add('hover-active');
        };

        const handleMouseLeave = () => {
            container.classList.remove('hover-active');
        };

        container.addEventListener('touchstart', handleTouchStart);
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);
        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
            container.removeEventListener('mouseenter', handleMouseEnter);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isFrozen]);

    const cssVars: CSSVars = useMemo(
        () => ({
            '--sticker-rotate': `${rotate}deg`,
            '--sticker-p': `${defaultPadding}px`,
            '--sticker-peelback-hover': `${peelBackHoverPct}%`,
            '--sticker-peelback-active': `${peelBackActivePct}%`,
            '--sticker-peel-easing': peelEasing,
            '--sticker-peel-hover-easing': peelHoverEasing,
            '--sticker-width': `${width}px`,
            '--sticker-shadow-opacity': shadowIntensity,
            '--sticker-lighting-constant': lightingIntensity,
            '--peel-direction': `${peelDirection}deg`
        }),
        [
            rotate,
            peelBackHoverPct,
            peelBackActivePct,
            peelEasing,
            peelHoverEasing,
            width,
            shadowIntensity,
            lightingIntensity,
            peelDirection
        ]
    );

    const uniqueId = useId().replace(/:/g, "");

    return (
        <div className={`draggable ${className}`} ref={dragTargetRef} style={{...cssVars, pointerEvents: 'none' }}>
            <svg width="0" height="0" className="absolute pointer-events-none">
                <defs>
                    {/* Optimized filters: Removed specular lighting for performance */}
                    <filter id={`dropShadow-${uniqueId}`}>
                        <feDropShadow
                            dx="2"
                            dy="4"
                            stdDeviation={2 * shadowIntensity}
                            floodColor="black"
                            floodOpacity={shadowIntensity}
                        />
                    </filter>

                    <filter id={`expandAndFill-${uniqueId}`}>
                        <feOffset dx="0" dy="0" in="SourceAlpha" result="shape" />
                        <feFlood floodColor="rgb(179,179,179)" result="flood" />
                        <feComposite operator="in" in="flood" in2="shape" />
                    </filter>
                </defs>
            </svg>

            <div className="sticker-container" ref={containerRef} style={{ pointerEvents: 'auto' }}>
                <div className="sticker-main" style={{ filter: `url(#dropShadow-${uniqueId})` }}>
                    <div className="sticker-lighting">
                        <img
                            src={imageSrc}
                            alt=""
                            className="sticker-image"
                            draggable="false"
                            onContextMenu={e => e.preventDefault()}
                        />
                    </div>
                </div>

                <div className="flap">
                    <div className="flap-lighting">
                        <img
                            src={imageSrc}
                            alt=""
                            className="flap-image"
                            style={{ filter: `url(#expandAndFill-${uniqueId})` }}
                            draggable="false"
                            onContextMenu={e => e.preventDefault()}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StickerPeel;
