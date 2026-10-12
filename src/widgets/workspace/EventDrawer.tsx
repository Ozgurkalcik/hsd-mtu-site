'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    WorkspaceEvent,
    WorkspaceCalendar,
    WorkspaceGroup,
    WorkspaceMember,
    WorkspaceSubtask,
    WorkspaceComment,
    WorkspaceAttachment,
    WorkspaceRole,
    EventVisibility,
    WorkspaceReminder
} from '@/shared/api/workspaceTypes';

interface EventDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    event: WorkspaceEvent | null;
    initialDate?: Date | null;
    calendars: WorkspaceCalendar[];
    groups: WorkspaceGroup[];
    members: WorkspaceMember[];
    currentMember: WorkspaceMember | null;
    theme?: 'light' | 'dark';
    onEventSaved: (event: WorkspaceEvent) => void;
    onEventDeleted: (eventId: string) => void;
}

const PRESET_COLORS = [
    { name: 'Kırmızı (Etkinlik)', value: '#dc2626' },
    { name: 'Mor (Proje)', value: '#8b5cf6' },
    { name: 'Pembe (Sosyal/Tasarım)', value: '#ec4899' },
    { name: 'Kehribar (Medium)', value: '#f59e0b' },
    { name: 'Mavi (Koordinasyon)', value: '#3b82f6' },
    { name: 'Zümrüt (Resmi)', value: '#10b981' },
    { name: 'Cyan (Atölye)', value: '#06b6d4' },
    { name: 'Nötr (Genel)', value: '#71717a' },
];

// ⚡ 4 Çekirdek Komiteye Özel Gelişmiş Etkinlik Şablonları (Templates)
interface CommitteeTemplate {
    id: string;
    label: string;
    committeeKey: 'proj' | 'event' | 'social' | 'medium';
    committeeName: string;
    committeeBadge: string;
    committeeColor: string;
    calendarId: string;
    category: string;
    title: string;
    location: string;
    meetingLink?: string;
    durationMinutes: number;
    description: string;
    subtasks: string[];
}

const COMMITTEE_TEMPLATES: CommitteeTemplate[] = [
    // 🟣 1. PROJE KOMİTESİ (5 Şablon)
    {
        id: 'tmpl_proj_sprint',
        label: 'Sprint Planlama & Backlog',
        committeeKey: 'proj',
        committeeName: 'Proje Komitesi',
        committeeBadge: '🟣 Proje',
        committeeColor: '#8b5cf6',
        calendarId: 'cal_dev',
        category: 'Geliştirme',
        title: 'HSD Haftalık Sprint & Backlog Planlaması',
        location: 'Discord Ses Kanalı',
        meetingLink: 'https://discord.gg/hsdmtu',
        durationMinutes: 60,
        description: `### 🎯 Sprint Hedefleri & Çıktılar
- Geçen sprintin tamamlanan ve devreden işlerinin analizi
- GitHub Issues & PR önceliklendirmesi (High / Medium / Low)
- Bu haftaki milestone teslimatları ve test kapsamı
- Pair-programming eşleşmeleri ve kod mimarisi kararları`,
        subtasks: [
            'Geçmiş sprint retrospective notları incelendi',
            'GitHub Issue backlog temizlendi ve etiketlendi',
            'Geliştiricilere modül görevleri dağıtıldı',
            'Sprint bitiş tarihi ve demo günü teyit edildi',
            'Discord proje kanalına özet aktarıldı'
        ]
    },
    {
        id: 'tmpl_proj_review',
        label: 'Code Review & Refactor',
        committeeKey: 'proj',
        committeeName: 'Proje Komitesi',
        committeeBadge: '🟣 Proje',
        committeeColor: '#8b5cf6',
        calendarId: 'cal_dev',
        category: 'Geliştirme',
        title: 'Topluluk Projesi Kod İnceleme & Pair Programming',
        location: 'Google Meet',
        meetingLink: 'https://meet.google.com/hsd-mtu-code',
        durationMinutes: 90,
        description: `### 🔍 Kod İnceleme & Güvenlik Kapsamı
- Pull Request mimari ve TypeScript tip kontrolleri
- Supabase RLS politikaları ve veri güvenliği doğrulaması
- useFrozen() ve performans bütçesi kontrolü
- Production öncesi staging ortamı testi`,
        subtasks: [
            'Açık PR\'lar lokal ortama çekilip derlendi',
            'Linter, Prettier ve tip hataları giderildi',
            'Performans kriterleri (LCP, CLS) doğrulandı',
            'Kod sahibiyle geri bildirimler paylaşıldı ve merge edildi'
        ]
    },
    {
        id: 'tmpl_proj_hackathon',
        label: 'Hackathon & Maraton Kampı',
        committeeKey: 'proj',
        committeeName: 'Proje Komitesi',
        committeeBadge: '🟣 Proje',
        committeeColor: '#8b5cf6',
        calendarId: 'cal_dev',
        category: 'Hackathon',
        title: 'Teknik Hackathon & Proje Geliştirme Kampı',
        location: 'MTÜ Mühendislik Fakültesi D-102 Lab',
        durationMinutes: 180,
        description: `### 🚀 Hackathon Yol Haritası
- Problem tanımı ve Huawei Cloud / HarmonyOS / AI API seçimi
- MVP (Minimum Viable Product) kullanıcı akış şeması
- 24 saatlik geliştirme maratonu ve sunum demosu`,
        subtasks: [
            'Hackathon kuralları ve değerlendirme jürisi belirlendi',
            'Takım rolleri (Frontend, Backend, AI, Tasarım) dağıtıldı',
            'Boilerplate proje deposu (Next.js + Tailwind) klonlandı',
            'Jüri için 3 dakikalık sunum slaytı hazırlandı'
        ]
    },
    {
        id: 'tmpl_proj_workshop',
        label: 'Hands-on Teknik Atölye',
        committeeKey: 'proj',
        committeeName: 'Proje Komitesi',
        committeeBadge: '🟣 Proje',
        committeeColor: '#8b5cf6',
        calendarId: 'cal_dev',
        category: 'Workshop',
        title: 'Hands-on Teknik Atölye: Modern Web & Cloud Mimarisi',
        location: 'MTÜ Battalgazi D-105 Bilgisayar Lab',
        durationMinutes: 120,
        description: `### 💻 Atölye Kazanımları
- Next.js 16 App Router ve SSR mantığı
- Supabase gerçek zamanlı veri tabanı yönetimi
- Katılımcıların canlıda çalışan bir web uygulaması yayınlaması`,
        subtasks: [
            'Lab bilgisayarlarında Node.js ve VS Code kurulumu teyit edildi',
            'Örnek başlangıç reposu (Starter repo) hazırlandı',
            'Katılımcı kılavuzu (PDF) paylaşıldı',
            'Atölye sonu soru-cevap ve sertifika kaydı yapıldı'
        ]
    },
    {
        id: 'tmpl_proj_rfc',
        label: 'Mimari Tasarım (RFC)',
        committeeKey: 'proj',
        committeeName: 'Proje Komitesi',
        committeeBadge: '🟣 Proje',
        committeeColor: '#8b5cf6',
        calendarId: 'cal_dev',
        category: 'Toplantı',
        title: 'Sistem Mimarisi & RFC (Request for Comments) Toplantısı',
        location: 'Google Meet',
        meetingLink: 'https://meet.google.com/hsd-mtu-rfc',
        durationMinutes: 60,
        description: `### 📐 Mimari Tasarım Gündemi
- Yeni servis mimarisi ve mikro-servis geçiş fizibilitesi
- API şeması ve veri tabanı ilişkisel modeli (ER Diagram)
- Ölçeklenebilirlik ve sunucu kaynak analizi`,
        subtasks: [
            'RFC teknik dokümanı yazılıp ekibe iletildi',
            'Veritabanı ilişkileri ve indeks yapıları tartışıldı',
            'Teknik borç (tech debt) maddeleri listelendi',
            'Nihai mimari kararlar dokümante edildi'
        ]
    },

    // 🔴 2. ETKİNLİK & SPONSORLUK KOMİTESİ (5 Şablon)
    {
        id: 'tmpl_evt_summit',
        label: 'Teknoloji Zirvesi (Büyük)',
        committeeKey: 'event',
        committeeName: 'Etkinlik & Sponsorluk',
        committeeBadge: '🔴 Etkinlik',
        committeeColor: '#dc2626',
        calendarId: 'cal_core',
        category: 'Toplantı',
        title: 'HSD Malatya Teknoloji Zirvesi & Büyük Konferans',
        location: 'MTÜ Battalgazi Konferans Salonu',
        durationMinutes: 240,
        description: `### 🏛️ Zirve Detayları
- 200+ Üniversite öğrencisi ve yazılım sektörü profesyonelleri
- 4 Ana Oturum: Yapay Zeka, Bulut Bilişim, Mobil Ekosistem, Girişimcilik
- Networking alanı, çekilişler ve ikramlar`,
        subtasks: [
            'Konferans salonu rektörlük tahsis onayı alındı',
            '4 ana konuşmacının ulaşım ve konaklama planı netleşti',
            'Ses sistemi, LED ekran, mikrofon ve canlı yayın altyapısı kuruldu',
            'Etkinlik giriş QR barkod okuma ekibi görevlendirildi',
            'Etkinlik sonu katılımcı memnuniyet anketi iletildi'
        ]
    },
    {
        id: 'tmpl_evt_webinar',
        label: 'Webinar & Tech Talk',
        committeeKey: 'event',
        committeeName: 'Etkinlik & Sponsorluk',
        committeeBadge: '🔴 Etkinlik',
        committeeColor: '#dc2626',
        calendarId: 'cal_core',
        category: 'Toplantı',
        title: 'Konuk Konuşmacı ile Canlı Tech Talk & Webinar',
        location: 'Google Meet & YouTube Canlı Yayın',
        meetingLink: 'https://meet.google.com/hsd-techtalk',
        durationMinutes: 60,
        description: `### 🎙️ Webinar Akışı
- Konuk: Kıdemli Yazılım Mühendisi / Huawei Developer Expert
- 45 dk Teknik Sunum + 20 dk İnteraktif Soru-Cevap
- Canlı yayında katılımcılara hediye Huawei kuponları`,
        subtasks: [
            'Konuk ile prova yayını ve ses/ekran testi yapıldı',
            'YouTube Canlı Yayın linki oluşturulup topluluğa duyuruldu',
            'Moderatör soru listesi hazırlandı',
            'Canlı yayın chat moderatörleri atandı'
        ]
    },
    {
        id: 'tmpl_evt_sponsor',
        label: 'Sponsorluk Görüşmesi',
        committeeKey: 'event',
        committeeName: 'Etkinlik & Sponsorluk',
        committeeBadge: '🔴 Etkinlik',
        committeeColor: '#dc2626',
        calendarId: 'cal_core',
        category: 'Sponsorluk',
        title: 'Kurumsal Sponsorluk & Üniversite İş Birliği Görüşmesi',
        location: 'Google Meet',
        meetingLink: 'https://meet.google.com/hsd-sponsor-meet',
        durationMinutes: 45,
        description: `### 💼 Sponsorluk Toplantı Gündemi
- HSD MTÜ 2026 etkinlik takvimi ve erişim istatistikleri
- Platin, Altın ve Gümüş sponsorluk paketlerinin sunumu
- Staj, mentorluk ve teknik destek iş birlikleri`,
        subtasks: [
            'Güncel sponsorluk dosyası (Pitch Deck PDF) gönderildi',
            'Firma yetkilisinin bütçe talebi ve istekleri not alındı',
            'Resmi protokol taslağı hazırlandı',
            'Teşekkür e-postası ve sözleşme süreci takip edildi'
        ]
    },
    {
        id: 'tmpl_evt_stand',
        label: 'Kampüs Tanıtım Standı',
        committeeKey: 'event',
        committeeName: 'Etkinlik & Sponsorluk',
        committeeBadge: '🔴 Etkinlik',
        committeeColor: '#dc2626',
        calendarId: 'cal_core',
        category: 'Genel',
        title: 'Kampüs Tanıtım Standı & Yeni Üye Kabulü',
        location: 'MTÜ Battalgazi Merkez Fuaye Alanı',
        durationMinutes: 240,
        description: `### 🎪 Stant Organizasyonu
- Üniversite öğrencilerine HSD MTÜ faaliyetlerinin anlatılması
- Yeni dönem çalışma grupları için üye kaydı alınması
- Huawei sticker, defter ve hediye ürün dağıtımı`,
        subtasks: [
            'SKS Daire Başkanlığı stant izin dilekçesi onaylatıldı',
            'Roll-up bannerlar ve masa örtüsü stant alanına kuruldu',
            'Ekip üyeleri 2 saatlik nöbet çizelgesine yerleştirildi',
            'Karekodlu üye kayıt formu tablet üzerinde hazırlandı'
        ]
    },
    {
        id: 'tmpl_evt_official',
        label: 'Resmi İzin & Lojistik',
        committeeKey: 'event',
        committeeName: 'Etkinlik & Sponsorluk',
        committeeBadge: '🔴 Etkinlik',
        committeeColor: '#dc2626',
        calendarId: 'cal_core',
        category: 'Toplantı',
        title: 'Rektörlük / SKS Resmi İzin & Lojistik Toplantısı',
        location: 'MTÜ Rektörlük Binası Toplantı Salonu',
        durationMinutes: 45,
        description: `### 📜 Resmi Prosedürler
- Dönemlik etkinlik takviminin danışman hocaya sunulması
- Salon tahsis, güvenlik ve temizlik koordinasyonu
- Resmi onay yazılarının teslimi`,
        subtasks: [
            'Etkinlik talep dilekçesi danışman hocaya imzalatıldı',
            'Sağlık Kültür ve Spor (SKS) birimine teslim edildi',
            'Güvenlik amirliği etkinlik saatleri konusunda bilgilendirildi'
        ]
    },

    // 🌸 3. SOSYAL MEDYA & TASARIM KOMİTESİ (4 Şablon)
    {
        id: 'tmpl_soc_reels',
        label: 'Reels & Kısa Video',
        committeeKey: 'social',
        committeeName: 'Sosyal Medya & Tasarım',
        committeeBadge: '🌸 Sosyal',
        committeeColor: '#ec4899',
        calendarId: 'cal_social',
        category: 'Sosyal Medya',
        title: 'Instagram Reels & TikTok Dinamik Video Yayını',
        location: 'Instagram (@hsdmtu) & CapCut',
        durationMinutes: 60,
        description: `### 🎬 Video Konsepti
- 30-45 saniyelik dinamik etkinlik duyurusu / yazılım ipucu
- Kanca (Hook), değer önerisi ve harekete geçirici mesaj (CTA)
- Trend ses ve Huawei marka renklerine uygun tipografi`,
        subtasks: [
            'Ham video çekimleri tamamlandı',
            'CapCut / Premiere üzerinde dinamik altyazı ve efektler eklendi',
            'Açıklama metni, hashtagler ve etiketler hazırlandı',
            'Komite başkanı onayı sonrası en etkileşimli saatte yayınlandı'
        ]
    },
    {
        id: 'tmpl_soc_poster',
        label: 'Afiş & Baskı Tasarımı',
        committeeKey: 'social',
        committeeName: 'Sosyal Medya & Tasarım',
        committeeBadge: '🌸 Sosyal',
        committeeColor: '#ec4899',
        calendarId: 'cal_social',
        category: 'Sosyal Medya',
        title: 'Etkinlik Afişi, Banner ve Yaka Kartı Baskı Tasarımı',
        location: 'Figma Çalışma Alanı',
        durationMinutes: 90,
        description: `### 🎨 Baskı & Dijital Varlıklar
- 50x70cm Dikey Salon Afişi (CMYK 300 DPI)
- 1920x1080 LED Sahne Ekranı Görseli (RGB)
- Katılımcı ve Görevli Yaka Kartı Şablonu`,
        subtasks: [
            'Figma üzerinde 3 farklı konsept varyasyonu hazırlandı',
            'Tüm konuşmacı fotoğrafları ve unvanları teyit edildi',
            'Matbaa için kesim payı (bleed) ve renk profili kontrol edildi',
            'Baskı merkezine PDF çıktı teslim edildi'
        ]
    },
    {
        id: 'tmpl_soc_critique',
        label: 'Tasarım İncelemesi (Critique)',
        committeeKey: 'social',
        committeeName: 'Sosyal Medya & Tasarım',
        committeeBadge: '🌸 Sosyal',
        committeeColor: '#ec4899',
        calendarId: 'cal_social',
        category: 'Sosyal Medya',
        title: 'Haftalık Tasarım İnceleme & Brand Guidelines Kontrolü',
        location: 'Google Meet & Figma Live',
        meetingLink: 'https://meet.google.com/hsd-design-critique',
        durationMinutes: 60,
        description: `### 🖌️ İnceleme Kriterleri
- Huawei marka rehberi (renk kodları, logo güvenli alanları)
- Tipografi hiyerarşisi ve mobil ekran okunabilirliği
- Önümüzdeki haftanın içerik takviminin netleştirilmesi`,
        subtasks: [
            'Haftalık görsel taslakları Figma tahtasında toplandı',
            'Renk kontrastları ve font boyutları incelendi',
            'Revize istekleri tasarımcılara iletildi'
        ]
    },
    {
        id: 'tmpl_soc_story',
        label: 'Story & Anket Serisi',
        committeeKey: 'social',
        committeeName: 'Sosyal Medya & Tasarım',
        committeeBadge: '🌸 Sosyal',
        committeeColor: '#ec4899',
        calendarId: 'cal_social',
        category: 'Sosyal Medya',
        title: 'Instagram Hikaye (Story) Serisi & Etkileşim Anketi',
        location: 'Instagram (@hsdmtu)',
        durationMinutes: 45,
        description: `### 📱 Hikaye Dizisi
- 5 adımlı etkileşim akışı: Merak uyandırma -> Bilgi -> Anket -> Link
- Geri sayım sayacı ve soru-cevap kutusu`,
        subtasks: [
            '1080x1920 hikaye görselleri hazırlandı',
            'Bio linkine doğrudan etkinlik başvuru URL\'i eklendi',
            'Gelen anket yanıtları ve DM\'ler kaydedildi'
        ]
    },

    // 🟠 4. MEDIUM KOMİTESİ (4 Şablon)
    {
        id: 'tmpl_med_article',
        label: 'Haftalık Teknik Makale',
        committeeKey: 'medium',
        committeeName: 'Medium Komitesi',
        committeeBadge: '🟠 Medium',
        committeeColor: '#f59e0b',
        calendarId: 'cal_social',
        category: 'Yayın',
        title: 'HSD Medium Teknik Blog: Haftalık Yazılım Makalesi',
        location: 'medium.com/@hsdmtu',
        durationMinutes: 90,
        description: `### ✍️ Makale Detayları
- Başlık: Modern Web & Mobil Geliştirme Teknolojileri
- Yazar: Topluluk Teknik Ekibi Üyesi
- Hedef: 1000+ kelime, çalışan kod blokları ve mimari şemalar`,
        subtasks: [
            'Makale taslağı Markdown olarak kaleme alındı',
            'Kod blokları ve syntax vurguları test edildi',
            '1200x630 piksel özel kapak görseli hazırlandı',
            'Teknik editörden imla ve özgünlük onayı alındı',
            'Medium yayınında yayına alındı ve sosyal medyada paylaşıldı'
        ]
    },
    {
        id: 'tmpl_med_writers',
        label: 'Yazar Koordinasyonu',
        committeeKey: 'medium',
        committeeName: 'Medium Komitesi',
        committeeBadge: '🟠 Medium',
        committeeColor: '#f59e0b',
        calendarId: 'cal_social',
        category: 'Yayın',
        title: 'Medium Yazarları Aylık İçerik & Fikir Dağıtım Toplantısı',
        location: 'Google Meet',
        meetingLink: 'https://meet.google.com/hsd-medium-writers',
        durationMinutes: 60,
        description: `### 📝 Toplantı Gündemi
- Önümüzdeki 4 haftanın teknoloji konu başlıkları (AI, Cloud, Frontend, DevOps)
- Yeni katılan yazar adayları için yayınlama kılavuzu
- Teslim tarihleri ve editör eşleşmeleri`,
        subtasks: [
            'Konu havuzu oylamaya sunuldu',
            'Her yazara 1 makale konusu ve teslim tarihi atandı',
            'SEO anahtar kelime listesi yazarlara iletildi'
        ]
    },
    {
        id: 'tmpl_med_peer',
        label: 'Editörlük (Peer-Review)',
        committeeKey: 'medium',
        committeeName: 'Medium Komitesi',
        committeeBadge: '🟠 Medium',
        committeeColor: '#f59e0b',
        calendarId: 'cal_social',
        category: 'Yayın',
        title: 'Makale Editörlük & Peer-Review İnceleme Oturumu',
        location: 'Google Docs & Medium Taslak',
        durationMinutes: 45,
        description: `### 🔍 Editör İncelemesi
- Teknik doğruluk ve kod örneği çalıştırma testi
- Anlatım akıcılığı, Türkçe imla kuralları ve SEO optimizasyonu
- Kaynakça ve referans kontrolleri`,
        subtasks: [
            'Yazının intihal (plagiarism) kontrolü yapıldı',
            'Görsellerin telif hakları ve alt-text etiketleri doğrulandı',
            'Yazara geri bildirim notları iletildi'
        ]
    },
    {
        id: 'tmpl_med_newsletter',
        label: 'Aylık Bülten (Newsletter)',
        committeeKey: 'medium',
        committeeName: 'Medium Komitesi',
        committeeBadge: '🟠 Medium',
        committeeColor: '#f59e0b',
        calendarId: 'cal_social',
        category: 'Yayın',
        title: 'Aylık Topluluk Bülteni: "Bu Ay HSD MTÜ\'de Neler Oldu?"',
        location: 'Medium & E-Posta Bülteni',
        durationMinutes: 60,
        description: `### 📰 Bülten Kapsamı
- Ay boyunca gerçekleştirilen etkinlik ve atölye özetleri
- Ayın en çok okunan Medium makaleleri
- Gelecek ayın heyecan verici projeleri ve duyuruları`,
        subtasks: [
            'Etkinlik fotoğrafları ve istatistikleri toplandı',
            'Ayın en aktif topluluk üyeleri listelendi',
            'Bülten kapağı ve e-posta şablonu hazırlandı',
            'Tüm üyelere ve takipçilere iletildi'
        ]
    }
];

export default function EventDrawer({
    isOpen,
    onClose,
    event,
    initialDate,
    calendars,
    groups,
    members,
    currentMember,
    theme = 'dark',
    onEventSaved,
    onEventDeleted,
}: EventDrawerProps) {
    const isLight = theme === 'light';
    // Form State
    const [title, setTitle] = useState('');
    const [calendarId, setCalendarId] = useState('cal_core');
    const [category, setCategory] = useState('Toplantı');
    const [color, setColor] = useState('#dc2626');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('11:00');
    const [isAllDay, setIsAllDay] = useState(false);
    const [location, setLocation] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('scheduled');
    const [visibility, setVisibility] = useState<EventVisibility>('public');
    const [reminders, setReminders] = useState<WorkspaceReminder[]>([]);
    const [assignees, setAssignees] = useState<string[]>([]);
    const [subtasks, setSubtasks] = useState<WorkspaceSubtask[]>([]);
    const [comments, setComments] = useState<WorkspaceComment[]>([]);
    const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([]);
    const [version, setVersion] = useState<number>(1);

    // Past Event Detection & Permissions
    const isEventPast = useMemo(() => {
        if (!event) return false;
        try {
            return new Date(event.end_time).getTime() < Date.now();
        } catch {
            return false;
        }
    }, [event]);

    const canEditPast = useMemo(() => {
        if (!isEventPast) return true;
        if (currentMember?.role === 'super_admin' || currentMember?.role === 'workspace_admin') return true;
        if (currentMember?.group_id) return true;
        return false;
    }, [isEventPast, currentMember]);

    // Active Tab for Markdown
    const [descTab, setDescTab] = useState<'write' | 'preview'>('write');

    // Committee Quick Filter Tab
    const [activeCommitteeTab, setActiveCommitteeTab] = useState<'all' | 'proj' | 'event' | 'social' | 'medium'>('all');

    // Filter templates by active committee tab (Unconditional Hook)
    const filteredTemplates = useMemo(() => {
        if (activeCommitteeTab === 'all') return COMMITTEE_TEMPLATES;
        return COMMITTEE_TEMPLATES.filter(t => t.committeeKey === activeCommitteeTab);
    }, [activeCommitteeTab]);

    // Flash Template Notification
    const [appliedTemplateFeedback, setAppliedTemplateFeedback] = useState<string | null>(null);

    // Subtask input
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    // Comment input & Tag
    const [newCommentText, setNewCommentText] = useState('');
    const [newCommentTag, setNewCommentTag] = useState<'general' | 'idea' | 'blocker' | 'decision' | 'info'>('general');

    // Professional Reminders State
    const [isTestingReminder, setIsTestingReminder] = useState(false);
    const [reminderTestSuccess, setReminderTestSuccess] = useState(false);

    // Instant Announcement State
    const [announcementAudience, setAnnouncementAudience] = useState<'all' | 'group' | 'role'>('group');
    const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || 'grp_project');
    const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('editor');
    const [announcementMsg, setAnnouncementMsg] = useState('');
    const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
    const [announcementSuccess, setAnnouncementSuccess] = useState(false);

    // UI Loading & Feedback
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Populate when opening/editing
    useEffect(() => {
        if (!isOpen) return;

        if (event) {
            setTitle(event.title || '');
            setCalendarId(event.calendar_id || calendars[0]?.id || 'cal_core');
            setCategory(event.category || 'Toplantı');
            setColor(event.color || '#dc2626');
            setIsAllDay(Boolean(event.is_all_day));
            setLocation(event.location || '');
            setMeetingLink(event.meeting_link || '');
            setDescription(event.description || '');
            setStatus(event.status || 'scheduled');
            setVisibility(event.visibility || 'public');
            setReminders(event.reminders || []);
            setAssignees(event.assignees || []);
            setSubtasks(event.subtasks || []);
            setComments(event.comments || []);
            setAttachments(event.attachments || []);
            setVersion(event.version || 1);

            // Fetch latest comments directly from database
            if (event.id) {
                fetch(`/api/workspace/events/${event.id}/comments`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.comments && Array.isArray(data.comments)) {
                            setComments(data.comments);
                        }
                    })
                    .catch(err => console.error('Yorum yükleme hatası:', err));
            }

            // Parse Dates
            try {
                const s = new Date(event.start_time);
                setStartDate(s.toISOString().split('T')[0]);
                setStartTime(s.toTimeString().substring(0, 5));

                const e = new Date(event.end_time);
                setEndDate(e.toISOString().split('T')[0]);
                setEndTime(e.toTimeString().substring(0, 5));
            } catch {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
            }
        } else {
            // New Event Defaults: Use clicked date (initialDate) if available!
            const baseDate = initialDate ? new Date(initialDate) : new Date();
            const year = baseDate.getFullYear();
            const month = String(baseDate.getMonth() + 1).padStart(2, '0');
            const day = String(baseDate.getDate()).padStart(2, '0');
            const targetDateStr = `${year}-${month}-${day}`;

            setTitle('');
            setCalendarId(calendars[0]?.id || 'cal_core');
            setCategory('Toplantı');
            setColor(calendars[0]?.color || '#dc2626');
            setStartDate(targetDateStr);
            setStartTime('10:00');
            setEndDate(targetDateStr);
            setEndTime('11:00');
            setIsAllDay(false);
            setLocation('');
            setMeetingLink('');
            setDescription('');
            setStatus('scheduled');
            setVisibility('public');
            setReminders([
                { id: `rem_default_1`, minutes_before: 60, target: 'all' }
            ]);
            setAssignees(currentMember ? [currentMember.id] : []);
            setSubtasks([]);
            setComments([]);
            setAttachments([]);
            setVersion(1);
        }

        setErrorMsg(null);
        setAppliedTemplateFeedback(null);
        setAnnouncementSuccess(false);
        setAnnouncementMsg('');
        setReminderTestSuccess(false);
    }, [isOpen, event, initialDate, calendars, currentMember]);

    // Keyboard ESC to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // ⚡ Pratiklik: Şablon Uygulama (Apply Quick Template)
    const handleApplyTemplate = (tmpl: CommitteeTemplate) => {
        setTitle(tmpl.title);
        setCalendarId(tmpl.calendarId);
        setColor(tmpl.committeeColor);
        setCategory(tmpl.category);
        setLocation(tmpl.location);
        setMeetingLink(tmpl.meetingLink || '');
        setDescription(tmpl.description);

        // Pre-fill subtasks
        const templateSubtasks: WorkspaceSubtask[] = tmpl.subtasks.map((st, i) => ({
            id: `tmpl_sub_${Date.now()}_${i}`,
            event_id: event?.id || 'temp',
            title: st,
            is_completed: false,
            created_at: new Date().toISOString()
        }));
        setSubtasks(templateSubtasks);

        // Calculate end time automatically from template duration
        if (startTime) {
            const [hStr, mStr] = startTime.split(':');
            const startD = new Date();
            startD.setHours(Number(hStr), Number(mStr), 0, 0);
            const endD = new Date(startD.getTime() + tmpl.durationMinutes * 60 * 1000);
            setEndTime(endD.toTimeString().substring(0, 5));
        }

        // Show Flash Feedback
        setAppliedTemplateFeedback(`✓ "${tmpl.label}" şablonu uygulandı! (${tmpl.committeeName} — ${tmpl.durationMinutes} Dk)`);
        setTimeout(() => setAppliedTemplateFeedback(null), 6000);
    };

    // ⚡ Pratiklik: Toplantı Süresi Tek Tıkla Hesaplama (Duration Quick-Pick)
    const handleSetDuration = (durationMinutes: number) => {
        if (!startTime || !startDate) return;
        const [h, m] = startTime.split(':').map(Number);
        const sDate = new Date(`${startDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        const eDate = new Date(sDate.getTime() + durationMinutes * 60 * 1000);

        setEndDate(eDate.toISOString().split('T')[0]);
        setEndTime(eDate.toTimeString().substring(0, 5));
        setIsAllDay(false);
    };

    // ⚡ Pratiklik: Tarih Hızlı Kısayolları
    const handleQuickDate = (preset: 'today' | 'tomorrow' | 'friday' | 'saturday' | 'sunday' | 'next_week') => {
        const now = new Date();
        const target = new Date();

        if (preset === 'today') {
            // Keep target as today
        } else if (preset === 'tomorrow') {
            target.setDate(now.getDate() + 1);
        } else if (preset === 'friday') {
            const day = now.getDay();
            const diff = (5 - day + 7) % 7 || 7;
            target.setDate(now.getDate() + diff);
        } else if (preset === 'saturday') {
            const day = now.getDay();
            const diff = (6 - day + 7) % 7 || 7;
            target.setDate(now.getDate() + diff);
        } else if (preset === 'sunday') {
            const day = now.getDay();
            const diff = (7 - day + 7) % 7 || 7;
            target.setDate(now.getDate() + diff);
        } else if (preset === 'next_week') {
            target.setDate(now.getDate() + 7);
        }

        const dateStr = target.toISOString().split('T')[0];
        setStartDate(dateStr);
        setEndDate(dateStr);
    };

    // ⚡ Pratiklik: Hazır Konum & Platform Seçici
    const handleQuickLocation = (loc: string, link?: string) => {
        setLocation(loc);
        if (link !== undefined) {
            setMeetingLink(link);
        }
    };

    // ⚡ Pratiklik: Hazır Checklist Grupları Ekleme
    const handleAddPresetChecklist = (groupType: 'tech' | 'event' | 'social') => {
        const presets: Record<string, string[]> = {
            tech: [
                'GitHub PR ve issue review yapıldı',
                'Kod testleri ve linter çalıştırıldı',
                'Mimari güvenlik kontrolleri doğrulandı',
                'Production deploy onayı verildi'
            ],
            event: [
                'Konuşmacı teyidi ve sunum dosyası alındı',
                'Salon tahsisi, ses ve projeksiyon hazırlandı',
                'Katılım QR kodu ve kayıt listesi oluşturuldu',
                'Etkinlik sonrası teşekkür belgesi iletildi'
            ],
            social: [
                'Figma görsel ve banner tasarımı onaylandı',
                'Instagram & Twitter gönderi metinleri yazıldı',
                'Etkinlik gününde hikaye (Story) serisi paylaşıldı',
                'Fotoğraf ve video arşivi Drive klasörüne yüklendi'
            ]
        };

        const itemsToAdd = presets[groupType] || [];
        const newItems: WorkspaceSubtask[] = itemsToAdd.map((title, i) => ({
            id: `quick_sub_${Date.now()}_${i}`,
            event_id: event?.id || 'temp',
            title,
            is_completed: false,
            created_at: new Date().toISOString()
        }));

        setSubtasks(prev => [...prev, ...newItems]);
    };

    // Handle Save Event
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!title.trim()) {
            setErrorMsg('Lütfen etkinlik başlığını girin.');
            return;
        }

        if (!startDate || !endDate) {
            setErrorMsg('Başlangıç ve bitiş tarihlerini belirleyin.');
            return;
        }

        setIsSaving(true);

        const startISO = isAllDay
            ? new Date(`${startDate}T00:00:00`).toISOString()
            : new Date(`${startDate}T${startTime}:00`).toISOString();

        const endISO = isAllDay
            ? new Date(`${endDate}T23:59:59`).toISOString()
            : new Date(`${endDate}T${endTime}:00`).toISOString();

        const payload: Partial<WorkspaceEvent> = {
            calendar_id: calendarId,
            title: title.trim(),
            description: description.trim(),
            start_time: startISO,
            end_time: endISO,
            is_all_day: isAllDay,
            location: location.trim(),
            meeting_link: meetingLink.trim() || undefined,
            color,
            category,
            status,
            visibility,
            reminders,
            assignees,
            subtasks,
            comments,
            attachments,
            version,
            change_summary: event ? `"${title.trim()}" bilgileri güncellendi` : undefined,
        };

        try {
            const url = event ? `/api/workspace/events/${event.id}` : '/api/workspace/events';
            const method = event ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.status === 409) {
                setErrorMsg('⚠️ Çakışma Hatası: Bu etkinlik başka bir yönetici tarafından güncellendi. Lütfen sayfayı yenileyip tekrar deneyin.');
                setIsSaving(false);
                return;
            }

            if (!res.ok) {
                setErrorMsg(data.error || 'Etkinlik kaydedilirken bir hata oluştu.');
                setIsSaving(false);
                return;
            }

            if (data.event) {
                onEventSaved(data.event);
                onClose();
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Sunucuyla bağlantı kurulamadı.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Delete Event
    const handleDelete = async () => {
        if (!event) return;
        if (!confirm(`"${event.title}" etkinliğini silmek istediğinize emin misiniz?`)) return;

        setIsDeleting(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`/api/workspace/events/${event.id}`, { method: 'DELETE' });
            if (res.ok) {
                onEventDeleted(event.id);
                onClose();
            } else {
                const data = await res.json();
                setErrorMsg(data.error || 'Etkinlik silinemedi.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Silme işlemi sırasında hata oluştu.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Subtask Handlers
    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        const newSt: WorkspaceSubtask = {
            id: `sub_${Date.now()}`,
            event_id: event?.id || 'temp',
            title: newSubtaskTitle.trim(),
            is_completed: false,
            created_at: new Date().toISOString()
        };

        setSubtasks([...subtasks, newSt]);
        setNewSubtaskTitle('');
    };

    const handleToggleSubtask = (id: string, currentVal: boolean) => {
        setSubtasks(subtasks.map(st => st.id === id ? { ...st, is_completed: !currentVal } : st));
    };

    const handleDeleteSubtask = (id: string) => {
        setSubtasks(subtasks.filter(st => st.id !== id));
    };

    const handleToggleAllSubtasks = () => {
        const allCompleted = subtasks.every(s => s.is_completed);
        setSubtasks(subtasks.map(s => ({ ...s, is_completed: !allCompleted })));
    };

    const handleClearCompletedSubtasks = () => {
        setSubtasks(subtasks.filter(s => !s.is_completed));
    };

    // Reminder Handlers
    const handleAddReminder = (minutesBefore: number, target: 'all' | 'admins' | 'assignees' = 'all') => {
        const newRem: WorkspaceReminder = {
            id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            event_id: event?.id,
            minutes_before: minutesBefore,
            target,
            is_sent: false,
        };
        setReminders(prev => [...prev, newRem]);
    };

    const handleRemoveReminder = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    const handleTestInstantReminder = async () => {
        setIsTestingReminder(true);
        setReminderTestSuccess(false);

        // 1. Browser Native Notification test if supported & allowed
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(`🔔 HSD Hatırlatıcı: ${title || 'Topluluk Etkinliği'}`, {
                    body: `${startDate || 'Yakında'} • ${startTime || '10:00'} - ${location || 'Online'}`,
                    icon: '/favicon.ico',
                });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(`🔔 HSD Hatırlatıcı: ${title || 'Topluluk Etkinliği'}`, {
                            body: `${startDate || 'Yakında'} • ${startTime || '10:00'} - ${location || 'Online'}`,
                            icon: '/favicon.ico',
                        });
                    }
                });
            }
        }

        // 2. Dispatch simulated reminder to notification center
        try {
            await fetch('/api/workspace/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event?.id,
                    eventTitle: title || 'Topluluk Etkinliği',
                    title: `⏰ Etkinlik Hatırlatıcısı: ${title || 'Topluluk Etkinliği'}`,
                    message: `Bu etkinlik için test hatırlatıcısı tetiklendi. Başlangıç: ${startDate || 'Belirtilmedi'} ${startTime || ''}. Katılım linki/konumu: ${location || meetingLink || 'Belirlenmedi'}.`,
                    targetAudience: 'all',
                    type: 'reminder',
                }),
            });
            setReminderTestSuccess(true);
            setTimeout(() => setReminderTestSuccess(false), 4500);
        } catch (err) {
            console.error('Hatırlatıcı test hatası:', err);
        } finally {
            setIsTestingReminder(false);
        }
    };

    // Comment Handlers
    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;

        const newCom: WorkspaceComment = {
            id: `com_${Date.now()}`,
            event_id: event?.id || 'temp',
            user_id: currentMember?.id || 'anon',
            user_name: currentMember?.display_name || 'Topluluk Yöneticisi',
            user_avatar: currentMember?.avatar_url,
            content: newCommentText.trim(),
            created_at: new Date().toISOString(),
            tag: newCommentTag,
            is_pinned: false,
            reactions: {},
        };

        setComments([...comments, newCom]);
        setNewCommentText('');

        if (event?.id) {
            try {
                const res = await fetch(`/api/workspace/events/${event.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: newCom.content, tag: newCommentTag }),
                });
                const data = await res.json();
                if (res.ok && data.comment) {
                    setComments(prev => prev.map(c => c.id === newCom.id ? data.comment : c));
                    if (event) {
                        const updated = {
                            ...event,
                            comments: [...(event.comments || []).filter(c => c.id !== newCom.id), data.comment]
                        };
                        onEventSaved(updated);
                    }
                }
            } catch (err) {
                console.error('Yorum API hatası:', err);
            }
        }
    };

    const handleToggleCommentPin = async (commentId: string) => {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: !c.is_pinned } : c));
        if (event?.id) {
            try {
                await fetch(`/api/workspace/events/${event.id}/comments`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commentId, action: 'toggle_pin' }),
                });
            } catch (err) {
                console.error('Pin hatası:', err);
            }
        }
    };

    const handleToggleCommentReaction = async (commentId: string, emoji: string) => {
        const userId = currentMember?.id || 'anon';
        setComments(prev => prev.map(c => {
            if (c.id !== commentId) return c;
            const rx = { ...(c.reactions || {}) };
            const currentUsers = rx[emoji] || [];
            if (currentUsers.includes(userId)) {
                rx[emoji] = currentUsers.filter(u => u !== userId);
                if (rx[emoji].length === 0) delete rx[emoji];
            } else {
                rx[emoji] = [...currentUsers, userId];
            }
            return { ...c, reactions: rx };
        }));

        if (event?.id) {
            try {
                await fetch(`/api/workspace/events/${event.id}/comments`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commentId, action: 'toggle_reaction', emoji }),
                });
            } catch (err) {
                console.error('Reaksiyon hatası:', err);
            }
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (event?.id) {
            try {
                await fetch(`/api/workspace/events/${event.id}/comments?commentId=${commentId}`, {
                    method: 'DELETE',
                });
            } catch (err) {
                console.error('Yorum silme hatası:', err);
            }
        }
    };

    // File Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setErrorMsg(null);

        const formData = new FormData();
        formData.append('file', file);
        if (event?.id) formData.append('eventId', event.id);

        try {
            const res = await fetch('/api/workspace/files/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (res.ok && data.file) {
                setAttachments([...attachments, data.file]);
                if (event?.id) setVersion(v => v + 1);
            } else {
                setErrorMsg(data.error || 'Dosya yüklenemedi.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Yükleme sırasında hata oluştu.');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    // Instant Announcement Handler
    const handleSendInstantAnnouncement = async () => {
        if (!title.trim()) {
            alert('Lütfen önce etkinliğe bir başlık verin.');
            return;
        }

        setIsSendingAnnouncement(true);
        setAnnouncementSuccess(false);

        try {
            const messageText = announcementMsg.trim() ||
                `"${title}" etkinliği için hatırlatma: ${startDate} tarihinde saat ${startTime}'da gerçekleşecektir. (${location || 'Online'})`;

            const res = await fetch('/api/workspace/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event?.id,
                    eventTitle: title,
                    title: `⚡ Duyuru: ${title}`,
                    message: messageText,
                    targetAudience: announcementAudience,
                    targetGroupId: announcementAudience === 'group' ? selectedGroupId : undefined,
                    targetRole: announcementAudience === 'role' ? selectedRole : undefined,
                    type: 'urgent',
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setAnnouncementSuccess(true);
                setAnnouncementMsg('');
                setTimeout(() => setAnnouncementSuccess(false), 5000);
            } else {
                alert(data.error || 'Duyuru gönderilemedi.');
            }
        } catch (err) {
            console.error('Duyuru hatası:', err);
            alert('Sunucuyla iletişim kurulamadı.');
        } finally {
            setIsSendingAnnouncement(false);
        }
    };

    const completedSubtasksCount = subtasks.filter(s => s.is_completed).length;
    const progressPercent = subtasks.length > 0
        ? Math.round((completedSubtasksCount / subtasks.length) * 100)
        : 0;

    // React Rules of Hooks: Render guard only after ALL hooks have been called unconditionally
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 overflow-hidden backdrop-blur-sm transition-opacity animate-in fade-in duration-200 ${
            isLight ? 'bg-slate-900/40' : 'bg-black/80'
        }`}>
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10">
                <div className={`w-screen max-w-2xl border-l shadow-2xl flex flex-col h-full transition-colors ${
                    isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                }`}>

                    {/* ── 1. HEADER (Yüksek Kontrast & Kolay Okunabilirlik) ── */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-md shrink-0 ${
                        isLight ? 'bg-slate-50/95 border-slate-200 text-slate-900' : 'bg-zinc-900/90 border-zinc-800 text-white'
                    }`}>
                        <div className="flex items-center gap-3">
                            <span
                                className="w-4 h-4 rounded-full inline-block shadow-md ring-2 ring-white/30 shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <div>
                                <h2 className={`text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 ${
                                    isLight ? 'text-slate-900' : 'text-white'
                                }`}>
                                    {event ? 'Etkinliği Düzenle' : 'Yeni Topluluk Etkinliği'}
                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full font-mono border ${
                                        isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-zinc-800 text-rose-300 border-zinc-700/80'
                                    }`}>
                                        {category}
                                    </span>
                                </h2>
                                <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                    HSD Malatya Turgut Özal Üniversitesi Çekirdek Ekip Çalışma Alanı
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {event && (
                                <span className={`text-xs px-2.5 py-1 rounded-lg font-mono border font-semibold ${
                                    isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`} title="Versiyon Kilidi">
                                    v{version}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className={`p-2 rounded-xl transition-colors ${
                                    isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                                title="Kapat (Esc)"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* ── 2. SCROLLABLE BODY ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* Hata Bildirimi */}
                        {errorMsg && (
                            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-100 text-xs font-semibold flex items-start gap-2.5 shadow-md">
                                <svg className="w-4 h-4 shrink-0 text-rose-300 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Geçmiş Etkinlik Uyarısı */}
                        {isEventPast && (
                            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-md ${
                                canEditPast 
                                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' 
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                            }`}>
                                <span className="text-amber-400 font-bold text-sm shrink-0">⏳</span>
                                <div>
                                    <span className="font-semibold block">Bu etkinlik geçmiş bir tarihe aittir ({startDate}).</span>
                                    {!canEditPast && (
                                        <span className="text-zinc-400 text-[11px] block mt-0.5">
                                            Geçmiş etkinlikler yalnızca sistem ve komite yöneticileri tarafından düzenlenebilir (salt okunur mod).
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Flash Şablon Başarı Bildirimi */}
                        {appliedTemplateFeedback && (
                            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-base text-emerald-400">⚡</span>
                                    <span>{appliedTemplateFeedback}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAppliedTemplateFeedback(null)}
                                    className="text-emerald-400 hover:text-emerald-200 font-bold ml-2"
                                >
                                    ✕
                                </button>
                            </div>
                        )}

                        {/* ── PRATİKLİK MERKEZİ: HIZLI KOMİTE ŞABLONLARI ── */}
                        {!event && (
                            <div className={`p-4 rounded-2xl shadow-sm space-y-3.5 transition-colors ${
                                isLight
                                    ? 'bg-gradient-to-br from-rose-50/40 via-white to-slate-50 border border-slate-200'
                                    : 'bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-700/80 shadow-md'
                            }`}>
                                <div className={`flex items-center justify-between pb-2.5 border-b ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-rose-500 text-base">⚡</span>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            isLight ? 'text-slate-800' : 'text-white'
                                        }`}>
                                            Komite Hızlı Etkinlik Şablonları (Tek Tıkla Kur)
                                        </span>
                                    </div>
                                    <span className={`text-[11px] font-mono font-semibold ${
                                        isLight ? 'text-slate-500' : 'text-zinc-400'
                                    }`}>
                                        {filteredTemplates.length} Hazır Şablon
                                    </span>
                                </div>

                                {/* Komite Filtre Sekmeleri */}
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                    {[
                                        { id: 'all', label: 'Tümü (18)' },
                                        { id: 'proj', label: '🟣 Proje (5)' },
                                        { id: 'event', label: '🔴 Etkinlik (5)' },
                                        { id: 'social', label: '🌸 Sosyal (4)' },
                                        { id: 'medium', label: '🟠 Medium (4)' },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveCommitteeTab(tab.id as any)}
                                            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                                                activeCommitteeTab === tab.id
                                                    ? 'bg-rose-600 text-white shadow-sm'
                                                    : isLight
                                                        ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 shadow-xs'
                                                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Şablon Kartları (Yüksek Kontrast & Net Okunabilirlik) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {filteredTemplates.map(tmpl => (
                                        <button
                                            key={tmpl.id}
                                            type="button"
                                            onClick={() => handleApplyTemplate(tmpl)}
                                            className={`text-left p-2.5 rounded-xl transition-all group flex items-start gap-2.5 relative border ${
                                                isLight
                                                    ? 'bg-white border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 shadow-xs'
                                                    : 'bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                                            }`}
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full mt-0.5 shrink-0 group-hover:scale-125 transition-transform ring-1 ring-white/20"
                                                style={{ backgroundColor: tmpl.committeeColor }}
                                            />
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className={`text-xs font-bold truncate ${
                                                        isLight ? 'text-slate-800 group-hover:text-rose-600' : 'text-zinc-100 group-hover:text-white'
                                                    }`}>
                                                        {tmpl.label}
                                                    </p>
                                                    <span className={`text-[10px] font-mono shrink-0 ${
                                                        isLight ? 'text-slate-500' : 'text-zinc-400'
                                                    }`}>
                                                        {tmpl.durationMinutes} Dk
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] font-medium truncate mt-0.5 ${
                                                    isLight ? 'text-slate-500' : 'text-zinc-400'
                                                }`}>
                                                    {tmpl.committeeName} • {tmpl.category}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form id="event-form" onSubmit={handleSave} className="space-y-6">

                            {/* ── BÖLÜM 0: ETKİNLİĞİ EKLEYEN ÜYE & OLUŞTURULMA BİLGİSİ ── */}
                            {(() => {
                                const creatorMember = members.find(m => m.id === event?.created_by);
                                const creatorName = creatorMember?.display_name || creatorMember?.full_name || event?.created_by || (event ? 'Topluluk Üyesi' : (currentMember?.display_name || 'Siz'));
                                const creatorRole = creatorMember?.role || (event ? 'member' : (currentMember?.role || 'member'));
                                const creatorAvatar = creatorMember?.avatar_url || (event ? null : currentMember?.avatar_url);

                                return (
                                    <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                                        isLight
                                            ? 'bg-slate-50/90 border-slate-200'
                                            : 'bg-zinc-900/60 border-zinc-800'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            {creatorAvatar ? (
                                                <img
                                                    src={creatorAvatar}
                                                    alt={creatorName}
                                                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-rose-500/30 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
                                                    {creatorName.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                        {event ? creatorName : `${creatorName} (Yeni Ekleyen)`}
                                                    </span>
                                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                                                        creatorRole === 'super_admin'
                                                            ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/60 text-amber-300'
                                                            : creatorRole === 'workspace_admin'
                                                                ? isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-950/60 text-rose-300'
                                                                : creatorRole === 'editor'
                                                                    ? isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-950/60 text-blue-300'
                                                                    : isLight ? 'bg-slate-200/80 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                                                    }`}>
                                                        {creatorRole === 'super_admin' ? '👑 Admin' : creatorRole === 'workspace_admin' ? '🛡️ Yönetici' : creatorRole === 'editor' ? '✍️ Editör' : 'Üye'}
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                    {event ? (
                                                        <>Etkinliği Ekleyen Üye • {new Date(event.created_at || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                                                    ) : (
                                                        <>Bu etkinlik profiliniz ({currentMember?.display_name || 'Oturum Açan Üye'}) adına takvime kaydedilecek.</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {event?.edit_history && event.edit_history.length > 0 && (
                                            <div className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 shrink-0 ${
                                                isLight
                                                    ? 'bg-white border-slate-200 text-slate-700 shadow-xs'
                                                    : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                                            }`}>
                                                <span className="text-amber-500">✎</span>
                                                <span>{event.edit_history.length} Kez Düzenlendi</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* ── BÖLÜM 1: ETKİNLİK BAŞLIĞI ── */}
                            <div className="space-y-1.5">
                                <label className={`block text-xs font-bold uppercase tracking-wider ${
                                    isLight ? 'text-slate-700' : 'text-zinc-200'
                                }`}>
                                    Etkinlik Başlığı <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Örn: HSD Haftalık Çekirdek Ekip Sprint & Koordinasyon Toplantısı..."
                                    className={`w-full text-base sm:text-lg font-bold rounded-xl px-4 py-3 transition-all ${
                                        isLight
                                            ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-xs'
                                            : 'bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-inner'
                                    }`}
                                    autoFocus={!event}
                                    required
                                />
                            </div>

                            {/* ── BÖLÜM 2: KOMİTE / TAKVİM, KATEGORİ & RENK ── */}
                            <div className={`p-4 rounded-2xl space-y-4 transition-colors ${
                                isLight
                                    ? 'bg-slate-50/80 border border-slate-200'
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            }`}>
                                <div className={`flex items-center gap-2 pb-2 border-b ${
                                    isLight ? 'border-slate-200 text-slate-800' : 'border-zinc-800 text-zinc-300'
                                }`}>
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        Komite, Takvim & Kategori Ayarları
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Takvim Seçimi */}
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                                            isLight ? 'text-slate-600' : 'text-zinc-300'
                                        }`}>
                                            Topluluk Takvimi
                                        </label>
                                        <select
                                            value={calendarId}
                                            onChange={(e) => {
                                                setCalendarId(e.target.value);
                                                const selected = calendars.find(c => c.id === e.target.value);
                                                if (selected) setColor(selected.color);
                                            }}
                                            className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-rose-500 ${
                                                isLight
                                                    ? 'bg-white border border-slate-300 text-slate-800'
                                                    : 'bg-zinc-950 border border-zinc-700 text-zinc-100'
                                            }`}
                                        >
                                            {calendars.map(cal => (
                                                <option key={cal.id} value={cal.id}>{cal.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Kategori Seçimi */}
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                                            isLight ? 'text-slate-600' : 'text-zinc-300'
                                        }`}>
                                            Etkinlik Kategorisi
                                        </label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-rose-500 ${
                                                isLight
                                                    ? 'bg-white border border-slate-300 text-slate-800'
                                                    : 'bg-zinc-950 border border-zinc-700 text-zinc-100'
                                            }`}
                                        >
                                            <option value="Toplantı">Toplantı & Koordinasyon</option>
                                            <option value="Geliştirme">Yazılım, Sprint & PR</option>
                                            <option value="Workshop">Hands-on Atölye & Eğitim</option>
                                            <option value="Yayın">Medium & Teknik Blog</option>
                                            <option value="Sosyal Medya">Sosyal Medya & Tasarım</option>
                                            <option value="Sponsorluk">Sponsorluk & Üniversite</option>
                                            <option value="Hackathon">Hackathon & Yarışma</option>
                                            <option value="Genel">Genel Kampüs Etkinliği</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Renk Paleti */}
                                <div>
                                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                                        Renk Göstergesi
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setColor(c.value)}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                                    color === c.value
                                                        ? 'ring-2 ring-white scale-110 shadow-md'
                                                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: c.value }}
                                                title={c.name}
                                            >
                                                {color === c.value && (
                                                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── BÖLÜM 2.5: ERİŞİM & GÖRÜNÜRLÜK DÜZEYİ (RBAC KORUMALI) ── */}
                            <div className={`p-4 rounded-2xl ${
                                isLight 
                                    ? 'bg-slate-50/80 border border-slate-200' 
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            } space-y-3`}>
                                <div className={`flex items-center justify-between border-b pb-2 ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">🛡️</span>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            isLight ? 'text-slate-700' : 'text-zinc-200'
                                        }`}>
                                            Erişim & Görünürlük Düzeyi
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                                        isLight ? 'text-slate-600 bg-slate-200/80 border border-slate-300/70' : 'text-zinc-400 bg-zinc-800'
                                    }`}>
                                        {visibility === 'public' ? '🌍 Herkese Açık' : visibility === 'admin_only' ? '🛡️ Yönetici Özel' : '🔒 Gizli'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {/* 1. Tüm Topluluk */}
                                    <button
                                        type="button"
                                        onClick={() => setVisibility('public')}
                                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                            visibility === 'public'
                                                ? isLight
                                                    ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                                                    : 'bg-zinc-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                                                : isLight
                                                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-base">🌍</span>
                                                {visibility === 'public' && (
                                                    <span className={`text-[10px] font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>✓ Seçili</span>
                                                )}
                                            </div>
                                            <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Tüm Topluluk</p>
                                            <p className={`text-[10px] mt-0.5 leading-snug ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                Tüm topluluk üyeleri takvimde görüntüleyebilir.
                                            </p>
                                        </div>
                                    </button>

                                    {/* 2. Sadece Adminler */}
                                    <button
                                        type="button"
                                        onClick={() => setVisibility('admin_only')}
                                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                            visibility === 'admin_only'
                                                ? isLight
                                                    ? 'bg-amber-50/90 border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                                                    : 'bg-zinc-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                                                : isLight
                                                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-base">🛡️</span>
                                                {visibility === 'admin_only' && (
                                                    <span className={`text-[10px] font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>✓ Seçili</span>
                                                )}
                                            </div>
                                            <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Sadece Adminler</p>
                                            <p className={`text-[10px] mt-0.5 leading-snug ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                Yalnızca Super Admin, Workspace Admin ve Editorler görür.
                                            </p>
                                        </div>
                                    </button>

                                    {/* 3. Sadece Ben */}
                                    <button
                                        type="button"
                                        onClick={() => setVisibility('private')}
                                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                            visibility === 'private'
                                                ? isLight
                                                    ? 'bg-rose-50/90 border-rose-500 shadow-sm ring-1 ring-rose-500/30'
                                                    : 'bg-zinc-800/90 border-rose-500 shadow-md ring-1 ring-rose-500/30'
                                                : isLight
                                                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-base">🔒</span>
                                                {visibility === 'private' && (
                                                    <span className={`text-[10px] font-bold ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>✓ Seçili</span>
                                                )}
                                            </div>
                                            <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Sadece Ben</p>
                                            <p className={`text-[10px] mt-0.5 leading-snug ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                Yalnızca oluşturan siz ve Super Admin görebilir.
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* ── BÖLÜM 3: ZAMANLAMA, TARİH & HIZLI SÜRE KISAYOLLARI ── */}
                            <div className={`p-4 rounded-2xl ${
                                isLight 
                                    ? 'bg-slate-50/80 border border-slate-200' 
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            } space-y-4`}>
                                <div className={`flex items-center justify-between border-b pb-2 ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-slate-700' : 'text-zinc-300'
                                    }`}>
                                        Zamanlama & Süre Hesaplama
                                    </span>
                                    <label className="inline-flex items-center cursor-pointer gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isAllDay}
                                            onChange={(e) => setIsAllDay(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-9 h-5 ${isLight ? 'bg-slate-300' : 'bg-zinc-700'} peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 relative`}></div>
                                        <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>Tüm Gün</span>
                                    </label>
                                </div>

                                {/* Tarih Kısayolları */}
                                <div>
                                    <span className={`text-[11px] font-semibold block mb-1.5 ${
                                        isLight ? 'text-slate-500' : 'text-zinc-400'
                                    }`}>
                                        Hızlı Tarih Seçimi:
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        {[
                                            { id: 'today', label: 'Bugün' },
                                            { id: 'tomorrow', label: 'Yarın' },
                                            { id: 'friday', label: 'Bu Cuma' },
                                            { id: 'saturday', label: 'Bu Cumartesi' },
                                            { id: 'sunday', label: 'Bu Pazar' },
                                            { id: 'next_week', label: 'Gelecek Hafta' },
                                        ].map(dp => (
                                            <button
                                                key={dp.id}
                                                type="button"
                                                onClick={() => handleQuickDate(dp.id as any)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                    isLight
                                                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
                                                }`}
                                            >
                                                {dp.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Süre Kısayolları (Otomatik Bitiş Saati Hesaplar) */}
                                {!isAllDay && (
                                    <div>
                                        <span className={`text-[11px] font-semibold block mb-1.5 ${
                                            isLight ? 'text-slate-500' : 'text-zinc-400'
                                        }`}>
                                            Toplantı Süresi (Bitişi Otomatik Hesaplar):
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                            {[
                                                { mins: 30, label: '30 Dk' },
                                                { mins: 45, label: '45 Dk' },
                                                { mins: 60, label: '1 Saat' },
                                                { mins: 90, label: '1.5 Saat' },
                                                { mins: 120, label: '2 Saat' },
                                                { mins: 180, label: '3 Saat' },
                                                { mins: 240, label: '4 Saat' },
                                            ].map(dur => (
                                                <button
                                                    key={dur.mins}
                                                    type="button"
                                                    onClick={() => handleSetDuration(dur.mins)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                                                        isLight
                                                            ? 'bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-700 border-slate-200 shadow-xs'
                                                            : 'bg-zinc-800 hover:bg-rose-900/60 hover:text-white text-zinc-300 border-zinc-700/80'
                                                    }`}
                                                >
                                                    {dur.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tarih & Saat Inputları */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${
                                            isLight ? 'text-slate-600' : 'text-zinc-300'
                                        }`}>Başlangıç Zamanı</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500 ${
                                                    isLight
                                                        ? 'bg-white border-slate-300 text-slate-800'
                                                        : 'bg-zinc-950 border-zinc-700 text-zinc-100'
                                                }`}
                                                required
                                            />
                                            {!isAllDay && (
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className={`w-28 border rounded-xl px-2.5 py-2 text-xs font-mono font-bold focus:outline-none focus:border-rose-500 ${
                                                        isLight
                                                            ? 'bg-white border-slate-300 text-slate-800'
                                                            : 'bg-zinc-950 border-zinc-700 text-zinc-100'
                                                    }`}
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${
                                            isLight ? 'text-slate-600' : 'text-zinc-300'
                                        }`}>Bitiş Zamanı</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500 ${
                                                    isLight
                                                        ? 'bg-white border-slate-300 text-slate-800'
                                                        : 'bg-zinc-950 border-zinc-700 text-zinc-100'
                                                }`}
                                                required
                                            />
                                            {!isAllDay && (
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className={`w-28 border rounded-xl px-2.5 py-2 text-xs font-mono font-bold focus:outline-none focus:border-rose-500 ${
                                                        isLight
                                                            ? 'bg-white border-slate-300 text-slate-800'
                                                            : 'bg-zinc-950 border-zinc-700 text-zinc-100'
                                                    }`}
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── BÖLÜM 3.5: PROFESYONEL HATIRLATICI MEKANİZMASI ── */}
                            <div className={`p-4 rounded-2xl ${
                                isLight 
                                    ? 'bg-slate-50/80 border border-slate-200' 
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            } space-y-3.5`}>
                                <div className={`flex items-center justify-between border-b pb-2 ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">⏰</span>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            isLight ? 'text-slate-700' : 'text-zinc-200'
                                        }`}>
                                            Profesyonel Hatırlatıcı Mekanizması ({reminders.length})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleTestInstantReminder}
                                        disabled={isTestingReminder}
                                        className={`text-[11px] font-bold flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border disabled:opacity-50 ${
                                            isLight
                                                ? 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50/60 shadow-xs'
                                                : 'bg-zinc-800 border-zinc-700 text-rose-400 hover:text-rose-300 hover:border-zinc-600'
                                        }`}
                                        title="Sistem ve tarayıcı hatırlatıcısını hemen test et"
                                    >
                                        <span>🔔</span>
                                        <span>{isTestingReminder ? 'Test Ediliyor...' : 'Hatırlatıcıyı Test Et'}</span>
                                    </button>
                                </div>

                                {reminderTestSuccess && (
                                    <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                                        isLight
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                            : 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                                    }`}>
                                        <span>✓</span>
                                        <span>Test hatırlatıcısı başarıyla gönderildi! Bildirim merkezinden ve sisteminizden kontrol edebilirsiniz.</span>
                                    </div>
                                )}

                                {/* Hızlı Hatırlatıcı Ekleme Butonları */}
                                <div>
                                    <span className={`text-[11px] font-semibold block mb-1.5 ${
                                        isLight ? 'text-slate-500' : 'text-zinc-400'
                                    }`}>
                                        Hızlı Hatırlatıcı Ekle:
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleAddReminder(15, 'all')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                isLight
                                                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
                                            }`}
                                        >
                                            + ⏱️ 15 Dk Önce
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddReminder(60, 'all')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                isLight
                                                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
                                            }`}
                                        >
                                            + ⏰ 1 Saat Önce
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddReminder(1440, 'all')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                isLight
                                                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
                                            }`}
                                        >
                                            + 📅 1 Gün Önce
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddReminder(2880, 'admins')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                isLight
                                                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
                                            }`}
                                        >
                                            + 🛡️ 2 Gün Önce (Yöneticiler)
                                        </button>
                                    </div>
                                </div>

                                {/* Aktif Hatırlatıcılar Listesi */}
                                <div className="space-y-1.5">
                                    {reminders.length === 0 ? (
                                        <p className={`text-xs italic py-1 ${
                                            isLight ? 'text-slate-500' : 'text-zinc-500'
                                        }`}>Henüz planlanmış hatırlatıcı yok. Yukarıdaki butonlardan ekleyebilirsiniz.</p>
                                    ) : (
                                        reminders.map(rem => {
                                            const mins = rem.minutes_before ?? rem.trigger_minutes_before ?? 60;
                                            const label = mins < 60
                                                ? `${mins} dakika önce`
                                                : mins < 1440
                                                    ? `${Math.round(mins / 60)} saat önce`
                                                    : `${Math.round(mins / 1440)} gün önce`;
                                            const targetLabel = rem.target === 'admins' ? 'Sadece Yöneticiler' : rem.target === 'assignees' ? 'Görevliler' : 'Tüm Topluluk';

                                            return (
                                                <div
                                                    key={rem.id}
                                                    className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                                                        isLight
                                                            ? 'bg-white border-slate-200'
                                                            : 'bg-zinc-950 border-zinc-800'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-rose-500">🔔</span>
                                                        <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{label}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                                            isLight
                                                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                : 'bg-zinc-800 text-zinc-400'
                                                        }`}>
                                                            {targetLabel}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveReminder(rem.id)}
                                                        className={`p-1 text-xs transition-colors ${
                                                            isLight
                                                                ? 'text-slate-400 hover:text-rose-600'
                                                                : 'text-zinc-500 hover:text-rose-400'
                                                        }`}
                                                        title="Hatırlatıcıyı Kaldır"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* ── BÖLÜM 4: KONUM, PLATFORM & BAĞLANTILAR ── */}
                            <div className={`p-4 rounded-2xl ${
                                isLight 
                                    ? 'bg-slate-50/80 border border-slate-200' 
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            } space-y-3.5`}>
                                <div className={`flex items-center justify-between border-b pb-2 ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-slate-700' : 'text-zinc-300'
                                    }`}>
                                        Konum & Görüşme Platformu
                                    </span>
                                </div>

                                {/* Hızlı Platform Kısayolları */}
                                <div>
                                    <span className={`text-[11px] font-semibold block mb-1.5 ${
                                        isLight ? 'text-slate-500' : 'text-zinc-400'
                                    }`}>
                                        Hazır Platform / Konum Seç:
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {[
                                            { name: '📹 Google Meet', url: 'https://meet.google.com/hsd-mtu' },
                                            { name: '💬 Discord Ses', url: 'https://discord.gg/hsdmtu' },
                                            { name: '🏛️ Mühendislik D-102', url: undefined },
                                            { name: '🎤 Konferans Salonu', url: undefined },
                                            { name: '🎪 Merkez Fuaye', url: undefined },
                                        ].map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleQuickLocation(item.name.replace(/^[^\s]+\s/, ''), item.url)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                                    isLight
                                                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/80'
                                                }`}
                                            >
                                                {item.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${
                                            isLight ? 'text-slate-600' : 'text-zinc-300'
                                        }`}>Fiziksel / Dijital Konum</label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="Örn: MTÜ Battalgazi Kampüsü veya Google Meet"
                                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-rose-500 ${
                                                isLight
                                                    ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                                    : 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold mb-1 ${
                                            isLight ? 'text-slate-600' : 'text-zinc-300'
                                        }`}>Online Görüşme Linki</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={meetingLink}
                                                onChange={(e) => setMeetingLink(e.target.value)}
                                                placeholder="https://meet.google.com/..."
                                                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono ${
                                                    isLight
                                                        ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                                        : 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                                                }`}
                                            />
                                            {meetingLink && (
                                                <a
                                                    href={meetingLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 border transition-colors ${
                                                        isLight
                                                            ? 'bg-white hover:bg-slate-100 text-rose-600 border-slate-300 shadow-xs'
                                                            : 'bg-zinc-800 hover:bg-zinc-700 text-rose-300 hover:text-white border-zinc-700'
                                                    }`}
                                                    title="Bağlantıyı Yeni Sekmede Aç"
                                                >
                                                    ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── BÖLÜM 5: ETKİNLİK DURUMU ── */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                                    isLight ? 'text-slate-700' : 'text-zinc-200'
                                }`}>
                                    Etkinlik Durumu
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(['scheduled', 'in_progress', 'completed', 'cancelled'] as const).map(st => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatus(st)}
                                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                                status === st
                                                    ? isLight
                                                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                                                        : 'bg-zinc-800 border-rose-500 text-white shadow-sm'
                                                    : isLight
                                                        ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            {st === 'scheduled' ? '🗓️ Planlandı' :
                                                st === 'in_progress' ? '⚡ Devam Ediyor' :
                                                    st === 'completed' ? '✓ Tamamlandı' : '✕ İptal'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── BÖLÜM 6: MARKDOWN AÇIKLAMA & GÜNDEM ── */}
                            <div className={`p-4 rounded-2xl ${
                                isLight 
                                    ? 'bg-slate-50/80 border border-slate-200' 
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            } space-y-2.5`}>
                                <div className={`flex items-center justify-between border-b pb-2 ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <label className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-slate-700' : 'text-zinc-200'
                                    }`}>
                                        Açıklama & Gündem (Markdown Destekli)
                                    </label>
                                    <div className={`flex gap-1 p-0.5 rounded-lg text-xs ${
                                        isLight ? 'bg-slate-200/80' : 'bg-zinc-800'
                                    }`}>
                                        <button
                                            type="button"
                                            onClick={() => setDescTab('write')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                                descTab === 'write' 
                                                    ? isLight ? 'bg-white text-slate-900 shadow-xs' : 'bg-zinc-700 text-white shadow-xs'
                                                    : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDescTab('preview')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                                descTab === 'preview' 
                                                    ? isLight ? 'bg-white text-slate-900 shadow-xs' : 'bg-zinc-700 text-white shadow-xs'
                                                    : isLight ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            Önizleme
                                        </button>
                                    </div>
                                </div>

                                {descTab === 'write' ? (
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={6}
                                        placeholder="Etkinlik gündemi, hedefler, toplantı notları veya rehberler... (# Başlık, - Madde)"
                                        className={`w-full border rounded-xl p-3.5 text-xs sm:text-sm focus:outline-none focus:border-rose-500 font-mono leading-relaxed ${
                                            isLight
                                                ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                                : 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                                        }`}
                                    />
                                ) : (
                                    <div className={`p-4 rounded-xl min-h-[120px] text-xs sm:text-sm border leading-relaxed font-sans whitespace-pre-wrap ${
                                        isLight
                                            ? 'bg-white text-slate-800 border-slate-200'
                                            : 'bg-zinc-950 text-zinc-200 border-zinc-800'
                                    }`}>
                                        {description || <p className={`italic ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Henüz bir açıklama veya gündem yazılmadı.</p>}
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* ── BÖLÜM 7: GÖREV KONTROL LİSTESİ (CHECKLIST & İLERLEME ÇUBUĞU) ── */}
                        <div className={`p-4 rounded-2xl ${
                            isLight 
                                ? 'bg-slate-50/80 border border-slate-200' 
                                : 'bg-zinc-900/70 border border-zinc-800'
                        } space-y-3.5`}>
                            <div className={`flex items-center justify-between border-b pb-2 ${
                                isLight ? 'border-slate-200' : 'border-zinc-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-slate-700' : 'text-zinc-200'
                                    }`}>
                                        Görev Kontrol Listesi ({completedSubtasksCount}/{subtasks.length})
                                    </span>
                                    {subtasks.length > 0 && (
                                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold border ${
                                            isLight 
                                                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                                                : 'bg-zinc-800 text-rose-300 border-zinc-700'
                                        }`}>
                                            %{progressPercent}
                                        </span>
                                    )}
                                </div>

                                {subtasks.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={handleToggleAllSubtasks}
                                            className={`transition-colors text-[11px] ${
                                                isLight ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {subtasks.every(s => s.is_completed) ? 'İşaretleri Kaldır' : 'Tümünü Tamamla'}
                                        </button>
                                        <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>•</span>
                                        <button
                                            type="button"
                                            onClick={handleClearCompletedSubtasks}
                                            className={`transition-colors text-[11px] ${
                                                isLight ? 'text-slate-500 hover:text-rose-600' : 'text-zinc-400 hover:text-rose-400'
                                            }`}
                                        >
                                            Bitenleri Temizle
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* İlerleme Çubuğu */}
                            {subtasks.length > 0 && (
                                <div className={`w-full h-2 rounded-full overflow-hidden ${
                                    isLight ? 'bg-slate-200' : 'bg-zinc-800'
                                }`}>
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            )}

                            {/* Hazır Görev Setleri Ekleme Butonları */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className={`text-[11px] font-semibold mr-1 ${
                                    isLight ? 'text-slate-500' : 'text-zinc-400'
                                }`}>Hazır Maddeler Ekle:</span>
                                <button
                                    type="button"
                                    onClick={() => handleAddPresetChecklist('tech')}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                                        isLight 
                                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs' 
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-transparent'
                                    }`}
                                >
                                    + Kod/Teknik
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddPresetChecklist('event')}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                                        isLight 
                                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs' 
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-transparent'
                                    }`}
                                >
                                    + Lojistik/Salon
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddPresetChecklist('social')}
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                                        isLight 
                                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs' 
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-transparent'
                                    }`}
                                >
                                    + Medya/Duyuru
                                </button>
                            </div>

                            {/* Yeni Görev Ekleme Formu */}
                            <form onSubmit={handleAddSubtask} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    placeholder="+ Yeni kontrol maddesi ekle (örn: Konuşmacı slaytı kontrol edildi)..."
                                    className={`flex-1 border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-rose-500 ${
                                        isLight
                                            ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                            : 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                                    }`}
                                />
                                <button
                                    type="submit"
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm ${
                                        isLight
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                                            : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                                    }`}
                                >
                                    Ekle
                                </button>
                            </form>

                            {/* Görev Maddeleri Listesi */}
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {subtasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors group ${
                                            isLight
                                                ? 'bg-white border-slate-200 hover:border-slate-300'
                                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer flex-1 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={task.is_completed}
                                                onChange={() => handleToggleSubtask(task.id, task.is_completed)}
                                                className={`w-4 h-4 rounded text-rose-600 focus:ring-0 cursor-pointer ${
                                                    isLight ? 'border-slate-300 bg-white' : 'border-zinc-700 bg-zinc-800'
                                                }`}
                                            />
                                            <span className={`font-semibold ${
                                                task.is_completed 
                                                    ? isLight ? 'line-through text-slate-400' : 'line-through text-zinc-500'
                                                    : isLight ? 'text-slate-800' : 'text-zinc-100'
                                            }`}>
                                                {task.title}
                                            </span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSubtask(task.id)}
                                            className={`opacity-0 group-hover:opacity-100 p-1 text-xs transition-opacity ${
                                                isLight ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'
                                            }`}
                                            title="Görevi Sil"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── BÖLÜM 8: DOSYA EKLERİ (25MB DOĞRULAMA) ── */}
                        <div className={`p-4 rounded-2xl ${
                            isLight 
                                ? 'bg-slate-50/80 border border-slate-200' 
                                : 'bg-zinc-900/70 border border-zinc-800'
                        } space-y-3`}>
                            <div className={`flex items-center justify-between border-b pb-2 ${
                                isLight ? 'border-slate-200' : 'border-zinc-800'
                            }`}>
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                    isLight ? 'text-slate-700' : 'text-zinc-200'
                                }`}>
                                    Dosya Ekleri (Maks. 25MB)
                                </span>
                                <label className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                    isLight
                                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
                                }`}>
                                    {isUploading ? 'Yükleniyor...' : '+ Dosya Yükle'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            </div>

                            {attachments.length > 0 ? (
                                <div className="space-y-2">
                                    {attachments.map(att => (
                                        <div
                                            key={att.id}
                                            className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                                                isLight
                                                    ? 'bg-white border-slate-200'
                                                    : 'bg-zinc-950 border-zinc-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <span className={`p-1.5 rounded-lg text-sm ${
                                                    isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-800 text-zinc-200'
                                                }`}>📄</span>
                                                <div className="truncate">
                                                    <p className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{att.file_name}</p>
                                                    <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                                        {(att.file_size / 1024 / 1024).toFixed(2)} MB • {att.uploaded_by}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                                isLight 
                                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                                                    : 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50'
                                            }`}>
                                                Doğrulandı
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={`text-xs italic ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Bu etkinliğe henüz dosya eklenmedi.</p>
                            )}
                        </div>

                        {/* ── BÖLÜM 9: ⚡ ANLIK DUYURU & EKİP BİLDİRİMİ DAĞITIMI ── */}
                        <div className={`p-4 rounded-2xl ${
                            isLight 
                                ? 'bg-gradient-to-br from-rose-50/60 to-rose-100/30 border border-rose-200' 
                                : 'bg-rose-950/20 border border-rose-900/50'
                        } space-y-3.5`}>
                            <div className={`flex items-center justify-between border-b pb-2 ${
                                isLight ? 'border-rose-200/80' : 'border-rose-900/40'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-rose-500 text-base">⚡</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-rose-950' : 'text-rose-200'
                                    }`}>
                                        Anlık Duyuru & Ekip Bildirimi (Canlı Dağıtım)
                                    </span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                                    isLight 
                                        ? 'bg-rose-100 text-rose-700 border-rose-200' 
                                        : 'bg-rose-900/60 text-rose-300 border border-rose-800'
                                }`}>
                                    Anlık Bildirim
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className={`block mb-1 font-bold ${
                                        isLight ? 'text-slate-700' : 'text-zinc-300'
                                    }`}>Hedef Kitle</label>
                                    <select
                                        value={announcementAudience}
                                        onChange={(e) => setAnnouncementAudience(e.target.value as any)}
                                        className={`w-full border rounded-xl px-3 py-2 font-medium ${
                                            isLight 
                                                ? 'bg-white border-slate-300 text-slate-800' 
                                                : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                                        }`}
                                    >
                                        <option value="group">Özel Komite / Ekip</option>
                                        <option value="all">Tüm Topluluk Üyeleri</option>
                                        <option value="role">Belirli Rol Seviyesi</option>
                                    </select>
                                </div>

                                {announcementAudience === 'group' && (
                                    <div>
                                        <label className={`block mb-1 font-bold ${
                                            isLight ? 'text-slate-700' : 'text-zinc-300'
                                        }`}>Komite Seç</label>
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className={`w-full border rounded-xl px-3 py-2 font-medium ${
                                                isLight 
                                                    ? 'bg-white border-slate-300 text-slate-800' 
                                                    : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                                            }`}
                                        >
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {announcementAudience === 'role' && (
                                    <div>
                                        <label className={`block mb-1 font-bold ${
                                            isLight ? 'text-slate-700' : 'text-zinc-300'
                                        }`}>Rol Seç</label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value as any)}
                                            className={`w-full border rounded-xl px-3 py-2 font-medium ${
                                                isLight 
                                                    ? 'bg-white border-slate-300 text-slate-800' 
                                                    : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                                            }`}
                                        >
                                            <option value="super_admin">Super Admin</option>
                                            <option value="workspace_admin">Workspace Admin</option>
                                            <option value="editor">Editor</option>
                                            <option value="contributor">Contributor</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <input
                                type="text"
                                value={announcementMsg}
                                onChange={(e) => setAnnouncementMsg(e.target.value)}
                                placeholder="Özel duyuru notu (boş bırakılırsa etkinlik özeti iletilir)..."
                                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-rose-500 font-medium ${
                                    isLight 
                                        ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500'
                                }`}
                            />

                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={handleSendInstantAnnouncement}
                                    disabled={isSendingAnnouncement}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all disabled:opacity-50"
                                >
                                    {isSendingAnnouncement ? 'Gönderiliyor...' : '⚡ Anlık Duyur'}
                                </button>
                                {announcementSuccess && (
                                    <span className={`text-xs font-bold animate-in fade-in ${
                                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                                    }`}>
                                        ✓ Ekip Bildirimi Başarıyla Dağıtıldı!
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── BÖLÜM 10: YORUMLAR & EKİP NOTLARI (KURUMSAL SEVİYE) ── */}
                        <div className={`p-4 rounded-2xl ${
                            isLight 
                                ? 'bg-slate-50/80 border border-slate-200' 
                                : 'bg-zinc-900/70 border border-zinc-800'
                        } space-y-4`}>
                            <div className={`flex items-center justify-between border-b pb-2 ${
                                isLight ? 'border-slate-200' : 'border-zinc-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">💬</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${
                                        isLight ? 'text-slate-700' : 'text-zinc-200'
                                    }`}>
                                        Yorumlar & Ekip Notları ({comments.length})
                                    </span>
                                </div>
                                <span className={`text-[10px] font-mono ${
                                    isLight ? 'text-slate-500' : 'text-zinc-400'
                                }`}>
                                    {comments.filter(c => c.is_pinned).length > 0 && `${comments.filter(c => c.is_pinned).length} Sabitlendi • `}
                                    Kurumsal İşbirliği
                                </span>
                            </div>

                            {/* Yeni Yorum / Ekip Notu Formu */}
                            <form onSubmit={handleAddComment} className="space-y-2">
                                <div className="flex gap-2">
                                    <select
                                        value={newCommentTag}
                                        onChange={(e) => setNewCommentTag(e.target.value as any)}
                                        className={`border rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500 shrink-0 ${
                                            isLight 
                                                ? 'bg-white border-slate-300 text-slate-800' 
                                                : 'bg-zinc-950 border-zinc-700 text-zinc-200'
                                        }`}
                                    >
                                        <option value="general">💬 Genel</option>
                                        <option value="idea">💡 Fikir</option>
                                        <option value="decision">✅ Karar</option>
                                        <option value="blocker">⚠️ Engel</option>
                                        <option value="info">📌 Bilgi</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        placeholder="Bir güncelleme, karar veya ekip notu yazın..."
                                        className={`flex-1 border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-rose-500 font-medium ${
                                            isLight 
                                                ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400' 
                                                : 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                                        }`}
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors shrink-0 shadow-sm"
                                    >
                                        Ekle
                                    </button>
                                </div>
                            </form>

                            {/* Yorumlar Listesi (Sabitlenenler En Üstte) */}
                            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                {comments.length === 0 ? (
                                    <p className={`text-xs italic text-center py-4 ${
                                        isLight ? 'text-slate-400' : 'text-zinc-500'
                                    }`}>
                                        Henüz bir ekip notu veya değerlendirme eklenmedi. İlk notu siz ekleyin.
                                    </p>
                                ) : (
                                    [...comments]
                                        .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
                                        .map(c => {
                                            const isPinned = Boolean(c.is_pinned);
                                            const canDelete = currentMember?.role === 'super_admin' ||
                                                currentMember?.role === 'workspace_admin' ||
                                                c.user_id === currentMember?.id;

                                            const tagBadge = {
                                                idea: { 
                                                    label: '💡 Fikir', 
                                                    color: isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-950/70 border-purple-800 text-purple-300' 
                                                },
                                                decision: { 
                                                    label: '✅ Karar', 
                                                    color: isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/70 border-emerald-800 text-emerald-300' 
                                                },
                                                blocker: { 
                                                    label: '⚠️ Engel', 
                                                    color: isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-950/70 border-rose-800 text-rose-300' 
                                                },
                                                info: { 
                                                    label: '📌 Bilgi', 
                                                    color: isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-sky-950/70 border-sky-800 text-sky-300' 
                                                },
                                                general: { 
                                                    label: '💬 Not', 
                                                    color: isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-zinc-800 border-zinc-700 text-zinc-400' 
                                                },
                                            }[c.tag || 'general'];

                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                                                        isPinned
                                                            ? isLight 
                                                                ? 'bg-amber-50/70 border-amber-300 shadow-xs' 
                                                                : 'bg-amber-950/20 border-amber-600/60 shadow-sm'
                                                            : isLight 
                                                                ? 'bg-white border-slate-200 hover:border-slate-300' 
                                                                : 'bg-zinc-950/80 border-zinc-800/90 hover:border-zinc-700'
                                                    }`}
                                                >
                                                    {/* Üst Bilgi: Yazar, Tag, Zaman & Eylemler */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                                                isLight 
                                                                    ? 'bg-rose-100 border border-rose-200 text-rose-700' 
                                                                    : 'bg-rose-600/30 border border-rose-500/40 text-rose-300'
                                                            }`}>
                                                                {c.user_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className={`font-bold truncate ${
                                                                isLight ? 'text-slate-800' : 'text-zinc-200'
                                                            }`}>{c.user_name}</span>
                                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${tagBadge.color}`}>
                                                                {tagBadge.label}
                                                            </span>
                                                            {isPinned && (
                                                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                                                                    isLight 
                                                                        ? 'text-amber-800 bg-amber-100 border-amber-300' 
                                                                        : 'text-amber-400 bg-amber-950/60 border-amber-800/80'
                                                                }`}>
                                                                    📌 Sabitlendi
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[10px] font-mono ${
                                                                isLight ? 'text-slate-400' : 'text-zinc-500'
                                                            }`}>
                                                                {new Date(c.created_at).toLocaleString('tr-TR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleCommentPin(c.id)}
                                                                className={`p-1 rounded text-xs transition-colors ${
                                                                    isPinned 
                                                                        ? isLight ? 'text-amber-600 hover:text-amber-500' : 'text-amber-400 hover:text-amber-300'
                                                                        : isLight ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'
                                                                }`}
                                                                title={isPinned ? 'Sabitlemeyi Kaldır' : 'Yorumu Sabitle'}
                                                            >
                                                                📌
                                                            </button>
                                                            {canDelete && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteComment(c.id)}
                                                                    className={`p-1 rounded text-xs transition-colors ${
                                                                        isLight ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'
                                                                    }`}
                                                                    title="Yorumu Sil"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Yorum İçeriği */}
                                                    <p className={`leading-relaxed font-sans pl-1 ${
                                                        isLight ? 'text-slate-800' : 'text-zinc-200'
                                                    }`}>{c.content}</p>

                                                    {/* Reaksiyon Çubuğu */}
                                                    <div className={`flex items-center gap-1.5 pt-1 border-t ${
                                                        isLight ? 'border-slate-100' : 'border-zinc-900/60'
                                                    }`}>
                                                        {['👍', '🚀', '❤️', '👀'].map(emoji => {
                                                            const users = (c.reactions && c.reactions[emoji]) || [];
                                                            const hasReacted = users.includes(currentMember?.id || 'anon');

                                                            return (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => handleToggleCommentReaction(c.id, emoji)}
                                                                    className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
                                                                        hasReacted
                                                                            ? isLight
                                                                                ? 'bg-rose-50 border border-rose-300 text-rose-700'
                                                                                : 'bg-rose-950/80 border border-rose-700 text-rose-200'
                                                                            : isLight
                                                                                ? 'bg-slate-100 hover:bg-slate-200/70 text-slate-600 border border-slate-200'
                                                                                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                                                                    }`}
                                                                >
                                                                    <span>{emoji}</span>
                                                                    {users.length > 0 && <span className="text-[10px] font-bold">{users.length}</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        {/* ── BÖLÜM 10: DÜZENLEME GEÇMİŞİ & REVİZYON KAYITLARI (CHANGELOG) ── */}
                        {event && (
                            <div className={`p-4 rounded-2xl ${
                                isLight
                                    ? 'bg-slate-50/80 border border-slate-200'
                                    : 'bg-zinc-900/70 border border-zinc-800'
                            } space-y-3.5`}>
                                <div className={`flex items-center justify-between border-b pb-2 ${
                                    isLight ? 'border-slate-200' : 'border-zinc-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">📜</span>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            isLight ? 'text-slate-700' : 'text-zinc-200'
                                        }`}>
                                            Düzenleme Geçmişi ({event.edit_history?.length || 0})
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                                        isLight ? 'bg-slate-200/70 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                                    }`}>
                                        Versiyon: v{event.version || 1}
                                    </span>
                                </div>

                                {event.edit_history && event.edit_history.length > 0 ? (
                                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                                        {[...event.edit_history].reverse().map((record) => {
                                            const recMember = members.find(m => m.id === record.user_id);
                                            const recAvatar = recMember?.avatar_url;
                                            const recName = record.user_name || recMember?.display_name || recMember?.full_name || 'Topluluk Yöneticisi';
                                            const recDate = new Date(record.timestamp);

                                            return (
                                                <div
                                                    key={record.id}
                                                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                                                        isLight
                                                            ? 'bg-white border-slate-200 hover:border-slate-300'
                                                            : 'bg-zinc-950 border-zinc-850 hover:border-zinc-700'
                                                    }`}
                                                >
                                                    <div className="shrink-0 mt-0.5">
                                                        {recAvatar ? (
                                                            <img
                                                                src={recAvatar}
                                                                alt={recName}
                                                                className="w-6 h-6 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-zinc-700"
                                                            />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-[9px] font-bold text-white shadow-xs">
                                                                {recName.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 space-y-0.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                                                                    {recName}
                                                                </span>
                                                                {record.user_role && (
                                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                                                        record.user_role === 'super_admin'
                                                                            ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/60 text-amber-300'
                                                                            : isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                                                                    }`}>
                                                                        {record.user_role === 'super_admin' ? 'Admin' : record.user_role}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`text-[10px] font-mono shrink-0 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                                                                {recDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {recDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        <p className={`text-[11px] leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                                                            {record.action === 'created' ? (
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✨ Etkinlik oluşturuldu: {record.summary}</span>
                                                            ) : record.action === 'reverted' ? (
                                                                <span className="text-amber-600 dark:text-amber-400 font-semibold">↺ Geri alındı: {record.summary}</span>
                                                            ) : (
                                                                <span>✎ {record.summary}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={`p-3 rounded-xl border text-center italic text-xs ${
                                        isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                                    }`}>
                                        Bu etkinlik için henüz kayıtlı bir düzenleme geçmişi bulunmuyor.
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* ── 3. FOOTER ACTIONS ── */}
                    <div className={`p-4 border-t flex items-center justify-between backdrop-blur-md shrink-0 ${
                        isLight ? 'border-slate-200 bg-slate-50/95' : 'border-zinc-800 bg-zinc-900/90'
                    }`}>
                        <div>
                            {event && canEditPast && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                        isLight 
                                            ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200' 
                                            : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-rose-900/50'
                                    }`}
                                >
                                    {isDeleting ? 'Siliniyor...' : 'Etkinliği Sil'}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                    isLight 
                                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80' 
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                }`}
                            >
                                {isEventPast && !canEditPast ? 'Kapat' : 'İptal'}
                            </button>
                            {(!isEventPast || canEditPast) && (
                                <button
                                    type="submit"
                                    form="event-form"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Kaydediliyor...' : (event ? 'Güncelle' : 'Etkinliği Oluştur')}
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
