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

// Prochaine échéance. `from` décide de l'ancre — c'est le cœur du lot :
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
  const n = r.n || 1;

  // Jours fixes de la semaine (ex. [1,4] = lundi et jeudi) : prochaine
  // occurrence après l'ancre — sémantique « chaque lundi et jeudi », pas
  // « tous les n lundis », donc n est ignoré dans ce cas précis.
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
  if(r.kind === 'day') d.setDate(d.getDate()+n);
  else if(r.kind === 'week') d.setDate(d.getDate()+n*7);
  else if(r.kind === 'month') d.setMonth(d.getMonth()+n); // calendaire, pas 30j fixes
  else if(r.kind === 'year') d.setFullYear(d.getFullYear()+n);
  return dayKey(d);
}

// Jauge de fraîcheur : 1 = frais (vient d'être fait), 0 = à faire. Ne
// descend jamais sous 0 : au-delà de l'intervalle c'est « à faire », jamais
// « en retard ». `ref` = timestamp ms (défaut : maintenant).
function freshness(task, ref){
  const days = intervalDays(task.repeat);
  if(!days) return task.doneAt ? 1 : 0;
  if(!task.doneAt) return 0;
  ref = ref || Date.now();
  const f = 1 - (ref - task.doneAt) / (days*86400000);
  return Math.max(0, Math.min(1, f));
}

// Marque une réalisation : historise la date, met à jour doneAt, recalcule
// l'échéance si récurrente, remet postponed à 0.
//  from:'due'  → la tâche reste active pour le prochain cycle : doneAt
//                redevient null (ce n'est pas « fini », c'est reporté), due
//                avance à la prochaine échéance.
//  from:'done' (ou pas de récurrence) → doneAt se pose sur l'instant présent,
//                nouvelle référence de la jauge de fraîcheur.
function completeTask(task, ref){
  ref = ref || Date.now();
  const key = dayKey(new Date(ref));
  task.history = task.history || [];
  task.history.push(key);
  if(task.repeat && task.repeat.from === 'due'){
    task.due = nextDue(task, key);
    task.doneAt = null;
  } else {
    task.doneAt = ref;
    if(task.repeat) task.due = nextDue(task, key);
  }
  task.postponed = 0;
  touch(task);
  return task;
}
