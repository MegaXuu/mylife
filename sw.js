/* ==========================================================================
   sw.js — service worker. Cache-first avec mise à jour en arrière-plan
   (stale-while-revalidate) : la réponse en cache part immédiatement, une
   requête réseau la rafraîchit pour la prochaine visite.
   INCRÉMENTER `CACHE` À CHAQUE RELEASE, sinon l'app installée garde
   silencieusement l'ancienne version (cf. CONVENTIONS.md §4).
   ========================================================================== */
const CACHE = 'mylife-b3-5';
const ASSETS = [
  './',
  './index.html',
  './data/rayons.js',
  './data/entretien.js',
  './data/oiseaux.js',
  './js/state.js',
  './js/ui.js',
  './js/gestures.js',
  './js/recur.js',
  './js/nlp.js',
  './js/today.js',
  './js/tasks.js',
  './js/maison.js',
  './js/habits.js',
  './js/habits-screen.js',
  './js/shopping.js',
  './js/meals.js',
  './js/review.js',
  './js/settings.js',
  './js/boot.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

/* Installation : cache:'reload', jamais le cache HTTP du navigateur (Lot
   V3-4). GitHub Pages sert chaque fichier avec max-age=600 : un nouveau
   service worker installé juste après un push pouvait remplir son cache tout
   neuf avec les fichiers de la version PRÉCÉDENTE, encore frais côté
   navigateur — et l'app restait sur l'ancien code sous un nouveau numéro. */
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE)
    .then(c=>c.addAll(ASSETS.map(u=>new Request(u, {cache:'reload'}))))
    .then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/* Requêtes : la réponse en cache part tout de suite ; en arrière-plan, une
   revalidation AUPRÈS DU SERVEUR (cache:'no-cache' → If-None-Match, 304 si
   rien n'a bougé) la rafraîchit pour la prochaine fois. Lot V3-4 :
    · la revalidation ne se contente plus du cache HTTP (même raison qu'à
      l'installation) ;
    · une navigation avec paramètres (lien partagé, raccourci) est servie
      depuis le cache même hors-ligne (ignoreSearch) ; vers une adresse
      inconnue, hors-ligne, elle est renvoyée à la racine de l'app plutôt
      qu'à une page d'erreur — index.html servi ailleurs qu'à la racine y
      chercherait ses scripts au mauvais endroit ;
    · une adresse avec paramètres n'est jamais mise en cache (une entrée par
      variante ferait grossir le cache sans fin) ;
    · rien d'externe n'est jamais servi ni mis en cache (principe 7). */
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  e.respondWith(
    caches.match(req, {ignoreSearch: nav}).then(hit=>{
      const fresh = fetch(req.url, {cache:'no-cache', credentials:'same-origin'}).then(res=>{
        if(res && res.ok && !url.search){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>hit || (nav ? Response.redirect(self.registration.scope, 302) : Response.error()));
      return hit || fresh;
    })
  );
});
