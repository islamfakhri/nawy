/* =========================================================
   NAWY SERVICE WORKER
   ========================================================= */

const CACHE_NAME = "nawy-cache-v5";

const APP_SHELL = [
    "./",
    "./index.html",
    "./css/app.css",
    "./js/app.js",
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
                .then(cache =>
                    cache.addAll(APP_SHELL)
                )
                .then(() =>
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
                .then(cacheNames =>

                    Promise.all(

                        cacheNames
                            .filter(
                                name =>
                                    name.startsWith(
                                        "nawy-cache-"
                                    ) &&
                                    name !== CACHE_NAME
                            )
                            .map(
                                name =>
                                    caches.delete(name)
                            )

                    )

                )
                .then(() =>
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


        /*
           نحن نهتم فقط بطلبات GET
        */

        if (
            request.method !== "GET"
        ) {
            return;
        }


        event.respondWith(

            fetch(request)
                .then(response => {

                    /*
                       تحديث الكاش بالنسخة الجديدة
                    */

                    const copy =
                        response.clone();

                    caches
                        .open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                request,
                                copy
                            );

                        });


                    return response;
                })

                .catch(() =>
                    caches.match(request)
                )

        );
    }
);
