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
    WorkspaceRole
} from '@/shared/api/workspaceTypes';

interface EventDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    event: WorkspaceEvent | null;
    calendars: WorkspaceCalendar[];
    groups: WorkspaceGroup[];
    members: WorkspaceMember[];
    currentMember: WorkspaceMember | null;
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
    calendars,
    groups,
    members,
    currentMember,
    onEventSaved,
    onEventDeleted,
}: EventDrawerProps) {
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
    const [assignees, setAssignees] = useState<string[]>([]);
    const [subtasks, setSubtasks] = useState<WorkspaceSubtask[]>([]);
    const [comments, setComments] = useState<WorkspaceComment[]>([]);
    const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([]);
    const [version, setVersion] = useState<number>(1);

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

    // Comment input
    const [newCommentText, setNewCommentText] = useState('');

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
            setAssignees(event.assignees || []);
            setSubtasks(event.subtasks || []);
            setComments(event.comments || []);
            setAttachments(event.attachments || []);
            setVersion(event.version || 1);

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
            // New Event Defaults
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

            setTitle('');
            setCalendarId(calendars[0]?.id || 'cal_core');
            setCategory('Toplantı');
            setColor(calendars[0]?.color || '#dc2626');
            setStartDate(today);
            setStartTime(now.toTimeString().substring(0, 5));
            setEndDate(today);
            setEndTime(nextHour.toTimeString().substring(0, 5));
            setIsAllDay(false);
            setLocation('');
            setMeetingLink('');
            setDescription('');
            setStatus('scheduled');
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
    }, [isOpen, event, calendars, currentMember]);

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
            assignees,
            subtasks,
            comments,
            attachments,
            version,
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

    // Comment Handler
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
            created_at: new Date().toISOString()
        };

        setComments([...comments, newCom]);
        setNewCommentText('');

        if (event?.id) {
            try {
                await fetch(`/api/workspace/events/${event.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: newCom.content }),
                });
            } catch (err) {
                console.error('Yorum API hatası:', err);
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
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-4 sm:pl-10">
                <div className="w-screen max-w-2xl bg-zinc-950 border-l border-zinc-800 text-zinc-100 shadow-2xl flex flex-col h-full">

                    {/* ── 1. HEADER (Yüksek Kontrast & Kolay Okunabilirlik) ── */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-3">
                            <span
                                className="w-4 h-4 rounded-full inline-block shadow-md ring-2 ring-white/30 shrink-0"
                                style={{ backgroundColor: color }}
                            />
                            <div>
                                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                                    {event ? 'Etkinliği Düzenle' : 'Yeni Topluluk Etkinliği'}
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-rose-300 border border-zinc-700/80 font-mono">
                                        {category}
                                    </span>
                                </h2>
                                <p className="text-xs text-zinc-400 font-medium">
                                    HSD Malatya Turgut Özal Üniversitesi Çekirdek Ekip Çalışma Alanı
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {event && (
                                <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-mono border border-zinc-700 font-semibold" title="Versiyon Kilidi">
                                    v{version}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-700/80 shadow-md space-y-3.5">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-rose-400 text-base">⚡</span>
                                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                                            Komite Hızlı Etkinlik Şablonları (Tek Tıkla Kur)
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-zinc-400 font-mono font-semibold">
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
                                            className="text-left p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-all group flex items-start gap-2.5 relative"
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full mt-0.5 shrink-0 group-hover:scale-125 transition-transform ring-1 ring-white/20"
                                                style={{ backgroundColor: tmpl.committeeColor }}
                                            />
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className="text-xs font-bold text-zinc-100 group-hover:text-white truncate">
                                                        {tmpl.label}
                                                    </p>
                                                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                                        {tmpl.durationMinutes} Dk
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                                                    {tmpl.committeeName} • {tmpl.category}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form id="event-form" onSubmit={handleSave} className="space-y-6">

                            {/* ── BÖLÜM 1: ETKİNLİK BAŞLIĞI ── */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                                    Etkinlik Başlığı <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Örn: HSD Haftalık Çekirdek Ekip Sprint & Koordinasyon Toplantısı..."
                                    className="w-full text-base sm:text-lg font-bold bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-inner"
                                    autoFocus={!event}
                                    required
                                />
                            </div>

                            {/* ── BÖLÜM 2: KOMİTE / TAKVİM, KATEGORİ & RENK ── */}
                            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
                                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                        Komite, Takvim & Kategori Ayarları
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Takvim Seçimi */}
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                                            Topluluk Takvimi
                                        </label>
                                        <select
                                            value={calendarId}
                                            onChange={(e) => {
                                                setCalendarId(e.target.value);
                                                const selected = calendars.find(c => c.id === e.target.value);
                                                if (selected) setColor(selected.color);
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-rose-500"
                                        >
                                            {calendars.map(cal => (
                                                <option key={cal.id} value={cal.id}>{cal.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Kategori Seçimi */}
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                                            Etkinlik Kategorisi
                                        </label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-rose-500"
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

                            {/* ── BÖLÜM 3: ZAMANLAMA, TARİH & HIZLI SÜRE KISAYOLLARI ── */}
                            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                        Zamanlama & Süre Hesaplama
                                    </span>
                                    <label className="inline-flex items-center cursor-pointer gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isAllDay}
                                            onChange={(e) => setIsAllDay(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 relative"></div>
                                        <span className="text-xs font-bold text-zinc-200">Tüm Gün</span>
                                    </label>
                                </div>

                                {/* Tarih Kısayolları */}
                                <div>
                                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
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
                                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700/80 transition-colors"
                                            >
                                                {dp.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Süre Kısayolları (Otomatik Bitiş Saati Hesaplar) */}
                                {!isAllDay && (
                                    <div>
                                        <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
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
                                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-900/60 hover:text-white text-zinc-300 text-xs font-mono font-bold border border-zinc-700/80 transition-colors"
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
                                        <label className="block text-xs font-bold text-zinc-300 mb-1">Başlangıç Zamanı</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-rose-500"
                                                required
                                            />
                                            {!isAllDay && (
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="w-28 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-zinc-100 text-xs font-mono font-bold focus:outline-none focus:border-rose-500"
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-zinc-300 mb-1">Bitiş Zamanı</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 text-xs font-semibold focus:outline-none focus:border-rose-500"
                                                required
                                            />
                                            {!isAllDay && (
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="w-28 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-zinc-100 text-xs font-mono font-bold focus:outline-none focus:border-rose-500"
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── BÖLÜM 4: KONUM, PLATFORM & BAĞLANTILAR ── */}
                            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3.5">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                        Konum & Görüşme Platformu
                                    </span>
                                </div>

                                {/* Hızlı Platform Kısayolları */}
                                <div>
                                    <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
                                        Hazır Platform / Konum Seç:
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleQuickLocation('Google Meet', 'https://meet.google.com/hsd-mtu')}
                                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80"
                                        >
                                            📹 Google Meet
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickLocation('Discord Ses Kanalı', 'https://discord.gg/hsdmtu')}
                                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80"
                                        >
                                            💬 Discord Ses
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickLocation('MTÜ Mühendislik D-102 Lab')}
                                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80"
                                        >
                                            🏛️ Mühendislik D-102
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickLocation('MTÜ Battalgazi Konferans Salonu')}
                                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80"
                                        >
                                            🎤 Konferans Salonu
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickLocation('MTÜ Merkez Fuaye Stand Alanı')}
                                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/80"
                                        >
                                            🎪 Merkez Fuaye
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-300 mb-1">Fiziksel / Dijital Konum</label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="Örn: MTÜ Battalgazi Kampüsü veya Google Meet"
                                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-300 mb-1">Online Görüşme Linki</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={meetingLink}
                                                onChange={(e) => setMeetingLink(e.target.value)}
                                                placeholder="https://meet.google.com/..."
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                                            />
                                            {meetingLink && (
                                                <a
                                                    href={meetingLink}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 hover:text-white text-xs font-bold flex items-center justify-center shrink-0 border border-zinc-700"
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
                                <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">
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
                                                    ? 'bg-zinc-800 border-rose-500 text-white shadow-sm'
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
                            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                    <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                                        Açıklama & Gündem (Markdown Destekli)
                                    </label>
                                    <div className="flex gap-1 bg-zinc-800 p-0.5 rounded-lg text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setDescTab('write')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                                descTab === 'write' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDescTab('preview')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                                descTab === 'preview' ? 'bg-zinc-700 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
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
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono leading-relaxed"
                                    />
                                ) : (
                                    <div className="p-4 bg-zinc-950 rounded-xl min-h-[120px] text-xs sm:text-sm text-zinc-200 border border-zinc-800 leading-relaxed font-sans whitespace-pre-wrap">
                                        {description || <p className="text-zinc-500 italic">Henüz bir açıklama veya gündem yazılmadı.</p>}
                                    </div>
                                )}
                            </div>
                        </form>

                        {/* ── BÖLÜM 7: GÖREV KONTROL LİSTESİ (CHECKLIST & İLERLEME ÇUBUĞU) ── */}
                        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3.5">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                                        Görev Kontrol Listesi ({completedSubtasksCount}/{subtasks.length})
                                    </span>
                                    {subtasks.length > 0 && (
                                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-rose-300 font-bold border border-zinc-700">
                                            %{progressPercent}
                                        </span>
                                    )}
                                </div>

                                {subtasks.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={handleToggleAllSubtasks}
                                            className="text-zinc-400 hover:text-white transition-colors text-[11px]"
                                        >
                                            {subtasks.every(s => s.is_completed) ? 'İşaretleri Kaldır' : 'Tümünü Tamamla'}
                                        </button>
                                        <span className="text-zinc-600">•</span>
                                        <button
                                            type="button"
                                            onClick={handleClearCompletedSubtasks}
                                            className="text-zinc-400 hover:text-rose-400 transition-colors text-[11px]"
                                        >
                                            Bitenleri Temizle
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* İlerleme Çubuğu */}
                            {subtasks.length > 0 && (
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            )}

                            {/* Hazır Görev Setleri Ekleme Butonları */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[11px] font-semibold text-zinc-400 mr-1">Hazır Maddeler Ekle:</span>
                                <button
                                    type="button"
                                    onClick={() => handleAddPresetChecklist('tech')}
                                    className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                                >
                                    + Kod/Teknik
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddPresetChecklist('event')}
                                    className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                                >
                                    + Lojistik/Salon
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddPresetChecklist('social')}
                                    className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
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
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors shrink-0"
                                >
                                    Ekle
                                </button>
                            </form>

                            {/* Görev Maddeleri Listesi */}
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {subtasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                                    >
                                        <label className="flex items-center gap-3 cursor-pointer flex-1 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={task.is_completed}
                                                onChange={() => handleToggleSubtask(task.id, task.is_completed)}
                                                className="w-4 h-4 rounded border-zinc-700 text-rose-600 focus:ring-0 bg-zinc-800 cursor-pointer"
                                            />
                                            <span className={`font-semibold ${task.is_completed ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                                                {task.title}
                                            </span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSubtask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 text-xs transition-opacity"
                                            title="Görevi Sil"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── BÖLÜM 8: DOSYA EKLERİ (25MB DOĞRULAMA) ── */}
                        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                                    Dosya Ekleri (Maks. 25MB)
                                </span>
                                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-100 border border-zinc-700 transition-colors">
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
                                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <span className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-sm">📄</span>
                                                <div className="truncate">
                                                    <p className="font-bold text-zinc-200 truncate">{att.file_name}</p>
                                                    <p className="text-[11px] text-zinc-400">
                                                        {(att.file_size / 1024 / 1024).toFixed(2)} MB • {att.uploaded_by}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/50">
                                                Doğrulandı
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 italic">Bu etkinliğe henüz dosya eklenmedi.</p>
                            )}
                        </div>

                        {/* ── BÖLÜM 9: ⚡ ANLIK DUYURU & EKİP BİLDİRİMİ DAĞITIMI ── */}
                        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-3.5">
                            <div className="flex items-center justify-between border-b border-rose-900/40 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-rose-400 text-base">⚡</span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-rose-200">
                                        Anlık Duyuru & Ekip Bildirimi (Canlı Dağıtım)
                                    </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-800 font-mono font-bold">
                                    Anlık Bildirim
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="block text-zinc-300 mb-1 font-bold">Hedef Kitle</label>
                                    <select
                                        value={announcementAudience}
                                        onChange={(e) => setAnnouncementAudience(e.target.value as any)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-medium"
                                    >
                                        <option value="group">Özel Komite / Ekip</option>
                                        <option value="all">Tüm Topluluk Üyeleri</option>
                                        <option value="role">Belirli Rol Seviyesi</option>
                                    </select>
                                </div>

                                {announcementAudience === 'group' && (
                                    <div>
                                        <label className="block text-zinc-300 mb-1 font-bold">Komite Seç</label>
                                        <select
                                            value={selectedGroupId}
                                            onChange={(e) => setSelectedGroupId(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-medium"
                                        >
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {announcementAudience === 'role' && (
                                    <div>
                                        <label className="block text-zinc-300 mb-1 font-bold">Rol Seç</label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value as any)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 font-medium"
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
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-medium"
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
                                    <span className="text-xs text-emerald-400 font-bold animate-in fade-in">
                                        ✓ Ekip Bildirimi Başarıyla Dağıtıldı!
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── BÖLÜM 10: YORUMLAR & EKİP NOTLARI ── */}
                        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block border-b border-zinc-800 pb-2">
                                Yorumlar & Ekip Notları ({comments.length})
                            </span>

                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    placeholder="Bir güncelleme veya ekip notu yaz..."
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-medium"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
                                >
                                    Gönder
                                </button>
                            </form>

                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {comments.map(c => (
                                    <div key={c.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-zinc-100">{c.user_name}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono">
                                                {new Date(c.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-zinc-300 leading-relaxed font-sans">{c.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* ── 3. FOOTER ACTIONS ── */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between backdrop-blur-md shrink-0">
                        <div>
                            {event && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-rose-900/50 transition-colors"
                                >
                                    {isDeleting ? 'Siliniyor...' : 'Etkinliği Sil'}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                form="event-form"
                                disabled={isSaving}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Kaydediliyor...' : (event ? 'Güncelle' : 'Etkinliği Oluştur')}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
