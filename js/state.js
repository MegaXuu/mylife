/* ==========================================================================
   state.js — SOCLE, chargé en premier (après les catalogues data/*.js).
   Constantes, persistance IndexedDB, defaults()/migrate(), l'état global `S`,
   les helpers synchro-ready (CONVENTIONS.md §2) et les helpers de date.
   AUCUN RENDU DOM ICI — voir js/ui.js et les js/<ecran>.js pour l'affichage.
   ========================================================================== */

const APP_VERSION = 'Bêta 3.5'; // à synchroniser avec CACHE (sw.js) à chaque release

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
    backupNudgeAt: null, // dernier rappel de sauvegarde au démarrage (ms) — au plus un par semaine (Lot V3-5)
    seenVersion: null,  // dernière version vue au démarrage — annonce d'une mise à jour (Lot V3-3)
    onboarded: false
  };
}
function migrate(r){
  if(!r || typeof r !== 'object') throw new Error('état illisible');
  r.v = r.v || 1;
  // Une collection qui n'est pas un tableau (fichier abîmé, import approximatif)
  // redevient un tableau vide plutôt que de faire échouer tout le démarrage.
  ['tasks','habits','meals','shopping','frequents'].forEach(k=>{ if(r[k] !== undefined && !Array.isArray(r[k])) r[k] = []; });
  if(r.habitLog !== undefined && (typeof r.habitLog !== 'object' || Array.isArray(r.habitLog))) r.habitLog = {};
  if(r.settings !== undefined && (typeof r.settings !== 'object' || Array.isArray(r.settings))) r.settings = {};
  sanitizeKeys(r);
  repairLigatures(r);
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
    repairRecurring(t);
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
  if(r.backupNudgeAt === undefined) r.backupNudgeAt = null;
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

/* Lot V3-4 — deux réparations de tâches récurrentes, idempotentes, pour les
   données écrites avant la correction de completeTask() (js/recur.js) :
    · une tâche « après réalisation » SANS pièce avait reçu un doneAt comme un
      entretien : elle avait disparu de Tâches sans jamais entrer dans
      Maison. Elle redevient ouverte, due à sa prochaine occurrence ;
    · un début resté dans le passé alors que l'échéance a avancé d'au moins
      un cycle : c'est lui qui gardait la tâche dans « Aujourd'hui » tous les
      jours. Il est effacé, l'échéance suffit. */
function repairRecurring(t){
  const r = t.repeat;
  if(!r || t.deletedAt) return;
  if(r.from === 'done' && !t.room && t.doneAt){
    t.start = t.due || nextOccurrence(r, dayKey(new Date(t.doneAt)));
    t.due = null;
    t.doneAt = null;
    t.bucket = 'scheduled';
    return;
  }
  const iv = intervalDays(r);
  if(!(r.from === 'done' && t.room) && t.start && t.due && iv && daysBetween(t.start, t.due) >= iv) t.start = null;
}

/* Défense en profondeur (Lot V3-4) : les identifiants et les clés de pièce
   finissent dans des attributs onclick="fn('…')" ; esc() ne suffit pas dans
   ce contexte (le navigateur décode &#39; avant d'exécuter le JS). Un fichier
   importé — seule source possible de valeurs arbitraires — ne doit donc
   jamais y faire entrer autre chose que des caractères sûrs. Un objet dont
   l'identifiant ne l'est pas en reçoit un neuf ; une pièce inconnue devient
   « partout » ; un repas mal daté est écarté. */
const SAFE_KEY = /^[A-Za-z0-9_-]{1,64}$/;
const SAFE_DAY = /^\d{4}-\d{2}-\d{2}$/;
function sanitizeKeys(r){
  ['tasks','habits','meals','shopping'].forEach(k=>{
    if(Array.isArray(r[k])) r[k] = r[k].filter(o=>o && typeof o === 'object');
    (r[k] || []).forEach(o=>{ if(typeof o.id !== 'string' || !SAFE_KEY.test(o.id)) o.id = crypto.randomUUID(); });
  });
  (r.tasks || []).forEach(t=>{ if(t.room != null && !SAFE_KEY.test(String(t.room))) t.room = 'partout'; });
  (r.meals || []).forEach(m=>{
    if(!SAFE_DAY.test(String(m.day)) || (m.slot !== 'midi' && m.slot !== 'soir')) m.deletedAt = m.deletedAt || Date.now();
  });
  r.frequents = (r.frequents || []).filter(f=>f && /^[a-z0-9 -]*$/.test(String(f.norm)));
}

// Lot V3-5 : normalizeLabel() (js/shopping.js) écrit désormais les ligatures
// en deux lettres. Un produit fréquent enregistré avant (« Œufs », rangé sous
// la clé « ufs ») reprend sa vraie clé, fusionné avec celui qui l'aurait
// déjà ; un article resté au rayon « Autre » pour la même raison retrouve le
// sien. Idempotent : pour tout autre libellé, rien ne change.
function repairLigatures(r){
  if(typeof normalizeLabel !== 'function') return;
  const byNorm = {}, out = [];
  (r.frequents || []).forEach(f=>{
    const norm = normalizeLabel(f.label) || f.norm;
    if(byNorm[norm]){ byNorm[norm].count = (byNorm[norm].count || 0) + (f.count || 0); return; }
    byNorm[norm] = Object.assign({}, f, {norm});
    out.push(byNorm[norm]);
  });
  r.frequents = out;
  (r.shopping || []).forEach(it=>{
    if(it.rayon !== 'autre' || !/[œæ]/i.test(String(it.label))) return;
    const g = guessRayon(it.label);
    if(g){ it.rayon = g; touch(it); }
  });
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

/* Jamais de perte silencieuse (Lot V3-4). Jusqu'ici, un état stocké qu'on
   ne savait plus relire (JSON abîmé, migration qui échoue sur une donnée
   imprévue) était remplacé sans un mot par defaults() — puis écrasé au
   premier save(). Il est désormais recopié tel quel sous une clé à part
   AVANT de repartir de zéro ; boot() le signale, et Réglages → Données
   permet de l'exporter (corruptExportAction(), js/settings.js). */
let _corruptKey = null;
async function loadState(){
  _db = await openDb();
  let raw = null;
  if(_db) raw = await idbGet('S');
  else { try{ raw = localStorage.getItem(LS_KEY); }catch(e){} } // IndexedDB indisponible : repli sur localStorage
  if(!raw) return defaults();
  try{ return migrate(JSON.parse(raw)); }
  catch(e){
    _corruptKey = 'S-illisible-' + todayKey();
    if(_db) await idbSet(_corruptKey, raw);
    else { try{ localStorage.setItem(LS_KEY + '-illisible', raw); }catch(err){} }
    const s = defaults();
    s.corruptBackup = _corruptKey;
    s.onboarded = true; // une base qui avait des données n'est pas une première ouverture
    return s;
  }
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
// Jour ISO 1..7 (lundi..dimanche) — la convention de repeat.days, des
// habitudes et de la semaine type des repas. Ici depuis le Lot V3-4 : le
// moteur de récurrence en a besoin, il ne doit pas dépendre de js/habits.js.
function isoDow(k){
  const d = new Date(k+'T00:00').getDay();
  return d === 0 ? 7 : d;
}
