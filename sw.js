/* =========================================================
   NAWY — SERVICE WORKER
   Automatic update / offline support
   ========================================================= */

"use strict";


/* =========================================================
   VERSION
   غيّر الرقم عند الحاجة لإجبار المتصفح على نسخة جديدة.
   ========================================================= */

const CACHE_VERSION = "nawy-v1.0.0";

const CACHE_NAME = CACHE_VERSION;


/* =========================================================
   APP FILES
   ========================================================= */

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_FILES);

            })
            .then(() => {

                /*
                   تفعيل النسخة الجديدة فورًا
                   بدون انتظار إغلاق النسخة القديمة.
                */

                return self.skipWaiting();

            })

    );

});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))

                );

            })
            .then(() => {

                /*
                   السيطرة على الصفحات المفتوحة
                   فور تفعيل النسخة الجديدة.
                */

                return self.clients.claim();

            })

    );

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;


    /*
       نهتم فقط بطلبات GET.
    */

    if (request.method !== "GET") {
        return;
    }


    const url = new URL(request.url);


    /*
       لا نتدخل في طلبات خارج نطاق التطبيق.
    */

    if (url.origin !== self.location.origin) {
        return;
    }


    /* =====================================================
       HTML / NAVIGATION
       =====================================================

       نحاول الحصول على أحدث نسخة من السيرفر أولًا.

       لو الإنترنت غير متاح:
       نستخدم النسخة المخزنة.
       ===================================================== */

    if (
        request.mode === "navigate" ||
        request.destination === "document"
    ) {

        event.respondWith(

            fetch(request)
                .then(response => {

                    /*
                       حفظ أحدث نسخة من الصفحة.
                    */

                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {

                            cache.put(request, copy);

                        });

                    return response;

                })
                .catch(() => {

                    /*
                       Offline fallback.
                    */

                    return caches.match(request)
                        .then(cached => {

                            return cached ||
                                caches.match("./index.html");

                        });

                })

        );

        return;
    }


    /* =====================================================
       باقي الملفات
       =====================================================

       Cache First

       سريع جدًا،
       وإذا الملف غير موجود في الكاش
       يتم جلبه من الشبكة وتخزينه.
       ===================================================== */

    event.respondWith(

        caches.match(request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }


                return fetch(request)
                    .then(response => {

                        /*
                           لا نخزن الردود غير الصالحة.
                        */

                        if (
                            !response ||
                            response.status !== 200 ||
                            response.type === "opaque"
                        ) {

                            return response;

                        }


                        const copy = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(request, copy);

                            });

                        return response;

                    });

            })

    );

});