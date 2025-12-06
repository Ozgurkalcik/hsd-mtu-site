import React from 'react';
import Image from 'next/image';

interface CommitteeCardProps {
    name: string;
    role: string;
    imageSrc: string;
}

export default function CommitteeCard({ name, role, imageSrc }: CommitteeCardProps) {
    return (
        <div className="group relative w-full aspect-[3/4] rounded-2xl bg-[#0a0a0a] transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 will-change-transform">

            {/* 1. The Glowing Border (Behind everything) */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/20 to-white/5 opacity-50 group-hover:opacity-100 group-hover:from-rose-500 group-hover:to-purple-600 transition-all duration-500 blur-[1px]" />

            {/* 2. Main Container (Hollow Glass Effect) */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden bg-[#0a0a0a] ring-1 ring-white/10 group-hover:ring-0 transition-all">

                {/* Image Layer */}
                <div className="absolute inset-0 w-full h-full">
                    <Image
                        src={imageSrc}
                        alt={name}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110 grayscale-[0.4] group-hover:grayscale-0 opacity-80 group-hover:opacity-100"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                </div>

                {/* Inner Shadow / Vignette for Depth */}
                <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] z-10 pointer-events-none" />

                {/* Gradient Overlay for Text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 z-10" />

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 z-20">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">

                        {/* Dynamic Line */}
                        <div className="w-8 h-[2px] bg-white/30 mb-4 group-hover:w-full group-hover:bg-gradient-to-r group-hover:from-rose-500 group-hover:to-purple-600 transition-all duration-500" />

                        <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-md tracking-tight">
                            {name}
                        </h3>

                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] group-hover:text-rose-200 transition-colors duration-300">
                            {role}
                        </p>
                    </div>
                </div>

                {/* Glass Shine on Hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 z-30 pointer-events-none" />
            </div>
        </div>
    );
}
