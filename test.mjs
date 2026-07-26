/* ==========================================================================
   Test de fumée — charge index.html sous jsdom (fake-indexeddb injecté),
   exerce go() sur les 6 écrans, le cycle de vie d'une tâche (créer, cocher,
   supprimer), les invariants des oiseaux et la règle de casse à la saisie,
   puis vérifie la persistance après un rechargement simulé. Échoue à
   la moindre erreur runtime. Objectif : attraper les erreurs, pas vérifier
   la logique métier fine (il n'y en a quasiment aucune au Lot 1).
   Lancer :  npm test   (après un premier « npm install »)
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

const root = new URL('.', import.meta.url).pathname;
const read = f => readFileSync(root + f, 'utf8');

// Ordre de chargement impératif (CONVENTIONS.md §1) — miroir exact des balises
// <script> de index.html et du tableau ASSETS de sw.js. Concaténés en un seul
// <script> pour rester robuste sous jsdom, même portée globale qu'en prod.
const FILES = [
  'data/rayons.js', 'data/plantes.js', 'data/entretien.js', 'data/oiseaux.js',
  'js/state.js', 'js/ui.js', 'js/recur.js', 'js/nlp.js', 'js/today.js',
  'js/tasks.js', 'js/maison.js', 'js/plants.js', 'js/habits.js',
  'js/shopping.js', 'js/review.js', 'js/settings.js', 'js/boot.js',
];
const bundle = FILES.map(read).join('\n');
const html = read('index.html')
  .replace(/<script src="[^"]+"><\/script>\s*/g, '') // retire les 17 balises externes
  .replace('</body>', `<script>${bundle}</script>\n<script>window.__S=function(){return S;};</script>\n</body>`);

const fails = [];
const onError = (label, e) => fails.push(`${label} → ${e && e.message ? e.message : e}`);

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  beforeParse(win){
    // jsdom n'implémente pas IndexedDB : on injecte fake-indexeddb.
    win.indexedDB = indexedDB;
    win.IDBKeyRange = IDBKeyRange;
    // jsdom n'implémente pas scrollTo : no-op pour éviter le bruit console.
    win.scrollTo = () => {};
    win.addEventListener('error', e => onError('window.onerror', e.error || e.message));
  },
});

const win = dom.window;
if(typeof win.__ready === 'function') await win.__ready();
const S = typeof win.__S === 'function' ? win.__S() : undefined;

if(!S) fails.push('boot → état S inaccessible (le boot n’a pas produit d’état exploitable)');

const call = (label, fn) => { try{ fn(); }catch(e){ onError(label, e); } };

// 1) Les 6 écrans naviguent sans erreur runtime.
['today', 'tasks', 'maison', 'shopping', 'habits', 'settings'].forEach(scr =>
  call(`go('${scr}')`, () => win.go(scr))
);

// 2) Cycle de vie d'une tâche : créer, cocher, supprimer (tombstone, jamais retirée du tableau).
call('addTask', () => {
  win.go('tasks');
  const input = win.document.getElementById('task-input');
  input.value = 'Sortir les poubelles';
  win.addTask();
  if(!S.tasks.some(t => t.title === 'Sortir les poubelles')) throw new Error('tâche non créée');
});
let taskId;
call('doneTask', () => {
  const t = S.tasks.find(t => t.title === 'Sortir les poubelles');
  if(!t) throw new Error('tâche introuvable avant cochage');
  taskId = t.id;
  win.doneTask(taskId);
  if(!t.doneAt) throw new Error('tâche non marquée faite (doneAt absent)');
});
call('delTask (tombstone via confirmSheet)', () => {
  win.delTask(taskId); // ouvre confirmSheet()
  win._runConfirm();   // simule le tap sur « Supprimer »
  const t = S.tasks.find(t => t.id === taskId);
  if(!t) throw new Error('la tâche a été retirée du tableau au lieu d’un tombstone');
  if(!t.deletedAt) throw new Error('deletedAt absent après suppression');
});

// 3) Discipline synchro-ready (CONVENTIONS.md §2) : stamp()/touch()/live().
call('stamp/touch/live', () => {
  const o = win.stamp({title: 'x'});
  if(!o.id || !o.createdAt || !o.updatedAt) throw new Error('stamp() incomplet');
  if(o.deletedAt !== null) throw new Error('stamp() doit initialiser deletedAt à null');
  const before = o.updatedAt;
  win.touch(o);
  if(o.updatedAt < before) throw new Error('touch() n’a pas mis à jour updatedAt');
  if(win.live([o, {deletedAt: Date.now()}]).length !== 1) throw new Error('live() ne filtre pas les tombstones');
});

// 4) Oiseaux (Lot 2) : décoratifs, un seul par écran, aucun en mode sombre.
call('oiseaux', () => {
  win.go('today');
  const oiseaux = win.document.querySelectorAll('#s-today .bird');
  if(oiseaux.length !== 1) throw new Error(`${oiseaux.length} oiseau(x) sur Aujourd'hui, attendu 1`);
  if(oiseaux[0].getAttribute('aria-hidden') !== 'true') throw new Error('oiseau non masqué aux lecteurs d’écran');
  win.document.documentElement.setAttribute('data-mode', 'dark');
  win.go('today');
  if(win.document.querySelectorAll('#s-today .bird').length) throw new Error('oiseau présent en mode sombre');
  win.document.documentElement.removeAttribute('data-mode');
  S.settings.birds = false;
  win.go('today');
  if(win.document.querySelectorAll('#s-today .bird').length) throw new Error('interrupteur « Oiseaux » sans effet');
  S.settings.birds = true;
});

// 5) Règle de casse (CONVENTIONS.md §3) : majuscule initiale posée À LA SAISIE.
call('cap à la saisie', () => {
  win.go('tasks');
  win.document.getElementById('task-input').value = 'trier les papiers';
  win.addTask();
  const t = S.tasks.find(t => t.title === 'Trier les papiers');
  if(!t) throw new Error('le titre stocké n’a pas reçu sa majuscule initiale');
});

// 6) Écriture immédiate puis relecture directe dans IndexedDB — équivalent, pour ce
//    test de fumée, à vérifier la persistance après un rechargement de l'app.
if(typeof win.saveNow === 'function'){
  try{ await win.saveNow(); }catch(e){ onError('saveNow (flush)', e); }
}
function idbGetDirect(key){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('mylife', 1);
    req.onsuccess = () => {
      const db = req.result;
      const rq = db.transaction('state', 'readonly').objectStore('state').get(key);
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    };
    req.onerror = () => reject(req.error);
  });
}
try{
  const raw = await idbGetDirect('S');
  if(!raw) fails.push('IndexedDB → clé "S" absente après saveNow()');
  else{
    const persisted = JSON.parse(raw);
    const t = (persisted.tasks || []).find(t => t.id === taskId);
    if(!t) fails.push('IndexedDB → la tâche supprimée est absente (devrait être un tombstone persisté)');
    else if(!t.deletedAt) fails.push('IndexedDB → deletedAt non persisté sur la tâche supprimée');
  }
}catch(e){
  fails.push('IndexedDB → lecture directe en échec : ' + (e && e.message ? e.message : e));
}

// 7) Bilan.
if(fails.length){
  console.error(`\n✗ ${fails.length} échec(s) :`);
  fails.forEach(f => console.error('  - ' + f));
  process.exit(1);
} else {
  console.log('✓ Test fumée OK — 6 écrans, cycle de vie d’une tâche, oiseaux, casse, persistance.');
}
