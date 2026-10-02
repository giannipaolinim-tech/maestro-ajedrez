// Service worker de la PWA. build.js completa VERSION y FONT_CSS.
// index.html: red primero (si tarda más de 3,5 s o no hay conexión, usa la copia guardada),
// así cada vez que abrís la app con internet baja la última versión publicada.
const VERSION = '__VERSION__';
const CACHE = 'maestro-' + VERSION;
const FONTS = 'maestro-fonts';
const FONT_CSS = '__FONT_CSS__';
const CORE = ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

async function cacheFonts() {
  try {
    const c = await caches.open(FONTS);
    if (await c.match(FONT_CSS)) return;
    const r = await fetch(FONT_CSS);
    if (!r.ok) return;
    const css = await r.clone().text();
    await c.put(FONT_CSS, r);
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
    await Promise.all(urls.map(u => fetch(u).then(x => x.ok && c.put(u, x)).catch(() => {})));
  } catch (e) {}
}

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))),
    cacheFonts()
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(url) {
  return new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    const cached = () => caches.open(CACHE).then(c => c.match('index.html'));
    const t = setTimeout(() => cached().then(finish), 3500);
    fetch(url, { cache: 'no-store' }).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); }
      clearTimeout(t); finish(res);
    }).catch(() => {
      clearTimeout(t);
      cached().then(r => finish(r || new Response('Sin conexión y sin copia guardada.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req.url).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') c.put(req.url, r.clone());
      return r;
    }))));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) { e.respondWith(networkFirst(url.href)); return; }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
