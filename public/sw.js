// Service worker da MIRA: abre o app mesmo sem internet (a leitura pela IA continua precisando de rede).
// Nunca guarda nada de /api: as histórias não ficam em cache.
const CACHE = 'mira-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/icones/icone-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;
  // páginas: rede primeiro (sempre a versão nova), cache se estiver sem internet
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('/', c)); return r; }).catch(() => caches.match('/')));
    return;
  }
  // arquivos do app (_next/static, ícones): cache primeiro
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icones')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
  }
});
