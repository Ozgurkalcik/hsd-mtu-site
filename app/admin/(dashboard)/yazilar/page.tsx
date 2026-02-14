'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const PUBLISHED_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Yayında' : 'Taslak'}
    </span>
)

const DATE_RENDER = (value: unknown) =>
    value ? new Date(value as string).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function ArticlesPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'articles',
                title: 'Yazılar',
                singular: 'Yazı',
                fields: [
                    { key: 'title', label: 'Başlık', type: 'text', required: true, placeholder: 'Yazı başlığı' },
                    { key: 'content', label: 'İçerik', type: 'textarea', required: true, placeholder: 'Yazı içeriği...' },
                    { key: 'excerpt', label: 'Özet', type: 'text', placeholder: 'Kısa açıklama' },
                    { key: 'author_name', label: 'Yazar', type: 'text', placeholder: 'Yazar adı' },
                    { key: 'image_url', label: 'Kapak Görseli', type: 'image', placeholder: 'Görsel yükleyin veya URL girin' },
                    { key: 'is_published', label: 'Yayında', type: 'checkbox', defaultValue: false },
                ],
                displayColumns: [
                    { key: 'title', label: 'Başlık' },
                    { key: 'author_name', label: 'Yazar' },
                    { key: 'is_published', label: 'Durum', render: PUBLISHED_BADGE },
                    { key: 'created_at', label: 'Tarih', render: DATE_RENDER },
                ],
            }}
        />
    )
}
