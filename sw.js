const CACHE_NAME = 'nawy-app-v2'; // تحديث الإصدار لتجاوز الذاكرة القديمة
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. تثبيت الـ Service Worker وتحميل الملفات الحديثة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('تم حفظ الملفات الجديدة في الذاكرة المؤقتة');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // إجبار النسخة الجديدة على التفعيل فوراً بدون انتظار إغلاق المتصفح
  self.skipWaiting();
});

// 2. تنظيف الـ Cache القديمة (حذف v1 واستبدالها بـ v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('جاري حذف الذاكرة القديمة:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // السيطرة المباشرة على جميع الصفحات المفتوحة لتطبيق التحديث
  self.clients.claim();
});

// 3. استدعاء الملفات عند انقطاع الإنترنت (Offline Support)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // إرجاع الملف من الذاكرة إذا كان موجوداً، أو جلبه من الشبكة
      return cachedResponse || fetch(event.request).catch(() => {
        // في حال عدم وجود إنترنت وعدم وجود الملف
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
