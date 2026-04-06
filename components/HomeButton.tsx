'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LuArrowLeft } from 'react-icons/lu';

export default function HomeButton() {
    // Local ve Live ortamı algılayıp ana sayfaya güvenli yönlendirme sağlar.
    // Next/Link zaten '/' ile bunu otomatik yapar ancak özel domain yapılandırmaları için
    // gerekirse burada 'process.env.NEXT_PUBLIC_SITE_URL' de kullanılabilir.
    const homeHref = "/";

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-8 left-8 z-[100]"
        >
            <Link
                href={homeHref}
                className="group flex items-center gap-4 py-2.5 pr-5 pl-2.5 rounded-full border border-red-500/40 bg-black/40 hover:bg-red-950/60 backdrop-blur-md transition-all duration-500 ease-out shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 border border-red-500/40 group-hover:bg-red-600/40 group-hover:border-red-500/60 transition-all duration-300">
                    <LuArrowLeft 
                        className="text-red-50 group-hover:text-white transition-colors duration-300 group-hover:-translate-x-0.5" 
                        size={16} 
                    />
                </div>
                <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/90 group-hover:text-white transition-colors duration-300">
                    Ana Sayfa
                </span>
            </Link>
        </motion.div>
    );
}
