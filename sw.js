/* Service Worker — Administrasi Wali Kelas
 * - Cangkang aplikasi (HTML/CSS/JS/ikon): tampil instan dari cache, diperbarui senyap di latar (stale-while-revalidate)
 * - Pustaka CDN & font: cache-first (jarang berubah, versi terkunci)
 * - Permintaan ke Google Apps Script: SELALU langsung ke jaringan, tidak pernah dari cache (data & token)
 * Naikkan VER setiap rilis agar cache lama dibersihkan. */
const VER = 'wk-v3.0.0';
const SHELL = ['./', './index.html', './css/styles.css?v=3.0.0', './js/config.js', './js/gas-client.js?v=3.0.0', './js/pwa.js?v=3.0.0', './js/app.js?v=3.0.0', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const CDN = /(^|\.)(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'script.google.com' || u.hostname.endsWith('googleusercontent.com')) return;   // API: jaringan saja

  if (CDN.test(u.hostname)) {                                   // cache-first
    e.respondWith(caches.open(VER).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r); if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res;
    }));
    return;
  }
  if (u.origin !== location.origin) return;

  if (u.pathname.endsWith('/js/config.js')) {                   // config: jaringan dulu (URL GAS bisa berubah), cache bila offline
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
    return;
  }
  e.respondWith(caches.open(VER).then(async c => {              // stale-while-revalidate
    const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || (r.mode === 'navigate' ? c.match('./index.html') : Response.error());
  }));
});
