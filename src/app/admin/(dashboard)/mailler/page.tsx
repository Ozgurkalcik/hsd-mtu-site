'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

export default function ContactEmailsPage() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'contact_emails',
                title: 'İletişim Mailleri',
                singular: 'E-posta Adresi',
                fields: [
                    { key: 'email', label: 'E-posta Adresi', type: 'text', required: true, placeholder: 'ornek@email.com' },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'email', label: 'E-posta' },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
