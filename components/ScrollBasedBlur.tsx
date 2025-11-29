"use client";

import { useEffect, useState } from "react";
import GradualBlur from "@/components/GradualBlur/GradualBlur";

export default function ScrollBasedBlur() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            // Find the About Us section
            const aboutSection = document.getElementById("hakkimizda");

            if (!aboutSection) return;

            const rect = aboutSection.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Logic:
            // If the bottom of the About Us section is above the bottom of the viewport (meaning we scrolled past it), hide the blur.
            // rect.bottom is the distance from the top of the viewport to the bottom of the element.
            // If rect.bottom < windowHeight, it means the bottom of the element is visible or above the viewport.
            // Actually, we want it to disappear when we scroll PAST it.
            // So when rect.bottom <= windowHeight, we are at the end or past it.

            // Let's add a small buffer so it fades out smoothly just as we finish the section.
            if (rect.bottom <= windowHeight) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
        };

        window.addEventListener("scroll", handleScroll);
        // Trigger once on mount
        handleScroll();

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
