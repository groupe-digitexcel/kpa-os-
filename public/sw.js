// Kingdom Passion Academy — PWA service worker
//
// SCOPE OF WHAT THIS DOES: makes the web app installable on Android (and
// desktop browsers) with an app icon, splash screen, and fast repeat loads.
// It does NOT give the browser version the same full offline data entry the
// Windows desktop app has (that uses a real local SQLite database via Node,
// which a browser can't run). This service worker just caches static assets
// and shows a friendly "you're offline" page instead of a browser error when
// there's no connection and nothing cached to show.

const CACHE_NAME = "kpa-os-shell-v1";
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Page navigations: try the network first (data must stay fresh), fall
  // back to the offline page only if the network truly fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts): cache-first for speed, then
  // populate the cache from the network in the background.
  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});
