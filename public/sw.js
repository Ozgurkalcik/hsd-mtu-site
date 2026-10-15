// HSD MTÜ Topluluk Portalı & Çalışma Alanı - Web Push & Background Service Worker
// Android Chrome & iOS 16.4+ (PWA) Arka Plan Bildirim Yöneticisi

const CACHE_NAME = 'hsd-workspace-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Arka Plan Push Bildirim Olayı
self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch {
            data = { title: 'HSD MTÜ Topluluk Bildirimi', body: event.data.text() };
        }
    }

    const title = data.title || 'HSD MTÜ Topluluk Bildirimi';
    const options = {
        body: data.body || data.message || 'Topluluk takviminizde yeni bir güncelleme var.',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'hsd-workspace-notification',
        renotify: true,
        data: {
            url: data.url || '/workspace',
            eventId: data.eventId,
            timestamp: Date.now()
        },
        actions: [
            { action: 'open', title: 'Takvimde Aç' },
            { action: 'close', title: 'Kapat' }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime Tıklama Olayı (Android & iOS)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const targetUrl = event.notification.data?.url || '/workspace';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('/workspace') && 'focus' in client) {
                    client.postMessage({
                        type: 'NOTIFICATION_CLICKED',
                        eventId: event.notification.data?.eventId
                    });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
