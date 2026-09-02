/* =========================================================
   NAWY — SERVICE WORKER
   Automatic Update + Offline Support
   ========================================================= */

"use strict";


/* =========================================================
   VERSION
   ---------------------------------------------------------
   غيّر الرقم عند إصدار نسخة جديدة من التطبيق.
   مثال:
   nawy-v7
   nawy-v8
   nawy-v9
   ========================================================= */

const CACHE_VERSION = "nawy-v7";
const CACHE_NAME = CACHE_VERSION;


/* =========================================================
   APP SHELL
   ---------------------------------------------------------
   الملفات الأساسية التي يجب أن تكون متاحة Offline.
   ========================================================= */

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];


/* =========================================================
   INSTALL
   ---------------------------------------------------------
   تثبيت النسخة الجديدة وتجهيز الملفات الأساسية.
   ========================================================= */

self.addEventListener("install", (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log("NAWY SW: Installed", CACHE_VERSION);
      })
      .catch((error) => {
        console.error("NAWY SW: Install failed:", error);
        throw error;
      })
  );

  /*
    تفعيل النسخة الجديدة فورًا
    بدل انتظار إغلاق التبويبات القديمة.
  */
  self.skipWaiting();

});


/* =========================================================
   ACTIVATE
   ---------------------------------------------------------
   حذف النسخ القديمة ثم السيطرة على الصفحات المفتوحة.
   ========================================================= */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches.keys()
      .then((cacheNames) => {

        return Promise.all(

          cacheNames
            .filter((cacheName) => {

              /*
                نحذف فقط Caches الخاصة بـ NAWY.
                ولا نلمس أي Cache تابع لتطبيق آخر.
              */

              return (
                cacheName.startsWith("nawy-") &&
                cacheName !== CACHE_NAME
              );

            })
            .map((cacheName) => caches.delete(cacheName))

        );

      })

      .then(() => self.clients.claim())

      .then(() => {
        console.log("NAWY SW: Activated", CACHE_VERSION);
      })

  );

});


/* =========================================================
   FETCH
   ---------------------------------------------------------
   استراتيجية:
   Network First
   ثم Cache عند عدم توفر الإنترنت.
   ========================================================= */

self.addEventListener("fetch", (event) => {

  const request = event.request;


  /* -------------------------------------------------------
     نتعامل فقط مع GET
     ------------------------------------------------------- */

  if (request.method !== "GET") {
    return;
  }


  /* -------------------------------------------------------
     نفس Origin فقط
     ------------------------------------------------------- */

  const requestURL = new URL(request.url);

  if (requestURL.origin !== self.location.origin) {
    return;
  }


  /* -------------------------------------------------------
     Navigation
     -------------------------------------------------------
     طلب فتح صفحة التطبيق.

     نحاول الإنترنت أولًا مع منع استخدام نسخة HTTP Cache
     قديمة، ثم نخزن النتيجة في Cache.
     ------------------------------------------------------- */

  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request, {
        cache: "no-cache"
      })

        .then((response) => {

          if (response && response.ok) {

            const responseClone = response.clone();

            event.waitUntil(

              caches.open(CACHE_NAME)
                .then((cache) => {
                  return cache.put("./index.html", responseClone);
                })

            );

          }

          return response;

        })

        .catch(() => {

          /*
            Offline:
            نرجع آخر نسخة محفوظة من index.html.
          */

          return caches.match("./index.html")
            .then((cachedResponse) => {

              if (cachedResponse) {
                return cachedResponse;
              }

              /*
                fallback أخير.
              */

              return new Response(
                "<h1>NAWY</h1><p>أنت غير متصل بالإنترنت.</p>",
                {
                  status: 503,
                  statusText: "Offline",
                  headers: {
                    "Content-Type": "text/html; charset=utf-8"
                  }
                }
              );

            });

        })

    );

    return;
  }


  /* -------------------------------------------------------
     باقي الملفات
     -------------------------------------------------------
     Network First ثم Cache.
     ------------------------------------------------------- */

  event.respondWith(

    fetch(request)

      .then((response) => {

        if (response && response.ok) {

          const responseClone = response.clone();

          event.waitUntil(

            caches.open(CACHE_NAME)
              .then((cache) => {
                return cache.put(request, responseClone);
              })

          );

        }

        return response;

      })

      .catch(() => {

        return caches.match(request)
          .then((cachedResponse) => {

            if (cachedResponse) {
              return cachedResponse;
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
   ---------------------------------------------------------
   أوامر من index.html
   ========================================================= */

self.addEventListener("message", (event) => {

  const data = event.data;

  if (!data || typeof data.type !== "string") {
    return;
  }


  /* -------------------------------------------------------
     تفعيل النسخة الجديدة فورًا
     ------------------------------------------------------- */

  if (data.type === "SKIP_WAITING") {

    self.skipWaiting();

    return;
  }


  /* -------------------------------------------------------
     مسح Cache الخاصة بـ NAWY فقط
     ------------------------------------------------------- */

  if (data.type === "CLEAR_CACHE") {

    event.waitUntil(

      caches.keys()
        .then((cacheNames) => {

          return Promise.all(

            cacheNames
              .filter((cacheName) => {
                return cacheName.startsWith("nawy-");
              })
              .map((cacheName) => {
                return caches.delete(cacheName);
              })

          );

        })

    );

  }

});


/* =========================================================
   VERSION MESSAGE
   ---------------------------------------------------------
   يسمح للـ index.html بمعرفة نسخة الـ Service Worker.
   ========================================================= */

self.addEventListener("message", (event) => {

  if (!event.data) {
    return;
  }

  if (event.data.type === "GET_VERSION") {

    if (event.ports && event.ports[0]) {

      event.ports[0].postMessage({
        type: "VERSION",
        version: CACHE_VERSION
      });

    }

  }

});
