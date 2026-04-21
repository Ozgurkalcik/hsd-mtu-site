'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

export default function TeamPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'team_members',
                title: 'Ekip Üyeleri',
                singular: 'Ekip Üyesi',
                fields: [
                    { key: 'full_name', label: 'Ad Soyad', type: 'text', required: true, placeholder: 'Ad Soyad' },
                    { key: 'role_title', label: 'Ünvan / Rol', type: 'text', required: true, placeholder: 'Başkan, Yazılım Ekibi Lideri...' },
                    { key: 'committee', label: 'Komite', type: 'text', placeholder: 'Yazılım Komitesi, Tasarım Komitesi...' },
                    { key: 'image_url', label: 'Profil Fotoğrafı', type: 'image', placeholder: 'Görsel yükleyin veya URL girin' },
                    { key: 'display_order', label: 'Sıralama', type: 'number', defaultValue: 0 },
                    { key: 'is_leadership', label: 'Liderlik Ekibi', type: 'checkbox', defaultValue: false },
                    { key: 'is_showcase', label: 'Vitrin (Ana Sayfa)', type: 'checkbox', defaultValue: false },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'full_name', label: 'Ad Soyad' },
                    { key: 'role_title', label: 'Rol' },
                    { key: 'committee', label: 'Komite' },
                    { key: 'is_leadership', label: 'Kadro', render: (val) => val ? 'Dev' : 'Komite' },
                    { key: 'is_showcase', label: 'Vitrin', render: (val) => val ? '✅' : '-' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
