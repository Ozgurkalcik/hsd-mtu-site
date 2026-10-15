'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    isLight?: boolean;
}

export function SkeletonBox({ className = '', isLight = false }: SkeletonProps) {
    return (
        <div
            className={`rounded-xl animate-shimmer relative overflow-hidden ${
                isLight ? 'bg-slate-200/80' : 'bg-zinc-800/60'
            } ${className}`}
        />
    );
}

// 🗓️ Takvim Hücreleri İçin Shimmer İskeleti
export function CalendarGridSkeleton({ isLight = false }: { isLight?: boolean }) {
    return (
        <div className="w-full h-full flex flex-col space-y-4 animate-in fade-in duration-300">
            {/* Header İskeleti */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/40">
                <div className="flex items-center gap-3">
                    <SkeletonBox className="w-32 h-8" isLight={isLight} />
                    <SkeletonBox className="w-20 h-6" isLight={isLight} />
                </div>
                <div className="flex items-center gap-2">
                    <SkeletonBox className="w-24 h-8" isLight={isLight} />
                    <SkeletonBox className="w-28 h-8" isLight={isLight} />
                </div>
            </div>

            {/* Haftanın Günleri Başlıkları */}
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <SkeletonBox key={i} className="h-6 w-full" isLight={isLight} />
                ))}
            </div>

            {/* 35 Günlük Takvim Hücre Grid'i */}
            <div className="grid grid-cols-7 gap-2 flex-1 min-h-[500px]">
                {Array.from({ length: 35 }).map((_, i) => (
                    <div
                        key={i}
                        className={`p-2 rounded-xl border flex flex-col justify-between ${
                            isLight
                                ? 'bg-slate-50 border-slate-200/70'
                                : 'bg-zinc-900/40 border-zinc-800/40'
                        }`}
                    >
                        <SkeletonBox className="w-6 h-5" isLight={isLight} />
                        {i % 3 === 0 && (
                            <SkeletonBox className="w-full h-5 mt-auto rounded-lg" isLight={isLight} />
                        )}
                        {i % 5 === 0 && (
                            <SkeletonBox className="w-3/4 h-4 mt-1 rounded-lg" isLight={isLight} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// 👥 Üye Katılım Listesi Shimmer İskeleti
export function AttendanceListSkeleton({ isLight = false }: { isLight?: boolean }) {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <SkeletonBox className="w-8 h-8 rounded-full shrink-0" isLight={isLight} />
                        <div className="space-y-1 flex-1 max-w-[200px]">
                            <SkeletonBox className="w-24 h-4" isLight={isLight} />
                            <SkeletonBox className="w-16 h-3" isLight={isLight} />
                        </div>
                    </div>
                    <SkeletonBox className="w-20 h-6 rounded-full" isLight={isLight} />
                </div>
            ))}
        </div>
    );
}

// 📊 Admin Tablo Satırları İskeleti
export function AdminTableSkeleton({ rows = 6, isLight = false }: { rows?: number; isLight?: boolean }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <SkeletonBox className="w-9 h-9 rounded-xl shrink-0" isLight={isLight} />
                        <div className="space-y-1">
                            <SkeletonBox className="w-36 h-4" isLight={isLight} />
                            <SkeletonBox className="w-24 h-3" isLight={isLight} />
                        </div>
                    </div>
                    <SkeletonBox className="w-24 h-6 rounded-lg hidden sm:block" isLight={isLight} />
                    <SkeletonBox className="w-20 h-6 rounded-full" isLight={isLight} />
                </div>
            ))}
        </div>
    );
}
