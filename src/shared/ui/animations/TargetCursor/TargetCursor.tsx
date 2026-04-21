"use client";
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { gsap } from 'gsap';
import './TargetCursor.css';

export interface TargetCursorProps {
    targetSelector?: string;
    spinDuration?: number;
    hideDefaultCursor?: boolean;
    hoverDuration?: number;
    parallaxOn?: boolean;
    containerSelector?: string; // Limit cursor to this container
}

const TargetCursor: React.FC<TargetCursorProps> = ({
    targetSelector = '.cursor-target',
    spinDuration = 2,
    hideDefaultCursor = true,
    hoverDuration = 0.2,
    parallaxOn = true,
    containerSelector
}) => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const cornersRef = useRef<NodeListOf<HTMLDivElement> | null>(null);
    const spinTl = useRef<gsap.core.Timeline | null>(null);
    const dotRef = useRef<HTMLDivElement>(null);

    const isActiveRef = useRef(false);
    const targetCornerPositionsRef = useRef<{ x: number; y: number }[] | null>(null);
    const tickerFnRef = useRef<(() => void) | null>(null);
    const activeStrengthRef = useRef({ current: 0 });

    // State to track if cursor is inside the container
    const [isInsideContainer, setIsInsideContainer] = useState(false);
    const isInsideRef = useRef(false); // Ref to track inside state for event listeners without stale closures

    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
        return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
    }, []);

    const constants = useMemo(() => ({ borderWidth: 3, cornerSize: 12 }), []);

    const moveCursor = useCallback((x: number, y: number) => {
        if (!cursorRef.current) return;
        gsap.to(cursorRef.current, { x, y, duration: 0.1, ease: 'power3.out' });
    }, []);

    useEffect(() => {
        if (isMobile || !cursorRef.current) return;

        const originalBodyCursor = document.body.style.cursor;
        const cursor = cursorRef.current;

        // Create GSAP timeline
        gsap.set(cursor, {
            xPercent: -50,
            yPercent: -50,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        });

        if (spinTl.current) spinTl.current.kill();
        spinTl.current = gsap.timeline({ repeat: -1 })
            .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });


        cornersRef.current = cursor.querySelectorAll<HTMLDivElement>('.target-cursor-corner');

        // Container check helper
        const checkIsInside = (clientX: number, clientY: number) => {
            if (!containerSelector) {
                return true; // If no container specified, always active
            }
            const container = document.querySelector(containerSelector);
            if (!container) return false;

            const rect = container.getBoundingClientRect();
            return (
                clientX >= rect.left &&
                clientX <= rect.right &&
                clientY >= rect.top &&
                clientY >= rect.top &&
                clientY <= rect.bottom
            );
        };

        const updateVisibility = (clientX: number, clientY: number) => {
            const inside = checkIsInside(clientX, clientY);

            if (inside !== isInsideRef.current) {
                isInsideRef.current = inside;
                setIsInsideContainer(inside);

                if (inside) {
                    if (hideDefaultCursor) document.body.style.cursor = 'none';
                    cursor.classList.add('is-active');
                } else {
                    document.body.style.cursor = originalBodyCursor;
                    cursor.classList.remove('is-active');
                }
            }
            return inside;
        };


        const mouseMoveHandler = (e: MouseEvent) => {
            const inside = updateVisibility(e.clientX, e.clientY);

            if (inside) {
                moveCursor(e.clientX, e.clientY);
            }
        };

        // Track mouse position for scroll updates
        let lastMouseX = window.innerWidth / 2;
        let lastMouseY = window.innerHeight / 2;

        const globalMouseMove = (e: MouseEvent) => {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            mouseMoveHandler(e);
        };

        const scrollHandler = () => {
            updateVisibility(lastMouseX, lastMouseY);
        };

        window.addEventListener('mousemove', globalMouseMove);
        window.addEventListener('scroll', scrollHandler, { passive: true });

        // Ticker for magnet effect
        const tickerFn = () => {
            if (!targetCornerPositionsRef.current || !cursorRef.current || !cornersRef.current) {
                return;
            }
            const strength = activeStrengthRef.current.current;
            if (strength === 0) return;

            const cursorX = gsap.getProperty(cursorRef.current, 'x') as number;
            const cursorY = gsap.getProperty(cursorRef.current, 'y') as number;

            const corners = Array.from(cornersRef.current);
            corners.forEach((corner, i) => {
                const currentX = gsap.getProperty(corner, 'x') as number;
                const currentY = gsap.getProperty(corner, 'y') as number;

                // Safety check for targetCornerPositionsRef
                if (!targetCornerPositionsRef.current || !targetCornerPositionsRef.current[i]) return;

                const targetX = targetCornerPositionsRef.current[i].x - cursorX;
                const targetY = targetCornerPositionsRef.current[i].y - cursorY;

                const finalX = currentX + (targetX - currentX) * strength;
                const finalY = currentY + (targetY - currentY) * strength;

                const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05;

                gsap.to(corner, {
                    x: finalX,
                    y: finalY,
                    duration: duration,
                    ease: duration === 0 ? 'none' : 'power1.out',
                    overwrite: 'auto'
                });
            });
        };

        tickerFnRef.current = tickerFn;

        // Hover interactions
        let activeTarget: Element | null = null;
        let currentLeaveHandler: (() => void) | null = null;
        let resumeTimeout: ReturnType<typeof setTimeout> | null = null;

        const cleanupTarget = (target: Element) => {
            if (currentLeaveHandler) {
                target.removeEventListener('mouseleave', currentLeaveHandler);
            }
            currentLeaveHandler = null;
        };

        const enterHandler = (e: MouseEvent) => {
            // Only process if we are inside the container
            if (containerSelector) {
                const container = document.querySelector(containerSelector);
                if (!container) return;

                // Simple bounding box check usually sufficient here as mousemove updates state
                const rect = container.getBoundingClientRect();
                if (!(
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                )) return;
            }

            const directTarget = e.target as Element;
            // Traverse up to find matching target
            const target = directTarget.closest(targetSelector);

            if (!target || !cursorRef.current || !cornersRef.current) return;
            if (activeTarget === target) return;

            if (activeTarget) cleanupTarget(activeTarget);
            if (resumeTimeout) {
                clearTimeout(resumeTimeout);
                resumeTimeout = null;
            }

            activeTarget = target;

            const corners = Array.from(cornersRef.current);
            corners.forEach(corner => gsap.killTweensOf(corner));
            gsap.killTweensOf(cursorRef.current, 'rotation');
            spinTl.current?.pause();
            gsap.set(cursorRef.current, { rotation: 0 });

            const rect = target.getBoundingClientRect();
            const { borderWidth, cornerSize } = constants;
            const cursorX = gsap.getProperty(cursorRef.current, 'x') as number;
            const cursorY = gsap.getProperty(cursorRef.current, 'y') as number;

            targetCornerPositionsRef.current = [
                { x: rect.left - borderWidth, y: rect.top - borderWidth },
                { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
                { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
                { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
            ];

            isActiveRef.current = true;
            gsap.ticker.add(tickerFnRef.current!);
            gsap.to(activeStrengthRef.current, { current: 1, duration: hoverDuration, ease: 'power2.out' });

            corners.forEach((corner, i) => {
                // safety
                if (!targetCornerPositionsRef.current || !targetCornerPositionsRef.current[i]) return;

                gsap.to(corner, {
                    x: targetCornerPositionsRef.current[i].x - cursorX,
                    y: targetCornerPositionsRef.current[i].y - cursorY,
                    duration: 0.2,
                    ease: 'power2.out'
                });
            });

            const leaveHandler = () => {
                gsap.ticker.remove(tickerFnRef.current!);
                isActiveRef.current = false;
                targetCornerPositionsRef.current = null;
                gsap.set(activeStrengthRef.current, { current: 0, overwrite: true });

                activeTarget = null;

                // Reset corners
                if (cornersRef.current) {
                    const corners = Array.from(cornersRef.current);
                    gsap.killTweensOf(corners);
                    const { cornerSize } = constants;
                    const positions = [
                        { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
                        { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
                        { x: cornerSize * 0.5, y: cornerSize * 0.5 },
                        { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
                    ];

                    corners.forEach((corner, index) => {
                        gsap.to(corner, { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power3.out' });
                    });
                }

                resumeTimeout = setTimeout(() => {
                    if (!activeTarget && cursorRef.current && spinTl.current) {
                        // Restart spin nicely
                        const currentRotation = gsap.getProperty(cursorRef.current, 'rotation') as number;
                        const normalizedRotation = currentRotation % 360;
                        if (spinTl.current) {
                            spinTl.current.kill();
                            spinTl.current = gsap.timeline({ repeat: -1 })
                                .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
                        }

                        gsap.to(cursorRef.current, {
                            rotation: normalizedRotation + 360,
                            duration: spinDuration * (1 - normalizedRotation / 360),
                            ease: 'none',
                            onComplete: () => {
                                spinTl.current?.restart();
                            }
                        });
                    }
                    resumeTimeout = null;
                }, 50);
                cleanupTarget(target);
            };

            currentLeaveHandler = leaveHandler;
            target.addEventListener('mouseleave', leaveHandler);
        };

        window.addEventListener('mouseover', enterHandler);

        // Click handlers
        const mouseDownHandler = () => {
            if (!isInsideRef.current && containerSelector) return;
            if (!dotRef.current || !cursorRef.current) return;
            gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 });
            gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 });
        };

        const mouseUpHandler = () => {
            if (!isInsideRef.current && containerSelector) return;
            if (!dotRef.current || !cursorRef.current) return;
            gsap.to(dotRef.current, { scale: 1, duration: 0.3 });
            gsap.to(cursorRef.current, { scale: 1, duration: 0.2 });
        };

        window.addEventListener('mousedown', mouseDownHandler);
        window.addEventListener('mouseup', mouseUpHandler);


        return () => {
            window.removeEventListener('mousemove', globalMouseMove);
            window.removeEventListener('scroll', scrollHandler);
            window.removeEventListener('mouseover', enterHandler);
            window.removeEventListener('mousedown', mouseDownHandler);
            window.removeEventListener('mouseup', mouseUpHandler);

            if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current);
            if (activeTarget) cleanupTarget(activeTarget);

            spinTl.current?.kill();

            // Restore cursor if we were hiding it
            document.body.style.cursor = originalBodyCursor;
        };
    }, [containerSelector, spinDuration, hideDefaultCursor, isMobile, hoverDuration, parallaxOn, constants, moveCursor, targetSelector]);
    // Removed isInsideContainer from deps to avoid re-binding listeners on every move/state change.
    // Updated handlers to use closure or ref if needed.
    // *Actually* for mouseMoveHandler, isInsideContainer change triggers state update but re-binding is expensive?
    // Let's refine the Effect to avoid constant re-binding. The logic inside mousemove handles the state update.

    if (isMobile) return null;

    return (
        <div ref={cursorRef} className={`target-cursor-wrapper ${isInsideContainer ? 'is-active' : ''}`}>
            <div ref={dotRef} className="target-cursor-dot" />
            <div className="target-cursor-corner corner-tl" />
            <div className="target-cursor-corner corner-tr" />
            <div className="target-cursor-corner corner-br" />
            <div className="target-cursor-corner corner-bl" />
        </div>
    );
};

export default TargetCursor;
