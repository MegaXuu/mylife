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
              '  récurrence, Maison, algorithme d’« Aujourd’hui » (blocs, seuil d’entretien,\n' +
              '  cochage de session, plafond, état vide, pastille), parseQuick (' + nlpCases.length + ' cas\n' +
              '  + mécanisme d’ignorance) et persistance.');
}
