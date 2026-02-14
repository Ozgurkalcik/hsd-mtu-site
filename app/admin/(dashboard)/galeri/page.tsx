'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

const IMAGE_PREVIEW = (value: unknown) =>
    value ? (
        <img
            src={value as string}
            alt="Önizleme"
            style={{
                width: 48,
                height: 48,
                objectFit: 'cover',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        />
    ) : (
        <div style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#444',
            fontSize: '0.65rem',
        }}>
            N/A
        </div>
    )

export default function GalleryPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'gallery_images',
                title: 'Galeri',
                singular: 'Görsel',
                fields: [
                    { key: 'title', label: 'Başlık', type: 'text', placeholder: 'Görsel başlığı' },
                    { key: 'image_url', label: 'Görsel URL', type: 'url', required: true, placeholder: 'https://...' },
                    { key: 'alt_text', label: 'Alt Metin', type: 'text', placeholder: 'Görsel açıklaması' },
                    { key: 'category', label: 'Kategori', type: 'text', placeholder: 'Etkinlik, Toplantı...' },
                    { key: 'display_order', label: 'Sıralama', type: 'number', defaultValue: 0 },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'image_url', label: 'Önizleme', render: IMAGE_PREVIEW },
                    { key: 'title', label: 'Başlık' },
                    { key: 'category', label: 'Kategori' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
