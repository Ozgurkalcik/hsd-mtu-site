'use client'

import AdminCrudPage from '../components/AdminCrudPage'

const STATUS_BADGE = (value: unknown) => (
    <span className={`admin-badge ${value ? 'admin-badge--active' : 'admin-badge--inactive'}`}>
        {value ? 'Aktif' : 'Pasif'}
    </span>
)

const DATE_RENDER = (value: unknown) =>
    value ? new Date(value as string).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function CustomPagesAdmin() {
    return (
        <AdminCrudPage
            config={{
                tableName: 'custom_pages',
                title: 'Özel Sayfalar',
                singular: 'Sayfa',
                fields: [
                    { key: 'title', label: 'Başlık', type: 'text', required: true, placeholder: 'Sayfa Başlığı' },
                    { key: 'slug', label: 'Uzantı (Slug)', type: 'text', required: true, placeholder: 'ornek-sayfa-url (Boşluk bırakmayın, küçük harf kullanın)' },
                    { key: 'image', label: 'Ana Görsel', type: 'image' },
                    { key: 'description', label: 'İçerik (Açıklama)', type: 'textarea', placeholder: 'Sayfa detaylarını buraya yazabilirsiniz...' },
                    { key: 'action_text', label: 'Buton Metni', type: 'text', placeholder: 'Örn: Kayıt Ol (Boşsa "Detaylara Git" yazar)' },
                    { key: 'action_url', label: 'Eylem Linki (Buton)', type: 'text', placeholder: 'https://... (Sayfa sonunda buton olarak çıkar)' },
                    { key: 'event_date', label: 'Tarih', type: 'date' },
                    { key: 'location', label: 'Mekan / Adres', type: 'text', placeholder: 'Sayfaya mekan bilgisi eklemek için doldurun' },
                    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
                ],
                displayColumns: [
                    { key: 'title', label: 'Başlık' },
                    { key: 'slug', label: 'Uzantı', render: (val) => <span style={{ opacity: 0.7, fontSize: '0.85em' }}>/sayfa/{val as string}</span> },
                    { key: 'event_date', label: 'Tarih', render: DATE_RENDER },
                    { key: 'is_active', label: 'Durum', render: STATUS_BADGE },
                ],
            }}
        />
    )
}
