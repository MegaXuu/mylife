/* ==========================================================================
   boot.js — DÉMARRAGE, TOUJOURS CHARGÉ EN DERNIER. boot()/READY, persistance
   du stockage, enregistrement du service worker, sauvegarde immédiate à la
   mise en arrière-plan, vérification de mise à jour au retour au premier
   plan. Ne rien charger après ce fichier.
   ========================================================================== */
// Jour du dernier rendu (Lot V3-4). Une PWA reste en mémoire des jours
// entiers : rouverte le lendemain matin, elle montrait encore « Aujourd'hui »
// de la veille — sa date, ses cochages, son entretien — jusqu'au premier tap.
let _renderedDay = null;
function refreshIfNewDay(){
  const k = todayKey();
  if(_renderedDay === k) return;
  _renderedDay = k;
  // Jamais sous une feuille ouverte ou pendant une saisie : on rafraîchira
  // au prochain passage, rien ne presse au point d'effacer ce qu'on tape.
  const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if(document.getElementById('sheet-bg').classList.contains('show') || typing){ _renderedDay = null; return; }
  rerender();
}

async function boot(){
  S = await loadState();
  purgeTombstones();
  pickBirds(); // un tirage d'espèce et de perchoir par écran, à chaque ouverture
  applyTheme(); // js/settings.js — avant le premier rendu, pour éviter tout flash
  watchSystemTheme();
  go('today');
  _renderedDay = todayKey();
  // État stocké illisible (loadState(), js/state.js) : il a été recopié à part
  // avant de repartir de zéro — le dire tout de suite, jamais en silence.
  let calm = false;
  if(_corruptKey){ toast('Données illisibles : une copie de secours a été gardée (Réglages → Données).', {danger:true}); save(); }
  else calm = !announceUpdate(); // js/settings.js — un toast quand une nouvelle version vient d'arriver
  maybeWelcome();      // js/settings.js — uniquement au tout premier lancement
  maybeStartReview();  // js/review.js — le jour venu, si des tâches dorment
  // Un seul message à la fois au démarrage (Lot V3-5) : le rappel de
  // sauvegarde se tait devant une annonce de version, la bienvenue, la revue.
  if(calm && !document.getElementById('sheet-bg').classList.contains('show')) maybeBackupNudge();
}

/* Une promesse du navigateur qui échoue sans gravité — hors-ligne, pastille
   refusée — ne doit jamais remonter jusqu'au toast « Un souci inattendu »
   (onUnexpectedError(), js/ui.js, Lot V3-4). Corrigé au Lot V3-5 : rouverte
   sans réseau, l'app cherchait sa mise à jour (reg.update()), échouait, et
   affichait ce toast rouge à chaque retour — pour une app 100 % hors-ligne. */
function quietly(p){ if(p && typeof p.catch === 'function') p.catch(()=>{}); return p; }

try{ if(navigator.storage && navigator.storage.persist) quietly(navigator.storage.persist()); }catch(e){}

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

// Pastille de l'icône iOS (ROADMAP-V1.md §6 et §8) : posée à la fermeture,
// elle porte ce qu'il reste à faire aujourd'hui. C'est le seul substitut
// honnête aux notifications — gratuit, sans serveur, iOS 16.4+. Silencieux
// partout où l'API n'existe pas (Safari onglet, navigateur de bureau).
function updateBadge(){
  try{
    if(!navigator.setAppBadge) return;
    quietly(navigator.setAppBadge(todayBadgeCount())); // 0 efface la pastille
  }catch(e){}
}

// iOS peut tuer une PWA en arrière-plan sans avertir : on force le disque avant.
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState === 'hidden'){
    saveNow();
    updateBadge();
  } else if(document.visibilityState === 'visible'){
    // Vérifie une nouvelle version à chaque retour au premier plan (iOS ne le
    // fait pas de lui-même) — évite de rester bloqué sur une ancienne Bêta.
    if(_swReg) try{ quietly(_swReg.update()); }catch(e){}
    refreshIfNewDay();
  }
});
// Laissée ouverte au premier plan, l'app passe minuit elle aussi : un coup
// d'œil par minute suffit, le rendu ne coûte rien s'il n'a pas lieu d'être.
setInterval(()=>{ if(document.visibilityState !== 'hidden') refreshIfNewDay(); }, 60000);
window.addEventListener('pagehide', ()=>{ saveNow(); updateBadge(); });
