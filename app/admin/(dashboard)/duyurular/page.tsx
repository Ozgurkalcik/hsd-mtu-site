'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

const DATE_RENDER = (value: unknown) =>
    value ? new Date(value as string).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function AnnouncementsPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'announcements',
                title: 'Duyurular',
                singular: 'Duyuru',
                fields: [
                    { key: 'title', label: 'Başlık', type: 'text', required: true, placeholder: 'Duyuru başlığı' },
                    { key: 'content', label: 'İçerik', type: 'textarea', required: true, placeholder: 'Duyuru içeriği...' },
                    { key: 'excerpt', label: 'Özet', type: 'text', placeholder: 'Kısa açıklama' },
                    { key: 'image_url', label: 'Görsel', type: 'image', placeholder: 'Görsel yükleyin veya URL girin' },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                    { key: 'is_pinned', label: 'Sabitlenmiş', type: 'checkbox', defaultValue: false },
                ],
                displayColumns: [
                    { key: 'title', label: 'Başlık' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                    { key: 'created_at', label: 'Tarih', render: DATE_RENDER },
                ],
            }}
        />
    )
}
