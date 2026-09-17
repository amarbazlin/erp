// Cache only a static, non-sensitive offline page. Never cache ERP pages,
// Supabase responses, credentials, product images, or queue write requests.
const CACHE = 'forgera-offline-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)))
  // Wait for existing tabs to close before activating an update.
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('forgera-offline-') && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.mode !== 'navigate') return
  event.respondWith(fetch(request).catch(async () => {
    const offline = await caches.match(OFFLINE)
    return offline || new Response('Offline. Connect to the internet and reload ForgeraERP.', {
      status: 503, headers: { 'Content-Type': 'text/plain' },
    })
  }))
})
