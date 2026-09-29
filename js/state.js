/* ==========================================================================
   state.js — SOCLE, chargé en premier (après les catalogues data/*.js).
   Constantes, persistance IndexedDB, defaults()/migrate(), l'état global `S`,
   les helpers synchro-ready (CONVENTIONS.md §2) et les helpers de date.
   AUCUN RENDU DOM ICI — voir js/ui.js et les js/<ecran>.js pour l'affichage.
   ========================================================================== */

const APP_VERSION = 'Bêta 3.3'; // à synchroniser avec CACHE (sw.js) à chaque release

const IDB_NAME = 'mylife';
const IDB_VERSION = 1;
const LS_KEY = 'mylife';

/* ---------- Valeurs par défaut & migration (modèle : ROADMAP-V1.md §5) ---------- */
// Semaine type des repas (Lot V3-2, js/meals.js) : pour chaque jour ISO
// (1 = lundi … 7 = dimanche), midi et soir, un statut ('plan' à prévoir,
// 'cantine', 'ailleurs') et un nombre de personnes. Vit ici et pas dans
// meals.js : defaults() l'appelle dès le chargement de ce fichier, avant
// que meals.js n'existe (même raison que RAYON_ORDER_DEFAULT, data/rayons.js).
function mealWeekDefault(){
  const w = {};
  for(let d = 1; d <= 7; d++) w[d] = {midi:{s:'plan', p:2}, soir:{s:'plan', p:2}};
  return w;
}
function defaults(){
  return {
    v: 1,
    tasks: [],       // tâches ponctuelles + entretien récurrent (ménage, admin, plantes)
    habits: [],      // définitions d'habitudes
    habitLog: {},    // { 'YYYY-MM-DD': { habitId: valeur | 'skip' } }
    meals: [],        // repas de la semaine, seulement là où on s'écarte de la semaine type (Lot V3-2)
    shopping: [],     // articles de la liste de courses
    frequents: [],    // produits fréquents dérivés de l'historique
    settings: {
      userName: null,   // prénom du salut d'accueil
      weekStart: 1,      // lundi
      rayonOrder: RAYON_ORDER_DEFAULT.slice(), // ordre des rayons, adapté au plan du magasin (Lot 9)
      rayonOverrides: {}, // {libellé normalisé: rayon} — corrections mémorisées (Lot 9, js/shopping.js)
      choreBudget: 30,    // minutes d'entretien proposées par jour sur Aujourd'hui (Lot V3-1, js/maison.js)
      mealWeek: mealWeekDefault(), // semaine type des repas (Lot V3-2, js/meals.js)
      mealWeekSet: false, // la semaine type a-t-elle déjà été réglée une fois ?
      todayCap: 7,        // plafond visuel de l'écran Aujourd'hui
      reviewDay: 0,        // jour de la revue hebdomadaire (0 = dimanche)
      hideDone: false,
      birds: true,         // micro-présences d'oiseaux (Lot 2) — jamais en mode sombre
      theme: 'auto'        // 'light' | 'dark' | 'auto' (Lot 11) — auto suit prefers-color-scheme
    },
    lastReview: null,
    lastExport: null,   // dernier export JSON (ms) — Réglages le rappelle (Lot V3-3)
    seenVersion: null,  // dernière version vue au démarrage — annonce d'une mise à jour (Lot V3-3)
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
  // Lot V3-1 : les plantes ne sont plus un domaine à part. Une base qui en
  // portait garde l'essentiel — un entretien « S'occuper des plantes » par
  // pièce, au rythme d'arrosage le plus court de ses plantes — plutôt que de
  // les perdre sans rien dire. Les photos restent dans le store 'photos'
  // jusqu'à la prochaine réinitialisation (idbClearPhotos()).
  const hadPlants = (r.plants || []).length > 0;
  migratePlants(r);
  r.habits = r.habits || [];
  r.habitLog = r.habitLog || {};
  r.meals = r.meals || [];
  r.shopping = r.shopping || [];
  r.frequents = r.frequents || [];
  r.settings = Object.assign({
    userName: null, weekStart: 1, rayonOrder: [], rayonOverrides: {}, choreBudget: 30,
    mealWeekSet: false, todayCap: 7, reviewDay: 0, hideDone: false, birds: true, theme: 'auto'
  }, r.settings || {});
  if(!r.settings.mealWeek || typeof r.settings.mealWeek !== 'object') r.settings.mealWeek = mealWeekDefault();
  delete r.settings.coldFrom; delete r.settings.coldTo; // saison froide des plantes, Lot V1-7 → V3-1
  // Lot V1-9 : un rayonOrder vide (installs d'avant ce lot, jamais rempli)
  // retombe sur l'ordre par défaut plutôt que de laisser Courses sans groupes.
  if(!r.settings.rayonOrder || !r.settings.rayonOrder.length) r.settings.rayonOrder = RAYON_ORDER_DEFAULT.slice();
  if(!r.settings.rayonOverrides) r.settings.rayonOverrides = {};
  if(r.lastReview === undefined) r.lastReview = null;
  if(r.lastExport === undefined) r.lastExport = null;
  if(r.seenVersion === undefined) r.seenVersion = null;
  // Lot V1-11 : une base déjà peuplée avant l'existence de la bienvenue ne
  // doit jamais se la voir proposer après coup — seule une base réellement
  // vierge (aucune tâche, plante, habitude ou article) reste à onboarder.
  if(r.onboarded === undefined){
    const hasData = r.tasks.length || hadPlants || r.habits.length || r.shopping.length;
    r.onboarded = !!hasData;
  }
  return r;
}

// Une plante vivante → un entretien par pièce. Idempotent : la clé plants
// disparaît après coup, et un entretien de même titre déjà présent dans la
// pièce n'est pas recréé.
function migratePlants(r){
  const plants = (r.plants || []).filter(p=>!p.deletedAt && p.room);
  delete r.plants;
  const byRoom = {};
  plants.forEach(p=>{
    const w = p.care && p.care.water ? (p.care.water.warm || 7) : 7;
    byRoom[p.room] = Math.min(byRoom[p.room] || w, w);
  });
  Object.keys(byRoom).forEach(room=>{
    const title = 'S’occuper des plantes';
    if(r.tasks.some(t=>!t.deletedAt && t.room === room && t.title === title)) return;
    r.tasks.push(stamp({
      title, notes:'', cat:'entretien', room, bucket:'anytime', start:null, due:null,
      evening:false, prio:0, effort:1, mins:10,
      repeat:{kind:'day', n:byRoom[room], days:[], from:'done'},
      doneAt:Date.now(), history:[], postponed:0, touchedAt:Date.now()
    }));
  });
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
// Vide le store 'photos' en une fois — réinitialisation (Lot 11). Depuis le
// Lot V3-1 plus rien n'y écrit (les photos de plantes ont disparu avec les
// plantes) : ce qui y reste d'avant est purgé ici, rien d'autre ne le ferait.
function idbClearPhotos(){
  return new Promise(resolve=>{
    if(!_db){ resolve(false); return; }
    try{
      const tx = _db.transaction('photos','readwrite');
      tx.objectStore('photos').clear();
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
  ['tasks','habits','meals','shopping'].forEach(k=>{
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
