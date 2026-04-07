'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import './GlobalLoader.css'

export default function GlobalLoader() {
    const [isLoading, setIsLoading] = useState(true)
    const [isExiting, setIsExiting] = useState(false)

    // Handle soft routing loading if needed, or just normal page load
    useEffect(() => {
        if (!isLoading) return;

        const finishLoading = () => {
            // Biraz pürüzsüz geçiş için gecikme
            setTimeout(() => {
                setIsLoading(false)
                setIsExiting(true)
            }, 1000)
        }

        // Sayfadaki tüm resim ve dosyalar tamamen yüklendiğinde
        if (document.readyState === 'complete') {
            finishLoading()
        } else {
            window.addEventListener('load', finishLoading)
            
            // Eğer çok uzun süre yüklenmeyen bir dosya olursa diye güvenlik süresi (12 saniye)
            const fallback = setTimeout(finishLoading, 12000)

            return () => {
                window.removeEventListener('load', finishLoading)
                clearTimeout(fallback)
            }
        }
    }, [isLoading])

    return (
        <>
            {/* 
                JavaScript ile müdahale etmek yerine SSR aşamasında doğrudan style basılır. 
                Sayfa daha ilk parse edildiği anda scroll kapanır. 
                isExiting ile veda animasyonu tamamen bitene kadar scroll kapalı tutulur. 
            */}
            {(isLoading || isExiting) && (
                <style dangerouslySetInnerHTML={{ __html: `
                    body { overflow: hidden !important; }
                `}} />
            )}

            <AnimatePresence onExitComplete={() => setIsExiting(false)}>
                {isLoading && (
                <motion.div
                    className="global-loader-overlay"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="global-loader-center">
                        {/* Kırmızı Kalp Atışı Dalgaları */}
                        <div className="ripple-container">
                            <div className="ripple ripple-1"></div>
                            <div className="ripple ripple-2"></div>
                        </div>
                        
                        {/* Merkezdeki Logo */}
                        <div className="global-loader-logo-wrapper">
                            <Image
                                src="/images/hsd-logo-white.png"
                                alt="HSD Logo"
                                width={300}
                                height={300}
                                priority
                                className="global-loader-logo"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    )
}
