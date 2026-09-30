/* ==========================================================================
   recur.js — moteur de récurrence, fonctions PURES sans DOM, partagées entre
   les tâches d'entretien (repeat.from:'done', vue par pièce de l'écran
   Maison) et les échéances fixes (repeat.from:'due', écran Tâches).
   repeat = { kind:'day'|'week'|'month'|'year', n, days:[1..7]=lundi..dimanche, from:'due'|'done' }
   ========================================================================== */

// Intervalle en jours, tous kinds confondus — approximation utilisée par la
// jauge de fraîcheur. mois/an ne sont pas des durées fixes en calendaire ;
// nextDue() fait le calcul exact pour la vraie date, ceci ne sert qu'au
// ratio continu de la jauge.
function intervalDays(repeat){
  if(!repeat) return null;
  const n = repeat.n || 1;
  switch(repeat.kind){
    case 'day': return n;
    case 'week': return (repeat.days && repeat.days.length) ? Math.round((n*7) / repeat.days.length) : n*7;
    case 'month': return n*30;
    case 'year': return n*365;
    default: return n;
  }
}

// Occurrence suivante d'une récurrence, strictement après le jour `anchor`
// ('YYYY-MM-DD') — le calcul pur, sans tâche autour. Partagé par nextDue()
// (entretien, depuis doneAt) et completeTask() (tâches récurrentes ouvertes,
// depuis l'occurrence honorée ou le jour de réalisation).
//  Jours fixes de la semaine (ex. [1,4] = lundi et jeudi) : prochaine
//  occurrence après l'ancre — sémantique « chaque lundi et jeudi », pas
//  « tous les n lundis », donc n est ignoré dans ce cas précis.
function nextOccurrence(r, anchor){
  const n = r.n || 1;
  if(r.kind === 'week' && r.days && r.days.length){
    const days = r.days.slice().sort((a,b)=>a-b);
    const d = new Date(anchor+'T00:00');
    for(let i=0;i<14;i++){
      d.setDate(d.getDate()+1);
      const iso = d.getDay() === 0 ? 7 : d.getDay(); // 1=lundi..7=dimanche
      if(days.indexOf(iso) !== -1) return dayKey(d);
    }
    return anchor; // n'arrive pas : days est toujours non vide ici
  }
  const d = new Date(anchor+'T00:00');
  if(r.kind === 'day'){ d.setDate(d.getDate()+n); return dayKey(d); }
  if(r.kind === 'week'){ d.setDate(d.getDate()+n*7); return dayKey(d); }
  if(r.kind === 'month' || r.kind === 'year'){
    // Calendaire, pas 30 jours fixes — et borné au dernier jour du mois
    // visé (Lot V3-4) : setMonth() faisait du 31 janvier + 1 mois le 3 mars,
    // et du 29 février + 1 an le 1er mars. `r.dom` (jour du mois voulu,
    // posé par « tous les 31 du mois ») évite en plus la dérive 31 → 28 → 28.
    const y = d.getFullYear() + (r.kind === 'year' ? n : 0);
    const m = d.getMonth() + (r.kind === 'month' ? n : 0);
    const want = r.dom || d.getDate();
    const last = new Date(y, m + 1, 0).getDate();
    return dayKey(new Date(y, m, Math.min(want, last)));
  }
  return dayKey(d);
}

// Première occurrence d'une récurrence à partir du jour `ref`, ce jour
// compris (Lot V3-4) : « tous les lundis » tapé un lundi, c'est aujourd'hui.
// Sert à donner une première date à une tâche récurrente qui n'en a pas —
// sans elle, « Sport tous les lundis » restait dans « Un jour » et
// n'apparaissait jamais un lundi.
function firstOccurrence(r, ref){
  if(r && r.kind === 'week' && r.days && r.days.length){
    if(r.days.indexOf(isoDow(ref)) !== -1) return ref;
    return nextOccurrence(r, ref);
  }
  return ref;
}

// Prochaine échéance. `from` décide de l'ancre :
//  'due'  → depuis l'échéance précédente (task.due), qu'elle ait été honorée
//           ou non (le loyer, c'est le 5 quoi qu'il arrive ; les impôts, le
//           15 mai). Rater une échéance ne décale pas la suivante.
//  'done' → depuis la réalisation effective (task.doneAt), jamais depuis une
//           date où la tâche aurait dû être faite (l'aspirateur, c'est 7
//           jours après le dernier passage réel).
function nextDue(task, ref){
  const r = task.repeat;
  if(!r) return null;
  ref = ref || todayKey();
  const anchor = r.from === 'done'
    ? dayKey(new Date(task.doneAt || Date.now()))
    : (task.due || ref);
  return nextOccurrence(r, anchor);
}

// La jauge de fraîcheur vit dans js/maison.js depuis le Lot V3-1
// (choreFresh(), au jour près et non bornée) ; freshness(), qui la calculait
// ici à la milliseconde et bornée à [0,1], n'avait plus d'appelant et a été
// retirée au Lot V3-3.

/* Marque une réalisation : historise le jour, remet postponed à 0, et selon
   la nature de la tâche :
    · entretien (pièce + from:'done', glossaire) → doneAt se pose sur
      l'instant présent : c'est la nouvelle référence de sa jauge ;
    · tâche récurrente « ouverte » (from:'due', ou from:'done' SANS pièce) →
      elle reste active et avance à sa prochaine occurrence : depuis
      l'occurrence honorée (à date fixe) ou depuis aujourd'hui (après
      réalisation). Son début avance avec elle, en gardant l'avance qu'il
      avait sur l'échéance ;
    · tâche ponctuelle → doneAt, elle est finie.
   Corrigé au Lot V3-4 : une tâche « après réalisation » sans pièce recevait
   un doneAt comme un entretien, quittait donc Tâches… sans jamais entrer
   dans Maison — elle disparaissait pour de bon après sa première
   réalisation. Et le début d'une tâche récurrente ne bougeait pas : faite,
   elle restait affichée dans « Aujourd'hui » tous les jours jusqu'à la
   prochaine échéance. */
function completeTask(task, ref){
  ref = ref || Date.now();
  const key = dayKey(new Date(ref));
  const r = task.repeat;
  task.history = task.history || [];
  task.history.push(key);
  if(r && !(r.from === 'done' && task.room)){
    const occ = task.due || task.start || key;       // l'occurrence qu'on vient d'honorer
    const next = nextOccurrence(r, r.from === 'done' ? key : occ);
    if(task.due){
      const lead = task.start ? daysBetween(task.start, task.due) : null;
      task.due = next;
      task.start = lead != null ? addDays(next, -lead) : task.start;
    } else {
      task.start = next;
    }
    task.bucket = 'scheduled';
    task.doneAt = null;
  } else {
    task.doneAt = ref;
    if(r) task.due = nextDue(task, key);
  }
  task.postponed = 0;
  task.touchedAt = ref; // une réalisation est un signe de vie : jamais candidate à la revue juste après
  touch(task);
  return task;
}

// Cliché exact des champs que completeTask() modifie (Lot V3-4) — pour que
// « Annuler » restitue la tâche telle qu'elle était, où qu'on l'ait cochée
// (Aujourd'hui, Tâches, Maison). Trois copies du même motif avant ce lot,
// dont aucune ne gardait `start`.
function completionSnapshot(t){
  return {doneAt:t.doneAt, due:t.due, start:t.start, bucket:t.bucket,
          postponed:t.postponed || 0, touchedAt:t.touchedAt, history:(t.history || []).slice()};
}
function restoreCompletion(t, snap){
  t.doneAt = snap.doneAt; t.due = snap.due; t.start = snap.start; t.bucket = snap.bucket;
  t.postponed = snap.postponed; t.touchedAt = snap.touchedAt; t.history = snap.history;
  touch(t);
  return t;
}
