// The old site used a caching service worker. This version clears those caches and removes itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({type:'window'})) c.navigate(c.url);
})()));
