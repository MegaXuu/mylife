/* ==========================================================================
   Test de fumée — charge index.html sous jsdom (fake-indexeddb injecté),
   exerce go() sur les 6 écrans, le cycle de vie d'une tâche (créer, cocher,
   supprimer), les invariants des oiseaux, la règle de casse à la saisie, le
   moteur de récurrence (distinction from:'due' / from:'done', jauge de
   fraîcheur, completeTask()) et l'écran Maison, puis vérifie la persistance
   après un rechargement simulé. Échoue à la moindre erreur runtime.
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

// 6) Moteur de récurrence (Lot V1-4, js/recur.js) : la distinction from:'due' /
//    from:'done' est le cœur du lot — testée explicitement, pas seulement par
//    ricochet via l'UI.
call('intervalDays', () => {
  if(win.intervalDays(null) !== null) throw new Error('intervalDays(null) devrait être null');
  if(win.intervalDays({kind:'day', n:5}) !== 5) throw new Error('intervalDays jour incorrect');
  if(win.intervalDays({kind:'week', n:2}) !== 14) throw new Error('intervalDays semaine incorrect');
  if(win.intervalDays({kind:'month', n:1}) !== 30) throw new Error('intervalDays mois incorrect');
  if(win.intervalDays({kind:'year', n:1}) !== 365) throw new Error('intervalDays an incorrect');
});
call('nextDue from:due (échéance précédente, indépendante de la réalisation)', () => {
  const t = {due: '2026-01-05', repeat: {kind: 'month', n: 1, from: 'due'}};
  if(win.nextDue(t, '2026-01-05') !== '2026-02-05')
    throw new Error('nextDue from:due devrait repartir de l’échéance précédente, obtenu ' + win.nextDue(t, '2026-01-05'));
});
call('nextDue from:done (réalisation effective, pas la date attendue)', () => {
  const t = {doneAt: new Date('2026-01-01T00:00').getTime(), due: '2025-12-20', repeat: {kind: 'day', n: 7, from: 'done'}};
  const got = win.nextDue(t, '2026-01-10');
  if(got !== '2026-01-08')
    throw new Error('nextDue from:done doit ignorer l’ancienne échéance et repartir de doneAt, obtenu ' + got);
});
call('nextDue jours fixes de semaine', () => {
  const t = {doneAt: new Date('2026-01-05T00:00').getTime(), repeat: {kind: 'week', days: [1, 4], from: 'done'}}; // lundi 2026-01-05
  if(win.nextDue(t) !== '2026-01-08') // jeudi suivant
    throw new Error('nextDue jours fixes incorrect, obtenu ' + win.nextDue(t));
});
call('freshness bornée [0,1], jamais négative', () => {
  const now = Date.now();
  const frais = win.freshness({doneAt: now, repeat: {kind: 'day', n: 6}}, now);
  if(Math.abs(frais - 1) > 0.01) throw new Error('freshness juste après doneAt devrait être ~1');
  const demi = win.freshness({doneAt: now - 3*86400000, repeat: {kind: 'day', n: 6}}, now);
  if(Math.abs(demi - 0.5) > 0.01) throw new Error('freshness à mi-intervalle devrait être ~0,5, obtenu ' + demi);
  const vieux = win.freshness({doneAt: now - 60*86400000, repeat: {kind: 'day', n: 6}}, now);
  if(vieux !== 0) throw new Error('freshness très en retard doit rester 0, jamais négative — obtenu ' + vieux);
  if(win.freshness({doneAt: null, repeat: {kind: 'day', n: 6}}, now) !== 0)
    throw new Error('freshness sans doneAt devrait être 0 (à faire)');
});
call('completeTask from:done — doneAt se pose sur l’instant, la tâche reste visible en Maison', () => {
  const t = {doneAt: null, due: null, repeat: {kind: 'day', n: 7, from: 'done'}, history: [], postponed: 2};
  win.completeTask(t);
  if(!t.doneAt) throw new Error('completeTask from:done devrait poser doneAt');
  if(t.postponed !== 0) throw new Error('completeTask devrait remettre postponed à 0');
  if(!t.history.length) throw new Error('completeTask devrait historiser la réalisation');
});
call('completeTask from:due — reste actif, l’échéance avance', () => {
  const t = {doneAt: null, due: '2026-01-05', repeat: {kind: 'month', n: 1, from: 'due'}, history: [], postponed: 1};
  win.completeTask(t);
  if(t.doneAt !== null) throw new Error('completeTask from:due ne doit pas laisser doneAt : la tâche n’est pas finie, juste reportée au prochain cycle');
  if(t.due !== win.nextDue({due: '2026-01-05', repeat: t.repeat}, '2026-01-05'))
    throw new Error('completeTask from:due devrait avancer l’échéance');
});

// 6 bis) Écran Maison (Lot V1-4) : un entretien (repeat.from:'done' + room) vit
// dans la vue par pièce et disparaît de la liste des tâches ouvertes.
call('Maison — entretien créé, visible en Maison, absent des tâches ouvertes', () => {
  win.go('maison');
  S.tasks.push(win.stamp({
    title: 'Passer l’aspirateur', notes: '', cat: 'entretien', room: 'salon', bucket: 'anytime',
    start: null, due: null, evening: false, prio: 0, effort: 2,
    repeat: {kind: 'day', n: 7, days: [], from: 'done'},
    doneAt: Date.now(), history: [], postponed: 0, touchedAt: Date.now()
  }));
  win.go('maison');
  const t = S.tasks.find(t => t.title === 'Passer l’aspirateur');
  if(!win.getMaisonItems().some(x => x.id === t.id)) throw new Error('l’entretien devrait apparaître dans getMaisonItems()');
  win.go('tasks');
  if(win.getTaskItems().some(x => x.id === t.id)) throw new Error('un entretien déjà fait ne devrait pas polluer la liste des tâches ouvertes');
  const before = t.doneAt;
  win.tapMaisonItem(t.id);
  if(t.doneAt <= before) throw new Error('tapMaisonItem devrait rafraîchir doneAt');
});

// 7) Écriture immédiate puis relecture directe dans IndexedDB — équivalent, pour ce
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

// 8) Bilan.
if(fails.length){
  console.error(`\n✗ ${fails.length} échec(s) :`);
  fails.forEach(f => console.error('  - ' + f));
  process.exit(1);
} else {
  console.log('✓ Test fumée OK — 6 écrans, cycle de vie d’une tâche, oiseaux, casse, persistance.');
}
