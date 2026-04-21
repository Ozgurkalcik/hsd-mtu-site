'use client';
import React from 'react';

interface SimpleMarqueeProps {
    children: React.ReactNode;
    speed?: number; // seconds for one loop
    direction?: 'left' | 'right';
    className?: string;
}

export default function SimpleMarquee({
    children,
    speed = 20,
    direction = 'left',
    className = ''
}: SimpleMarqueeProps) {
    return (
        <div className={`overflow-hidden flex w-full relative group ${className}`}>
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .marquee-track {
                    display: flex;
                    min-width: 100%;
                    flex-shrink: 0;
                    align-items: center;
                    justify-content: space-around;
                    white-space: nowrap;
                    animation: marquee ${speed}s linear infinite;
                    animation-direction: ${direction === 'right' ? 'reverse' : 'normal'};
                }
                .group:hover .marquee-track {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="marquee-track">
                {children}
            </div>
            {/* Duplicate for infinite loop */}
            <div className="marquee-track">
                {children}
            </div>
        </div>
    );
}
