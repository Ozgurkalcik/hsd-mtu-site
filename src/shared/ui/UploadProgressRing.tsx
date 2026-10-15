'use client';

import React from 'react';

interface UploadProgressRingProps {
    progress: number; // 0 to 100
    fileName: string;
    fileSize?: string;
    status?: 'uploading' | 'completed' | 'error';
    isLight?: boolean;
}

export default function UploadProgressRing({
    progress,
    fileName,
    fileSize,
    status = 'uploading',
    isLight = false,
}: UploadProgressRingProps) {
    const radius = 24;
    const strokeWidth = 3.5;
    const normalizedRadius = radius - strokeWidth * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

    const isDone = progress >= 100 || status === 'completed';

    return (
        <div className={`p-3 rounded-2xl border flex items-center gap-3.5 transition-all shadow-sm ${
            isLight
                ? 'bg-white border-slate-200'
                : 'bg-zinc-900/90 border-zinc-800'
        }`}>
            {/* SVG Progress Ring */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="rotate-[-90deg] transition-all duration-300"
                >
                    {/* Arka plan sönük iz */}
                    <circle
                        stroke={isLight ? '#e2e8f0' : '#27272a'}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    {/* Dolgu halkası */}
                    <circle
                        stroke={isDone ? '#10b981' : '#e11d48'}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        className="transition-[stroke-dashoffset] duration-300 ease-out"
                    />
                </svg>

                {/* Merkez Metin / İkon */}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold">
                    {isDone ? (
                        <span className="text-emerald-500 text-sm animate-pop">✓</span>
                    ) : (
                        <span className={isLight ? 'text-slate-700' : 'text-zinc-200'}>
                            %{Math.round(progress)}
                        </span>
                    )}
                </div>
            </div>

            {/* Dosya Bilgisi & Durum */}
            <div className="overflow-hidden flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                    {fileName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    {fileSize && (
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                            {fileSize}
                        </span>
                    )}
                    <span className={`text-[10px] font-semibold ${
                        isDone
                            ? 'text-emerald-500'
                            : 'text-rose-500 animate-pulse'
                    }`}>
                        {isDone ? 'Yükleme Tamamlandı' : 'Yükleniyor...'}
                    </span>
                </div>
            </div>
        </div>
    );
}
