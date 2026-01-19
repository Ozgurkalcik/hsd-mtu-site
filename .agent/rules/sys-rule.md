---
trigger: always_on
---

# Performans ve Mimari Standartları

**Sistem Durumu:** YÜKSEK DERECEDE OPTİMİZE EDİLMİŞ
**Ana Direktif:** Sıfır Atık Kaynak Kullanımı

Bu proje, agresif bir "Viewport Freeze" (Görünüm Alanı Dondurma) ve "Background Throttling" (Arka Plan Sınırlama) mimarisi kullanmaktadır. Yeni eklenen tüm özellikler, performans kaybını (ısınma/gecikme) önlemek için bu standartlara uymak **ZORUNDADIR**.

## 1. "Frozen" (Dondurulmuş) Mimarisi

### Temel Kavram
Site "Bölümlere" (Sections) ayrılmıştır. Yalnızca **Görünür Bölüm** ve onun hemen komşuları (1 üst, 1 alt) CPU/GPU kaynaklarını tüketebilir.
- **Aktif Bölge:** Viewport ± %100 kenar boşluğu.
- **Dondurulmuş Bölge:** Diğer her şey.

### Bileşenler
- **`components/FrozenSection.tsx`**: Tüm üst düzey sayfa bölümleri için zorunlu sarmalayıcı (wrapper).
    - `rootMargin: '100% 0px 100% 0px'` ile `IntersectionObserver` kullanır.
    - `FrozenContext` (`useFrozen` hook'u) sağlar.
    - DOM öğesine `.is-frozen-section` sınıfını ekler.

### Yeni Bileşenler İçin Kurallar
Şu özellikleri kullanan bir bileşen eklerseniz:
- `requestAnimationFrame`
- `setInterval`
- `Three.js` / WebGL
- `GSAP` ticker'ları

**Şunları YAPMALISINIZ:**
1.  **Context'i tüketin**: Bileşeninizin içinde `const isFrozen = useFrozen();` içe aktarın.
2.  **Yürütmeyi durdurun**: Render döngünüzde `if (isFrozen) return;` kontrolü yapın veya değişken güncellemelerini iptal edin.
    ```typescript
    const isFrozen = useFrozen();
    
    useFrame(() => {
      if (isFrozen) return; // RENDER'I DURDUR
      // ... gerçek render mantığı
    });
    ```
3.  **Üst Sarmalayıcıdan Emin Olun**: Bileşenin `app/page.tsx` içinde bir `<FrozenSection>` içine yerleştirildiğinden (veya açıkça sarmalandığından) emin olun.

## 2. Arka Plan Sınırlandırma (Global)

- **`components/VisibilityController.tsx`**: `document.hidden` durumunu izler.
    - **GSAP**: Global ticker'ı duraklatır (`gsap.ticker.fps(0)`).
    - **CSS**: `<body>` öğesine `.is-hidden` sınıfını ekler.
    - **Global CSS**: `app/globals.css`, `.is-hidden` mevcut olduğunda `animation-play-state: paused !important` kuralını zorlar.

## 3. Doğrulanmış Ağır Bileşenler
Bu bileşenler zaten optimize edilmiştir. Mantıklarını bozmayın:
- `LiquidChrome`: `isFrozen`, `document.hidden` veya kesişim durumunda duraklar.
- `FloatingLines`: `isFrozen`, `document.hidden` durumunda duraklar.
- `FaultyTerminal`: `isFrozen` durumunda duraklar.
- `StickerPeel`: Global GSAP duraklatmasıyla optimize edilir.

## 4. CSS Animasyonları
Tüm CSS animasyonları, şu kural aracılığıyla ekran dışında otomatik olarak duraklatılır:
```css
.is-frozen-section * {
  animation-play-state: paused !important;
}
```
Bölümün sarmalayıcısı olduğu sürece CSS için ekstra bir işlem gerekmez.

---
**Özet:**
*   Sadece bir döngü eklemeyin. [useFrozen](file:///Users/mustafazahter/Desktop/hsd-mtu-site/components/FrozenSection.tsx) kancasına saygı duyup duymadığını **kontrol edin**.
*   [FrozenSection](file:///Users/mustafazahter/Desktop/hsd-mtu-site/components/FrozenSection.tsx) sarmalayıcılarını **kaldırmayın**.
*   [layout.tsx](file:///Users/mustafazahter/Desktop/hsd-mtu-site/app/layout.tsx) dosyasındaki [VisibilityController](file:///Users/mustafazahter/Desktop/hsd-mtu-site/components/VisibilityController.tsx) bileşenini aktif **tutun**.
