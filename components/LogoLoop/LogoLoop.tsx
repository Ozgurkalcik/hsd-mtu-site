'use client';
import React, { useMemo } from 'react';
import './LogoLoop.css';

export type LogoItem =
    | {
        node: React.ReactNode;
        href?: string;
        title?: string;
        ariaLabel?: string;
    }
    | {
        src: string;
        alt?: string;
        href?: string;
        title?: string;
        width?: number;
        height?: number;
    };

export interface LogoLoopProps {
    logos: LogoItem[];
    speed?: number; // Duration in seconds for one full loop cycle
    direction?: 'left' | 'right'; // Vertical not supported in this simple CSS version for now
    logoHeight?: number;
    gap?: number;
    pauseOnHover?: boolean;
    scaleOnHover?: boolean;
    renderItem?: (item: LogoItem, key: React.Key) => React.ReactNode;
    ariaLabel?: string;
    className?: string;
    style?: React.CSSProperties;
    fadeOut?: boolean;
    fadeOutColor?: string;
    hoverSpeed?: number; // Ignored in CSS version, just used for props compatibility
}

export const LogoLoop = React.memo<LogoLoopProps>(
    ({
        logos,
        speed = 20, // Now treated as duration (seconds) or speed factor
        direction = 'left',
        logoHeight = 28,
        gap = 32,
        pauseOnHover = true,
        scaleOnHover = false,
        renderItem,
        ariaLabel = 'Partner logos',
        className,
        style,
        fadeOut = false,
        fadeOutColor,
    }) => {

        // We render multiple copies to ensure seamless infinite scrolling
        // For CSS marquees, typically 2 sets are enough if the content width > container width
        // But to be safe and simple, we'll just render enough list items to definitely cover the screen
        // Actually, the classic CSS marquee trick is:
        // [List][List] -> animate translateX from 0 to -100% of [List] width
        // This requires [List] to be exactly the same width.

        // Generate logical items
        const renderLogoItem = (item: LogoItem, key: React.Key) => {
            if (renderItem) {
                return (
                    <div className="logoloop__item" key={key} role="listitem">
                        {renderItem(item, key)}
                    </div>
                );
            }

            const isNodeItem = 'node' in item;
            const content = isNodeItem ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <span className="logoloop__node" aria-hidden={!!item.href && !item.ariaLabel}>
                    {(item as any).node}
                </span>
            ) : (
                <img
                    src={(item as any).src}
                    alt={(item as any).alt ?? ''}
                    title={(item as any).title}
                    loading="lazy"
                    draggable={false}
                />
            );

            const itemContent = item.href ? (
                <a
                    className="logoloop__link"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    {content}
                </a>
            ) : (
                content
            );

            return (
                <div className="logoloop__item" key={key}>
                    {itemContent}
                </div>
            );
        };

        const cssVariables = {
            '--logoloop-gap': `${gap}px`,
            '--logoloop-logoHeight': `${logoHeight}px`,
            '--logoloop-duration': `${typeof speed === 'number' ? speed : 20}s`,
            ...(fadeOutColor && { '--logoloop-fadeColor': fadeOutColor })
        } as React.CSSProperties;

        // Create the list of items
        const items = logos.map((item, index) => renderLogoItem(item, `original-${index}`));

        // To ensure seamless looping with `transform: translateX(-50%)`, we need two identical halves.
        // Each half must be wide enough to cover the screen. 
        // If the list is short, we repeat it within the half.
        // We'll create "One Half" which consists of enough copies of `items` to cover a large screen width (e.g. 4 copies is safe).
        // Then we render [Half][Half].

        // Create one "Half" (consisting of 4 copies of the original list to be safe)
        const halfContent = (
            <>
                <div className="logoloop__list">
                    {items}
                </div>
                <div className="logoloop__list" aria-hidden="true">
                    {items}
                </div>
                <div className="logoloop__list" aria-hidden="true">
                    {items}
                </div>
                <div className="logoloop__list" aria-hidden="true">
                    {items}
                </div>
            </>
        );

        return (
            <div
                className={`logoloop ${fadeOut ? 'logoloop--fade' : ''} ${scaleOnHover ? 'logoloop--scale-hover' : ''} ${className ?? ''}`}
                style={{ ...cssVariables, ...style }}
                aria-label={ariaLabel}
            >
                <div className="logoloop__track logoloop__track--animate">
                    {/* First Half (initial view) */}
                    {halfContent}
                    {/* Second Half (enters view as we scroll) */}
                    {halfContent}
                </div>
            </div>
        );
    }
);

LogoLoop.displayName = 'LogoLoop';

export default LogoLoop;
