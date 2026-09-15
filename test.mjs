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
  'js/state.js', 'js/ui.js', 'js/gestures.js', 'js/recur.js', 'js/nlp.js', 'js/today.js',
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

// 0) Réglages (Lot V1-11) — bienvenue, thème, export/import, avant tout le
//    reste : c'est justement ce qui s'ouvre réellement au tout premier boot()
//    sur une base fake-indexeddb vierge (maybeWelcome(), appelé par boot()).
//    La tester ici, et la fermer proprement, évite de laisser le hook
//    _onSheetClose de la bienvenue traîner pour les scénarios suivants.
call('Bienvenue — trois écrans, prénom retenu, tâche créée, onboarded=true et jamais revue', () => {
  if(!win.document.getElementById('sheet-bg').classList.contains('show'))
    throw new Error('la feuille de bienvenue devrait déjà être ouverte au premier boot (S vide, !onboarded)');
  win.advanceWelcome(); // écran 1 → 2
  const nameEl = win.document.getElementById('w-name');
  if(!nameEl) throw new Error('le champ prénom devrait être présent à l’étape 2');
  nameEl.value = 'ada';
  nameEl.dispatchEvent(new win.Event('input', {bubbles: true}));
  win.advanceWelcome(); // écran 2 → 3
  if(S.settings.userName !== 'Ada') throw new Error('le prénom devrait être retenu avec la casse posée par cap()');
  const taskEl = win.document.getElementById('w-task');
  if(!taskEl) throw new Error('le champ tâche devrait être présent à l’étape 3');
  taskEl.value = 'découvrir mylife';
  taskEl.dispatchEvent(new win.Event('input', {bubbles: true}));
  win.finishWelcome();
  if(!S.onboarded) throw new Error('la bienvenue terminée devrait poser S.onboarded = true');
  if(win.document.getElementById('sheet-bg').classList.contains('show'))
    throw new Error('la feuille devrait être fermée après finishWelcome()');
  const created = S.tasks.find(t => t.title === 'Découvrir mylife');
  if(!created) throw new Error('la première tâche saisie devrait être créée, avec la casse posée par cap()');
  // Nettoyage : ne pas polluer les scénarios suivants avec cette tâche/ce prénom.
  created.deletedAt = Date.now(); win.touch(created);
  S.settings.userName = null;
});
call('Bienvenue — maybeWelcome() ne se redéclenche jamais une fois onboarded', () => {
  win.maybeWelcome();
  if(win.document.getElementById('sheet-bg').classList.contains('show'))
    throw new Error('la bienvenue ne doit jamais se rejouer une fois S.onboarded posé à true');
});

call('Réglages — thème : clair/sombre explicites, auto retombe sur clair sans planter (jsdom n’a pas matchMedia)', () => {
  const backup = S.settings.theme;
  try{
    win.setTheme('dark');
    if(win.document.documentElement.getAttribute('data-mode') !== 'dark')
      throw new Error('« Sombre » devrait poser data-mode="dark"');
    win.setTheme('light');
    if(win.document.documentElement.getAttribute('data-mode') === 'dark')
      throw new Error('« Clair » ne devrait jamais poser data-mode="dark"');
    win.setTheme('auto');
    if(win.document.documentElement.getAttribute('data-mode') === 'dark')
      throw new Error('« Auto » sans matchMedia devrait retomber sur clair, jamais planter ni forcer sombre');
  } finally {
    S.settings.theme = backup;
    win.applyTheme();
  }
});

call('Réglages — validateImportPayload() : structure minimale exigée avant tout import', () => {
  if(win.validateImportPayload(null)) throw new Error('null devrait être rejeté');
  if(win.validateImportPayload({})) throw new Error('objet vide devrait être rejeté (v manquant)');
  if(win.validateImportPayload({v: 1, tasks: []})) throw new Error('tableaux/settings/habitLog manquants devraient être rejetés');
  if(!win.validateImportPayload(win.defaults())) throw new Error('defaults() devrait être une structure valide');
});
call('Réglages — applyImportedData() : rejet intégral si invalide, remplacement entier si valide', () => {
  const backupJson = JSON.stringify(S);
  try{
    if(win.applyImportedData({not: 'valid'}))
      throw new Error('un payload invalide ne devrait jamais être accepté');
    if(JSON.stringify(S) !== backupJson)
      throw new Error('un import invalide ne doit rien modifier dans S (pas d’écrasement partiel)');

    const payload = JSON.parse(backupJson);
    payload.settings.userName = 'Imported Name';
    payload.tasks = [];
    if(!win.applyImportedData(payload))
      throw new Error('un payload valide (structure de S) devrait être accepté');
    if(S.settings.userName !== 'Imported Name')
      throw new Error('S devrait refléter les données importées après un import valide');
  } finally {
    const restored = JSON.parse(backupJson);
    Object.keys(S).forEach(k => delete S[k]);
    Object.assign(S, restored);
  }
});

// Asynchrone (IndexedDB) : hors du helper call() synchrone, comme savePlantSheet()
// et le flush saveNow() plus bas.
try{
  await win.idbPutPhoto('photo-test-reset', new win.Blob(['x']));
  const before = await win.idbGetPhoto('photo-test-reset');
  if(!before) throw new Error('la photo de test devrait être présente avant idbClearPhotos()');
  const ok = await win.idbClearPhotos();
  if(!ok) throw new Error('idbClearPhotos() devrait réussir');
  const after = await win.idbGetPhoto('photo-test-reset');
  if(after) throw new Error('idbClearPhotos() devrait vider le store « photos » entièrement');
}catch(e){ onError('Réglages — Réinitialisation : idbClearPhotos() vide le store sans toucher à state', e); }

call('Réglages — six groupes dans l’ordre attendu', () => {
  win.go('settings');
  const html = win.document.getElementById('s-settings').innerHTML;
  const order = ['Profil', 'Aujourd’hui', 'Maison', 'Courses', 'Données', 'À propos'];
  let lastIdx = -1;
  order.forEach(title => {
    const idx = html.indexOf(title);
    if(idx === -1) throw new Error('groupe manquant dans Réglages : ' + title);
    if(idx <= lastIdx) throw new Error('ordre des groupes de Réglages incorrect autour de : ' + title);
    lastIdx = idx;
  });
});

// 1) Les 6 écrans naviguent sans erreur runtime.
['today', 'tasks', 'maison', 'shopping', 'habits', 'settings'].forEach(scr =>
  call(`go('${scr}')`, () => win.go(scr))
);

// 1 bis) Navigation & saisie (Lot V2-2) : cinq onglets, écran Habitudes
// atteignable à zéro habitude, mémorisation du défilement par écran.
call('Tab bar — cinq onglets (§3.1)', () => {
  const tabs = win.document.querySelectorAll('#tabbar .tab');
  if(tabs.length !== 5) throw new Error('la tab bar devrait avoir 5 onglets, obtenu ' + tabs.length);
  if(![...tabs].some(t => t.dataset.s === 'habits'))
    throw new Error('un onglet Habitudes devrait exister dans la tab bar');
});
call('go(\'habits\') fonctionne avec S.habits vide et rend un état vide (audit A3)', () => {
  const backup = S.habits.slice();
  S.habits.length = 0;
  try{
    win.go('habits');
    const el = win.document.getElementById('s-habits');
    if(!/Aucune habitude/.test(el.textContent)) throw new Error('un état vide devrait inviter à créer une habitude');
    const btn = [...el.querySelectorAll('button')].find(b => /Ajouter une habitude/.test(b.textContent));
    if(!btn) throw new Error('le bouton « Ajouter une habitude » devrait être présent même à zéro habitude');
  } finally {
    S.habits.length = 0; backup.forEach(h => S.habits.push(h));
  }
});
call('go() — mémorise et restaure la position de défilement par écran, remonte en haut sur l’onglet déjà actif', () => {
  // jsdom ne défile pas : window.scrollY reste 0 et scrollTo() est un no-op
  // (voir beforeParse plus haut) — on vérifie donc la valeur stockée via
  // scrollPosFor(), pas un vrai déplacement du DOM.
  win.go('tasks');
  if(win.scrollPosFor('maison') !== 0) throw new Error('un écran jamais quitté devrait avoir une position à 0');
  Object.defineProperty(win, 'scrollY', {value: 640, configurable: true});
  win.go('maison'); // quitte Tâches à 640 : doit être mémorisé
  if(win.scrollPosFor('tasks') !== 640)
    throw new Error('la position quittée sur Tâches (640) devrait être mémorisée, obtenu ' + win.scrollPosFor('tasks'));
  Object.defineProperty(win, 'scrollY', {value: 0, configurable: true});
  win.go('tasks'); // y revient : devrait restaurer 640 (vérifié indirectement, scrollTo est un no-op sous jsdom)
  win.go('tasks'); // retape l'onglet déjà actif : convention iOS, remonte en haut
  if(win.scrollPosFor('tasks') !== 640)
    throw new Error('retaper l’onglet déjà actif ne doit pas effacer la position mémorisée des AUTRES écrans');
});
call('go() — pilote body.capture-open selon la barre de saisie collée de l’écran (§3.2)', () => {
  win.go('today');
  if(!win.document.body.classList.contains('capture-open')) throw new Error('Aujourd’hui pose une barre de capture : capture-open attendu');
  win.go('maison');
  if(win.document.body.classList.contains('capture-open')) throw new Error('Maison n’a pas de barre de saisie collée : capture-open ne devrait pas être posé');
  win.go('shopping');
  if(!win.document.body.classList.contains('capture-open')) throw new Error('Courses pose un champ d’ajout collé : capture-open attendu');
  win.go('today');
});

// 2) Cycle de vie d'une tâche : créer (barre de capture, Lot V1-6), cocher,
//    supprimer (tombstone, jamais retirée du tableau).
call('commitCapture', () => {
  win.go('tasks');
  const input = win.document.getElementById('cap-input-tasks');
  input.value = 'Sortir les poubelles';
  win.commitCapture();
  if(!S.tasks.some(t => t.title === 'Sortir les poubelles')) throw new Error('tâche non créée via la capture rapide');
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

// 5) Règle de casse (CONVENTIONS.md §3) : majuscule initiale posée À LA SAISIE
//    (parseQuick() l'applique via cap(), cf. js/nlp.js).
call('cap à la saisie', () => {
  win.go('tasks');
  win.document.getElementById('cap-input-tasks').value = 'trier les papiers';
  win.commitCapture();
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

// 6 ter) Écran « Aujourd'hui » (Lot V1-5) : l'algorithme de la roadmap §6. C'est
// l'écran qu'il est cher de rater, donc la répartition des blocs est testée
// directement sur todayBuckets(), pas seulement par ricochet via le rendu.
const DEFAUT_TACHE = {
  title: 'x', notes: '', cat: 'perso', room: null, bucket: 'anytime',
  start: null, due: null, evening: false, prio: 0, effort: 2,
  repeat: null, history: [], doneAt: null, postponed: 0,
};
const mk = o => {
  const t = win.stamp(Object.assign({}, DEFAUT_TACHE, {touchedAt: Date.now()}, o));
  S.tasks.push(t);
  return t;
};
const has = (list, t) => list.some(x => x.id === t.id);
// Chaque scénario part d'une ardoise vide puis rend les tâches préexistantes.
const scenario = (label, build) => call(label, () => {
  const backup = S.tasks.slice();
  S.tasks.length = 0;
  try{ build(); } finally { S.tasks.length = 0; backup.forEach(t => S.tasks.push(t)); }
});

scenario('Aujourd’hui — répartition des blocs, aucun item dans deux blocs à la fois', () => {
  const today = win.todayKey();
  const retard = mk({title: 'Retard', bucket: 'scheduled', due: win.addDays(today, -3)});
  const debut  = mk({title: 'Début passé', bucket: 'scheduled', start: win.addDays(today, -2)});
  const soir   = mk({title: 'Soir', bucket: 'scheduled', start: today, evening: true});
  const court  = mk({title: 'Court', bucket: 'anytime', effort: 1});
  const peut   = mk({title: 'Peut-être court', bucket: 'someday', effort: 1});
  const futur  = mk({title: 'Futur', bucket: 'scheduled', start: win.addDays(today, 3)});
  const b = win.todayBuckets();

  if(!has(b.overdue, retard)) throw new Error('une échéance dépassée doit occuper le bloc 1');
  if(has(b.scheduled, retard)) throw new Error('une échéance dépassée ne doit pas être AUSSI dans le bloc du jour');
  // La règle qui empêche le mur de honte (ROADMAP §6.1).
  if(!has(b.scheduled, debut)) throw new Error('un start passé doit simplement remonter dans le bloc du jour');
  if(has(b.overdue, debut)) throw new Error('un start passé ne doit JAMAIS produire une échéance dépassée');
  if(!has(b.evening, soir)) throw new Error('une tâche « ce soir » doit aller dans son bloc');
  if(has(b.scheduled, soir)) throw new Error('une tâche « ce soir » ne doit pas être aussi dans le bloc du jour');
  if(!has(b.quick, court)) throw new Error('une tâche anytime à effort court doit être proposée');
  if(has(b.quick, peut)) throw new Error('« si tu as 10 minutes » ne doit JAMAIS proposer du someday');
  if(has(b.scheduled, futur)) throw new Error('une tâche à venir n’a rien à faire dans le bloc du jour');

  // Pastille iOS : ce qui reste dû. L'offre « 10 minutes » n'en fait pas partie.
  if(win.todayBadgeCount() !== 3)
    throw new Error('pastille attendue à 3 (retard + jour + soir), obtenue ' + win.todayBadgeCount());
});

scenario('Aujourd’hui — entretien : seules les jauges basses remontent, au plus 3', () => {
  const rep = {kind: 'day', n: 10, days: [], from: 'done'};
  const frais = mk({title: 'Frais', room: 'salon', repeat: rep, doneAt: Date.now()});
  const bas = mk({title: 'Bas', room: 'salon', repeat: rep, doneAt: Date.now() - 9 * 86400000});
  const b = win.todayBuckets();
  if(b.soins.some(x => x.t.id === frais.id))
    throw new Error('un entretien encore frais ne doit pas encombrer Aujourd’hui — sinon l’écran ne sait jamais dire « c’est bon »');
  if(!b.soins.some(x => x.t.id === bas.id)) throw new Error('un entretien proche d’« à faire » doit remonter');
  if(b.soins.length > 3) throw new Error('au plus 3 entretiens (ROADMAP §6.3)');
  // Un entretien vit dans son bloc, jamais dans la liste des tâches du jour.
  if(has(b.scheduled, bas) || has(b.overdue, bas)) throw new Error('un entretien ne doit pas fuiter dans les blocs de tâches');
});

scenario('Aujourd’hui — cochée dans la session : elle reste barrée et sort des blocs ouverts', () => {
  const t = mk({title: 'À cocher', bucket: 'scheduled', start: win.todayKey()});
  win.go('today');
  win.todayDone(t.id);
  const b = win.todayBuckets();
  if(has(b.scheduled, t)) throw new Error('une tâche cochée ne doit plus compter comme à faire');
  if(!has(b.done, t)) throw new Error('une tâche cochée doit rester posée, barrée, jusqu’au prochain démarrage');
  if(win.document.querySelectorAll('#s-today .row.done').length !== 1)
    throw new Error('la ligne cochée devrait être rendue barrée');
});

scenario('Aujourd’hui — état vide : il le dit, et ne propose RIEN d’autre (principe 6)', () => {
  // Un entretien encore frais et une tâche « peut-être » : ni l'un ni l'autre
  // ne doit servir de prétexte à remplir l'écran.
  mk({title: 'Frais', room: 'salon', repeat: {kind: 'day', n: 10, days: [], from: 'done'}, doneAt: Date.now()});
  mk({title: 'Pas mûr', bucket: 'someday', effort: 1});
  win.go('today');
  const el = win.document.getElementById('s-today');
  if(!/C’est bon pour aujourd’hui\./.test(el.textContent)) throw new Error('l’état vide devrait le dire clairement');
  // Le prénom s'y invite aussi (arbitrage §3.6), et rien de plus : ni
  // récapitulatif nommé, ni emoji.
  const nomAvant = S.settings.userName;
  S.settings.userName = 'Florian';
  win.go('today');
  const elP = win.document.getElementById('s-today');
  if(!/C’est bon pour aujourd’hui, Florian\./.test(elP.textContent))
    throw new Error('l’état vide devrait se personnaliser, obtenu : ' + elP.querySelector('.empty-title').textContent);
  if(elP.querySelectorAll('.check, .more, .row').length)
    throw new Error('l’état vide personnalisé ne gagne aucune cible tactile');
  S.settings.userName = nomAvant;
  win.go('today');
  if(/10 minutes|Entretien|Pas mûr|Frais/.test(el.textContent)) throw new Error('l’état vide ne doit rien proposer d’autre');
  if(el.querySelectorAll('.check, .more, .row').length)
    throw new Error('aucune cible tactile hors navigation sur l’état vide');
  if(el.querySelectorAll('.bird').length !== 1) throw new Error('l’état vide garde son oiseau, un seul');
  if(win.todayBadgeCount() !== 0) throw new Error('pastille à 0 quand tout est fait');
});

scenario('Aujourd’hui — plafond todayCap et « + N autres »', () => {
  const today = win.todayKey();
  S.settings.todayCap = 2;
  for(let i = 0; i < 5; i++) mk({title: 'Tâche ' + i, bucket: 'scheduled', start: today});
  win.go('today');
  const el = win.document.getElementById('s-today');
  if(el.querySelectorAll('.list-page .row').length !== 2)
    throw new Error('le plafond todayCap devrait limiter la liste à 2, obtenu ' + el.querySelectorAll('.list-page .row').length);
  const more = el.querySelector('.more');
  if(!more || !/\+ 3 autres/.test(more.textContent)) throw new Error('« + 3 autres » attendu sous la liste plafonnée');
  win.toggleTodayMore();
  if(win.document.querySelectorAll('#s-today .list-page .row').length !== 5)
    throw new Error('déplier devrait montrer les 5 tâches');
  win.toggleTodayMore();
  S.settings.todayCap = 7;
});

// 6 quinquies) Lot V2-3 — les trois décisions de l'écran « Aujourd'hui » v3.
// todayShown() est PURE (une liste d'entrées, un plafond) : on l'attaque
// directement, sans DOM ni plantes réelles, exactement comme parseQuick().
call('Aujourd’hui — réserve de places pour les soins sous le plafond (audit B3, todayShown())', () => {
  const mixte = (nt, ns) => {
    const a = [];
    for(let i = 0; i < nt; i++) a.push({id: 't' + i, kind: 'task'});
    for(let i = 0; i < ns; i++) a.push({id: 's' + i, kind: 'soin'});
    return a; // l'ordre de todayBuckets() : les soins CONCATÉNÉS après les tâches
  };
  const soins = l => l.filter(e => e.kind === 'soin').length;

  // Le cas exact de l'audit du 14/08/2026 : 7 tâches, 4 soins dus, plafond à 7.
  // En V1, les QUATRE soins tombaient dans « + 4 autres ».
  const a = win.todayShown(mixte(7, 4), 7);
  if(a.length !== 7) throw new Error('le plafond reste un plafond : 7 lignes attendues, obtenu ' + a.length);
  if(soins(a) !== 3) throw new Error('3 places réservées aux soins attendues, obtenu ' + soins(a));
  if(a[0].kind !== 'soin') throw new Error('les soins prennent la tête du bloc, pas la queue de la file');

  // La réserve est un minimum garanti, pas un maximum : sans tâche, tous passent.
  if(win.todayShown(mixte(0, 5), 7).length !== 5)
    throw new Error('5 soins et aucune tâche : les 5 doivent passer');
  // Elle ne prend jamais plus qu'il n'y a de soins dus.
  const b = win.todayShown(mixte(10, 1), 7);
  if(b.length !== 7 || soins(b) !== 1) throw new Error('un seul soin dû : une seule place réservée');
  if(b[0].kind !== 'soin') throw new Error('ce soin unique doit rester en tête');
  // Plafond serré : la réserve ne mange jamais plus de la moitié des places.
  const c = win.todayShown(mixte(3, 4), 2);
  if(c.length !== 2 || soins(c) !== 1)
    throw new Error('un plafond à 2 doit rester partagé, obtenu ' + c.map(e => e.kind).join(','));
  // Aucun soin dû : le plafond se comporte exactement comme en V1.
  if(win.todayShown(mixte(9, 0), 7).length !== 7)
    throw new Error('sans soin, rien ne doit changer par rapport à la V1');
  // Déplié (plafond = total), l'ordre ne bouge pas : les soins restent en tête.
  // Sans ça, taper « + 4 autres » les renvoyait en queue de liste.
  const d = win.todayShown(mixte(7, 4), 11);
  if(d.length !== 11) throw new Error('déplié, les 11 entrées doivent être montrées');
  if(d.slice(0, 4).some(e => e.kind !== 'soin'))
    throw new Error('déplier ne doit pas renvoyer les soins en queue de liste');
});

scenario('Aujourd’hui — cocher est annulable, et une ligne cochée se décoche (audit A2)', () => {
  const today = win.todayKey();
  const t = mk({title: 'Relever le compteur', bucket: 'scheduled', start: today, due: today,
    repeat: {kind: 'day', n: 3, days: [], from: 'due'}});
  win.go('today');
  const dueAvant = t.due;
  // Longueur relative : DEFAUT_TACHE.history est un tableau partagé par tous
  // les mk() de ce fichier, un scénario antérieur a pu y pousser.
  const histAvant = (t.history || []).length;
  win.todayDone(t.id);
  if(t.due === dueAvant) throw new Error('une tâche récurrente cochée doit voir son échéance avancer');
  if((t.history || []).length !== histAvant + 1) throw new Error('cocher doit historiser la réalisation');

  // La case de la ligne barrée n'est plus morte : c'est tout le sujet de A2.
  const check = win.document.querySelector('#s-today .row.done .check');
  if(!check) throw new Error('la ligne cochée devrait être rendue barrée');
  if(check.disabled) throw new Error('la case d’une ligne cochée ne doit plus être disabled (audit A2)');
  if(check.getAttribute('aria-label') !== 'Marquer non fait')
    throw new Error('la case devrait s’annoncer comme un décochage, obtenu ' + check.getAttribute('aria-label'));

  // Le toast porte l'annulation immédiate, et elle restitue l'état d'AVANT —
  // pas l'échéance suivante, pas une réalisation de trop dans l'historique.
  if(!/Annuler/.test(win.document.getElementById('toast').textContent))
    throw new Error('cocher devrait offrir « Annuler » (undoable(), Lot V2-1)');
  win._runToastAct();
  if(t.due !== dueAvant) throw new Error('annuler doit restituer l’échéance d’avant, pas la suivante');
  if((t.history || []).length !== histAvant) throw new Error('annuler doit retirer la réalisation de l’historique');
  let b = win.todayBuckets();
  if(!has(b.scheduled, t)) throw new Error('la tâche annulée doit redevenir à faire');
  if(has(b.done, t)) throw new Error('la tâche annulée ne doit plus figurer parmi les cochées');

  // Plus tard dans la journée : le décochage passe par la case elle-même.
  win.todayDone(t.id);
  win.document.querySelector('#s-today .row.done .check').click();
  if(t.due !== dueAvant) throw new Error('décocher à la case doit restituer l’échéance d’avant');
  b = win.todayBuckets();
  if(has(b.done, t) || !has(b.scheduled, t)) throw new Error('décocher à la case doit rendre la tâche à faire');
});

call('Aujourd’hui — le prénom entre dans le sur-titre, et seulement s’il y en a un (audit C1, §3.6)', () => {
  const avant = S.settings.userName;
  S.settings.userName = null;
  if(win.todayOverline() !== win.longDate())
    throw new Error('sans prénom, le sur-titre est la date seule');
  S.settings.userName = 'Florian';
  if(win.todayOverline() !== 'Bonjour Florian · ' + win.longDate())
    throw new Error('avec prénom : « Bonjour Florian · <date> », obtenu ' + win.todayOverline());
  win.go('today');
  if(!new RegExp('Bonjour Florian · ').test(win.document.querySelector('#s-today .head-over').textContent))
    throw new Error('le sur-titre rendu devrait porter le prénom');
  S.settings.userName = '   '; // blanc : traité comme absent, jamais un « Bonjour » orphelin
  if(win.todayOverline() !== win.longDate())
    throw new Error('un prénom blanc ne doit produire ni « Bonjour » orphelin ni virgule qui pend');
  S.settings.userName = avant;
});

// 6 quater) parseQuick() (Lot V1-6, js/nlp.js) : le parseur est une fonction
// PURE, testée directement sans passer par le DOM ni par S. Date de
// référence fixe (lundi 27 juillet 2026) pour des attentes reproductibles.
const NLP_REF = new Date(2026, 6, 27, 9, 0, 0);
const nlpCases = [
  ['aujourd’hui — start', "Réunion aujourd'hui", r => {
    if(r.start !== '2026-07-27') throw new Error('start attendu 2026-07-27, obtenu ' + r.start);
    if(r.title !== 'Réunion') throw new Error('titre attendu « Réunion », obtenu « ' + r.title + ' »');
  }],
  ['ce soir — start + evening', 'Appeler le médecin ce soir', r => {
    if(r.start !== '2026-07-27' || !r.evening) throw new Error('« ce soir » devrait poser start=aujourd’hui et evening=true');
  }],
  ['demain — start', 'Rendre le livre demain', r => {
    if(r.start !== '2026-07-28') throw new Error('start attendu 2026-07-28, obtenu ' + r.start);
  }],
  ['demain soir — start + evening', 'Dîner demain soir', r => {
    if(r.start !== '2026-07-28' || !r.evening) throw new Error('« demain soir » devrait poser start=demain et evening=true');
  }],
  ['après-demain — start', 'Rendez-vous après-demain', r => {
    if(r.start !== '2026-07-29') throw new Error('start attendu 2026-07-29, obtenu ' + r.start);
  }],
  ['lundi (bare, un lundi) — occurrence en cours', 'Sport lundi', r => {
    if(r.start !== '2026-07-27') throw new Error('« lundi » un lundi devrait rester aujourd’hui, obtenu ' + r.start);
  }],
  ['lundi prochain — saute la semaine en cours', 'Sport lundi prochain', r => {
    if(r.start !== '2026-08-03') throw new Error('start attendu 2026-08-03, obtenu ' + r.start);
  }],
  ['vendredi (bare)', 'Pot de départ vendredi', r => {
    if(r.start !== '2026-07-31') throw new Error('start attendu 2026-07-31, obtenu ' + r.start);
  }],
  ['dimanche (bare)', 'Marché dimanche', r => {
    if(r.start !== '2026-08-02') throw new Error('start attendu 2026-08-02, obtenu ' + r.start);
  }],
  ['la semaine prochaine', 'Bilan la semaine prochaine', r => {
    if(r.start !== '2026-08-03') throw new Error('start attendu 2026-08-03, obtenu ' + r.start);
  }],
  ['le mois prochain', 'Révision le mois prochain', r => {
    if(r.start !== '2026-08-27') throw new Error('start attendu 2026-08-27, obtenu ' + r.start);
  }],
  ['dans 3 jours', 'Relancer dans 3 jours', r => {
    if(r.start !== '2026-07-30') throw new Error('start attendu 2026-07-30, obtenu ' + r.start);
  }],
  ['dans 2 semaines', 'Contrôle dans 2 semaines', r => {
    if(r.start !== '2026-08-10') throw new Error('start attendu 2026-08-10, obtenu ' + r.start);
  }],
  ['dans un mois', 'Suivi dans un mois', r => {
    if(r.start !== '2026-08-27') throw new Error('start attendu 2026-08-27, obtenu ' + r.start);
  }],
  ['le 15 (jour déjà passé ce mois-ci → mois suivant)', 'Loyer le 15', r => {
    if(r.start !== '2026-08-15') throw new Error('start attendu 2026-08-15, obtenu ' + r.start);
  }],
  ['le 30 (jour encore à venir ce mois-ci)', 'Anniversaire le 30', r => {
    if(r.start !== '2026-07-30') throw new Error('start attendu 2026-07-30, obtenu ' + r.start);
  }],
  ['le 15 mai (mois déjà passé → année suivante)', 'Impôts le 15 mai', r => {
    if(r.start !== '2027-05-15') throw new Error('start attendu 2027-05-15, obtenu ' + r.start);
    if(r.title !== 'Impôts') throw new Error('titre attendu « Impôts », obtenu « ' + r.title + ' »');
  }],
  ['15/05 (numérique, sans année)', 'Salon 15/05', r => {
    if(r.start !== '2027-05-15') throw new Error('start attendu 2027-05-15, obtenu ' + r.start);
  }],
  ['15/05/27 (numérique, année à 2 chiffres)', 'Salon 15/05/27', r => {
    if(r.start !== '2027-05-15') throw new Error('start attendu 2027-05-15, obtenu ' + r.start);
  }],
  ['avant le 15 — due, pas start', 'Dossier avant le 15', r => {
    if(r.due !== '2026-08-15') throw new Error('due attendu 2026-08-15, obtenu ' + r.due);
    if(r.start !== null) throw new Error('« avant le » ne doit pas poser de start');
  }],
  ['pour le 15 — due', 'Rapport pour le 15', r => {
    if(r.due !== '2026-08-15') throw new Error('due attendu 2026-08-15, obtenu ' + r.due);
  }],
  ['deadline 15/05 — due, numérique', 'Facture deadline 15/05', r => {
    if(r.due !== '2027-05-15') throw new Error('due attendu 2027-05-15, obtenu ' + r.due);
  }],
  ['tous les jours', 'Arroser tous les jours', r => {
    if(!r.repeat || r.repeat.kind !== 'day' || r.repeat.n !== 1 || r.repeat.from !== 'due')
      throw new Error('repeat attendu {day,1,due}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['chaque jour', 'Arroser chaque jour', r => {
    if(!r.repeat || r.repeat.kind !== 'day' || r.repeat.n !== 1) throw new Error('repeat attendu {day,1}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les 3 jours — à date fixe par défaut', 'Vérifier tous les 3 jours', r => {
    if(!r.repeat || r.repeat.kind !== 'day' || r.repeat.n !== 3 || r.repeat.from !== 'due')
      throw new Error('repeat attendu {day,3,due}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les 3 jours après — from:done', 'Arroser le ficus tous les 3 jours après', r => {
    if(!r.repeat || r.repeat.from !== 'done' || r.repeat.n !== 3) throw new Error('repeat attendu from:done n:3, obtenu ' + JSON.stringify(r.repeat));
    if(r.title !== 'Arroser le ficus') throw new Error('titre attendu « Arroser le ficus », obtenu « ' + r.title + ' »');
  }],
  ['tous les 7 jours après réalisation', 'Aspirateur tous les 7 jours après réalisation', r => {
    if(!r.repeat || r.repeat.from !== 'done' || r.repeat.n !== 7) throw new Error('repeat attendu from:done n:7, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les 7 jours après la dernière fois', 'Aspirateur tous les 7 jours après la dernière fois', r => {
    if(!r.repeat || r.repeat.from !== 'done' || r.repeat.n !== 7) throw new Error('repeat attendu from:done n:7, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['toutes les semaines', 'Poubelles toutes les semaines', r => {
    if(!r.repeat || r.repeat.kind !== 'week' || r.repeat.n !== 1 || r.repeat.days.length)
      throw new Error('repeat attendu {week,1,sans jours}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les lundis — jour fixe', 'Sport tous les lundis', r => {
    if(!r.repeat || r.repeat.kind !== 'week' || JSON.stringify(r.repeat.days) !== '[1]')
      throw new Error('repeat attendu {week,days:[1]}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les vendredis après — jour fixe + from:done', 'Vidage tous les vendredis après', r => {
    if(!r.repeat || JSON.stringify(r.repeat.days) !== '[5]' || r.repeat.from !== 'done')
      throw new Error('repeat attendu {days:[5],from:done}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les 15 du mois', 'Ménage tous les 15 du mois', r => {
    if(!r.repeat || r.repeat.kind !== 'month' || r.repeat.n !== 1) throw new Error('repeat attendu {month,1}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les 2 mois', 'Filtre tous les 2 mois', r => {
    if(!r.repeat || r.repeat.kind !== 'month' || r.repeat.n !== 2) throw new Error('repeat attendu {month,2}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['tous les ans', 'Détartrage tous les ans', r => {
    if(!r.repeat || r.repeat.kind !== 'year' || r.repeat.n !== 1) throw new Error('repeat attendu {year,1}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['chaque année', 'Révision chaque année', r => {
    if(!r.repeat || r.repeat.kind !== 'year' || r.repeat.n !== 1) throw new Error('repeat attendu {year,1}, obtenu ' + JSON.stringify(r.repeat));
  }],
  ['!! → urgent', 'Payer le loyer !!', r => {
    if(r.prio !== 2) throw new Error('prio attendue 2, obtenue ' + r.prio);
    if(/!/.test(r.title)) throw new Error('les « ! » ne doivent pas rester dans le titre, obtenu « ' + r.title + ' »');
  }],
  ['urgent (mot) → prio 2', 'Payer le loyer urgent', r => {
    if(r.prio !== 2) throw new Error('prio attendue 2, obtenue ' + r.prio);
  }],
  ['! → important', 'Relire le contrat !', r => {
    if(r.prio !== 1) throw new Error('prio attendue 1, obtenue ' + r.prio);
  }],
  ['important (mot) → prio 1', 'Relire le contrat important', r => {
    if(r.prio !== 1) throw new Error('prio attendue 1, obtenue ' + r.prio);
  }],
  ['5 min → effort court', 'Vider le lave-vaisselle 5 min', r => {
    if(r.effort !== 1) throw new Error('effort attendu 1, obtenu ' + r.effort);
  }],
  ['10 min → effort court', 'Trier le courrier 10 min', r => {
    if(r.effort !== 1) throw new Error('effort attendu 1, obtenu ' + r.effort);
  }],
  ['court (mot) → effort 1', 'Sortir les poubelles court', r => {
    if(r.effort !== 1) throw new Error('effort attendu 1, obtenu ' + r.effort);
  }],
  ['1 h → effort long', 'Ranger le garage 1 h', r => {
    if(r.effort !== 3) throw new Error('effort attendu 3, obtenu ' + r.effort);
  }],
  ['long (mot) → effort 3', 'Faire les comptes long', r => {
    if(r.effort !== 3) throw new Error('effort attendu 3, obtenu ' + r.effort);
  }],
  ['#admin → catégorie', 'Déclaration #admin', r => {
    if(r.cat !== 'admin') throw new Error('cat attendue admin, obtenue ' + r.cat);
    if(/#/.test(r.title)) throw new Error('le dièse ne doit pas rester dans le titre, obtenu « ' + r.title + ' »');
  }],
  ['#menage → catégorie', 'Corvée #menage', r => {
    if(r.cat !== 'menage') throw new Error('cat attendue menage, obtenue ' + r.cat);
  }],
  ['#cuisine → pièce', 'Nettoyer #cuisine', r => {
    if(r.room !== 'cuisine') throw new Error('room attendue cuisine, obtenue ' + r.room);
  }],
  ['#salon → pièce', 'Ranger #salon', r => {
    if(r.room !== 'salon') throw new Error('room attendue salon, obtenue ' + r.room);
  }],
  ['combinaison — date + soir, titre nettoyé', 'Courses demain soir', r => {
    if(r.start !== '2026-07-28' || !r.evening) throw new Error('start/evening incorrects : ' + JSON.stringify(r));
    if(r.title !== 'Courses') throw new Error('titre attendu « Courses », obtenu « ' + r.title + ' »');
  }],
  ['combinaison — pièce + priorité + date, titre nettoyé', 'Réunion #cuisine urgent demain', r => {
    if(r.room !== 'cuisine' || r.prio !== 2 || r.start !== '2026-07-28') throw new Error('combinaison incorrecte : ' + JSON.stringify(r));
    if(r.title !== 'Réunion') throw new Error('titre attendu « Réunion », obtenu « ' + r.title + ' »');
  }],
  ['ponctuation collée — « avant le 5, !! » reste reconnu', 'Payer le loyer avant le 5, !!', r => {
    if(r.due !== '2026-08-05') throw new Error('due attendu 2026-08-05, obtenu ' + r.due);
    if(r.prio !== 2) throw new Error('prio attendue 2, obtenue ' + r.prio);
    if(r.title !== 'Payer le loyer') throw new Error('titre attendu « Payer le loyer », obtenu « ' + r.title + ' »');
  }],
  ['ponctuation non liée à une règle — la virgule reste dans le titre', 'Acheter du lait, du pain', r => {
    if(r.title !== 'Acheter du lait, du pain') throw new Error('titre attendu « Acheter du lait, du pain », obtenu « ' + r.title + ' »');
  }],
  ['rien de reconnu — le titre reste intact, casse posée à la saisie', 'acheter du lait', r => {
    if(r.title !== 'Acheter du lait') throw new Error('titre attendu « Acheter du lait », obtenu « ' + r.title + ' »');
    if(r.start || r.due || r.repeat || r.cat || r.room || r.prio || r.effort !== 2) throw new Error('aucun champ ne devrait être déduit ici : ' + JSON.stringify(r));
  }],
];
nlpCases.forEach(([label, texte, check]) => {
  call('parseQuick — ' + label, () => check(win.parseQuick(texte, NLP_REF)));
});

// Mécanisme d'ignorance (barre de capture, js/nlp.js) : une puce retirée
// désactive sa règle SANS ré-interpréter le fragment — le mot revient donc
// tel quel dans le titre.
call("parseQuick — ignore('date') rend le mot au titre", () => {
  const avec = win.parseQuick('Réunion demain', NLP_REF);
  if(avec.start !== '2026-07-28') throw new Error('sans ignore, « demain » devrait poser un start');
  const sans = win.parseQuick('Réunion demain', NLP_REF, ['date']);
  if(sans.start !== null) throw new Error("ignore('date') devrait annuler le start");
  if(sans.title !== 'Réunion demain') throw new Error('le mot « demain » devrait revenir dans le titre, obtenu « ' + sans.title + ' »');
});
call("parseQuick — ignore('repeat') rend le fragment au titre", () => {
  const sans = win.parseQuick('Arroser tous les 3 jours après', NLP_REF, ['repeat']);
  if(sans.repeat !== null) throw new Error("ignore('repeat') devrait annuler la récurrence");
  if(!/tous les 3 jours après/i.test(sans.title)) throw new Error('le fragment de récurrence devrait revenir dans le titre, obtenu « ' + sans.title + ' »');
});

// 6 quinquies) Plantes (Lot V1-7, js/plants.js) : modulation saisonnière et
// réutilisation du moteur de récurrence (js/recur.js) sans le dupliquer.
call('Plantes — plantSeason() suit settings.coldFrom/coldTo, y compris le bouclage sur l’année', () => {
  S.settings.coldFrom = 10; S.settings.coldTo = 2;
  if(win.plantSeason(new Date(2026, 0, 15)) !== 'cold') throw new Error('janvier devrait être en saison froide');
  if(win.plantSeason(new Date(2026, 6, 15)) !== 'warm') throw new Error('juillet devrait être en saison chaude');
  if(win.plantSeason(new Date(2026, 9, 15)) !== 'cold') throw new Error('octobre (coldFrom) devrait déjà être froid');
  if(win.plantSeason(new Date(2026, 1, 28)) !== 'cold') throw new Error('février (coldTo) devrait encore être froid');
});
call('Plantes — careFreshness() : cold:0 suspend le soin (null), jamais une jauge', () => {
  if(win.careFreshness({warm:7, cold:0, lastAt:Date.now()}, 'cold') !== null)
    throw new Error('un soin à cold:0 doit être suspendu (null) en saison froide');
  const f = win.careFreshness({warm:7, cold:14, lastAt:Date.now()}, 'cold');
  if(f === null || Math.abs(f - 1) > 0.01) throw new Error('un soin tout juste fait doit être ~1, obtenu ' + f);
});

let plantId;
call('Plantes — création, soin traduit en tâche pour recur.js, historique', () => {
  const p = win.stamp({
    name: 'Ficus du salon', species: 'ficus_lyrata', room: 'salon', photoId: null,
    care: {
      water: {warm: 7, cold: 14, lastAt: Date.now() - 5000, history: []},
      feed: {warm: 30, cold: 0, lastAt: null, history: []},
      repot: {months: 24, lastAt: null}
    },
    notes: '', sort: 0
  });
  S.plants.push(p);
  plantId = p.id;
  // getPlantCareItems() déduit la saison de la date réelle (plantSeason() sans
  // ref) : on force la saison froide via les réglages, indépendamment de la
  // date du jour où tourne le test, pour vérifier la suspension de l'engrais.
  S.settings.coldFrom = 1; S.settings.coldTo = 12;
  const items = win.getPlantCareItems();
  S.settings.coldFrom = 10; S.settings.coldTo = 2;
  const water = items.find(x => x.id === p.id + '-water');
  if(!water) throw new Error('le soin arrosage devrait apparaître dans getPlantCareItems()');
  if(water.title !== 'Ficus du salon (arrosage)') throw new Error('titre du soin incorrect : ' + water.title);
  if(items.some(x => x.id === p.id + '-feed'))
    throw new Error('l’engrais suspendu en saison froide (cold:0) ne doit jamais être proposé');
  if(!items.some(x => x.id === p.id + '-repot')) throw new Error('le rempotage devrait aussi apparaître');
  const before = p.care.water.lastAt;
  win.doPlantCare(p.id, 'water');
  if(p.care.water.lastAt <= before) throw new Error('doPlantCare devrait rafraîchir lastAt');
  if(p.care.water.history.length !== 1) throw new Error('doPlantCare devrait historiser l’arrosage (recur.js completeTask)');
});

call('Maison — les soins de plante rejoignent la vue par pièce, à côté de l’entretien', () => {
  win.go('maison');
  const html = win.document.getElementById('s-maison').innerHTML;
  if(!html.includes('Ficus du salon (arrosage)'))
    throw new Error('le soin d’arrosage du Ficus devrait apparaître dans la vue Maison');
  if(!/plantSheet\('/.test(html)) throw new Error('un tap sur une plante devrait ouvrir sa fiche (plantSheet), pas la compléter directement');
});

call('Aujourd’hui — un soin de plante vraiment dû rejoint le bloc du jour, jamais le bloc Entretien', () => {
  const p = S.plants.find(x => x.id === plantId);
  const savedLastAt = p.care.water.lastAt;
  p.care.water.lastAt = Date.now() - 30 * 86400000; // très en retard : jauge à 0
  const b = win.todayBuckets();
  const entry = b.scheduled.find(x => x.id === plantId + '-water');
  if(!entry || entry.kind !== 'soin') throw new Error('le soin d’arrosage dû devrait rejoindre le bloc du jour (kind:"soin")');
  if(b.soins.some(x => x.t && x.t.id === plantId + '-water'))
    throw new Error('un soin de plante ne doit jamais fuiter dans le bloc Entretien, réservé aux tâches from:done');
  win.go('today');
  const el = win.document.getElementById('s-today');
  if(!/Ficus du salon \(arrosage\)/.test(el.textContent))
    throw new Error('le soin dû devrait être rendu dans le bloc « Aujourd’hui »');
  p.care.water.lastAt = savedLastAt; // remis à l'état frais pour ne pas polluer les autres scénarios
});

// 6 sexies) Habitudes (Lot V1-8, js/habits.js) : moteur de série/quota — JAMAIS
// une jauge de fraîcheur (CONVENTIONS.md §6, frontière entretien/habitude).
// Chaque scénario part d'une ardoise vide (habits + habitLog) et restaure
// derrière lui, comme scenario() le fait pour S.tasks.
const habitScenario = (label, build) => call(label, () => {
  const backupH = S.habits.slice(), backupLog = S.habitLog;
  S.habits.length = 0; S.habitLog = {};
  try{ build(); } finally { S.habits.length = 0; backupH.forEach(h => S.habits.push(h)); S.habitLog = backupLog; }
});

habitScenario('isoDow / habitActiveOn — jours fixes n’activent que leurs jours, le quota n’importe lequel', () => {
  if(win.isoDow('2026-07-27') !== 1) throw new Error('27/07/2026 est un lundi, isoDow devrait valoir 1');
  if(win.isoDow('2026-08-02') !== 7) throw new Error('02/08/2026 est un dimanche, isoDow devrait valoir 7');
  const h = {sched: {kind: 'days', days: [1, 3]}};
  if(!win.habitActiveOn(h, '2026-07-27')) throw new Error('lundi devrait être actif (jours [1,3])');
  if(win.habitActiveOn(h, '2026-07-28')) throw new Error('mardi ne devrait pas être actif (jours [1,3])');
  const q = {sched: {kind: 'week', perWeek: 3}};
  if(!win.habitActiveOn(q, '2026-07-28')) throw new Error('mode quota : actionnable n’importe quel jour');
});

habitScenario('Habitudes — jour sauté : neutre, ne casse ni n’alimente la série (point ㉑)', () => {
  const h = win.stamp({name: 'Lecture', unit: 'pages', target: 20, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  const today = win.todayKey();
  win.setHabitLogValue(h.id, 20, win.addDays(today, -2)); // avant-hier : atteint
  win.setHabitLogValue(h.id, 'skip', win.addDays(today, -1)); // hier : sauté
  win.setHabitLogValue(h.id, 20, today); // aujourd'hui : atteint
  const streak = win.habitStreak(h, today);
  // 2 réussites réelles (avant-hier, aujourd'hui) : le jour sauté entre les
  // deux ne les additionne pas à 3, il se contente de ne pas les séparer.
  if(streak !== 2) throw new Error('un jour sauté ne doit pas casser la série : attendu 2, obtenu ' + streak);
  if(win.habitReachedOn(h, win.addDays(today, -1))) throw new Error('un jour sauté n’est jamais une réussite');
});

habitScenario('Habitudes — progression partielle : ni échec ni réussite, seule l’atteinte alimente la série (point ㉓)', () => {
  const h = win.stamp({name: 'Eau', unit: 'L', target: 2, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  const today = win.todayKey();
  win.setHabitLogValue(h.id, 1, today); // 1 L sur 2 : partiel
  if(win.habitReachedOn(h, today)) throw new Error('1/2 ne devrait pas compter comme atteint');
  if(win.habitValueOn(h, today) !== 1) throw new Error('la valeur partielle devrait être conservée telle quelle, pas arrondie à 0 ou 1');
});

habitScenario('Habitudes — mode quota hebdomadaire : la série se compte en semaines, pas en jours (point ㉒)', () => {
  const h = win.stamp({name: 'Sport', unit: '', target: 1, sched: {kind: 'week', perWeek: 2}, sort: 0});
  S.habits.push(h);
  const today = win.todayKey();
  const ws = win.habitWeekStart(today);
  win.setHabitLogValue(h.id, 1, ws);               // semaine en cours : 2 jours distincts atteints
  win.setHabitLogValue(h.id, 1, win.addDays(ws, 1));
  if(win.habitWeekDone(h, ws) !== 2) throw new Error('2 jours atteints cette semaine, obtenu ' + win.habitWeekDone(h, ws));
  if(win.habitStreak(h, today) < 1) throw new Error('la semaine en cours, quota atteint, devrait compter dans la série');
  win.setHabitLogValue(h.id, 1, win.addDays(ws, -7)); // semaine précédente : 1 seul jour, quota non atteint
  if(win.habitStreak(h, today) !== 1)
    throw new Error('une semaine précédente sous le quota devrait arrêter la série à 1, obtenu ' + win.habitStreak(h, today));
});

habitScenario('Aujourd’hui — le bloc Habitudes rejoint todayBuckets(), jamais mêlé aux tâches ni à l’entretien', () => {
  const today = win.todayKey();
  const h = win.stamp({name: 'Lecture', unit: 'pages', target: 20, sched: {kind: 'days', days: [win.isoDow(today)]}, sort: 0});
  S.habits.push(h);
  const b = win.todayBuckets();
  if(!b.habits.some(x => x.id === h.id)) throw new Error('une habitude active aujourd’hui devrait apparaître dans todayBuckets().habits');
  if(b.scheduled.some(x => x.id === h.id) || b.soins.some(x => x.t && x.t.id === h.id))
    throw new Error('une habitude ne doit jamais fuiter dans les blocs de tâches ou d’entretien');
  if(win.todayBadgeCount() < 1) throw new Error('une habitude non atteinte devrait compter dans la pastille');
  win.go('today');
  const el = win.document.getElementById('s-today');
  if(!/Lecture/.test(el.textContent)) throw new Error('le bloc Habitudes devrait être rendu sur Aujourd’hui');
  if(!/Habitudes du jour/.test(el.textContent)) throw new Error('le titre du bloc devrait être « Habitudes du jour »');
});

// Isole aussi S.plants : le Ficus créé plus haut a un engrais/rempotage
// jamais fait (donc perpétuellement dus) qui polluerait sinon tout état vide
// calculé après ce point du fichier.
call('Aujourd’hui — état vide : une habitude non atteinte l’empêche, une déjà faite ne gêne plus (principe 6)', () => {
  const backupH = S.habits.slice(), backupLog = S.habitLog, backupP = S.plants.slice();
  S.habits.length = 0; S.habitLog = {}; S.plants.length = 0;
  try{
    const today = win.todayKey();
    const h = win.stamp({name: 'Lecture', unit: '', target: 1, sched: {kind: 'days', days: [win.isoDow(today)]}, sort: 0});
    S.habits.push(h);
    win.go('today');
    let el = win.document.getElementById('s-today');
    if(/C’est bon pour aujourd’hui\./.test(el.textContent))
      throw new Error('une habitude encore actionnable devrait empêcher l’état vide');
    win.setHabitLogValue(h.id, 1, today); // atteinte
    win.go('today');
    el = win.document.getElementById('s-today');
    if(!/C’est bon pour aujourd’hui\./.test(el.textContent))
      throw new Error('une habitude déjà atteinte aujourd’hui ne doit plus bloquer l’état vide');
  } finally {
    S.habits.length = 0; backupH.forEach(h => S.habits.push(h));
    S.habitLog = backupLog;
    S.plants.length = 0; backupP.forEach(p => S.plants.push(p));
  }
});

habitScenario('Habitudes — stepHabit()/skipHabit() écrivent dans habitLog ; changer d’avis après un saut reste possible', () => {
  const h = win.stamp({name: 'Verres d’eau', unit: 'L', target: 6, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  const today = win.todayKey();
  win.stepHabit(h.id, 1);
  if(win.habitValueOn(h, today) !== 1) throw new Error('stepHabit(+1) devrait poser la valeur à 1');
  win.stepHabit(h.id, -1);
  if(win.habitValueOn(h, today) !== 0) throw new Error('stepHabit(-1) devrait redescendre à 0');
  win.skipHabit(h.id);
  if(!win.habitSkippedOn(h, today)) throw new Error('skipHabit() devrait marquer le jour comme sauté');
  win.stepHabit(h.id, 1); // change d'avis : une habitude sautée reste actionnable
  if(win.habitSkippedOn(h, today)) throw new Error('reprendre après un saut devrait écraser le skip');
  if(win.habitValueOn(h, today) !== 1) throw new Error('la valeur devrait être posée après le changement d’avis');
});

// Lot V2-3 (audit B8) — la saisie du bloc du jour. habStep() est pure : on
// l'attaque directement, comme parseQuick() ou guessRayon().
call('Habitudes — habStep() : le pas s’adapte à l’objectif (audit B8)', () => {
  const h = (unit, target) => ({unit, target});
  if(win.habStep(h('', 1)) !== 1) throw new Error('coche simple : le pas vaut l’objectif');
  if(win.habStep(h('', 3)) !== 3) throw new Error('coche simple : un tap pose l’objectif, quel qu’il soit');
  if(win.habStep(h('L', 6)) !== 1) throw new Error('objectif ≤ 10 : pas de 1');
  if(win.habStep(h('pages', 20)) !== 5) throw new Error('objectif ≤ 25 : pas de 5');
  if(win.habStep(h('min', 30)) !== 10) throw new Error('objectif ≤ 60 : pas de 10');
  if(win.habStep(h('fois', 100)) !== 25) throw new Error('au-delà de 60 : pas de 25');
});

habitScenario('Habitudes — le pas ne saute jamais par-dessus l’objectif, « Fait » le pose en un geste', () => {
  const h = win.stamp({name: 'Marche', unit: 'min', target: 30, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  const k = win.todayKey();
  // Le cas de l'audit : 30 minutes de marche, trois taps au lieu du clavier.
  win.stepHabit(h.id, 1);
  if(win.habitValueOn(h, k) !== 10) throw new Error('un tap devrait poser 10, obtenu ' + win.habitValueOn(h, k));
  win.stepHabit(h.id, 1); win.stepHabit(h.id, 1);
  if(win.habitValueOn(h, k) !== 30) throw new Error('trois taps devraient poser exactement 30');
  // De 25 à 30 : le pas se rabat sur l'objectif, il ne le dépasse pas.
  win.setHabitLogValue(h.id, 25);
  win.stepHabit(h.id, 1);
  if(win.habitValueOn(h, k) !== 30) throw new Error('« +10 » depuis 25 devrait poser 30, pas 35');
  // Objectif franchi : le pas reprend sa valeur pleine (règle du Lot V1-8 —
  // on peut toujours boire un septième verre).
  win.stepHabit(h.id, 1);
  if(win.habitValueOn(h, k) !== 40) throw new Error('au-delà de l’objectif, le pas reprend sa valeur pleine');
  // « Fait » depuis zéro, et son annulation.
  win.setHabitLogValue(h.id, 0);
  win.reachHabit(h.id);
  if(win.habitValueOn(h, k) !== 30) throw new Error('« Fait » devrait poser l’objectif en un geste');
  if(!win.habitReachedOn(h, k)) throw new Error('« Fait » devrait marquer l’objectif atteint');
  if(!/Annuler/.test(win.document.getElementById('toast').textContent))
    throw new Error('« Fait » devrait être annulable (checklist V2 §6)');
  win._runToastAct();
  if(win.habitValueOn(h, k) !== 0) throw new Error('annuler « Fait » devrait revenir à la valeur d’avant');
});

habitScenario('Habitudes — bloc du jour : ligne de contrôles, et jamais « Sauter » avec les deux boutons d’ajout', () => {
  const h = win.stamp({name: 'Lecture', unit: 'pages', target: 20, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  win.go('today');
  let card = win.document.querySelector('#s-today .card.t-habitudes');
  if(!card) throw new Error('le bloc « Habitudes du jour » devrait être rendu');
  if(card.querySelector('.hab-num'))
    throw new Error('le champ numérique du Lot V1-8 ne doit plus exister (audit B8)');
  const plus = card.querySelector('.hab-ctrl .step.num');
  if(!plus || plus.textContent !== '+5')
    throw new Error('le bouton d’ajout devrait dire « +5 », obtenu ' + (plus && plus.textContent));
  const fait = card.querySelector('.hab-ctrl .step.wide');
  if(!fait || fait.textContent !== 'Fait') throw new Error('« Fait » devrait être posé dans la ligne de contrôles');
  // La règle du Lot V1-8, vérifiée par la structure : « Sauter » vit sur la
  // ligne du titre, jamais sur celle des deux boutons d'ajout.
  const head = card.querySelector('.row-head');
  if(!head || !head.querySelector('.skip')) throw new Error('« Sauter » devrait vivre sur la ligne du titre');
  if(card.querySelector('.hab-ctrl .skip'))
    throw new Error('jamais « Sauter » et deux boutons d’ajout sur la même ligne (règle du Lot V1-8)');
  // Une valeur posée : « Sauter » n'a plus de sens, « − » prend sa place.
  win.stepHabit(h.id, 1);
  card = win.document.querySelector('#s-today .card.t-habitudes');
  if(card.querySelector('.skip')) throw new Error('une habitude entamée ne propose plus de sauter la journée');
  if(card.querySelectorAll('.hab-ctrl .step').length !== 3)
    throw new Error('ligne de contrôles attendue à trois boutons (−, +5, Fait)');
  // Objectif atteint : la ligne retombe compacte (la carte rétrécit dans la journée).
  win.reachHabit(h.id);
  card = win.document.querySelector('#s-today .card.t-habitudes');
  if(card.querySelector('.hab-ctrl')) throw new Error('une habitude au quota doit retomber à la ligne compacte');
  if(!card.querySelector('.row-soft')) throw new Error('une habitude au quota reste posée, en retrait');
  if(!/6 \/ 6|20 \/ 20/.test(card.textContent))
    throw new Error('la ligne compacte reprend la valeur dans sa méta, obtenu : ' + card.textContent.trim());
});

habitScenario('Habitudes — une habitude sans unité dit « Fait », jamais « + » (audit B8)', () => {
  const h = win.stamp({name: 'Étirements', unit: '', target: 1, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  win.go('today');
  const card = win.document.querySelector('#s-today .card.t-habitudes');
  if(card.querySelector('.hab-ctrl'))
    throw new Error('une coche simple n’a rien à composer : pas de ligne de contrôles');
  const boutons = [...card.querySelectorAll('.step, .skip')].map(b => b.textContent);
  if(boutons.join('|') !== 'Sauter|Fait')
    throw new Error('attendu « Sauter » puis « Fait », obtenu ' + boutons.join('|'));
  win.reachHabit(h.id);
  if(!win.habitReachedOn(h, win.todayKey())) throw new Error('« Fait » devrait atteindre l’objectif d’une coche simple');
  const apres = win.document.querySelector('#s-today .card.t-habitudes');
  if(!apres.querySelector('.row-soft')) throw new Error('une coche simple faite passe en retrait');
  if([...apres.querySelectorAll('.step')].map(b => b.textContent).join('|') !== '−')
    throw new Error('une coche simple faite n’offre plus qu’un « − » pour se dédire');
});

// Fiche habitude (création/édition/suppression via l’UI, comme taskSheet/plantSheet) —
// synchrone, donc dans le helper call() standard.
call('Habitudes — fiche : création via l’UI, casse posée par cap(), tombstone à la suppression', () => {
  win.go('habits');
  win.habitSheet(null);
  const nameEl = win.document.getElementById('h-name');
  if(!nameEl) throw new Error('le champ nom devrait être présent à la création');
  nameEl.value = 'marche quotidienne';
  nameEl.dispatchEvent(new win.Event('input', {bubbles: true}));
  win.setHUnit('min');
  win.setHTarget('30');
  win.setHSchedKind('days');
  win.saveHabitSheet();
  const h = S.habits.find(x => x.name === 'Marche quotidienne');
  if(!h) throw new Error('l’habitude devrait être créée avec la casse posée par cap()');
  if(!h.id || !h.createdAt || !h.updatedAt || h.deletedAt !== null)
    throw new Error('la discipline synchro-ready (id/createdAt/updatedAt/deletedAt) devrait être respectée');
  if(h.unit !== 'min' || h.target !== 30) throw new Error('unité/objectif non enregistrés correctement');
  win.deleteHabit(h.id);
  win._runConfirm();
  if(!h.deletedAt) throw new Error('la suppression d’une habitude doit être un tombstone, jamais un splice()');
  if(!S.habits.some(x => x.id === h.id)) throw new Error('l’habitude supprimée doit rester dans le tableau (tombstone)');
});

// 6 septies) Courses (Lot V1-9, js/shopping.js) : classement automatique par
// rayon (guessRayon(), pure), fréquents, correction mémorisée, mode magasin
// et intégration au bloc 5 d'« Aujourd'hui ». Chaque scénario part d'une
// ardoise vide (shopping + frequents + réglages rayons) et restaure derrière
// lui, comme scenario()/habitScenario() le font pour leurs domaines.
const shopScenario = (label, build) => call(label, () => {
  const backupS = S.shopping.slice(), backupF = S.frequents.slice();
  const backupOrder = S.settings.rayonOrder.slice(), backupOv = Object.assign({}, S.settings.rayonOverrides);
  S.shopping.length = 0; S.frequents.length = 0;
  try{ build(); } finally {
    S.shopping.length = 0; backupS.forEach(it => S.shopping.push(it));
    S.frequents.length = 0; backupF.forEach(f => S.frequents.push(f));
    S.settings.rayonOrder = backupOrder;
    S.settings.rayonOverrides = backupOv;
  }
});

call('Courses — guessRayon() : clé exacte, mot dans un libellé plus long, casse et accents indifférents', () => {
  if(win.guessRayon('Lait') !== 'cremerie') throw new Error('« Lait » devrait tomber sur cremerie (clé exacte)');
  if(win.guessRayon('lait demi-écrémé') !== 'cremerie') throw new Error('« lait demi-écrémé » devrait tomber sur cremerie (mot « lait »)');
  if(win.guessRayon('LAIT') !== 'cremerie') throw new Error('« LAIT » devrait tomber sur cremerie, la casse ne doit rien changer');
  if(win.guessRayon('Pommes') !== 'fruits-legumes') throw new Error('le pluriel devrait rester reconnu');
  if(win.guessRayon('Papier toilette double épaisseur') !== 'hygiene')
    throw new Error('une clé à deux mots doit être trouvée au milieu d’un libellé plus long, obtenu ' + win.guessRayon('Papier toilette double épaisseur'));
  if(win.guessRayon('Truc bidule inconnu') !== null) throw new Error('un libellé absent du dictionnaire devrait rendre null (→ "autre" à l’ajout)');
});

shopScenario('Courses — addShoppingItem() : rayon deviné, discipline synchro-ready, tombe sur "autre" si inconnu', () => {
  const it = win.addShoppingItem('Yaourt nature');
  if(it.rayon !== 'cremerie') throw new Error('rayon attendu cremerie, obtenu ' + it.rayon);
  if(!it.id || !it.createdAt || !it.updatedAt || it.deletedAt !== null)
    throw new Error('addShoppingItem() devrait respecter la discipline synchro-ready (stamp())');
  if(it.done !== false) throw new Error('un article ajouté ne devrait pas être coché');
  const inconnu = win.addShoppingItem('Truc bidule inconnu');
  if(inconnu.rayon !== 'autre') throw new Error('un libellé non reconnu doit tomber sur "autre", obtenu ' + inconnu.rayon);
});

shopScenario('Courses — correction de rayon mémorisée pour ce libellé, pas à chaque ajout', () => {
  const it = win.addShoppingItem('Truc bidule maison');
  if(it.rayon !== 'autre') throw new Error('« Truc bidule maison » ne devrait pas être reconnu (attendu "autre"), obtenu ' + it.rayon);
  win.shopItemSheet(it.id);
  if(!win.document.getElementById('sh-label')) throw new Error('la fiche article devrait afficher un champ libellé');
  win.setShRayon('boisson');
  win.saveShopItemSheet();
  if(it.rayon !== 'boisson') throw new Error('la correction manuelle devrait s’appliquer immédiatement à l’article');
  const encore = win.addShoppingItem('Truc bidule maison');
  if(encore.rayon !== 'boisson')
    throw new Error('un nouvel ajout du même libellé devrait reprendre la correction mémorisée, obtenu ' + encore.rayon);
});

shopScenario('Courses — produits fréquents : ≥ 3 ajouts, pas avant, proposés en un tap', () => {
  win.addShoppingItem('Pain'); win.addShoppingItem('Pain');
  if(win.frequentShoppingItems().some(f => f.label === 'Pain'))
    throw new Error('2 ajouts ne devraient pas encore faire un fréquent (seuil à 3)');
  win.addShoppingItem('Pain');
  if(!win.frequentShoppingItems().some(f => f.label === 'Pain'))
    throw new Error('3 ajouts devraient faire apparaître « Pain » dans les fréquents');
  const before = S.shopping.length;
  const f = win.frequentShoppingItems().find(f => f.label === 'Pain');
  win.addFrequentShopItem(f.norm);
  if(S.shopping.length !== before + 1) throw new Error('un tap sur un fréquent devrait ajouter l’article directement');
});

shopScenario('Courses — cocher/décocher, vidage des cochés en tombstone (jamais automatique)', () => {
  const it = win.addShoppingItem('Beurre doux');
  win.toggleShopDone(it.id);
  if(!it.done) throw new Error('toggleShopDone() devrait cocher l’article');
  win.toggleShopDone(it.id);
  if(it.done) throw new Error('un second tap devrait décocher (erreur réversible, point 4)');
  win.toggleShopDone(it.id);
  win.clearCheckedShopping();
  win._runConfirm();
  if(!it.deletedAt) throw new Error('vider les cochés doit être un tombstone, jamais un splice()');
  if(!S.shopping.some(x => x.id === it.id)) throw new Error('l’article vidé doit rester dans le tableau (tombstone)');
});

shopScenario('Courses — ordre des rayons réglable, persiste dans settings.rayonOrder', () => {
  win.addShoppingItem('Lait'); // cremerie
  win.addShoppingItem('Pomme'); // fruits-legumes
  S.settings.rayonOrder = ['cremerie', 'fruits-legumes'];
  win.go('shopping');
  let titres = Array.from(win.document.querySelectorAll('#s-shopping .card-title')).map(e => e.textContent);
  if(titres[0] !== 'Crèmerie' || titres[1] !== 'Fruits et légumes')
    throw new Error('les cartes devraient suivre settings.rayonOrder, obtenu ' + JSON.stringify(titres));
  win.rayonOrderSheet();
  win.moveRayon(0, 1); // fait passer fruits-legumes avant cremerie
  win.saveRayonOrder();
  if(S.settings.rayonOrder[0] !== 'fruits-legumes')
    throw new Error('saveRayonOrder() devrait persister le nouvel ordre, obtenu ' + JSON.stringify(S.settings.rayonOrder));
  win.go('shopping');
  titres = Array.from(win.document.querySelectorAll('#s-shopping .card-title')).map(e => e.textContent);
  if(titres[0] !== 'Fruits et légumes') throw new Error('l’écran devrait refléter le nouvel ordre après enregistrement');
});

shopScenario('Aujourd’hui — bloc Courses (5) : une ligne, jamais la liste, n’empêche jamais l’état vide, absente de la pastille', () => {
  win.addShoppingItem('Café moulu');
  win.addShoppingItem('Riz basmati');
  const b = win.todayBuckets();
  if(b.shopping !== 2) throw new Error('todayBuckets().shopping devrait compter les articles non cochés, obtenu ' + b.shopping);
  const badgeAvant = win.todayBadgeCount();
  win.go('today');
  const el = win.document.getElementById('s-today');
  if(!/2 articles à acheter/.test(el.textContent)) throw new Error('le bouton devrait afficher « 2 articles à acheter »');
  if(el.querySelectorAll('.shop').length !== 1) throw new Error('un seul bouton Courses, jamais la liste des articles');
  if(win.todayBadgeCount() !== badgeAvant)
    throw new Error('les articles de courses ne devraient pas alimenter la pastille (comme le bloc 7)');
});

shopScenario('Aujourd’hui — le bouton Courses reste visible même quand tout le reste dit "c’est bon" (comme Ce soir)', () => {
  const backupH = S.habits.slice(), backupLog = S.habitLog, backupP = S.plants.slice();
  S.habits.length = 0; S.habitLog = {}; S.plants.length = 0;
  try{
    win.addShoppingItem('Chocolat noir');
    win.go('today');
    const el = win.document.getElementById('s-today');
    if(!/C’est bon pour aujourd’hui\./.test(el.textContent))
      throw new Error('un article de courses en attente ne devrait jamais bloquer l’état vide');
    if(!/1 article à acheter/.test(el.textContent))
      throw new Error('le bouton Courses devrait rester affiché sous l’état vide, comme « Ce soir »');
  } finally {
    S.habits.length = 0; backupH.forEach(h => S.habits.push(h));
    S.habitLog = backupLog;
    S.plants.length = 0; backupP.forEach(p => S.plants.push(p));
  }
});

// 6 octies) Revue hebdomadaire (Lot V1-10, js/review.js) : le système
// immunitaire de l'app. Isole aussi S.lastReview et settings.reviewDay, comme
// scenario()/habitScenario()/shopScenario() le font pour leurs domaines.
const reviewScenario = (label, build) => call(label, () => {
  const backupT = S.tasks.slice(), backupReview = S.lastReview, backupDay = S.settings.reviewDay;
  S.tasks.length = 0;
  try{ build(); } finally {
    S.tasks.length = 0; backupT.forEach(t => S.tasks.push(t));
    S.lastReview = backupReview; S.settings.reviewDay = backupDay;
  }
});

reviewScenario('Revue — reviewCandidates() : dormante depuis 30 jours, ou reportée plus de 3 fois', () => {
  const dormante = mk({title: 'Dormante', touchedAt: Date.now() - 40*86400000});
  const recente = mk({title: 'Récente', touchedAt: Date.now()});
  const reportee = mk({title: 'Reportée', touchedAt: Date.now(), postponed: 4});
  const list = win.reviewCandidates();
  if(!list.some(t => t.id === dormante.id)) throw new Error('une tâche dormante depuis 30 jours devrait être candidate');
  if(list.some(t => t.id === recente.id)) throw new Error('une tâche touchée aujourd’hui ne devrait pas être candidate');
  if(!list.some(t => t.id === reportee.id)) throw new Error('une tâche reportée plus de 3 fois devrait être candidate, même récente');
});

call('Revue — reviewDue() : le bon jour, jamais deux fois dans la même semaine', () => {
  const backupDay = S.settings.reviewDay, backupReview = S.lastReview;
  try{
    S.settings.reviewDay = 0; // dimanche
    const dim1 = new Date(2026, 6, 26);  // dimanche 26/07/2026
    const lundi = new Date(2026, 6, 27); // jamais le jour (reviewDay=dimanche)
    const dim2 = new Date(2026, 7, 2);   // dimanche suivant, 7 jours après dim1

    S.lastReview = null;
    if(!win.reviewDue(dim1)) throw new Error('dimanche sans revue précédente devrait déclencher');
    if(win.reviewDue(lundi)) throw new Error('lundi ne devrait jamais déclencher (reviewDay=dimanche)');

    S.lastReview = dim1.getTime();
    if(win.reviewDue(dim1)) throw new Error('déjà revu ce jour-là : ne doit pas redéclencher la même semaine');
    if(!win.reviewDue(dim2)) throw new Error('le dimanche suivant, 7 jours après, la revue doit redevenir due');
  } finally {
    S.settings.reviewDay = backupDay; S.lastReview = backupReview;
  }
});

reviewScenario('Revue — flux complet : Faire cette semaine / Un jour / Abandonner, puis lastReview posé', () => {
  S.lastReview = null;
  const keep = mk({title: 'À reprendre', touchedAt: Date.now() - 40*86400000});
  const someday = mk({title: 'À reporter un jour', touchedAt: Date.now() - 40*86400000});
  const drop = mk({title: 'À abandonner', touchedAt: Date.now() - 40*86400000});
  win.startReview([keep, someday, drop]);
  win.reviewKeep();
  if(keep.bucket !== 'scheduled' || keep.start !== win.todayKey() || keep.postponed !== 0)
    throw new Error('« Faire cette semaine » devrait planifier la tâche aujourd’hui et remettre postponed à 0');
  win.reviewSomeday();
  if(someday.bucket !== 'someday' || someday.start !== null)
    throw new Error('« Un jour » devrait basculer la tâche en someday, sans start');
  win.reviewDrop();
  if(!drop.deletedAt) throw new Error('« Abandonner » devrait tombstoner la tâche, jamais un splice()');
  if(S.lastReview === null) throw new Error('la revue terminée (toutes les tâches triées) devrait poser S.lastReview');
  const html = win.document.getElementById('sheet').innerHTML;
  if(!/3 tâches triées/.test(html)) throw new Error('l’écran de fin devrait annoncer le compte, sans score ni félicitations : ' + html);
});

// Motivation légère (ROADMAP §2, point 4 du Lot 10) : célébrations sobres,
// jamais un score. Les toasts sont interceptés (plutôt que lus dans le DOM)
// pour rester fiables même si un toast précédent est encore affiché.
habitScenario('Habitudes — record de série : toast sobre à l’amélioration, jamais le tout premier jour', () => {
  const h = win.stamp({name: 'Course à pied', unit: '', target: 1, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  h.createdAt = Date.now() - 5*86400000; // née il y a 5 jours, pour laisser un peu d’historique
  S.habits.push(h);
  const today = win.todayKey();
  const calls = [];
  const origToast = win.toast;
  win.toast = msg => calls.push(msg);
  try{
    win.setHabitLogValue(h.id, 1, win.addDays(today, -1)); // hier : une série de 1 déjà posée
    win.stepHabit(h.id, 1); // aujourd'hui : la série passe à 2, bat le record de 1
    if(calls.length !== 1 || !/Record de série pour Course à pied/.test(calls[0]))
      throw new Error('un nouveau record de série devrait déclencher un toast sobre, obtenu : ' + JSON.stringify(calls));
  } finally { win.toast = origToast; }
});

habitScenario('Habitudes — record de série : aucun bruit le tout premier jour (prevBest=0)', () => {
  const h = win.stamp({name: 'Toute nouvelle habitude', unit: '', target: 1, sched: {kind: 'days', days: [1,2,3,4,5,6,7]}, sort: 0});
  S.habits.push(h);
  const calls = [];
  const origToast = win.toast;
  win.toast = msg => calls.push(msg);
  try{
    win.stepHabit(h.id, 1); // premier jour : prevBest=0, ce serait un « record » systématique
    if(calls.length) throw new Error('le tout premier jour d’une habitude ne doit jamais déclencher de célébration');
  } finally { win.toast = origToast; }
});

call('Maison — célébration sobre à la première réalisation d’un entretien annuel, jamais ensuite', () => {
  const t = win.stamp({
    title: 'Détartrage ballon d’eau chaude', notes: '', cat: 'entretien', room: 'sdb', bucket: 'anytime',
    start: null, due: null, evening: false, prio: 0, effort: 2,
    repeat: {kind: 'year', n: 1, days: [], from: 'done'},
    doneAt: Date.now(), history: [], postponed: 0, touchedAt: Date.now()
  });
  S.tasks.push(t);
  const calls = [];
  const origToast = win.toast;
  win.toast = msg => calls.push(msg);
  try{
    win.go('maison');
    win.tapMaisonItem(t.id);
    if(calls.length !== 1 || !/Entretien annuel réalisé pour la première fois/.test(calls[0]))
      throw new Error('la première réalisation d’un entretien annuel devrait fêter l’occasion sobrement, obtenu : ' + JSON.stringify(calls));
    win.tapMaisonItem(t.id); // deuxième réalisation : ne doit plus jamais se reproduire
    if(calls.length !== 1) throw new Error('la célébration ne doit avoir lieu qu’une seule fois, pas à chaque réalisation');
  } finally {
    win.toast = origToast;
    t.deletedAt = Date.now(); // tombstone : ne pollue pas les scénarios suivants
  }
});

// savePlantSheet() est asynchrone (photo éventuelle) : hors du helper call()
// synchrone, comme le flush saveNow() plus bas.
try{
  win.plantSheet(null);
  const nameEl = win.document.getElementById('p-name');
  if(!nameEl) throw new Error('le champ nom devrait être présent à la création');
  // _pSheet est un `let` de plants.js : accessible en interne (oninput=) mais
  // pas via win._pSheet (pas de propriété sur window). On passe donc par le
  // DOM et les setters exposés, comme le ferait un vrai geste utilisateur.
  nameEl.value = 'orchidée du bureau';
  nameEl.dispatchEvent(new win.Event('input', {bubbles: true}));
  win.setPRoom('bureau');
  await win.savePlantSheet();
  const p = S.plants.find(x => x.name === 'Orchidée du bureau');
  if(!p) throw new Error('la plante devrait être créée avec la casse posée par cap()');
  if(!p.id || !p.createdAt || !p.updatedAt || p.deletedAt !== null)
    throw new Error('la discipline synchro-ready (id/createdAt/updatedAt/deletedAt) devrait être respectée');
  win.deletePlant(p.id);
  win._runConfirm();
  if(!p.deletedAt) throw new Error('la suppression d’une plante doit être un tombstone, jamais un splice()');
  if(!S.plants.some(x => x.id === p.id)) throw new Error('la plante supprimée doit rester dans le tableau (tombstone)');
}catch(e){ onError('plantSheet — création/suppression', e); }

// 6 undecies) Socle d'interaction (Lot V2-1) : gestures.js se charge sans
// erreur runtime (déjà couvert par window.onerror sur l'ensemble du bundle,
// vérifié ici explicitement par la présence d'un de ses symboles globaux —
// le balayage lui-même ne se simule pas sous jsdom, cf. consigne du lot),
// undoable() et rowAttrs().
call('gestures.js — chargé sans erreur, sa fonction globale est bien exposée', () => {
  // Les `const` de tête de fichier (comme SWIPE_COMMIT_RATIO) ne deviennent
  // pas des propriétés de window (portée lexicale du script, pas globalThis) :
  // seule une déclaration `function` l'est, d'où ce choix de symbole ici.
  if(typeof win.swipeRunAttr !== 'function') throw new Error('gestures.js ne semble pas chargé (swipeRunAttr absent)');
});

call('undoable() — enveloppe toast() avec une action « Annuler » déjà câblée', () => {
  let ran = false;
  win.undoable('Test annulable', () => { ran = true; });
  const t = win.document.getElementById('toast');
  if(!t.classList.contains('show')) throw new Error('undoable() devrait afficher le toast');
  const btn = t.querySelector('.toast-act');
  if(!btn || btn.textContent !== 'Annuler') throw new Error('undoable() devrait poser un bouton « Annuler »');
  btn.click();
  if(!ran) throw new Error('cliquer sur « Annuler » devrait exécuter la fonction fournie');
  win.hideToast();
});

call('rowAttrs() — role, tabindex, et Entrée/Espace déclenchent comme un clic (audit D3)', () => {
  let n = 0;
  win.rowAttrsTestBump = () => { n++; };
  const wrap = win.document.createElement('div');
  wrap.innerHTML = '<div id="ra-test"' + win.rowAttrs('rowAttrsTestBump()') + '>x</div>';
  win.document.body.appendChild(wrap);
  const el = win.document.getElementById('ra-test');
  if(el.getAttribute('role') !== 'button') throw new Error('rowAttrs() devrait poser role="button"');
  if(el.getAttribute('tabindex') !== '0') throw new Error('rowAttrs() devrait poser tabindex="0"');
  el.click();
  if(n !== 1) throw new Error('le clic devrait déclencher onTap via onclick');
  el.dispatchEvent(new win.KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
  if(n !== 2) throw new Error('Entrée devrait déclencher onTap comme un clic');
  el.dispatchEvent(new win.KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true}));
  if(n !== 3) throw new Error('Espace devrait déclencher onTap comme un clic');
  wrap.remove();
});

call('rowAttrs() — appliqué aux lignes cliquables de Aujourd’hui, Tâches, Maison, Courses', () => {
  // Aujourd'hui : rien ne garantit qu'une tâche du bloc du jour (row-main via
  // todayRow()) traîne encore à ce point du test — on en pose une exprès.
  const t = mk({title: 'Ligne accessible', bucket: 'scheduled', start: win.todayKey()});
  win.go('today');
  const todayHtml = win.document.getElementById('s-today').innerHTML;
  if(!/class="row-main" role="button" tabindex="0"/.test(todayHtml))
    throw new Error('Aujourd’hui — les .row-main cliquables devraient porter role="button"/tabindex="0"');
  t.deletedAt = Date.now(); win.touch(t); // nettoyage : ne pollue pas les scénarios suivants
  win.go('tasks');
  const tasksHtml = win.document.getElementById('s-tasks').innerHTML;
  if(!/class="row-main" role="button" tabindex="0"/.test(tasksHtml))
    throw new Error('Tâches — les .row-main cliquables devraient porter role="button"/tabindex="0"');
  win.go('maison');
  const maisonHtml = win.document.getElementById('s-maison').innerHTML;
  if(maisonHtml.includes('class="row row-care"') && !/class="row row-care" role="button" tabindex="0"/.test(maisonHtml))
    throw new Error('Maison — les lignes d’entretien/soin cliquables devraient porter role="button"/tabindex="0"');
  win.go('shopping');
  win.addShoppingItem('Test rowAttrs');
  win.go('shopping');
  const shopHtml = win.document.getElementById('s-shopping').innerHTML;
  if(!/class="row-main" role="button" tabindex="0"/.test(shopHtml))
    throw new Error('Courses — les .row-main cliquables devraient porter role="button"/tabindex="0"');
  const it = S.shopping.find(x => x.label === 'Test rowAttrs');
  if(it){ it.deletedAt = Date.now(); win.touch(it); } // nettoyage : ne pollue pas les scénarios suivants
});

// 6 duodecies) Tâches v2 (Lot V2-4) : balayage à la place des boutons de
// ligne, fiche en divulgation progressive, groupe « Fait » piloté par
// settings.hideDone, indicateur de notes, filtres qui n'apparaissent que
// s'ils servent.
scenario('Tâches — plus aucun bouton de ligne permanent, le balayage les remplace (point 1)', () => {
  const t = mk({title: 'Tâche avec balayage', bucket: 'scheduled', start: win.todayKey()});
  win.go('tasks');
  const html = win.document.getElementById('s-tasks').innerHTML;
  if(html.includes('row-postpone') || html.includes('row-del'))
    throw new Error('les boutons « > »/« × » permanents ne devraient plus être rendus sur Tâches');
  if(!new RegExp('data-swipe-left="delTask\\(\'' + t.id + '\'\\)"').test(html))
    throw new Error('la ligne devrait porter data-swipe-left vers delTask()');
  if(!new RegExp('data-swipe-right="postponeTask\\(\'' + t.id + '\'\\)"').test(html))
    throw new Error('une tâche du groupe « Aujourd’hui et avant » devrait porter data-swipe-right vers postponeTask()');
});

scenario('Tâches — reporter est annulable (point 1)', () => {
  const t = mk({title: 'À reporter', bucket: 'scheduled', start: win.todayKey()});
  const startAvant = t.start, postponedAvant = t.postponed || 0;
  win.go('tasks');
  win.postponeTask(t.id);
  if(t.start === startAvant) throw new Error('postponeTask() devrait pousser le début à demain');
  if(!/Annuler/.test(win.document.getElementById('toast').textContent))
    throw new Error('reporter devrait offrir « Annuler », il ne l’offrait pas avant ce lot');
  win._runToastAct();
  if(t.start !== startAvant) throw new Error('annuler un report devrait restituer le début d’avant');
  if((t.postponed || 0) !== postponedAvant) throw new Error('annuler un report devrait remettre le compteur d’avant');
});

scenario('Tâches — le groupe « Fait » exclut toujours l’entretien (point 3)', () => {
  const normale = mk({title: 'Tâche faite', doneAt: Date.now(), history: [win.todayKey()]});
  const entretien = mk({
    title: 'Entretien fait', room: 'salon', repeat: {kind: 'day', n: 7, days: [], from: 'done'},
    doneAt: Date.now(), history: [win.todayKey()]
  });
  const ids = win.taskDoneItems().map(x => x.id);
  if(ids.indexOf(normale.id) === -1) throw new Error('une tâche normale faite devrait apparaître dans le groupe « Fait »');
  if(ids.indexOf(entretien.id) !== -1)
    throw new Error('un entretien garde toujours un doneAt par construction : il ne doit JAMAIS polluer « Fait »');
});

scenario('Tâches — settings.hideDone pilote l’existence du groupe « Fait » (audit C2)', () => {
  mk({title: 'Tâche faite (hideDone)', doneAt: Date.now(), history: [win.todayKey()]});
  const avant = S.settings.hideDone;
  S.settings.hideDone = false;
  if(!win.taskDoneSectionHtml()) throw new Error('hideDone=false : le groupe « Fait » devrait se rendre');
  S.settings.hideDone = true;
  if(win.taskDoneSectionHtml()) throw new Error('hideDone=true : « cacher les tâches faites » devrait vider le groupe');
  S.settings.hideDone = avant;
});

scenario('Tâches — décochage depuis le groupe « Fait » rouvre la tâche (point 3)', () => {
  const t = mk({title: 'À décocher', doneAt: Date.now(), history: [win.todayKey()]});
  const histAvant = t.history.length;
  win.unDoneTask(t.id);
  if(t.doneAt !== null) throw new Error('unDoneTask() devrait vider doneAt');
  if(t.history.length !== histAvant - 1) throw new Error('unDoneTask() devrait retirer la dernière réalisation de l’historique');
});

scenario('Tâches — fiche : divulguée d’emblée sur une tâche neuve, dépliée sur une tâche avec une valeur non par défaut (point 2, audit A5)', () => {
  const neuve = mk({title: 'Tâche simple'});
  win.taskSheet(neuve.id);
  let html = win.document.getElementById('sheet').innerHTML;
  if(html.includes('id="ts-notes"')) throw new Error('une tâche sans particularité devrait s’ouvrir repliée (Notes cachées)');
  if(!/Plus d.?options/.test(html)) throw new Error('le bouton « Plus d’options » devrait être présent, replié');
  win.closeSheet();

  const marquee = mk({title: 'Tâche catégorisée', cat: 'menage'});
  win.taskSheet(marquee.id);
  html = win.document.getElementById('sheet').innerHTML;
  if(!html.includes('id="ts-notes"'))
    throw new Error('une catégorie non par défaut devrait déplier la fiche d’emblée, pas la cacher à l’utilisateur');
  win.closeSheet();
});

scenario('Tâches — indicateur de notes (point 4, audit C3)', () => {
  const avecNotes = mk({title: 'A des notes', bucket: 'scheduled', start: win.todayKey(), notes: 'Détail important'});
  const sansNotes = mk({title: 'Sans notes', bucket: 'scheduled', start: win.todayKey()});
  win.go('tasks');
  const html = win.document.getElementById('s-tasks').innerHTML;
  const rowAvec = html.slice(html.indexOf(win.esc(avecNotes.title)));
  if(!rowAvec.slice(0, 400).includes('row-note-ic'))
    throw new Error('une tâche avec des notes devrait porter l’indicateur discret');
  const rowSans = html.slice(html.indexOf(win.esc(sansNotes.title)));
  if(rowSans.slice(0, 200).includes('row-note-ic'))
    throw new Error('une tâche sans notes ne devrait porter aucun indicateur');
});

scenario('Tâches — recherche et filtres n’apparaissent qu’au-delà du seuil (point 5)', () => {
  for(let i = 0; i < 3; i++) mk({title: 'Tâche ' + i});
  win.go('tasks');
  if(win.document.getElementById('task-search'))
    throw new Error('avec peu de tâches ouvertes, la recherche ne devrait pas prendre de la place pour rien');
  for(let i = 3; i < 10; i++) mk({title: 'Tâche ' + i});
  win.go('tasks');
  if(!win.document.getElementById('task-search'))
    throw new Error('au-delà du seuil, la recherche devrait redevenir accessible');
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
  console.log('✓ Test fumée OK — 6 écrans, cycle de vie d’une tâche, oiseaux, casse,\n' +
              '  socle d’interaction V2-1 (gestures.js chargé, undoable(), rowAttrs()),\n' +
              '  navigation & saisie V2-2 (cinq onglets, Habitudes atteignable à zéro,\n' +
              '  mémorisation du défilement, barre de saisie collée par écran),\n' +
              '  « Aujourd’hui » v3 V2-3 (prénom dans le sur-titre et l’état vide, réserve\n' +
              '  de places des soins sous le plafond, cochage annulable et décochable),\n' +
              '  récurrence, Maison, algorithme d’« Aujourd’hui » (blocs, seuil d’entretien,\n' +
              '  cochage de session, plafond, état vide, pastille), parseQuick (' + nlpCases.length + ' cas\n' +
              '  + mécanisme d’ignorance), plantes (saison, soins réutilisant recur.js,\n' +
              '  intégration Maison et bloc du jour, fiche), habitudes (série/quota, jour\n' +
              '  sauté neutre, progression partielle, mode quota hebdomadaire, pas adapté\n' +
              '  à l’objectif et « Fait » en un geste, intégration Aujourd’hui, fiche),\n' +
              '  courses (guessRayon, fréquents, correction mémorisée,\n' +
              '  vidage en tombstone, ordre des rayons, intégration Aujourd’hui), revue\n' +
              '  hebdomadaire (candidats, déclenchement, flux complet, lastReview),\n' +
              '  célébrations sobres (record de série, entretien annuel), Réglages (bienvenue\n' +
              '  au premier lancement, thème, export/import validé avant écriture,\n' +
              '  réinitialisation du store photos, ordre des six groupes) et persistance.');
}
