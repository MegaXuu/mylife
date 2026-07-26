/* ==========================================================================
   boot.js — DÉMARRAGE, TOUJOURS CHARGÉ EN DERNIER. boot()/READY, persistance
   du stockage, enregistrement du service worker, sauvegarde immédiate à la
   mise en arrière-plan, vérification de mise à jour au retour au premier
   plan. Ne rien charger après ce fichier.
   ========================================================================== */
async function boot(){
  S = await loadState();
  purgeTombstones();
  go('today');
}

try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}

const READY = boot();
window.__ready = function(){ return READY; };

let _swReg = null;
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{ _swReg = reg; }).catch(()=>{});
  });
  // Le service worker prend la main dès qu'une nouvelle version est active : on
  // recharge une seule fois pour afficher les fichiers frais (sinon la page déjà
  // ouverte resterait sur l'ancien JS malgré le nouveau cache actif).
  let _swRefreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(_swRefreshed) return;
    _swRefreshed = true;
    location.reload();
  });
}

// iOS peut tuer une PWA en arrière-plan sans avertir : on force le disque avant.
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden'){
    saveNow();
  } else if(document.visibilityState === 'visible'){
    // Vérifie une nouvelle version à chaque retour au premier plan (iOS ne le
    // fait pas de lui-même) — évite de rester bloqué sur une ancienne Bêta.
    if(_swReg) try{ _swReg.update(); }catch(e){}
  }
});
window.addEventListener('pagehide', ()=>{ saveNow(); });
