'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';

export default function VisibilityController() {
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                document.body.classList.add('is-hidden');
                gsap.ticker.fps(0); // Pause GSAP ticker completely
            } else {
                document.body.classList.remove('is-hidden');
                gsap.ticker.fps(60); // Resume GSAP ticker (default)
            }
        };

        // Initial check
        handleVisibilityChange();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.body.classList.remove('is-hidden');
            gsap.ticker.fps(60);
        };
    }, []);

    return null;
}
