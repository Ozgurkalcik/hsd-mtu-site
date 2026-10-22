# HSD MTÜ — Rol Tabanlı Erişim Denetimi (RBAC) Matrisi

**Versiyon:** 2.1.0  
**Tarih:** 23 Ekim 2026  
**Durum:** Üretim Standardı (En Az Yetki İlkesi - Principle of Least Privilege)

---

## 1. Kanonik Roller ve Hiyerarşi

HSD MTÜ Topluluk Çalışma Alanı (Workspace) ve Yönetim Paneli, açıkça tanımlanmış 5 ana iç rol ve anonim dış erişim seviyesine sahiptir:

```
                    ┌─────────────────┐
                    │   super_admin   │ (Tam Sistem Hakimiyeti, Güvenlik, Rol Atama)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ workspace_admin │ (Üye, Komite ve Etkinlik Yönetimi)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     editor      │ (Etkinlik İçerikleri, RSVP ve Katılımcı Yönetimi)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   contributor   │ (Kendi Görevleri, Etkinlik Oluşturma ve Yorum Yapma)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     viewer      │ (Yalnızca Çalışma Alanı İçeriğini İzleme)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      anon       │ (Genel Web Ziyaretçisi - Sıfır Özel Workspace Verisi)
                    └─────────────────┘
```

> **Önemli İlke 1 — Bilinmeyen Roller (Default-Deny):**  
> `admin`, `manager`, `moderator` veya tanımsız herhangi bir rol string'i Workspace yönetim sisteminde kesinlikle reddedilir (`isUserAdminRole` yalnızca `super_admin` ve `workspace_admin` kabul eder).
>
> **Önemli İlke 2 — Komite Başkanları (Committee Leads):**  
> `event_lead`, `tech_lead`, `design_lead` vb. unvanlar bir rol türü değil, `workspace_groups` üzerindeki bir görevlendirmedir (`lead_id`, `lead_name`). Komite başkanları sistem seviyesinde yönetici (`super_admin` / `workspace_admin`) değildir; en fazla `editor` veya `contributor` rolüne atanırlar.
>
> **Önemli İlke 3 — Eski Yönetim Paneli (`admin_users`):**  
> `/admin/login` üzerinden Supabase Auth ile giriş yapan yöneticiler `admin_users` tablosunda doğrulanır. Workspace tarafına geçerken bu yöneticiler yetki düzeylerine göre kanonik `super_admin` veya `workspace_admin` rollerine eşlenir.

---

## 2. Detaylı Rol Yetki Matrisi (Feature / Action Matrix)

| Yetki / İşlem | super_admin | workspace_admin | editor | contributor | viewer | anon |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Giriş ve Oturum Açma** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Workspace Takvimini ve Etkinlikleri Görüntüleme** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Etkinlik Oluşturma** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Kendi Etkinliğini Düzenleme/Silme** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Başkalarının Etkinliğini Düzenleme/Silme** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Etkinliklere Yorum Yapma** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Kendi Yorumunu Silme/Düzenleme** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Başkalarının Yorumunu Silme** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Alt Görev (Subtask) Ekleme/Tamamlama** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Alt Görev Silme** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **LCV Katılım Bildirimi (Attendance - RSVP)** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Etkinlik Katılımcı Listesini Görme (KVKK)** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Katılımcı Bilet Check-in Yapma** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Harici Duyuru / Discord Webhook Gönderme** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Dosya Yükleme (Attachment)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Yeni Üye Ekleme / Davet Etme** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Üye Bilgilerini Güncelleme** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Üyeyi Süper Yönetici Yapma** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Süper Yönetici Bilgilerini Değiştirme** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Üye Silme / Askıya Alma** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Yönetici Notlarını (`admin_notes`) Görme/Yazma** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Kullanıcı Rol İzinlerini Değiştirme** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sistem ve Güvenlik Ayarlarını Değiştirme** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Aktif Oturumları Listeleme ve İptal Etme** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Denetim Günlüklerini (Audit Logs) İnceleme** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Halka Açık Vitrin Etkinliklerini Görme (`/`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Halka Açık Etkinliğe Kayıt Olma (Public RSVP)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Rate Limited) |
| **Açılır Duyuru Popup'ını Görme (`SitePopup`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Açılır Duyuru Popup'ını Düzenleme (`/admin/popup`)**| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Veritabanı Düzeyinde RLS Erişim Kuralları

Tüm istekler doğrudan Supabase PostgREST veya Next.js Route Handler üzerinden geldiğinde aşağıdaki PostgreSQL Row Level Security (RLS) politikaları zorunlu kılınır:

| Tablo Adı | `anon` İzinleri | `authenticated` İzinleri | `service_role` (Next.js Sunucusu) |
|:---|:---|:---|:---|
| **`workspace_members`** | **TAMAMEN REVOKE (Sıfır erişim)** | **TAMAMEN REVOKE (Sıfır erişim)** | Tam CRUD erişimi (`sanitizeMember` süzgeciyle parola ve admin notları korunur). |
| **`workspace_events`** | SELECT (Yalnızca `visibility = 'public'`) | SELECT (Tüm dahili etkinlikler) | Tam CRUD erişimi. |
| **`workspace_event_attendees`** | **TAMAMEN REVOKE (Sıfır erişim)** | **TAMAMEN REVOKE (Sıfır erişim)** | Tam CRUD erişimi (KVKK koruması, Next.js RSVP API üzerinden). |
| **`workspace_event_comments`** | **TAMAMEN REVOKE (Sıfır erişim)** | SELECT (Yorumları okuma) | Tam CRUD erişimi. |
| **`workspace_event_subtasks`** | **TAMAMEN REVOKE (Sıfır erişim)** | SELECT (Görevleri okuma) | Tam CRUD erişimi. |
| **`workspace_groups`** | SELECT (Genel komite okuma) | SELECT (Genel komite okuma) | Tam CRUD erişimi (Yazma anonime tamamen kapalı). |
| **`workspace_settings`** | **TAMAMEN REVOKE** | SELECT (Ayarları okuma) | Tam CRUD erişimi. |
| **`workspace_security_settings`**| **TAMAMEN REVOKE** | **TAMAMEN REVOKE** | Tam CRUD erişimi (Yalnızca sunucu katmanı). |
| **`popup_settings`** | SELECT (SitePopup okuma) | SELECT + UPDATE (`admin_users` kaydı varsa) | Tam CRUD erişimi. |
| **`community_projects`** | SELECT (`is_active = true`) | SELECT (`is_active = true`) | Tam CRUD erişimi. |
| **`admin_users`** | **TAMAMEN REVOKE** | SELECT (`auth_id = auth.uid()`) | Tam CRUD erişimi. |
| **`workspace_notifications`** | **TAMAMEN REVOKE** | SELECT (Bildirimleri okuma) | Tam CRUD erişimi. |
| **`storage.objects` (`uploads`)** | SELECT (Halka açık medya) | SELECT + INSERT (Admin doğrulamasıyla) | Tam Storage erişimi. |
| **`storage.objects` (`workspace-files`)** | **TAMAMEN REVOKE** | **TAMAMEN REVOKE** | Tam Storage erişimi (Yalnızca güvenli indirme tokenı ile sunulur). |
