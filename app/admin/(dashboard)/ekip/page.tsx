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
                    { key: 'department', label: 'Departman', type: 'text', placeholder: 'Yazılım, Tasarım...' },
                    { key: 'bio', label: 'Biyografi', type: 'textarea', placeholder: 'Kısa biyografi...' },
                    { key: 'image_url', label: 'Profil Fotoğrafı URL', type: 'url', placeholder: 'https://...' },
                    { key: 'linkedin_url', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/...' },
                    { key: 'github_url', label: 'GitHub', type: 'url', placeholder: 'https://github.com/...' },
                    { key: 'twitter_url', label: 'Twitter / X', type: 'url', placeholder: 'https://x.com/...' },
                    { key: 'display_order', label: 'Sıralama', type: 'number', defaultValue: 0 },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'full_name', label: 'Ad Soyad' },
                    { key: 'role_title', label: 'Rol' },
                    { key: 'department', label: 'Departman' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
