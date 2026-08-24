// SquadFrame Service Worker
// Estratégia: cache-first para estáticos, network-first para navegação

const CACHE_VERSION = 'v1';
const CACHE_NAME = `squadframe-${CACHE_VERSION}`;

const STATIC_PREFIXES = ['/_next/static/', '/fonts/'];
const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
const NETWORK_ONLY_HOSTS = ['supabase.co', 'supabase.in'];
const NETWORK_ONLY_PATHS = ['/api/', '/login', '/auth/', '/manifest.webmanifest', '/sw.js'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/icon-192-v3.png']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('squadframe-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Notifica todos os clientes que há nova versão ativa
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_ACTIVATED' })));
      })
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function isStaticAsset(url) {
  return (
    STATIC_PREFIXES.some(p => url.pathname.startsWith(p)) ||
    STATIC_EXTENSIONS.some(e => url.pathname.endsWith(e))
  );
}

function isNetworkOnly(url) {
  return (
    NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h)) ||
    NETWORK_ONLY_PATHS.some(p => url.pathname.startsWith(p))
  );
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return;
  if (isNetworkOnly(url)) return;

  if (isStaticAsset(url)) {
    // Cache First — assets com hash são imutáveis
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          }
          return response;
        }).catch(() => cached ?? new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Network First para navegação — dados sempre frescos
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then(cached => {
        if (cached) return cached;
        // Fallback offline mínimo para navegação
        if (request.mode === 'navigate') {
          return caches.match('/').then(root => root ?? new Response(
            '<!doctype html><meta charset=utf-8><title>Offline</title><body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>Sem conexão</h1><p>Verifique sua internet e tente novamente.</p></body>',
            { headers: { 'Content-Type': 'text/html' }, status: 503 }
          ));
        }
        return new Response('', { status: 503 });
      })
    )
  );
});

// ── Push ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); } catch { return; }

  const {
    title = 'SquadFrame',
    body = '',
    icon = '/icon-192-v3.png',
    badge = '/icon-192-v3.png',
    url = '/',
    tag,
    actions = [],
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tag ?? `sf-${Date.now()}`,
      data: { url },
      actions: actions.slice(0, 2),
      requireInteraction: false,
      vibrate: [200, 100, 200],
    })
  );
});

// ── Push subscription change ────────────────────────────────────────────────
// Dispara quando o próprio navegador invalida/renova a subscription (ex:
// rotação interna de chaves) — independe de qualquer aba estar aberta ou de
// o usuário dar F5. Sem isso, o servidor fica com uma subscription morta e
// nada nunca reconecta sozinho.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keyResp = await fetch('/api/push/vapid-public-key');
        const { key } = await keyResp.json();
        if (!key) return;

        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch (err) {
        // Best-effort — se falhar aqui, o resync periódico do app (enquanto
        // a aba estiver aberta) ainda cobre o caso.
      }
    })()
  );
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const sameOrigin = windowClients.find(c => new URL(c.url).origin === location.origin);
      if (sameOrigin) {
        sameOrigin.focus();
        return sameOrigin.navigate(targetUrl);
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Mensagens do cliente ──────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
