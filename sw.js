/* =========================================================
   NAWY — SERVICE WORKER
   Automatic Update + Offline Support
   ========================================================= */

"use strict";


/* =========================================================
   VERSION
   غيّر الرقم عند إصدار نسخة جديدة من التطبيق.
   ========================================================= */

const CACHE_VERSION = "nawy-v6";

const CACHE_NAME = CACHE_VERSION;


/* =========================================================
   APP FILES
   الملفات الأساسية التي نريد الاحتفاظ بها Offline.
   ========================================================= */

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];


/* =========================================================
   INSTALL
   تثبيت الـ Service Worker الجديد.
   ========================================================= */

self.addEventListener("install", (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((error) => {
        console.warn("NAWY SW: Cache install failed:", error);
      })
  );

  /*
    يجعل النسخة الجديدة جاهزة فورًا
    بدل انتظار إغلاق جميع التبويبات القديمة.
  */
  self.skipWaiting();
});


/* =========================================================
   ACTIVATE
   حذف أي Cache قديم.
   ========================================================= */

self.addEventListener("activate", (event) => {

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {

        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );

      })
      .then(() => self.clients.claim())
  );

});


/* =========================================================
   FETCH
   Network First
   ---------------------------------------------------------
   1. يحاول جلب أحدث نسخة من الإنترنت.
   2. لو الإنترنت غير متاح يستخدم النسخة المخزنة.
   3. يمنع بقاء index.html قديم قدر الإمكان.
   ========================================================= */

self.addEventListener("fetch", (event) => {

  /*
    لا نتعامل مع الطلبات غير GET.
  */
  if (event.request.method !== "GET") {
    return;
  }


  /*
    نتعامل فقط مع نفس Origin الخاص بالتطبيق.
  */
  const requestURL = new URL(event.request.url);

  if (requestURL.origin !== self.location.origin) {
    return;
  }


  event.respondWith(

    fetch(event.request)
      .then((response) => {

        /*
          نخزن نسخة ناجحة من الطلب.
        */

        if (response && response.ok) {

          const responseClone = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            })
            .catch(() => {});
        }

        return response;
      })


      .catch(() => {

        /*
          لو الإنترنت غير متاح،
          استخدم النسخة الموجودة في Cache.
        */

        return caches.match(event.request)
          .then((cachedResponse) => {

            if (cachedResponse) {
              return cachedResponse;
            }

            /*
              لو الصفحة المطلوبة غير موجودة في Cache
              نحاول إرجاع index.html.
            */

            if (event.request.mode === "navigate") {

              return caches.match("./index.html");
            }

            return new Response(
              "Offline",
              {
                status: 503,
                statusText: "Offline"
              }
            );

          });

      })

  );

});


/* =========================================================
   MESSAGE
   يسمح للـ index.html بطلب تحديث Service Worker يدويًا.
   ========================================================= */

self.addEventListener("message", (event) => {

  if (!event.data) {
    return;
  }


  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }


  if (event.data.type === "CLEAR_CACHE") {

    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
    );

  }

});
