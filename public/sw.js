// No private pages, API responses, credentials or customer data are cached.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    event.request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    ![
      "/dashboard",
      "/tasks",
      "/customers",
      "/calendar",
      "/finance",
      "/settings",
    ].includes(url.pathname)
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apex · Bağlantı yok</title><style>body{font:17px system-ui;padding:10vh 24px;background:#f7f7fb;color:#25212d;max-width:500px;margin:auto}a{display:inline-block;padding:14px 20px;background:#ac3b11;color:white;border-radius:8px;text-decoration:none}</style><h1>Bağlantı yok</h1><p>Güncel işleri görmek ve kayıtları göndermek için internete bağlan. Kaydetmediğin taslakları aynı cihazda, aynı hesapla tekrar açabilirsin.</p><a href="/dashboard">Tekrar dene</a></html>',
          {
            status: 503,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "Content-Security-Policy":
                "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
            },
          },
        ),
    ),
  );
});
