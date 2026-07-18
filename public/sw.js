/* Service Worker Sylva — volontairement minimal : l'app est hébergée et
   exige un réseau (comptes, données, temps réel), donc pas de cache
   réseau-d'abord avec repli hors-ligne (ça servirait une coquille périmée
   qui échouerait ensuite à charger ses données). Seul rôle : satisfaire les
   critères d'installabilité (icône sur l'écran d'accueil) sans intercepter
   ni mettre en cache quoi que ce soit. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
