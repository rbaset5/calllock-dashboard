/**
 * CallSeal Service Worker
 *
 * Provides:
 * - Offline support with cache-first strategy for static assets
 * - Network-first strategy for API calls
 * - Push notification handling
 * - Background sync for failed requests
 */

const CACHE_NAME = 'calllock-v1';
const STATIC_CACHE_NAME = 'calllock-static-v1';
const DYNAMIC_CACHE_NAME = 'calllock-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/action',
  '/booked',
  '/history',
  '/settings',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// API routes that should use network-first
const API_ROUTES = [
  '/api/action',
  '/api/booked',
  '/api/history',
  '/api/leads',
  '/api/jobs',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('calllock-') &&
                     name !== STATIC_CACHE_NAME &&
                     name !== DYNAMIC_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API routes: Network first, fallback to cache
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets and pages: Cache first, fallback to network
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return offline page if available
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }

    // Return a basic offline response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline JSON response for API routes
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Data may be stale.',
      offline: true
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Background cache update
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we're just updating the cache
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'CallSeal',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: 'calllock-notification',
    data: { url: '/action' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-96.png',
    tag: data.tag || 'calllock-notification',
    data: data.data || { url: '/action' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  // Add priority-specific styling
  if (data.priority === 'urgent') {
    options.requireInteraction = true;
    options.vibrate = [200, 100, 200, 100, 200];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/action';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }

        // Check if there's any CallSeal window open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.navigate(urlToOpen).then((client) => client?.focus());
          }
        }

        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event (for analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed without action');
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-lead-actions') {
    event.waitUntil(syncLeadActions());
  }
});

// Sync pending lead actions
async function syncLeadActions() {
  try {
    // Get pending actions from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-actions', 'readonly');
    const store = tx.objectStore('pending-actions');
    const actions = await store.getAll();

    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        // Remove from pending on success
        const deleteTx = db.transaction('pending-actions', 'readwrite');
        const deleteStore = deleteTx.objectStore('pending-actions');
        await deleteStore.delete(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Simple IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('calllock-sw', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Message event for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE_NAME)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});
