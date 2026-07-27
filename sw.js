/* ==========================================================================
   sw.js — service worker. Cache-first avec mise à jour en arrière-plan
   (stale-while-revalidate) : la réponse en cache part immédiatement, une
   requête réseau la rafraîchit pour la prochaine visite.
   INCRÉMENTER `CACHE` À CHAQUE RELEASE, sinon l'app installée garde
   silencieusement l'ancienne version (cf. CONVENTIONS.md §4).
   ========================================================================== */
const CACHE = 'mylife-b1-4';
const ASSETS = [
  './',
  './index.html',
  './data/rayons.js',
  './data/plantes.js',
  './data/entretien.js',
  './data/oiseaux.js',
  './js/state.js',
  './js/ui.js',
  './js/recur.js',
  './js/nlp.js',
  './js/today.js',
  './js/tasks.js',
  './js/maison.js',
  './js/plants.js',
  './js/habits.js',
  './js/shopping.js',
  './js/review.js',
  './js/settings.js',
  './js/boot.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit=>{
      const fresh = fetch(e.request).then(res=>{
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>hit);
      return hit || fresh;
    })
  );
});
