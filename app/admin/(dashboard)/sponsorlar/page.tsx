'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

export default function SponsorsPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'sponsors',
                title: 'Sponsorlar',
                singular: 'Sponsor',
                fields: [
                    { key: 'name', label: 'Sponsor Adı', type: 'text', required: true, placeholder: 'Şirket adı' },
                    { key: 'logo_url', label: 'Logo', type: 'image', required: true, placeholder: 'Logo yükleyin veya URL girin' },
                    { key: 'website_url', label: 'Web Sitesi', type: 'url', placeholder: 'https://...' },
                    { key: 'display_order', label: 'Sıralama', type: 'number', defaultValue: 0 },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'name', label: 'Sponsor' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}

