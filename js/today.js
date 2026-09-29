/* ==========================================================================
   today.js — écran « Aujourd'hui », le cœur de l'app (ROADMAP-V1.md §6).
   Il ne liste pas, il DÉCIDE. Ordre imposé par la roadmap :
     1. Échéances dépassées   — uniquement les vraies deadlines (due < aujourd'hui)
     2. Aujourd'hui           — start ≤ aujourd'hui et récurrences dues, plafonné
     3. Entretien du jour     — ce qui tient dans le budget quotidien (Lot V3-1)
     4. Habitudes du jour     — actives aujourd'hui, saisie en ligne (js/habits.js)
     5. Courses               — une ligne, jamais la liste (js/shopping.js)
     6. Ce soir               — sous-section discrète
     7. Si tu as 10 minutes   — 1 à 3 tâches anytime à effort court

   Depuis le Lot V3-1 : les plantes ne sont plus un domaine à part (ce sont
   des entretiens comme les autres), et le bloc 3 n'est plus « les 3 jauges
   les plus basses » mais la journée d'entretien décidée par choreDay()
   (js/maison.js) : ce qui est dû et tient dans le budget réglé, le plus
   urgent d'abord. Le reste attend demain, sans jamais encombrer l'écran.

   Depuis le Lot V1-8 : les habitudes actives aujourd'hui (js/habits.js,
   getTodayHabits()) rejoignent la sélection — un domaine à part, jamais mêlé
   aux tâches (une série ne se compte pas comme une jauge, CONVENTIONS.md §6).

   Depuis le Lot V2-3 (maquettes/today-v2.html) : le sur-titre porte le
   prénom (audit C1) ; une ligne cochée est annulable au toast ET décochable
   à la case (audit A2, todayUndone()). La réserve de places des soins de
   plantes sous le plafond (audit B3) a disparu avec les plantes au V3-1.

   Mise en forme : la maquette fait foi (cf. le bloc Lot V1-5 du <style>).
   Le bloc du jour est le seul à ne pas être une carte : c'est ce qui le rend
   dominant, il respire pleine largeur pendant que le reste est boîté.
   ========================================================================== */

const TODAY_QUICK_MAX = 3;     // « si tu as 10 minutes » : 1 à 3 tâches (§6.7)

// Sur-titre de l'écran : « Dimanche 26 juillet ». La casse de phrase impose
// la majuscule initiale que toLocaleDateString ne met pas en français.
function longDate(d){
  const s = (d || new Date()).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Le prénom demandé à la bienvenue depuis le Lot V1-11, enfin lu (audit C1).
// Vide, blanc ou absent : tout ce qui le mentionne doit retomber sur sa forme
// sans prénom — jamais un « Bonjour » orphelin, jamais une virgule qui pend.
function userFirstName(){
  return (S.settings.userName || '').trim();
}

// Sur-titre de l'écran : « Bonjour Florian · Vendredi 14 août », ou la date
// seule sans prénom. Arbitrage ROADMAP-V2 §3.6, et sa limite dans la même
// phrase : pas de salutation selon l'heure, pas d'emoji, pas de phrase.
function todayOverline(d){
  const n = userFirstName();
  const date = longDate(d);
  return n ? 'Bonjour ' + n + ' · ' + date : date;
}

/* ==========================================================================
   Cochages de la session — une tâche cochée ici reste posée, barrée, jusqu'au
   prochain démarrage. Elle ne s'évapore pas sous le doigt : c'est le retour
   qui dit « c'est bien celle-là que tu viens de faire ». Ce n'est PAS un
   journal : rien n'est persisté, et le tableau se vide au changement de jour.
   ========================================================================== */
let _tickDay = null;
let _ticked = {};   // id → cliché des champs que completeTask() a modifiés

// Le cliché vit dans le cochage lui-même (Lot V2-3) : une ligne barrée et son
// moyen de la décocher ont exactement la même durée de vie, celle de la
// session. Impossible d'afficher l'une sans l'autre.
function tickToday(id, snap){
  const k = todayKey();
  if(_tickDay !== k){ _tickDay = k; _ticked = {}; }
  _ticked[id] = snap || null;
}
function untickToday(id){ delete _ticked[id]; }
function tickedToday(){
  return _tickDay === todayKey() ? Object.keys(_ticked) : [];
}
function tickSnapshot(id){
  return _tickDay === todayKey() ? (_ticked[id] || null) : null;
}

let _todayMore = false; // « + N autres » déplié ?

/* ==========================================================================
   Sélection — une seule passe, un seul endroit où se décide ce qui compte.
   Un item n'apparaît jamais dans deux blocs : chaque filtre retire ce que le
   précédent a déjà pris.
   ========================================================================== */

function todayBuckets(){
  const today = todayKey();
  const care = getMaisonItems(); // entretien : isChore(), js/maison.js
  const careIds = care.map(t=>t.id);
  const ticked = tickedToday();

  // Cochée dans la session : elle a sa ligne barrée dans le bloc du jour, et
  // nulle part ailleurs — même si sa récurrence l'a laissée ouverte.
  const done = live(S.tasks).filter(t=>ticked.indexOf(t.id) !== -1 && careIds.indexOf(t.id) === -1);
  const open = live(S.tasks).filter(t=>
    !t.doneAt && careIds.indexOf(t.id) === -1 && ticked.indexOf(t.id) === -1);

  // 1. Seules les vraies deadlines. Jamais un start passé : c'est ce qui
  //    empêche le mur de honte (ROADMAP §6.1).
  const overdue = open.filter(t=>t.due && t.due < today).sort(taskCompare);
  const takenO = overdue.map(t=>t.id);
  const rest = open.filter(t=>takenO.indexOf(t.id) === -1);

  // 6. Ce soir : posé avant le bloc du jour pour qu'une tâche du soir n'y
  //    apparaisse pas deux fois.
  const evening = rest.filter(t=>t.evening && (!t.start || t.start <= today)).sort(taskCompare);
  const takenE = evening.map(t=>t.id);

  // 2. Le jour même : une date posée, arrivée à terme. Jamais someday.
  const scheduled = rest.filter(t=>takenE.indexOf(t.id) === -1 && t.bucket === 'scheduled' &&
    ((t.start && t.start <= today) || (t.due && t.due <= today))).sort(taskCompare);

  // 7. Le mécanisme qui empêche le « un jour » de pourrir silencieusement.
  //    Jamais someday : ce qui n'est pas mûr n'a rien à faire sur cet écran.
  const quick = rest.filter(t=>takenE.indexOf(t.id) === -1 &&
    t.bucket === 'anytime' && (t.effort || 2) === 1).sort(taskCompare).slice(0, TODAY_QUICK_MAX);

  // 3. La journée d'entretien (Lot V3-1) : ce qui est dû ET tient dans le
  //    budget quotidien — décidé par choreDay() (js/maison.js), le seul
  //    endroit où il se décide. Un entretien coché dans la session garde sa
  //    ligne barrée dans ce bloc, pas dans celui des tâches.
  const day = choreDay(today);
  const chores = day.picked.filter(t=>ticked.indexOf(t.id) === -1);
  const choresDone = care.filter(t=>ticked.indexOf(t.id) !== -1);
  const choresWaiting = day.waiting;

  // 4. Habitudes actives aujourd'hui (js/habits.js) — domaine à part, jamais
  //    mêlé aux tâches : une série ne se compte pas comme une jauge.
  const habits = getTodayHabits(today);

  // 5. Courses (js/shopping.js) : un compte, jamais la liste. Ce n'est pas un
  //    dû du jour — comme le bloc 7, il ne gêne jamais l'état vide et n'entre
  //    pas dans la pastille (voir todayBadgeCount()).
  const shopping = shoppingOpenCount();

  // 5 bis. Le repas du moment (js/meals.js, Lot V3-2) : une ligne, même
  //    statut que les courses — un rappel ambiant, ni dû ni pastille.
  const meal = mealTodayLine();

  return {overdue, scheduled, chores, choresDone, choresWaiting, evening, quick, done, habits, shopping, meal};
}

// Pastille de l'icône iOS (ROADMAP §6) : ce qu'il reste à faire aujourd'hui.
// « Si tu as 10 minutes » n'y entre pas — c'est une offre, pas un dû.
function todayBadgeCount(){
  const b = todayBuckets();
  return b.overdue.length + b.scheduled.length + b.chores.length + b.evening.length +
    habitsPendingCount(b.habits);
}

/* ==========================================================================
   Rendu
   ========================================================================== */

function overdueLabel(t, today){
  const n = daysBetween(t.due, today);
  return n <= 1 ? 'Passée d’un jour' : 'Passée de ' + n + ' jours';
}

// Méta d'une ligne du jour : la catégorie, la pièce, et le compteur de reports
// à partir de 3 — discret, sans jugement. Pas de date : elle est aujourd'hui.
function todayMeta(t){
  const bits = [];
  if(CAT_LABELS[t.cat]) bits.push(CAT_LABELS[t.cat]);
  if(t.room && ROOM_LABELS[t.room]) bits.push(ROOM_LABELS[t.room]);
  if((t.postponed || 0) >= 3) bits.push('Reportée ' + t.postponed + ' fois');
  return bits.join(' · ');
}

// Ligne de tâche : la case coche, le corps ouvre la fiche. Pas de bouton
// supprimer ni reporter ici — Aujourd'hui décide, il n'administre pas.
function todayRow(t, meta, cls){
  return '<li class="row'+(cls ? ' '+cls : '')+'">'+
    '<button class="check" role="checkbox" aria-checked="false" aria-label="Marquer fait" onclick="todayDone(\''+t.id+'\')"></button>'+
    '<div class="row-main"'+rowAttrs("taskSheet('"+t.id+"')")+'>'+
      '<div class="row-title">'+esc(t.title)+'</div>'+
      (meta ? '<div class="row-meta">'+meta+'</div>' : '')+
    '</div>'+
  '</li>';
}

// Ligne cochée dans la session (audit A2). Elle n'est plus `disabled` : le
// vert plein de .check.on dit déjà « un doigt peut agir ici » (première phrase
// de la discipline chromatique) — c'était l'attribut qui mentait, pas le
// dessin. Aucun libellé « décocher » ajouté : ce serait un deuxième chemin
// visible vers la même action (CONVENTIONS.md §3, principe 5).
function todayDoneRow(t){
  return '<li class="row done">'+
    '<button class="check on'+popClass(t.id)+'" role="checkbox" aria-checked="true" aria-label="Marquer non fait" '+
      'onclick="todayUndone(\''+t.id+'\')"></button>'+
    '<div class="row-main"><div class="row-title">'+esc(t.title)+'</div></div>'+
  '</li>';
}

function overdueCard(list, i, n){
  const today = todayKey();
  const rows = list.map(t=>{
    const bits = ['<span class="due">'+esc(overdueLabel(t, today))+'</span>'];
    const m = todayMeta(t);
    if(m) bits.push(m);
    return todayRow(t, bits.join(' · '));
  }).join('');
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="overline due">'+(list.length > 1 ? 'Échéances dépassées' : 'Échéance dépassée')+'</div>'+
    '<ul class="list">'+rows+'</ul>'+
  '</div>';
}

function todaySection(b){
  const cap = S.settings.todayCap || 7;
  const shown = _todayMore ? b.scheduled : b.scheduled.slice(0, cap);
  const hidden = b.scheduled.length - shown.length;
  return '<div class="sec"><h2 class="sec-title">Aujourd’hui</h2>'+
      '<span class="sec-count">'+b.scheduled.length+'</span></div>'+
    '<ul class="list list-page">'+
      shown.map(t=>todayRow(t, todayMeta(t))).join('')+
      b.done.map(todayDoneRow).join('')+
    '</ul>'+
    (hidden > 0 ? '<button class="more" onclick="toggleTodayMore()">+ '+hidden+' autre'+(hidden>1?'s':'')+'</button>'
                : (_todayMore && b.scheduled.length > cap ? '<button class="more" onclick="toggleTodayMore()">Réduire</button>' : ''));
}

// 3. Entretien du jour (Lot V3-1) : la carte teintée Maison, avec en
// compteur les minutes qu'il reste — c'est la seule unité qui dise si « ça
// passe » ce soir. Même case que le bloc du jour (todayDone(), annulable et
// décochable) : cocher un entretien ici, c'est exactement le « Fait » de
// Maison. Ce qui est dû mais ne tient pas dans le budget n'est pas caché
// pour autant : une ligne discrète dit qu'il attend, et mène à Maison.
function choreCard(b, i, n){
  const left = b.chores.reduce((s, t)=>s + choreMins(t), 0);
  const rows = b.chores.map(t=>todayRow(t, esc((ROOM_LABELS[t.room] || t.room)+' · '+choreMins(t)+' min'))).join('')+
    b.choresDone.map(todayDoneRow).join('');
  const wait = b.choresWaiting;
  return '<div class="card t-maison">'+birdOnCard(i, n)+
    '<div class="room-head"><h2 class="card-title">Entretien du jour</h2>'+
      (left ? '<span class="room-count">'+left+' min</span>' : '')+'</div>'+
    '<ul class="list">'+rows+'</ul>'+
    (wait ? '<button class="more" onclick="go(\'maison\')">'+wait+(wait > 1 ? ' autres attendent' : ' autre attend')+' demain</button>' : '')+
  '</div>';
}

// 5. Courses : un bouton pleine largeur teinté --t-courses, pas une case à
// cocher — ce n'est pas une tâche, la seule action est « Voir » (en vert),
// jamais un chevron gris (maquette today.html, jamais posé au Lot 5 faute de
// modèle de données). Toujours affiché si la liste n'est pas vide, comme
// « Ce soir » : un rappel ambiant qui ne bloque jamais l'état vide.
function shoppingButtonHtml(n){
  return '<button class="shop" onclick="go(\'shopping\')">'+
    '<span class="shop-l">'+icon('<path d="M5 8h14l-1.2 11H6.2z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path>', 20)+
      n+(n > 1 ? ' articles' : ' article')+' à acheter</span>'+
    '<span class="shop-go">Voir</span>'+
  '</button>';
}

function softSection(titre, list){
  return '<div class="sec soft"><h2 class="sec-title">'+esc(titre)+'</h2></div>'+
    '<ul class="list list-page">'+list.map(t=>todayRow(t, '', 'row-low')).join('')+'</ul>';
}

function renderToday(){
  const b = todayBuckets();
  // L'écran est vide quand plus rien ne demande d'attention. « Ce soir » n'en
  // fait pas partie : la phrase de l'état vide le dit explicitement, et la
  // tâche du soir reste visible dessous pour rester atteignable. Une
  // habitude déjà en retrait (row-soft — sautée ou au quota) ne compte pas :
  // seule une habitude encore actionnable retient l'écran.
  const vide = !b.overdue.length && !b.scheduled.length && !b.done.length &&
               !b.chores.length && !b.choresDone.length && !b.quick.length && !habitsPendingCount(b.habits);

  let html;
  if(vide){
    // Principe 6 (CONVENTIONS.md §3) : quand c'est bon, l'app le dit et ne
    // propose RIEN d'autre — pas d'entretien encore vert, pas de « 10 minutes »,
    // pas de récapitulatif. Un écran qui remplit son propre silence n'est
    // jamais fini.
    // Deux variantes (point laissé ouvert au Lot 5, tranché au Lot 12) : la
    // phrase ne doit pas sous-informer quand la tâche du soir est déjà faite
    // elle aussi — b.evening exclu du calcul de `vide` exprès (voir plus
    // haut), donc il peut encore y avoir quelque chose ce soir à ce point.
    const sousEmpty = b.evening.length
      ? 'Rien ne demande ton attention avant ce soir.'
      : 'Il ne reste rien à faire aujourd’hui.';
    // Le prénom entre aussi ici (arbitrage ROADMAP-V2 §3.6, « l'état vide se
    // personnalise »), et rien de plus : ni récapitulatif nommé, ni emoji.
    const n = userFirstName();
    html = emptyState('C’est bon pour aujourd’hui' + (n ? ', ' + n : '') + '.', sousEmpty);
  } else {
    const hasChores = b.chores.length || b.choresDone.length;
    const nCards = (b.overdue.length ? 1 : 0) + (hasChores ? 1 : 0) + (b.habits.length ? 1 : 0);
    let i = 0;
    html = '';
    if(b.overdue.length) html += overdueCard(b.overdue, i++, nCards);
    if(b.scheduled.length || b.done.length) html += todaySection(b);
    if(hasChores) html += choreCard(b, i++, nCards);
    if(b.habits.length) html += todayHabitsCard(b.habits, i++, nCards);
  }
  // Bloc Repas (Lot V3-3) : le repas du moment et les courses dans une seule
  // carte teintée — les deux mènent à l'onglet Repas.
  if(b.meal || b.shopping){
    html += '<div class="repas-block">'+
      (b.meal ? mealTodayHtml(b.meal) : '')+
      (b.shopping ? shoppingButtonHtml(b.shopping) : '')+
    '</div>';
  }
  if(b.evening.length) html += softSection('Ce soir', b.evening);
  if(!vide && b.quick.length) html += softSection('Si tu as 10 minutes', b.quick);

  document.getElementById('s-today').innerHTML =
    screenHead(todayOverline(), 'Aujourd\'hui') + html + captureBarHtml();
}

/* ---------- Actions ---------- */

function toggleTodayMore(){ _todayMore = !_todayMore; renderToday(); }

/* Cocher, et pouvoir s'en dédire (audit A2) — deux retours arrière, et c'est
   voulu : le toast « Annuler » dans la seconde (on s'est trompé de ligne), la
   case jusqu'au prochain démarrage (on s'est trompé de journée).

   Le cliché porte exactement les champs que completeTask() modifie
   (js/recur.js) : sans lui, décocher une tâche récurrente la laisserait avec
   l'échéance SUIVANTE, et une réalisation de trop dans son historique. */
function todayDone(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  tickToday(id, {       // la ligne reste posée, barrée, jusqu'au prochain démarrage
    doneAt: t.doneAt, due: t.due, postponed: t.postponed || 0,
    history: (t.history || []).slice()
  });
  completeTask(t);    // recalcule l'échéance si récurrente (js/recur.js)
  save();
  markPop(id);        // la case de la ligne barrée joue sa petite animation (Lot V3-3)
  renderToday();
  undoable(t.title + ' : fait.', ()=>todayUndone(id));
}

function todayUndone(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const snap = tickSnapshot(id);
  if(snap){
    t.doneAt = snap.doneAt; t.due = snap.due;
    t.postponed = snap.postponed; t.history = snap.history;
  } else {
    t.doneAt = null;  // cliché perdu : on relâche au moins la tâche
  }
  touch(t);
  untickToday(id);
  save();
  hideToast();
  renderToday();
}
