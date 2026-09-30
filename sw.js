// Service worker do OKR: deixa o app abrir sem internet.
// Quando você publicar uma versão nova, mude o número abaixo (v1 -> v2).
const V = 'okr26-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Página: tenta a internet primeiro (pega a versão nova); sem internet usa a guardada.
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('./index.html', cp)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Arquivos do próprio site e fontes do Google: usa o guardado e atualiza em segundo plano.
  const ok = u.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!ok) return;
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
