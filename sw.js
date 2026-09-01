```javascript
const CACHE_NAME = "nawy-cache-v6";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];


/* تثبيت النسخة الجديدة */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache =>
                cache.addAll(APP_FILES)
            )
            .then(() =>
                self.skipWaiting()
            )

    );
});


/* تفعيل النسخة الجديدة وحذف الكاش القديم */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(keys =>
                Promise.all(

                    keys
                        .filter(key =>
                            key.startsWith("nawy-cache-") &&
                            key !== CACHE_NAME
                        )
                        .map(key =>
                            caches.delete(key)
                        )

                )
            )
            .then(() =>
                self.clients.claim()
            )

    );
});


/*
   الاستراتيجية:

   HTML:
   الشبكة أولاً حتى تحصل على آخر نسخة.

   باقي الملفات:
   الكاش أولاً ثم الشبكة.
*/

self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }


    const isHTML =
        request.mode === "navigate" ||
        request.destination === "document";


    if (isHTML) {

        event.respondWith(

            fetch(request)
                .then(response => {

                    const copy =
                        response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache =>
                            cache.put(
                                request,
                                copy
                            )
                        );

                    return response;
                })

                .catch(() =>
                    caches.match(request)
                        .then(cached =>
                            cached ||
                            caches.match("./index.html")
                        )
                )

        );

        return;
    }


    event.respondWith(

        caches.match(request)
            .then(cached => {

                if (cached) {
                    return cached;
                }

                return fetch(request)
                    .then(response => {

                        if (
                            !response ||
                            response.status !== 200
                        ) {
                            return response;
                        }

                        const copy =
                            response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache =>
                                cache.put(
                                    request,
                                    copy
                                )
                            );

                        return response;
                    });

            })

    );
});
```
