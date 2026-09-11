/* EduTrack Ilmziyo — Production Service Worker (PWA Engine) */
const CACHE_NAME = 'edutrack-ilmziyo-v1';

// Critical app shell resources pre-cached on installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Service Worker Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Service Worker Activate Event (Clean up legacy caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('edutrack-ilmziyo-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Service Worker Fetch Event (Stale-While-Revalidate Strategy)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore non-http(s) schemes (e.g. chrome-extension://, blob:)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. Bypass external API calls, Supabase endpoints, and auth tokens
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return;
  }

  // 4. Stale-While-Revalidate for app shell, scripts, styles, images, and fonts
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch((error) => {
          // If offline and requesting navigation, fallback to /index.html
          if (request.mode === 'navigate') {
            return cache.match('/index.html');
          }
          return null;
        });

      // Return cached response immediately if available, otherwise wait for network
      if (cachedResponse) {
        // Kick off the background revalidation
        event.waitUntil(fetchPromise);
        return cachedResponse;
      }

      const networkResponse = await fetchPromise;
      if (networkResponse) {
        return networkResponse;
      }

      // Offline fallback for navigation
      if (request.mode === 'navigate') {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
      }

      return new Response('Tarmoq aloqasi mavjud emas (Offline)', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
      });
    })
  );
});
