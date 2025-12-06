'use client';
import React from 'react';
import { motion } from 'framer-motion';
import DomeGallery from './DomeGallery/DomeGallery';

export default function Gallery() {
    return (
        <section className="relative w-full bg-black overflow-hidden" style={{ height: '100vh' }}>
            <div className="absolute top-0 left-0 w-full z-10 pt-12 pb-8 bg-gradient-to-b from-black to-transparent pointer-events-none">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tighter drop-shadow-lg">
                        Galeri
                    </h2>
                    <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }}></div>
                </div>
            </div>

            <div className="w-full h-full">
                <DomeGallery
                    overlayBlurColor="#000000"
                    fit={0.8}
                    minRadius={600}
                    maxVerticalRotationDeg={0}
                    segments={34}
                    dragDampening={2}
                    grayscale={true}

                />
            </div>
        </section>
    );
}
