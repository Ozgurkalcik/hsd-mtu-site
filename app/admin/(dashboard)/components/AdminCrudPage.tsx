'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/shared/api/supabase'
import { motion, AnimatePresence } from 'motion/react'

// ============================================
// GENERIC CRUD PAGE COMPONENT
// ============================================

type FieldType = 'text' | 'textarea' | 'date' | 'checkbox' | 'select' | 'number' | 'url' | 'image'

interface FieldConfig {
    key: string
    label: string
    type: FieldType
    required?: boolean
    placeholder?: string
    options?: { value: string; label: string }[] // for select
    defaultValue?: string | boolean | number
}

interface CrudPageConfig {
    tableName: string
    title: string
    singular: string
    fields: FieldConfig[]
    displayColumns: { key: string; label: string; render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }[]
}

function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading,
}: {
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    isLoading: boolean
}) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                className="admin-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCancel}
            >
                <motion.div
                    className="admin-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="admin-modal-title">{title}</h3>
                    <p className="admin-modal-desc">{message}</p>
                    <div className="admin-modal-actions">
                        <button className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={isLoading}>
                            İptal
                        </button>
                        <button className="admin-btn admin-btn--danger" onClick={onConfirm} disabled={isLoading}>
                            {isLoading ? 'Siliniyor...' : 'Sil'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default function AdminCrudPage({ config }: { config: CrudPageConfig }) {
    const [items, setItems] = useState<Record<string, unknown>[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [view, setView] = useState<'list' | 'form'>('list')
    const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null)
    const [formData, setFormData] = useState<Record<string, unknown>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const supabase = createClient()

    const fetchItems = useCallback(async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from(config.tableName)
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            setMessage({ type: 'error', text: 'Veriler yüklenirken hata oluştu.' })
        } else {
            setItems(data ?? [])
        }
        setIsLoading(false)
    }, [config.tableName])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    const initNewForm = () => {
        const defaults: Record<string, unknown> = {}
        config.fields.forEach((f) => {
            if (f.defaultValue !== undefined) {
                defaults[f.key] = f.defaultValue
            } else if (f.type === 'checkbox') {
                defaults[f.key] = false
            } else {
                defaults[f.key] = ''
            }
        })
        setFormData(defaults)
        setEditingItem(null)
        setView('form')
    }

    const initEditForm = (item: Record<string, unknown>) => {
        const data: Record<string, unknown> = {}
        config.fields.forEach((f) => {
            if (f.type === 'date' && item[f.key]) {
                // Tarihi input için formatla
                data[f.key] = new Date(item[f.key] as string).toISOString().slice(0, 16)
            } else if (f.type === 'checkbox') {
                data[f.key] = item[f.key] ?? false
            } else {
                data[f.key] = item[f.key] ?? ''
            }
        })
        setFormData(data)
        setEditingItem(item)
        setView('form')
    }

    const handleFileUpload = async (file: File, key: string) => {
        const { validateImageSize, compressImage } = await import('@/shared/utils/imageCompressor')

        // Boyut kontrolü — 6MB limit
        const { valid, error: sizeError } = validateImageSize(file)
        if (!valid) {
            setMessage({ type: 'error', text: sizeError! })
            return
        }

        setMessage({ type: 'success', text: 'Görsel sıkıştırılıyor...' })

        // Canvas sıkıştırma
        let processedFile = file
        try {
            processedFile = await compressImage(file)
        } catch {
            // Sıkıştırma başarısız olursa orijinali kullan
        }

        setMessage({ type: 'success', text: 'Görsel yükleniyor...' })

        const fileExt = processedFile.type === 'image/png' ? 'png' : 'jpg'
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, processedFile, {
                contentType: processedFile.type,
                upsert: true
            })

        if (uploadError) {
            console.error(uploadError)
            setMessage({ type: 'error', text: 'Görsel yüklenirken hata oluştu.' })
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath)

        setFormData((prev) => ({ ...prev, [key]: publicUrl }))
        setMessage({ type: 'success', text: 'Görsel başarıyla yüklendi.' })
    }

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        // Input sanitization
        const sanitized: Record<string, unknown> = {}
        config.fields.forEach((f) => {
            const val = formData[f.key]
            if (f.type === 'text' || f.type === 'textarea' || f.type === 'url' || f.type === 'image') {
                const trimmed = typeof val === 'string' ? val.trim() : val
                // Boş string'leri required olmayan alanlarda null yap
                sanitized[f.key] = (trimmed === '' && !f.required) ? null : trimmed
            } else if (f.type === 'date') {
                // Boş tarih alanlarını null olarak gönder (PostgreSQL '' kabul etmez)
                sanitized[f.key] = val ? new Date(val as string).toISOString() : null
            } else if (f.type === 'number') {
                sanitized[f.key] = val === '' || val === null || val === undefined ? (f.required ? 0 : null) : Number(val)
            } else {
                sanitized[f.key] = val
            }
        })

        if (editingItem) {
            // Update
            const { error } = await supabase
                .from(config.tableName)
                .update(sanitized)
                .eq('id', editingItem.id)

            if (error) {
                console.error('Update error:', error)
                setMessage({ type: 'error', text: `Güncelleme hatası: ${error.message}` })
            } else {
                setMessage({ type: 'success', text: `${config.singular} güncellendi.` })
                setView('list')
                fetchItems()
            }
        } else {
            // Insert
            const { error } = await supabase
                .from(config.tableName)
                .insert(sanitized)

            if (error) {
                console.error('Insert error:', error)
                setMessage({ type: 'error', text: `Ekleme hatası: ${error.message}` })
            } else {
                setMessage({ type: 'success', text: `${config.singular} eklendi.` })
                setView('list')
                fetchItems()
            }
        }

        setIsSaving(false)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)

        const { error } = await supabase
            .from(config.tableName)
            .delete()
            .eq('id', deleteTarget)

        if (error) {
            setMessage({ type: 'error', text: 'Silme sırasında hata oluştu.' })
        } else {
            setMessage({ type: 'success', text: `${config.singular} silindi.` })
            fetchItems()
        }

        setDeleteTarget(null)
        setIsDeleting(false)
    }

    // Auto-hide message
    useEffect(() => {
        if (message) {
            const t = setTimeout(() => setMessage(null), 4000)
            return () => clearTimeout(t)
        }
    }, [message])

    return (
        <div>
            {/* Message Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            position: 'fixed',
                            top: '1.5rem',
                            right: '1.5rem',
                            zIndex: 9999,
                            padding: '0.75rem 1.25rem',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(220, 38, 38, 0.95)',
                            border: `1px solid ${message.type === 'success' ? '#34d399' : '#f87171'}`,
                            color: '#ffffff',
                            fontWeight: '500',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {view === 'list' ? (
                <>
                    {/* Header */}
                    <div className="admin-crud-header">
                        <div className="admin-page-header" style={{ marginBottom: 0 }}>
                            <motion.h1
                                className="admin-page-title"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {config.title}
                            </motion.h1>
                            <p className="admin-page-desc">
                                Toplam {items.length} {config.singular.toLowerCase()}
                            </p>
                        </div>
                        <button className="admin-btn admin-btn--primary" onClick={initNewForm}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
                            </svg>
                            Yeni {config.singular}
                        </button>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="admin-empty">
                            <div className="admin-loading-spinner" />
                        </div>
                    ) : items.length === 0 ? (
                        <motion.div
                            className="admin-table-wrapper"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="admin-empty">
                                <div className="admin-empty-icon">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                                    </svg>
                                </div>
                                <p className="admin-empty-title">Henüz {config.singular.toLowerCase()} yok</p>
                                <p className="admin-empty-desc">İlk {config.singular.toLowerCase()} eklemek için yukarıdaki butonu kullanın.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="admin-table-wrapper"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        {config.displayColumns.map((col) => (
                                            <th key={col.key}>{col.label}</th>
                                        ))}
                                        <th style={{ width: '120px' }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.id as string}>
                                            {config.displayColumns.map((col) => (
                                                <td key={col.key}>
                                                    {col.render
                                                        ? col.render(item[col.key], item)
                                                        : String(item[col.key] ?? '—')}
                                                </td>
                                            ))}
                                            <td>
                                                <div className="admin-table-actions">
                                                    <button
                                                        className="admin-btn admin-btn--ghost admin-btn--sm"
                                                        onClick={() => initEditForm(item)}
                                                    >
                                                        Düzenle
                                                    </button>
                                                    <button
                                                        className="admin-btn admin-btn--danger admin-btn--sm"
                                                        onClick={() => setDeleteTarget(item.id as string)}
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </>
            ) : (
                /* Form View */
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="admin-crud-header">
                        <div className="admin-page-header" style={{ marginBottom: 0 }}>
                            <h1 className="admin-page-title">
                                {editingItem ? `${config.singular} Düzenle` : `Yeni ${config.singular}`}
                            </h1>
                        </div>
                        <button className="admin-btn admin-btn--ghost" onClick={() => setView('list')}>
                            ← Geri
                        </button>
                    </div>

                    <div className="admin-form">
                        {config.fields.map((field) => (
                            <div key={field.key} className="admin-form-group">
                                {field.type === 'checkbox' ? (
                                    <div className="admin-form-checkbox-row">
                                        <input
                                            type="checkbox"
                                            id={field.key}
                                            className="admin-form-checkbox"
                                            checked={!!formData[field.key]}
                                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                                        />
                                        <label htmlFor={field.key} className="admin-form-label" style={{ cursor: 'pointer' }}>
                                            {field.label}
                                        </label>
                                    </div>
                                ) : (
                                    <>
                                        <label htmlFor={field.key} className="admin-form-label">
                                            {field.label} {field.required && <span style={{ color: '#dc2626' }}>*</span>}
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                id={field.key}
                                                className="admin-form-input admin-form-textarea"
                                                value={(formData[field.key] as string) || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                id={field.key}
                                                className="admin-form-input admin-form-select"
                                                value={(formData[field.key] as string) || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                required={field.required}
                                            >
                                                <option value="">Seçiniz...</option>
                                                {field.options?.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'date' ? (
                                            <input
                                                id={field.key}
                                                type="datetime-local"
                                                max="9999-12-31T23:59"
                                                className="admin-form-input"
                                                value={(formData[field.key] as string) || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                required={field.required}
                                            />
                                        ) : field.type === 'image' ? (
                                            <div>
                                                {!!formData[field.key] && (
                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <img
                                                            src={formData[field.key] as string}
                                                            alt="Önizleme"
                                                            style={{ maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                        />
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    id={field.key}
                                                    accept="image/*"
                                                    className="admin-form-input"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleFileUpload(e.target.files[0], field.key)
                                                        }
                                                    }}
                                                />
                                                <input
                                                    type="hidden"
                                                    value={(formData[field.key] as string) || ''}
                                                    required={field.required}
                                                />
                                                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
                                                    Maksimum 6MB yüklenebilir. Görseller otomatik olarak sıkıştırılır. veya URL girin:
                                                </p>
                                                <input
                                                    type="url"
                                                    className="admin-form-input"
                                                    style={{ marginTop: '0.25rem' }}
                                                    placeholder="https://..."
                                                    value={(formData[field.key] as string) || ''}
                                                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                id={field.key}
                                                type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                                                className="admin-form-input"
                                                value={(formData[field.key] as string) || ''}
                                                onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        ))}

                        <div className="admin-form-actions">
                            <button
                                className="admin-btn admin-btn--primary"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Kaydediliyor...' : editingItem ? 'Güncelle' : 'Kaydet'}
                            </button>
                            <button className="admin-btn admin-btn--ghost" onClick={() => setView('list')}>
                                İptal
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                title={`${config.singular} Sil`}
                message={`Bu ${config.singular.toLowerCase()} kalıcı olarak silinecek. Devam etmek istiyor musunuz?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    )
}
