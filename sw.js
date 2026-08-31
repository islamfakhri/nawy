/* =====================================================
   NAWY SERVICE WORKER
   AUTO UPDATE VERSION
   ===================================================== */


/*
 * غيّر الرقم ده عند إصدار نسخة كبيرة جديدة.
 */

const VERSION = "nawy-v6";


const STATIC_CACHE =
    VERSION + "-static";


const RUNTIME_CACHE =
    VERSION + "-runtime";



/* =====================================================
   INSTALL
   ===================================================== */

self.addEventListener(
    "install",
    event => {

        /*
         * لا ننتظر الـSW القديم.
         */

        self.skipWaiting();


        event.waitUntil(

            caches.open(
                STATIC_CACHE
            ).then(cache => {

                return cache.addAll([
                    "./",
                    "./index.html",
                    "./manifest.json",
                    "./icon-192.png"
                ]);

            })

        );

    }
);



/* =====================================================
   ACTIVATE
   ===================================================== */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            Promise.all([

                /*
                 * حذف أي Cache قديم
                 */

                caches.keys()
                    .then(keys => {

                        return Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key !==
                                        STATIC_CACHE &&
                                        key !==
                                        RUNTIME_CACHE
                                )
                                .map(
                                    key =>
                                        caches.delete(key)
                                )

                        );

                    }),


                /*
                 * استلام التحكم فورًا
                 */

                self.clients.claim()

            ])

        );

    }
);



/* =====================================================
   MESSAGE
   ===================================================== */

self.addEventListener(
    "message",
    event => {

        if (
            event.data &&
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);



/* =====================================================
   FETCH
   ===================================================== */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        /*
         * GET فقط
         */

        if (
            request.method !==
            "GET"
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        /*
         * تجاهل الطلبات الخارجية.
         */

        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
         * HTML / Navigation
         *
         * Network First
         *
         * يعني:
         * حاول تجيب أحدث نسخة من السيرفر.
         * لو الإنترنت مش موجود استخدم الكاش.
         */

        if (
            request.mode ===
            "navigate" ||
            request.destination ===
            "document"
        ) {

            event.respondWith(

                fetch(request)
                    .then(response => {

                        const copy =
                            response.clone();


                        caches.open(
                            RUNTIME_CACHE
                        ).then(cache => {

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
                        ).then(cached => {

                            return cached ||
                                caches.match(
                                    "./index.html"
                                );

                        });

                    })

            );


            return;

        }



        /*
         * الملفات الأخرى
         *
         * Network First
         */

        event.respondWith(

            fetch(request)

                .then(response => {

                    if (
                        response &&
                        response.status === 200
                    ) {

                        const copy =
                            response.clone();


                        caches.open(
                            RUNTIME_CACHE
                        ).then(cache => {

                            cache.put(
                                request,
                                copy
                            );

                        });

                    }


                    return response;

                })

                .catch(() => {

                    return caches.match(
                        request
                    );

                })

        );

    }
);