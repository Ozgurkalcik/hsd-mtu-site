# 🛡️ Güvenlik Politikası & Savunma Kılavuzu (Security Policy)

Bu repository, **açık kaynaklı (Public GitHub Repo)** statüsünde olduğu için projenin güvenliği, sıfır-güven (Zero-Trust) mimarisi ve çok katmanlı savunma (Defense-in-Depth) standartlarına göre yapılandırılmıştır.

---

## 1. 🔍 Otomatik Güvenlik ve Açık Tarama Aracı

Bu projede kod veya yetkilendirme değişikliklerinden sonra çalıştırılmak üzere özel geliştirilmiş kapsamlı bir güvenlik doğrulama aracı yer almaktadır:

```bash
node scripts/deep_security_scanner.mjs
```

### Bu Araç Neleri Denetler?
1. **Gizli Anahtar & Sızıntı Taraması:** Supabase Service Role Key, AWS Key, PGP/RSA özel anahtarlar, JWT gizli anahtarları ve veritabanı şifrelerinin repo dosyalarına yazılıp yazılmadığını regex düzeyinde tarar.
2. **.gitignore Bütünlüğü:** `.env`, `.env.local`, `.env*.local`, `node_modules` ve `.next` dizinlerinin repoya sızmasını engelleyen kuralları denetler.
3. **Workspace API Rota Korumaları:** Tüm kritik `/api/workspace/` uç noktalarında (`events`, `comments`, `subtasks`, `admin/members`, `admin/roles`, `admin/audit-logs`, `notifications`) oturum ve yetki korumalarının (`getWorkspaceSession`, `verifyAdmin`) aktifliğini doğrular.
4. **Supabase RLS (Row Level Security) Sıkılaştırması:** `anon` rolünün doğrudan veritabanına yetkisiz yazma (INSERT/UPDATE/DELETE) yapmasını engelleyen SQL politikalarını ve görünürlük filtrelerini (`public`, `admin_only`, `private`) denetler.
5. **Enjeksiyon Koruması:** SQL enjeksiyonu ve güvensiz sorgu birleştirmelerinin bulunmadığını parametrik sorgu kontrolüyle onaylar.

---

## 2. 🔐 Veritabanı & RLS Savunma Mimarisi (Row Level Security)

Public depolarda istemci tarafına gömülen `NEXT_PUBLIC_SUPABASE_ANON_KEY` genel bir anahtardır. Bu nedenle sistemimizin ilk güvenlik kalkanı **Supabase Row Level Security (RLS)** politikalarıdır.

- **Anonim Yazma Yasağı:** `workspace_comments`, `workspace_subtasks`, `workspace_notifications` ve `workspace_members` tablolarına `anon` rolünden doğrudan INSERT yapılamaz. Tüm işlemler Next.js Server API katmanındaki `getWorkspaceSession()` süzgecinden geçer.
- **Etkinlik Görünürlük Koruması (`visibility`):**
  - `public`: Tüm ziyaretçiler ve topluluk üyeleri okuyabilir.
  - `admin_only`: Sadece `super_admin`, `workspace_admin` veya `editor` rollerine sahip üyeler görebilir.
  - `private`: Yalnızca etkinliği oluşturan üye (`created_by`) veya `super_admin` görebilir.
- **Şifre Güvenliği:** Üye parolaları asla düz metin (plain text) olarak saklanmaz. `crypto.scryptSync` ve tuzlama (salt) algoritması ile 64 baytlık güvenli hash olarak tutulur.

---

## 3. 👥 Rol Tabanlı Erişim Kontrolü (RBAC) & Yönetici İşlemleri

Workspace yönetiminde uygulanan roller ve erişim seviyeleri:

| Rol | Görüntüleme | Etkinlik Ekleme | Etkinlik Düzenleme/Silme | Yönetim Paneli (/admin) |
|---|:---:|:---:|:---:|:---:|
| **👑 super_admin** | ✓ | ✓ | ✓ | ✓ (Tam Yetki) |
| **🛡️ workspace_admin** | ✓ | ✓ | ✓ | ✓ |
| **✍️ editor** | ✓ | ✓ | ✓ (Kendi/Komite) | ✕ |
| **💡 contributor** | ✓ | ✕ | ✕ (Yalnızca Yorum & Reaksiyon) | ✕ |
| **👀 viewer** | ✓ (Public) | ✕ | ✕ | ✕ |

---

## 4. 📝 Üye Değerlendirme & Özel Ekip Notları

Topluluk üyeleri hakkında yöneticiler ve çekirdek ekip tarafından girilen iç değerlendirme ve performans notları (`admin_notes` / `member_notes`), yalnızca yetkili yöneticilere sunulur ve genel API yanıtlarından filtrelenir.

---

## 5. 🧹 Güvenlik Denetim İzi (Audit Log) & Geçmiş Temizleme

Sistemde oturum açma, yetki değiştirme, şifre güncelleme ve üye silme gibi tüm kritik eylemler zaman damgası ve IP adresi ile `workspace_audit_logs` tablosunda kayıt altına alınır.
Yalnızca `super_admin` veya `workspace_admin` rolleri, yönetim panelindeki **"Denetim Geçmişini Temizle"** butonu ile güvenlik onayından sonra bu geçmişi sıfırlayabilir.

---

## 6. 🚨 Güvenlik Açığı Bildirimi

Bu depoda potansiyel bir güvenlik açığı veya bilgi sızıntısı tespit ettiğinizde lütfen GitHub Issues üzerinde açıkça paylaşmak yerine **security@hsdmtu.site** adresine e-posta gönderiniz. Bildirimler 24 saat içinde incelenip çözüme kavuşturulacaktır.
