/* ==========================================================================
   state.js — SOCLE, chargé en premier (après les catalogues data/*.js).
   Constantes, persistance IndexedDB, defaults()/migrate(), l'état global `S`,
   les helpers synchro-ready (CONVENTIONS.md §2) et les helpers de date.
   AUCUN RENDU DOM ICI — voir js/ui.js et les js/<ecran>.js pour l'affichage.
   ========================================================================== */

const APP_VERSION = 'Bêta 1.10'; // à synchroniser avec CACHE (sw.js) à chaque release

const IDB_NAME = 'mylife';
const IDB_VERSION = 1;
const LS_KEY = 'mylife';

/* ---------- Valeurs par défaut & migration (modèle : ROADMAP-V1.md §5) ---------- */
function defaults(){
  return {
    v: 1,
    tasks: [],       // tâches ponctuelles + entretien récurrent (ménage, admin)
    plants: [],      // plantes et leurs soins
    habits: [],      // définitions d'habitudes
    habitLog: {},    // { 'YYYY-MM-DD': { habitId: valeur | 'skip' } }
    shopping: [],     // articles de la liste de courses
    frequents: [],    // produits fréquents dérivés de l'historique
    settings: {
      userName: null,   // prénom du salut d'accueil
      weekStart: 1,      // lundi
      rayonOrder: RAYON_ORDER_DEFAULT.slice(), // ordre des rayons, adapté au plan du magasin (Lot 9)
      rayonOverrides: {}, // {libellé normalisé: rayon} — corrections mémorisées (Lot 9, js/shopping.js)
      coldFrom: 10,       // bornes de la saison froide (plantes) : octobre
      coldTo: 2,          // → février
      todayCap: 7,        // plafond visuel de l'écran Aujourd'hui
      reviewDay: 0,        // jour de la revue hebdomadaire (0 = dimanche)
      hideDone: false,
      birds: true          // micro-présences d'oiseaux (Lot 2) — jamais en mode sombre
    },
    lastReview: null,
    onboarded: false
  };
}
function migrate(r){
  r.v = r.v || 1;
  r.tasks = (r.tasks || []).map(t=>{
    // Lot V1-3 : modèle Things 3 (start/due/bucket/effort/prio…). Les tâches
    // du Lot 1 n'avaient ni date ni catégorie : elles deviennent 'anytime'.
    if(t.notes === undefined) t.notes = '';
    if(t.cat === undefined) t.cat = 'perso';
    if(t.room === undefined) t.room = null;
    if(t.bucket === undefined) t.bucket = 'anytime';
    if(t.start === undefined) t.start = null;
    if(t.due === undefined) t.due = null;
    if(t.evening === undefined) t.evening = false;
    if(t.prio === undefined) t.prio = 0;
    if(t.effort === undefined) t.effort = 2;
    if(t.postponed === undefined) t.postponed = 0;
    if(t.touchedAt === undefined) t.touchedAt = t.updatedAt || t.createdAt || Date.now();
    // Lot V1-4 : moteur de récurrence (js/recur.js).
    if(t.repeat === undefined) t.repeat = null;
    if(t.history === undefined) t.history = [];
    return t;
  });
  r.plants = r.plants || [];
  r.habits = r.habits || [];
  r.habitLog = r.habitLog || {};
  r.shopping = r.shopping || [];
  r.frequents = r.frequents || [];
  r.settings = Object.assign({
    userName: null, weekStart: 1, rayonOrder: [], rayonOverrides: {}, coldFrom: 10, coldTo: 2,
    todayCap: 7, reviewDay: 0, hideDone: false, birds: true
  }, r.settings || {});
  // Lot V1-9 : un rayonOrder vide (installs d'avant ce lot, jamais rempli)
  // retombe sur l'ordre par défaut plutôt que de laisser Courses sans groupes.
  if(!r.settings.rayonOrder || !r.settings.rayonOrder.length) r.settings.rayonOrder = RAYON_ORDER_DEFAULT.slice();
  if(!r.settings.rayonOverrides) r.settings.rayonOverrides = {};
  if(r.lastReview === undefined) r.lastReview = null;
  if(r.onboarded === undefined) r.onboarded = false;
  return r;
}

let S = defaults(); // jamais null, même avant la fin du boot() asynchrone

/* ---------- Persistance IndexedDB — base 'mylife', stores 'state' et 'photos' ---------- */
let _db = null;
function openDb(){
  return new Promise(resolve=>{
    if(typeof indexedDB === 'undefined'){ resolve(null); return; }
    let req;
    try{ req = indexedDB.open(IDB_NAME, IDB_VERSION); }catch(e){ resolve(null); return; }
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      if(!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>resolve(null);
  });
}
function idbGet(key){
  return new Promise(resolve=>{
    try{
      const rq = _db.transaction('state','readonly').objectStore('state').get(key);
      rq.onsuccess = ()=>resolve(rq.result);
      rq.onerror = ()=>resolve(undefined);
    }catch(e){ resolve(undefined); }
  });
}
function idbSet(key, val){
  return new Promise(resolve=>{
    try{
      const tx = _db.transaction('state','readwrite');
      tx.objectStore('state').put(val, key);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>resolve(false);
      tx.onabort = ()=>resolve(false);
    }catch(e){ resolve(false); }
  });
}
// Photos de plantes (Blobs) : store séparé, jamais dans S. Utilisé à partir du Lot 7.
function idbPutPhoto(id, blob){
  return new Promise(resolve=>{
    if(!_db){ resolve(false); return; }
    try{
      const tx = _db.transaction('photos','readwrite');
      tx.objectStore('photos').put(blob, id);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>resolve(false);
    }catch(e){ resolve(false); }
  });
}
function idbGetPhoto(id){
  return new Promise(resolve=>{
    if(!_db){ resolve(null); return; }
    try{
      const rq = _db.transaction('photos','readonly').objectStore('photos').get(id);
      rq.onsuccess = ()=>resolve(rq.result || null);
      rq.onerror = ()=>resolve(null);
    }catch(e){ resolve(null); }
  });
}
function idbDelPhoto(id){
  return new Promise(resolve=>{
    if(!_db){ resolve(false); return; }
    try{
      const tx = _db.transaction('photos','readwrite');
      tx.objectStore('photos').delete(id);
      tx.oncomplete = ()=>resolve(true);
      tx.onerror = ()=>resolve(false);
    }catch(e){ resolve(false); }
  });
}

async function loadState(){
  _db = await openDb();
  if(_db){
    const raw = await idbGet('S');
    if(raw){ try{ return migrate(JSON.parse(raw)); }catch(e){} }
    return defaults();
  }
  // IndexedDB indisponible (mode privé, quota…) : repli silencieux sur localStorage seul.
  let lsRaw = null;
  try{ lsRaw = localStorage.getItem(LS_KEY); }catch(e){}
  if(lsRaw){ try{ return migrate(JSON.parse(lsRaw)); }catch(e){} }
  return defaults();
}

let _dirty = false, _writing = false, _saveTimer = null;
async function writeState(){
  if(_db){
    let ok = await idbSet('S', JSON.stringify(S));
    if(!ok) ok = await idbSet('S', JSON.stringify(S)); // un retry avant d'alerter
    if(!ok) toast('Sauvegarde impossible', {danger:true});
  } else {
    try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){}
  }
}
function _flush(){
  _saveTimer = null;
  if(_writing){ _saveTimer = setTimeout(_flush, 150); return; }
  if(!_dirty) return;
  _dirty = false; _writing = true;
  writeState().finally(()=>{
    _writing = false;
    if(_dirty && !_saveTimer) _saveTimer = setTimeout(_flush, 150);
  });
}
// Écriture débouncée 150 ms — coalesce les rafales de mutations.
function save(){
  _dirty = true;
  if(!_saveTimer) _saveTimer = setTimeout(_flush, 150);
}
// Écriture immédiate (async, attend le disque) : import JSON, mise en arrière-plan de l'app.
function saveNow(){
  if(_saveTimer){ clearTimeout(_saveTimer); _saveTimer = null; }
  _dirty = false;
  return writeState();
}

/* ---------- Discipline synchro-ready (CONVENTIONS.md §2) — obligatoire sur tout objet persisté ---------- */
function touch(o){ o.updatedAt = Date.now(); return o; }
function stamp(o){
  o.id = crypto.randomUUID();
  o.createdAt = o.updatedAt = Date.now();
  o.deletedAt = null;
  return o;
}
function live(arr){ return arr.filter(o=>!o.deletedAt); }

// Purge des tombstones > 90 jours, appelée une fois au boot (js/boot.js).
function purgeTombstones(){
  const cutoff = Date.now() - 90*24*60*60*1000;
  let changed = false;
  ['tasks','plants','habits','shopping'].forEach(k=>{
    const before = S[k].length;
    S[k] = S[k].filter(o=>!o.deletedAt || o.deletedAt > cutoff);
    if(S[k].length !== before) changed = true;
  });
  if(changed) save();
}

/* ---------- Helpers de date ---------- */
function dayKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function todayKey(){ return dayKey(new Date()); }
function addDays(k, n){
  const d = new Date(k+'T00:00');
  d.setDate(d.getDate()+n);
  return dayKey(d);
}
function daysBetween(a, b){
  return Math.round((new Date(b+'T00:00') - new Date(a+'T00:00')) / 86400000);
}
