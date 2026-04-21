import React from 'react';
import SafeImage from '@/shared/ui/components/SafeImage';

interface CommitteeCardProps {
    name: string;
    role: string;
    imageSrc: string;
}

export default function CommitteeCard({ name, role, imageSrc }: CommitteeCardProps) {
    return (
        <div className="group relative w-full aspect-[3/4] rounded-2xl bg-[#0a0a0a] transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 will-change-transform">

            {/* 1. The Glowing Border (Behind everything) */}
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#FF3333]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[4px]" />

            {/* 2. Main Container (Hollow Glass Effect) */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden bg-[#050505] ring-1 ring-white/10 group-hover:ring-[#FF3333]/40 group-hover:shadow-[0_0_25px_rgba(255,51,51,0.15)] transition-all duration-500">

                {/* Image Layer */}
                <div className="absolute inset-0 w-full h-full">
                    <SafeImage
                        src={imageSrc}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="absolute w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        style={{ objectFit: 'cover' }}
                    />
                </div>

                {/* Minimal Gradient Overlay restricted to bottom for readability */}
                <div className="absolute bottom-0 left-0 w-full h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 z-20">
                    <div className="w-full relative">
                        
                        {/* Dynamic Line - Made to look sharper and red (HSD theme) */}
                        <div className="w-8 h-[1px] bg-white/40 mb-4 group-hover:w-full group-hover:bg-[#FF3333] group-hover:shadow-[0_0_10px_rgba(255,51,51,0.8)] transition-all duration-700 ease-out" />

                        {/* Name */}
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1.5 tracking-tight group-hover:drop-shadow-[0_0_8px_rgba(255,51,51,0.5)] transition-all duration-500">
                            {name}
                        </h3>

                        {/* Role - Expanded smoothly with max-height transition instead of line-clamp */}
                        <div className="w-full grid group-hover:grid-rows-[1fr] transition-all duration-500">
                            <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-[0.15em] group-hover:text-white transition-all duration-500 overflow-hidden max-h-[16px] group-hover:max-h-[100px] leading-[16px]">
                                {role}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Premium Glass Shine on Hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out z-30 pointer-events-none skew-x-12" />
            </div>
        </div>
    );
}
