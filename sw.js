const CACHE_NAME = 'nawy-cache-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// تثبيت الـ Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// تفعيل الـ Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// استراتيجية Network First مع Fallback للكاش
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // نخزن نسخة في الكاش للاستخدام المستقبلي
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, responseClone))
          .catch(() => {});
        return response;
      })
      .catch(() => {
        // لو مفيش إنترنت، نرجع من الكاش
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            
            // لو الصفحة مش موجودة في الكاش، نرجع الصفحة الرئيسية
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            return new Response('', { status: 404 });
          });
      })
  );
});

// استقبال رسائل من الصفحة
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // لو في نافذة مفتوحة، نركز عليها
        for (const client of windowClients) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // لو مفيش نافذة، نفتح واحدة جديدة
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});

// معالجة إغلاق الإشعار
self.addEventListener('notificationclose', event => {
  console.log('Notification closed');
});