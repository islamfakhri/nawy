const CACHE_NAME = "nawy-shell-v7";

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

            caches
                .open(CACHE_NAME)
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )
                .then(
                    () =>
                        self.skipWaiting()
                )

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

            caches
                .keys()
                .then(
                    keys =>
                        Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key.startsWith(
                                            "nawy-shell-"
                                        ) &&
                                        key !==
                                            CACHE_NAME
                                )
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )

                        )
                )
                .then(
                    () =>
                        self.clients.claim()
                )

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


        if (
            request.method !==
            "GET"
        ) {

            return;

        }


        /*
           HTML:
           الشبكة أولًا للحصول على
           آخر نسخة، ثم Cache عند Offline.
        */

        if (
            request.mode ===
            "navigate"
        ) {

            event.respondWith(

                fetch(request)

                    .then(
                        response => {

                            const copy =
                                response.clone();


                            caches
                                .open(
                                    CACHE_NAME
                                )
                                .then(
                                    cache =>
                                        cache.put(
                                            request,
                                            copy
                                        )
                                );


                            return response;

                        }
                    )

                    .catch(
                        () =>
                            caches.match(
                                "./index.html"
                            )
                    )

            );


            return;

        }


        /*
           الملفات الثابتة:
           Cache First.
        */

        event.respondWith(

            caches
                .match(request)
                .then(
                    cached => {

                        if (cached) {
                            return cached;
                        }


                        return fetch(request)
                            .then(
                                response => {

                                    if (
                                        !response ||
                                        response.status !==
                                            200
                                    ) {

                                        return response;

                                    }


                                    const copy =
                                        response.clone();


                                    caches
                                        .open(
                                            CACHE_NAME
                                        )
                                        .then(
                                            cache =>
                                                cache.put(
                                                    request,
                                                    copy
                                                )
                                        );


                                    return response;

                                }
                            );

                    }
                )

        );

    }
);
