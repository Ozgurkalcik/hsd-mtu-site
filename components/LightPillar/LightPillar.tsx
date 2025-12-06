'use client';
import React from 'react';
import './LightPillar.css';

interface LightPillarProps {
    topColor?: string;
    bottomColor?: string;
    intensity?: number;
    className?: string;
    mixBlendMode?: React.CSSProperties['mixBlendMode'];
}

/**
 * LightPillar - A pure CSS animated glow effect.
 * Replaces the WebGL raymarching version for maximum performance.
 */
const LightPillar: React.FC<LightPillarProps> = ({
    topColor = '#5227FF',
    bottomColor = '#FF9FFC',
    intensity = 1.0,
    className = '',
    mixBlendMode = 'screen',
}) => {
    return (
        <div
            className={`light-pillar-container ${className}`}
            style={{
                '--lp-top-color': topColor,
                '--lp-bottom-color': bottomColor,
                '--lp-intensity': intensity,
                mixBlendMode,
            } as React.CSSProperties}
        >
            <div className="light-pillar-glow light-pillar-glow--main" />
            <div className="light-pillar-glow light-pillar-glow--secondary" />
            <div className="light-pillar-glow light-pillar-glow--accent" />
        </div>
    );
};

export default LightPillar;
