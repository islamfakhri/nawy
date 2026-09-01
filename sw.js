const CACHE_NAME = "nawy-static-v5";
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

<<<<<<< Updated upstream
/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(
          (cache) =>
            cache.addAll(APP_SHELL)
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
  (event) => {

    event.waitUntil(

      caches.keys()
        .then(
          (keys) =>
            Promise.all(

              keys
                .filter(
                  (key) =>
                    key.startsWith(
                      "nawy-static-"
                    ) &&
                    key !== CACHE_NAME
                )
                .map(
                  (key) =>
                    caches.delete(key)
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
  (event) => {

    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    /* -----------------------------------------------------
       NAVIGATION
       الشبكة أولًا
       Cache fallback عند انقطاع الإنترنت
    ----------------------------------------------------- */

    if (
      request.mode === "navigate"
    ) {

      event.respondWith(

        fetch(request)
          .then(
            (response) => {

              const copy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(
                  (cache) =>
                    cache.put(
                      "./index.html",
                      copy
                    )
                );

              return response;
            }
          )
          .catch(
            () =>
              caches
                .match("./index.html")
                .then(
                  (cached) =>
                    cached ||
                    caches.match("./")
                )
          )

      );

      return;
    }

    /* -----------------------------------------------------
       STATIC ASSETS
       Cache First
    ----------------------------------------------------- */

    event.respondWith(

      caches
        .match(request)
        .then(
          (cached) => {

            const networkFetch =
              fetch(request)
                .then(
                  (response) => {

                    if (
                      response.ok &&
                      new URL(
                        request.url
                      ).origin ===
                        self.location.origin
                    ) {

                      const copy =
                        response.clone();

                      caches
                        .open(
                          CACHE_NAME
                        )
                        .then(
                          (cache) =>
                            cache.put(
                              request,
                              copy
                            )
                        );

                    }

                    return response;
                  }
                )
                .catch(
                  () =>
                    cached
                );

            return (
              cached ||
              networkFetch
            );
          }
        )

    );

  }
);
=======
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("nawy-static-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // صفحات التنقل: حاول الشبكة أولًا حتى تصل التحديثات بسرعة، ثم استخدم النسخة المحلية عند انقطاع الإنترنت.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./")))
    );
    return;
  }

  // الأصول الثابتة: Cache First مع تحديث الخلفية عند توفر نسخة جديدة.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
>>>>>>> Stashed changes
