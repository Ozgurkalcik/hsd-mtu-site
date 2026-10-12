import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'HSD MTÜ - Huawei Student Developers',
        short_name: 'HSD MTÜ',
        description: 'Huawei Student Developers Malatya Turgut Özal Üniversitesi Topluluk Portalı & Çalışma Alanı',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#dc2626',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
