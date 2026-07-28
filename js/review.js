/* ==========================================================================
   review.js — revue hebdomadaire des tâches dormantes (Lot V1-10), le
   « système immunitaire » de l'app (ROADMAP-V1.md §3 point ⑨). Toujours une
   feuille modale (openSheet), jamais un écran propre : pas de #s-review,
   jamais appelée par go(). Une tâche à la fois, jamais une liste qu'on
   parcourt du regard sans agir — trois issues : faire cette semaine, un
   jour, abandonner.
   ========================================================================== */

const REVIEW_STALE_DAYS = 30;   // touchedAt plus vieux que ça → candidate
const REVIEW_POSTPONE_MAX = 3;  // postponed au-delà de ça → candidate aussi

// Candidates : tâches ouvertes. Jamais l'entretien (repeat.from:'done') : ces
// tâches gardent toujours un doneAt (glossaire CONVENTIONS.md §6) et sont
// donc déjà exclues par le filtre !t.doneAt — comme dans getTaskItems()
// (js/tasks.js). Triées de la plus dormante à la plus récente.
function reviewCandidates(ref){
  ref = ref || Date.now();
  const cutoff = ref - REVIEW_STALE_DAYS*24*60*60*1000;
  return live(S.tasks).filter(t=>!t.doneAt &&
      ((t.touchedAt || t.createdAt || 0) < cutoff || (t.postponed||0) > REVIEW_POSTPONE_MAX))
    .sort((a,b)=>(a.touchedAt||a.createdAt||0) - (b.touchedAt||b.createdAt||0));
}

// Déclenchement au boot (js/boot.js) : le jour settings.reviewDay (0 =
// dimanche par défaut), et jamais deux fois dans la même semaine.
function reviewDue(now){
  now = now || new Date();
  const day = S.settings.reviewDay == null ? 0 : S.settings.reviewDay;
  if(now.getDay() !== day) return false;
  if(!S.lastReview) return true;
  return daysBetween(dayKey(new Date(S.lastReview)), dayKey(now)) >= 6;
}

// Appelée une fois au boot : ne propose la revue que s'il y a vraiment
// quelque chose à trier — sinon une feuille vide serait un bruit, pas un
// service (principe 6, CONVENTIONS.md §3).
function maybeStartReview(){
  if(!reviewDue()) return;
  const list = reviewCandidates();
  if(list.length) startReview(list);
}

let _reviewQueue = [], _reviewIndex = 0, _reviewSorted = 0;

// Aussi appelée à la demande depuis Réglages (sans argument : recalcule la
// liste), auquel cas la revue peut s'ouvrir même si ce n'est pas le jour.
function startReview(list){
  _reviewQueue = (list || reviewCandidates()).map(t=>t.id);
  _reviewIndex = 0;
  _reviewSorted = 0;
  // Quel que soit le chemin de fermeture (Fermer, Plus tard, tap dehors,
  // glisser la poignée), l'écran dessous doit reprendre à jour derrière la
  // feuille — le compte de Réglages, l'écran Aujourd'hui après un abandon.
  _onSheetClose = rerender;
  openSheet(_reviewQueue.length ? reviewStepHtml() : reviewEndHtml());
}

function reviewAgo(t){
  const n = daysBetween(dayKey(new Date(t.touchedAt || t.createdAt || Date.now())), todayKey());
  return n <= 0 ? 'Touchée aujourd’hui' : 'Sans y toucher depuis ' + n + ' jours';
}

function reviewStepHtml(){
  const id = _reviewQueue[_reviewIndex];
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return reviewSkipMissing(); // supprimée entretemps ailleurs dans l'app
  const bits = [reviewAgo(t)];
  if((t.postponed||0) >= 3) bits.push('Reportée ' + t.postponed + ' fois');
  return '<p class="overline">Revue · ' + (_reviewIndex+1) + ' sur ' + _reviewQueue.length + '</p>'+
    '<p class="sheet-title">' + esc(t.title) + '</p>'+
    '<p class="sheet-msg">' + esc(bits.join(' · ')) + '</p>'+
    '<button class="btn primary btn-full" onclick="reviewKeep()">Faire cette semaine</button>'+
    '<button class="btn secondary btn-full" onclick="reviewSomeday()">Un jour</button>'+
    '<button class="btn danger btn-full" onclick="reviewDrop()">Abandonner</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Plus tard</button>';
}

// Pas de score, pas de félicitations exagérées (CONVENTIONS.md §3, ROADMAP
// point 4 du Lot 10) : juste le compte, et un mot sobre.
function reviewEndHtml(){
  const n = _reviewSorted;
  const msg = n ? (n + (n>1 ? ' tâches triées.' : ' tâche triée.')) : 'Rien à trier cette semaine.';
  return '<p class="sheet-title">Revue faite.</p>'+
    '<p class="sheet-msg">' + esc(msg) + '</p>'+
    '<button class="btn primary btn-full" onclick="closeSheet()">Fermer</button>';
}

function reviewSkipMissing(){
  _reviewIndex++;
  return _reviewIndex < _reviewQueue.length ? reviewStepHtml() : reviewEndHtml();
}

function advanceReview(){
  _reviewIndex++;
  if(_reviewIndex >= _reviewQueue.length){
    S.lastReview = Date.now();
    save();
    openSheet(reviewEndHtml());
  } else {
    openSheet(reviewStepHtml());
  }
}

// « Faire cette semaine » : ramène la tâche dans le champ de vision immédiat
// — start posé sur aujourd'hui, comme un report inversé — et efface le
// compteur de reports, la friction honnête ayant fait son office (⑥).
function reviewKeep(){
  const t = S.tasks.find(x=>x.id === _reviewQueue[_reviewIndex]);
  if(t){
    t.start = todayKey();
    t.bucket = 'scheduled';
    t.postponed = 0;
    t.touchedAt = Date.now();
    touch(t);
    save();
  }
  _reviewSorted++;
  advanceReview();
}

// « Un jour » : sort de la circulation, comme n'importe quelle tâche someday
// (glossaire CONVENTIONS.md §6 — n'apparaît plus nulle part).
function reviewSomeday(){
  const t = S.tasks.find(x=>x.id === _reviewQueue[_reviewIndex]);
  if(t){
    t.bucket = 'someday';
    t.start = null;
    t.touchedAt = Date.now();
    touch(t);
    save();
  }
  _reviewSorted++;
  advanceReview();
}

// « Abandonner » : tombstone comme delTask() (js/tasks.js), jamais un
// splice() — et annulable tant que le toast est là.
function reviewDrop(){
  const t = S.tasks.find(x=>x.id === _reviewQueue[_reviewIndex]);
  if(t){
    t.deletedAt = Date.now();
    touch(t);
    save();
    toast('Tâche abandonnée', {action:{label:'Annuler', fn:()=>{
      t.deletedAt = null;
      touch(t);
      save();
      rerender();
    }}});
  }
  _reviewSorted++;
  advanceReview();
}
