/* Service Worker Sylva — volontairement minimal : l'app est hébergée et
   exige un réseau (comptes, données, temps réel), donc pas de cache
   réseau-d'abord avec repli hors-ligne (ça servirait une coquille périmée
   qui échouerait ensuite à charger ses données). Rôles : satisfaire les
   critères d'installabilité (icône sur l'écran d'accueil), et afficher les
   notifications push (alertes) — seule façon de notifier l'utilisateur
   quand l'app n'est pas au premier plan, sur PC, téléphone et tablette. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* corps non-JSON, ignoré */ }
  const titre = data.title || "Sylva";
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/alertes" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      for (const client of liste) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
