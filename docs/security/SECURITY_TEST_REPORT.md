# HSD MTÜ — Güvenlik Test ve Doğrulama Raporu (Security Test Report)

**Tarih:** 23 Ekim 2026  
**Test Paketi:** `scripts/security-regression-tests.mjs` & Next.js Typecheck / Build  
**Sonuç:** 31/31 PASS (%100 Başarı) — Derleme: Başarılı (40/40 Sayfa)

---

## 1. Test Yürütme ve Ortam Bilgisi

| Parametre | Değer |
|:---|:---|
| **Node.js Versiyonu** | v24.11.1 |
| **Next.js Versiyonu** | 16.2.2 (Turbopack, App Router) |
| **Test Komutu** | `node scripts/security-regression-tests.mjs` |
| **Tip Denetimi Komutu** | `npx tsc --noEmit` |
| **Üretim Derleme Komutu** | `npm run build` |

---

## 2. Detaylı Test Sonuçları Tablosu (31 Senaryo)

| # | Test Adı | Kategori | Beklenen Davranış | Sonuç | Kanıt |
|:---:|:---|:---:|:---|:---:|:---|
| **T01** | Meşru HMAC İmzalı Token Doğrulama | Session/HMAC | Geçerli token başarıyla çözümlenmeli | **PASS** | `userId: 'mem_1', role: 'viewer'` doğrulandı. |
| **T02** | Payload Tahrifatı (Role Escalation) | Session/HMAC | `viewer` rolünü `super_admin` yapan sahte token reddedilmeli | **PASS** | İmza uyuşmazlığı tespit edildi, `null` döndü. |
| **T03** | Bozulmuş / Sahte İmza Reddi | Session/HMAC | Corrupted signature reddedilmeli | **PASS** | `timingSafeEqual` başarısız oldu, `null` döndü. |
| **T04** | Süresi Dolmuş Token Reddi | Session/HMAC | `expiresAt` geçmiş tokenlar kabul edilmemeli | **PASS** | Zaman aşımı kontrolü tokenı düşürdü. |
| **T05** | Tahmin Edilebilir Secret Koruması | Session/HMAC | Eski `hsd_session_production` ile imzalanan token reddedilmeli | **PASS** | Farklı secret imzası reddedildi. |
| **T06** | Fail-Closed Secret Doğrulaması | Session/FailClosed | Üretimde `WORKSPACE_SESSION_SECRET` eksikse fail-closed olmalı | **PASS** | Açık konfigürasyon hatası fırlatıldı (`MissingSessionSecretConfigurationError`). |
| **T07** | Geliştirici Ortamı İzolasyonu | Session/FailClosed | Yerel dev/test ortamında izole 32-byte anahtar çalışmalı | **PASS** | Geliştirici ortamı hatasız çalıştı. |
| **T08** | PBKDF2 Doğru Parola Doğrulaması | Auth/Password | 100k iterasyon PBKDF2 SHA-512 doğru şifreyi onaylamalı | **PASS** | `verifyPassword` `true` döndü. |
| **T09** | PBKDF2 Yanlış Parola Reddi | Auth/Password | Hatalı şifre denemesi başarısız olmalı | **PASS** | `verifyPassword` `false` döndü. |
| **T10** | Sabit Zamanlı (Timing-Safe) Karşılaştırma | Auth/Password | Zamanlama saldırılarına karşı sabit zamanlı SHA-256 | **PASS** | Timing-safe buffer karşılaştırması doğrulandı. |
| **T11** | `super_admin` Yönetici Tanıma | RBAC | Yönetici olarak doğrulanmalı | **PASS** | `isUserAdminRole('super_admin') === true` |
| **T12** | `workspace_admin` Yönetici Tanıma | RBAC | Yönetici olarak doğrulanmalı | **PASS** | `isUserAdminRole('workspace_admin') === true` |
| **T13** | `admin` (Kanonik Olmayan Değer) Reddi | RBAC | Kanonik olmayan `'admin'` rolü yönetici KABUL EDİLMEMELİ | **PASS** | `isUserAdminRole('admin') === false` |
| **T14** | `event_lead` Yönetici Reddi | RBAC | Komite başkanı unvanı yönetici KABUL EDİLMEMELİ | **PASS** | `isUserAdminRole('event_lead') === false` |
| **T15** | `tech_lead` Yönetici Reddi | RBAC | Komite başkanı unvanı yönetici KABUL EDİLMEMELİ | **PASS** | `isUserAdminRole('tech_lead') === false` |
| **T16** | `design_lead` Yönetici Reddi | RBAC | Komite başkanı unvanı yönetici KABUL EDİLMEMELİ | **PASS** | `isUserAdminRole('design_lead') === false` |
| **T17** | `contributor` Yönetici Reddi | RBAC | Normal üye yönetici KABUL EDİLMEMELİ | **PASS** | `isUserAdminRole('contributor') === false` |
| **T18** | `viewer` Yönetici Reddi | RBAC | İzleyici üye yönetici KABUL EDİLMEMELİ | **PASS** | `isUserAdminRole('viewer') === false` |
| **T19** | Bilinmeyen Roller (Default-Deny) | RBAC | `manager`, `moderator` vb. tanımsız roller reddedilmeli | **PASS** | Default-deny kuralı doğrulandı. |
| **T20** | Parola Özeti İzolasyonu | Data Privacy | `password_hash` alanı her koşulda yanıttan silinmeli | **PASS** | `!('password_hash' in member)` doğrulandı. |
| **T21** | Yönetici Notları İzolasyonu | Data Privacy | `admin_notes` normal üyelerden gizlenmeli | **PASS** | `!('admin_notes' in publicView)` doğrulandı. |
| **T22** | Giriş Sayaçları İzolasyonu | Data Privacy | `failed_login_attempts` & `locked_until` gizlenmeli | **PASS** | Alanlar başarıyla temizlendi. |
| **T23** | Admin Çağrısında Notları Koruma | Data Privacy | `isCallerAdmin === true` iken notlar dönmeli | **PASS** | Admin panel görünümünde notlar korundu. |
| **T24** | Güvenlik Migration Varlığı | SQL/RLS | `20261023_lockdown_rls...sql` mevcut olmalı | **PASS** | Migration dosyası diskte doğrulandı. |
| **T25** | `workspace_members` Anon/Auth İptali | SQL/RLS | `anon` ve `authenticated` için PostgREST tamamen kapatılmalı | **PASS** | `REVOKE ALL ON public.workspace_members FROM anon, authenticated;` doğrulandı. |
| **T26** | `workspace_event_attendees` Anon İptali | SQL/RLS | RSVP KVKK tablosu doğrudan erişime kapatılmalı | **PASS** | `REVOKE ALL ... FROM anon, authenticated;` doğrulandı. |
| **T27** | `workspace_groups` Anon UPDATE İptali | SQL/RLS | 20261017'deki anonim UPDATE açığı kapatılmalı | **PASS** | `REVOKE ... ON public.workspace_groups FROM anon;` doğrulandı. |
| **T28** | `popup_settings` Güvenli Erişim | SQL/RLS | SitePopup genel okuma açık, anonim yazma kapalı olmalı | **PASS** | Public SELECT ve REVOKE anon yazma doğrulandı. |
| **T29** | `workspace_settings` İzolasyonu | SQL/RLS | 20261014 yetkisiz UPDATE kapatılmalı | **PASS** | `REVOKE ... ON public.workspace_settings FROM anon, authenticated;` doğrulandı. |
| **T30** | `admin_users` İzolasyonu | SQL/RLS | `admin_users` anonime kapatılmalı | **PASS** | `REVOKE ALL ... FROM anon;` doğrulandı. |
| **T31** | `search_path = ''` Yapılandırması | SQL/RLS | Tetikleyici fonksiyonları güvenli search_path içermeli | **PASS** | `SET search_path = ''` doğrulandı. |

---

## 3. Derleme ve TypeScript Statik Analiz Kanıtı

```text
▲ Next.js 16.2.2 (Turbopack)
- Environments: .env.local
  Creating an optimized production build ...
✓ Compiled successfully in 5.0s
  Running TypeScript ...
  Finished TypeScript in 4.2s ...
  Collecting page data using 31 workers ...
  Generating static pages using 31 workers (0/40) ...
  Generating static pages using 31 workers (10/40) 
  Generating static pages using 31 workers (20/40) 
  Generating static pages using 31 workers (30/40) 
✓ Generating static pages using 31 workers (40/40) in 445ms
  Finalizing page optimization ...

Route (app)
├ ○ /
├ ○ /admin
├ ○ /admin/workspace
├ ƒ /api/workspace/auth/login
├ ƒ /api/workspace/rsvp
├ ƒ /api/workspace/webhook
├ ○ /workspace
...
40 route başarıyla derlendi. Hata sayısı: 0
```
