const CACHE_NAME = 'almustafa-v2'; // تغيير الإصدار لإجبار المتصفح على التحديث
const urlsToCache = [
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/index.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting(); // تفعيل النسخة الجديدة فوراً
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // حذف الكاش القديم
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // استبعاد ملفات الـ JS والـ HTML من الكاش لضمان التحديث
    if (event.request.mode === 'navigate' || event.request.url.endsWith('.js')) {
        return event.respondWith(fetch(event.request));
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
