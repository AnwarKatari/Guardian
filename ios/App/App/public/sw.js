// Simple Service Worker for PWA installability
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests (assets/pages)
  // Skip POST requests (like API calls) to avoid breaking security relays or throwing weird errors
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch((err) => {
      console.warn('[SW] Fetch failed; returning offline error boundary', err);
      // You could return a custom offline page here if cached
      throw err;
    })
  );
});
