'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

const TIER_BADGE = (value: unknown) => {
    const colors: Record<string, string> = {
        platinum: '#a78bfa',
        gold: '#f59e0b',
        silver: '#9ca3af',
        standard: '#666',
    }
    const color = colors[value as string] || '#666'
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.2rem 0.6rem',
            fontSize: '0.65rem',
            fontWeight: 500,
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color,
            background: `${color}14`,
            border: `1px solid ${color}30`,
        }}>
            {(value as string) || 'standard'}
        </span>
    )
}

export default function SponsorsPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'sponsors',
                title: 'Sponsorlar',
                singular: 'Sponsor',
                fields: [
                    { key: 'name', label: 'Sponsor Adı', type: 'text', required: true, placeholder: 'Şirket adı' },
                    { key: 'logo_url', label: 'Logo URL', type: 'url', placeholder: 'https://...' },
                    { key: 'website_url', label: 'Web Sitesi', type: 'url', placeholder: 'https://...' },
                    {
                        key: 'tier',
                        label: 'Seviye',
                        type: 'select',
                        options: [
                            { value: 'platinum', label: 'Platinum' },
                            { value: 'gold', label: 'Gold' },
                            { value: 'silver', label: 'Silver' },
                            { value: 'standard', label: 'Standard' },
                        ],
                        defaultValue: 'standard',
                    },
                    { key: 'display_order', label: 'Sıralama', type: 'number', defaultValue: 0 },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'name', label: 'Sponsor' },
                    { key: 'tier', label: 'Seviye', render: TIER_BADGE },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
