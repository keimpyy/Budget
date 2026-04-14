const CACHE_VERSION = 'budget-app-20260414h';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/budget-icon-180.png',
  '/budget-icon-192.png',
  '/budget-icon-512.png',
  '/vendor/supabase-js.js?v=20260409b',
  '/styles/app.css?v=20260414h',
  '/styles/theme.css',
  '/styles/base.css',
  '/styles/components.css',
  '/styles/dashboard.css',
  '/styles/budget.css',
  '/styles/loans.css',
  '/styles/sparen.css',
  '/styles/settings.css',
  '/styles/modal.css',
  '/js/state.js?v=20260414h',
  '/js/storage.js?v=20260414c',
  '/js/supabase.js?v=20260412d',
  '/js/ui.js?v=20260414h',
  '/js/dashboard.js?v=20260414e',
  '/js/budget.js?v=20260412d',
  '/js/loans.js?v=20260412d',
  '/js/sparen.js?v=20260414c',
  '/js/settings.js?v=20260414h',
  '/js/app.js?v=20260412d'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if(request.method !== 'GET' || url.origin !== self.location.origin){
    return;
  }

  if(request.mode === 'navigate'){
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        if(response && response.ok){
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
        }
        return response;
      }))
  );
});
