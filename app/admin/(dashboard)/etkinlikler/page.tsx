'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

const DATE_RENDER = (value: unknown) =>
    value ? new Date(value as string).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function EventsPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'events',
                title: 'Etkinlikler',
                singular: 'Etkinlik',
                fields: [
                    { key: 'title', label: 'Etkinlik Adı', type: 'text', required: true, placeholder: 'Etkinlik adı' },
                    { key: 'description', label: 'Açıklama', type: 'textarea', required: true, placeholder: 'Etkinlik açıklaması...' },
                    { key: 'excerpt', label: 'Özet', type: 'text', placeholder: 'Kısa açıklama' },
                    { key: 'event_date', label: 'Başlangıç Tarihi', type: 'date', required: true },
                    { key: 'end_date', label: 'Bitiş Tarihi', type: 'date' },
                    { key: 'location', label: 'Konum', type: 'text', placeholder: 'Etkinlik konumu' },
                    { key: 'image_url', label: 'Görsel URL', type: 'url', placeholder: 'https://...' },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'title', label: 'Etkinlik Adı' },
                    { key: 'event_date', label: 'Tarih', render: DATE_RENDER },
                    { key: 'location', label: 'Konum' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
