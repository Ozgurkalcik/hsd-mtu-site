"use client";

import { useEffect, useState } from "react";
import GradualBlur from '@/shared/ui/animations/GradualBlur/GradualBlur';

export default function ScrollBasedBlur() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        let ticking = false;

        const updateVisibility = () => {
            // Find the About Us section
            const aboutSection = document.getElementById("hakkimizda");

            if (!aboutSection) {
                ticking = false;
                return;
            }

            const rect = aboutSection.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            const nextVisible = rect.bottom > windowHeight;
            setIsVisible((prev) => (prev === nextVisible ? prev : nextVisible));
            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateVisibility);
                ticking = true;
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        // Trigger once on mount
        updateVisibility();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                zIndex: 100, // High z-index to sit on top
                pointerEvents: 'none', // Allow clicking through
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out'
            }}
        >
            <GradualBlur
                target="parent"
                position="bottom"
                height="6rem"
                strength={2}
                divCount={5}
                curve="bezier"
                exponential={true}
                opacity={1}
            />
        </div>
    );
}
