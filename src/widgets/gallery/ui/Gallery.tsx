'use client';
import React, { useState, useEffect } from 'react';
import DomeGallery from '@/shared/ui/animations/DomeGallery/DomeGallery';
import { createClient } from '@/shared/api/supabase';

export default function Gallery() {
    const [images, setImages] = useState<{ src: string; alt: string }[]>([]);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('gallery_images')
            .select('id, title, image_url, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .then(({ data }: { data: any[] | null }) => {
                if (data && data.length > 0) {
                    setImages(data.map(item => ({
                        src: item.image_url,
                        alt: item.title || 'Galeri görseli',
                    })));
                }
            });
    }, []);

    return (
        <section className="relative w-full bg-black overflow-hidden" style={{ height: '100vh' }}>
            {/* Title Section */}
            <div className="absolute top-0 left-0 right-0 z-10 text-center pt-8 md:pt-12">
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tighter">Galeri</h2>
                <div className="h-0.5 w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FF3333, transparent)' }}></div>
            </div>

            <div className="w-full h-full">
                {images.length > 0 ? (
                    <DomeGallery
                        images={images}
                        overlayBlurColor="#000000"
                        fit={0.8}
                        minRadius={600}
                        maxVerticalRotationDeg={0}
                        segments={34}
                        dragDampening={2}
                        grayscale={true}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-gray-400 text-lg">Henüz galeri görseli eklenmemiştir.</p>
                        <p className="text-gray-600 text-sm mt-2">Görseller eklendiğinde burada görünecek.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
