# HSD Malatya Turgut Özal Topluluğu

HSD Malatya Turgut Özal Topluluğu'nun resmi web sitesi. Next.js, TypeScript ve Tailwind CSS ile geliştirilmiştir.

## Proje Hakkında

HSD (High School Developers) Malatya Turgut Özal Topluluğu, lise öğrencilerine yönelik yazılım geliştirme ve teknoloji inovasyonu konusunda çalışan bir topluluktur.

## Teknolojiler

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **React 19** - UI library

## Kurulum ve Başlatma

### Gereksinimler
- Node.js 18+ 
- npm veya yarn

### Kurulum

```bash
# Bağımlılıkları yükleyin
npm install
```

### Development Server

```bash
npm run dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açarak uygulamayı görüntüleyebilirsiniz.

### Build

```bash
npm run build
npm start
```

## Proje Yapısı

```
hsd-mtu-site/
├── app/                 # Next.js App Router
│   ├── page.tsx        # Ana sayfa
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global stiller
├── public/             # Statik dosyalar
└── package.json        # Proje bağımlılıkları
```

## Geliştirme

Site şu bölümleri içermektedir:
- Ana sayfa (Hero section)
- Hakkımızda bölümü
- Etkinlikler bölümü (Workshop, Hackathon, Tech Talks)
- İletişim formu

## Lisans

© 2024 HSD Malatya Turgut Özal Topluluğu
