'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// Context to allow children to know if they should be frozen
const FrozenContext = createContext<boolean>(false);

export const useFrozen = () => useContext(FrozenContext);

interface FrozenSectionProps {
    children: React.ReactNode;
    className?: string; // To allow transparently wrapping sections that expect classNames
    as?: React.ElementType; // To render as 'section', 'div', etc.
    id?: string;
}

export default function FrozenSection({
    children,
    className = "",
    as: Component = 'section',
    id
}: FrozenSectionProps) {
    const [isFrozen, setIsFrozen] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // "rootMargin: 100%" means the intersection area is expanded by 1 viewport height 
        // on top and bottom.
        // So the element is "intersecting" if it is in the viewport, 
        // OR 1 screen above, OR 1 screen below.
        // Total active zone = 3 screens height.
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If isIntersecting is true, we are in the "Active Zone" (Visible + Neighbors).
                // So frozen is false.
                // If isIntersecting is false, we are far away. Frozen is true.
                setIsFrozen(!entry.isIntersecting);
            },
            {
                root: null, // Viewport
                rootMargin: '100% 0px 100% 0px',
                threshold: 0
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <FrozenContext.Provider value={isFrozen}>
            <Component
                ref={ref}
                className={`${className} ${isFrozen ? 'is-frozen-section' : ''}`}
                id={id}
                style={isFrozen ? {
                    // contentVisibility: 'auto', // Optional: Browser optimization to skip layout
                    // containIntrinsicSize: '1000px', // Placeholder height to prevent scroll jumps
                    // Note: Skipping contentVisibility for now to avoid layout shifts unless requested.
                } : undefined}
            >
                {/* 
                    We can mask the frozen state with CSS to ensure no accidental repaints,
                    but the real win is children using useFrozen() to stop JS loops.
                */}
                <div style={{ display: isFrozen ? 'none' : 'block' }}>
                    {/* 
                        WAIT: display:none causes reflows/scroll jumps if not careful.
                        Better to just pause animations via Context and CSS.
                        Reverting display:none. using CSS class for specific pausing.
                     */}
                </div>
                {children}
            </Component>
        </FrozenContext.Provider>
    );
}
