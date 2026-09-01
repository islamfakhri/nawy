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

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(
                        APP_FILES
                    );

                })
                .then(() => {

                    /*
                       لا ننتظر إغلاق النسخة القديمة.
                       النسخة الجديدة تصبح جاهزة فورًا.
                    */

                    return self.skipWaiting();

                })

        );

    }
);


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(cacheNames => {

                    return Promise.all(

                        cacheNames
                            .filter(
                                name =>
                                    name !== CACHE_NAME
                            )
                            .map(
                                name =>
                                    caches.delete(name)
                            )

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

    }
);


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        /*
           نهتم فقط بطلبات GET.
        */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        /*
           لا نتدخل في طلبات خارج نطاق التطبيق.
        */

        if (
            url.origin !== self.location.origin
        ) {

            return;

        }


        /*
           HTML:
           نحاول دائمًا الحصول على النسخة الأحدث
           من السيرفر أولًا.

           لو الإنترنت غير متاح:
           نستخدم النسخة المخزنة.
        */

        if (
            request.mode === "navigate" ||
            request.destination === "document"
        ) {

            event.respondWith(

                fetch(request)
                    .then(response => {

                        /*
                           حفظ أحدث index.html.
                        */

                        const copy =
                            response.clone();


                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    copy
                                );

                            });


                        return response;

                    })
                    .catch(() => {

                        return caches.match(
                            request
                        );

                    })

            );


            return;

        }


        /*
           باقي الملفات:
           Cache First

           سريع جدًا،
           مع الرجوع للشبكة لو الملف غير موجود.
        */

        event.respondWith(

            caches.match(request)
                .then(cachedResponse => {

                    if (
                        cachedResponse
                    ) {

                        return cachedResponse;

                    }


                    return fetch(request)
                        .then(response => {

                            if (
                                !response ||
                                response.status !== 200 ||
                                response.type === "opaque"
                            ) {

                                return response;

                            }


                            const copy =
                                response.clone();


                            caches.open(
                                CACHE_NAME
                            )
                            .then(cache => {

                                cache.put(
                                    request,
                                    copy
                                );

                            });


                            return response;

                        });

                })

        );

    }
);