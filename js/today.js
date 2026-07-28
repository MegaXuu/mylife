/* ==========================================================================
   today.js — écran « Aujourd'hui », le cœur de l'app (ROADMAP-V1.md §6).
   Il ne liste pas, il DÉCIDE. Ordre imposé par la roadmap :
     1. Échéances dépassées   — uniquement les vraies deadlines (due < aujourd'hui)
     2. Aujourd'hui           — start ≤ aujourd'hui et récurrences dues, plafonné
     3. Entretien             — au plus 3 jauges, les plus basses
     4. Habitudes du jour     — actives aujourd'hui, saisie en ligne (js/habits.js)
     5. Courses               — une ligne, jamais la liste (js/shopping.js)
     6. Ce soir               — sous-section discrète
     7. Si tu as 10 minutes   — 1 à 3 tâches anytime à effort court

   Depuis le Lot V1-7 : les soins de plantes réellement dus (jauge à 0,
   js/plants.js) rejoignent le bloc 2 « Aujourd'hui » — jamais le bloc 3
   Entretien, réservé aux tâches from:'done' (ROADMAP §6.2). `scheduled`
   devient donc un tableau mixte d'entrées {id, kind:'task'|'soin', t|s} ;
   `id` est dupliqué au premier niveau pour que has()/tri/plafond restent
   indifférents au contenu, tâche ou soin.

   Depuis le Lot V1-8 : les habitudes actives aujourd'hui (js/habits.js,
   getTodayHabits()) rejoignent la sélection — un domaine à part, jamais mêlé
   aux tâches (une série ne se compte pas comme une jauge, CONVENTIONS.md §6).

   Mise en forme : la maquette fait foi (cf. le bloc Lot V1-5 du <style>).
   Le bloc du jour est le seul à ne pas être une carte : c'est ce qui le rend
   dominant, il respire pleine largeur pendant que le reste est boîté.
   ========================================================================== */

const TODAY_CARE_MAX = 3;      // au plus 3 entretiens (ROADMAP §6.3)
const TODAY_CARE_SEUIL = 0.4;  // … et seulement ceux qui approchent d'« à faire »
const TODAY_QUICK_MAX = 3;     // « si tu as 10 minutes » : 1 à 3 tâches (§6.7)

// Sur-titre de l'écran : « Dimanche 26 juillet ». La casse de phrase impose
// la majuscule initiale que toLocaleDateString ne met pas en français.
function longDate(d){
  const s = (d || new Date()).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ==========================================================================
   Cochages de la session — une tâche cochée ici reste posée, barrée, jusqu'au
   prochain démarrage. Elle ne s'évapore pas sous le doigt : c'est le retour
   qui dit « c'est bien celle-là que tu viens de faire ». Ce n'est PAS un
   journal : rien n'est persisté, et le tableau se vide au changement de jour.
   ========================================================================== */
let _tickDay = null;
let _ticked = [];

function tickToday(id){
  const k = todayKey();
  if(_tickDay !== k){ _tickDay = k; _ticked = []; }
  if(_ticked.indexOf(id) === -1) _ticked.push(id);
}
function tickedToday(){
  return _tickDay === todayKey() ? _ticked : [];
}

let _todayMore = false; // « + N autres » déplié ?

/* ==========================================================================
   Sélection — une seule passe, un seul endroit où se décide ce qui compte.
   Un item n'apparaît jamais dans deux blocs : chaque filtre retire ce que le
   précédent a déjà pris.
   ========================================================================== */

// Entretien : tâche récurrente « après réalisation » rattachée à une pièce
// (glossaire CONVENTIONS.md §6). Même définition que getMaisonItems().
function todayCareItems(){
  return live(S.tasks).filter(t=>t.room && t.repeat && t.repeat.from === 'done');
}

function todayBuckets(){
  const today = todayKey(), now = Date.now();
  const care = todayCareItems();
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

  // 2. Le jour même : une date posée, arrivée à terme — et, depuis le Lot
  //    V1-7, les soins de plantes réellement dus (jauge à 0), jamais someday
  //    ni le bloc Entretien.
  const scheduledTasks = rest.filter(t=>takenE.indexOf(t.id) === -1 && t.bucket === 'scheduled' &&
    ((t.start && t.start <= today) || (t.due && t.due <= today))).sort(taskCompare);
  const duePlants = getPlantCareItems().filter(s=>s.f <= 0).sort((a,b)=>a.f - b.f);
  const scheduled = scheduledTasks.map(t=>({id:t.id, kind:'task', t}))
    .concat(duePlants.map(s=>({id:s.id, kind:'soin', s})));

  // 7. Le mécanisme qui empêche le « un jour » de pourrir silencieusement.
  //    Jamais someday : ce qui n'est pas mûr n'a rien à faire sur cet écran.
  const quick = rest.filter(t=>takenE.indexOf(t.id) === -1 &&
    t.bucket === 'anytime' && (t.effort || 2) === 1).sort(taskCompare).slice(0, TODAY_QUICK_MAX);

  // 3. Les jauges les plus basses, toutes pièces confondues — et seulement
  //    celles qui approchent d'« à faire ». Sans ce seuil le bloc serait
  //    permanent, et l'écran ne saurait jamais dire « c'est bon ».
  const soins = care.map(t=>({t, f: freshness(t, now)}))
    .filter(x=>x.f < TODAY_CARE_SEUIL)
    .sort((a,b)=>a.f - b.f)
    .slice(0, TODAY_CARE_MAX);

  // 4. Habitudes actives aujourd'hui (js/habits.js) — domaine à part, jamais
  //    mêlé aux tâches : une série ne se compte pas comme une jauge.
  const habits = getTodayHabits(today);

  // 5. Courses (js/shopping.js) : un compte, jamais la liste. Ce n'est pas un
  //    dû du jour — comme le bloc 7, il ne gêne jamais l'état vide et n'entre
  //    pas dans la pastille (voir todayBadgeCount()).
  const shopping = shoppingOpenCount();

  return {overdue, scheduled, soins, evening, quick, done, habits, shopping};
}

// Pastille de l'icône iOS (ROADMAP §6) : ce qu'il reste à faire aujourd'hui.
// « Si tu as 10 minutes » n'y entre pas — c'est une offre, pas un dû.
function todayBadgeCount(){
  const b = todayBuckets();
  return b.overdue.length + b.scheduled.length + b.soins.length + b.evening.length +
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
    '<button class="check" aria-label="Marquer fait" onclick="todayDone(\''+t.id+'\')"></button>'+
    '<div class="row-main" onclick="taskSheet(\''+t.id+'\')">'+
      '<div class="row-title">'+esc(t.title)+'</div>'+
      (meta ? '<div class="row-meta">'+meta+'</div>' : '')+
    '</div>'+
  '</li>';
}

// Soin de plante dû, dans le bloc du jour : même disposition que le bloc
// Entretien (row-care + gauge-side), mais un tap ouvre la fiche plante
// (js/plants.js) au lieu de compléter directement — c'est là que vit le
// bouton « arrosé ».
function todayPlantRow(s){
  const lieu = ROOM_LABELS[s.room] || s.room;
  return '<li class="row row-care" onclick="plantSheet(\''+s.plantId+'\')">'+
    '<div class="row-main">'+
      '<div class="row-title">'+esc(s.title)+'</div>'+
      (lieu ? '<div class="row-meta">'+esc(lieu)+'</div>' : '')+
    '</div>'+
    '<div class="gauge gauge-side"><div class="gauge-fill" style="width:'+gaugeWidth(s.f)+';background:'+gaugeColor(s.f)+'"></div></div>'+
  '</li>';
}

function todayDoneRow(t){
  return '<li class="row done">'+
    '<button class="check on" aria-label="Fait" disabled></button>'+
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
      shown.map(e=> e.kind === 'soin' ? todayPlantRow(e.s) : todayRow(e.t, todayMeta(e.t))).join('')+
      b.done.map(todayDoneRow).join('')+
    '</ul>'+
    (hidden > 0 ? '<button class="more" onclick="toggleTodayMore()">+ '+hidden+' autre'+(hidden>1?'s':'')+'</button>'
                : (_todayMore && b.scheduled.length > cap ? '<button class="more" onclick="toggleTodayMore()">Réduire</button>' : ''));
}

function careCard(soins, i, n){
  const rows = soins.map(({t, f})=>{
    const lieu = ROOM_LABELS[t.room] || t.room;
    const etat = f <= 0 ? '<b>À faire</b>' : esc(maisonAgo(t));
    return '<li class="row row-care" onclick="tapTodayCare(\''+t.id+'\')">'+
      '<div class="row-main">'+
        '<div class="row-title">'+esc(t.title)+'</div>'+
        '<div class="row-meta">'+esc(lieu)+' · '+etat+'</div>'+
      '</div>'+
      '<div class="gauge gauge-side"><div class="gauge-fill" id="tfill-'+t.id+'" '+
        'style="width:'+gaugeWidth(f)+';background:'+gaugeColor(f)+'"></div></div>'+
    '</li>';
  }).join('');
  return '<div class="card t-maison">'+birdOnCard(i, n)+
    '<h2 class="card-title">Entretien</h2>'+
    '<ul class="list">'+rows+'</ul>'+
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
               !b.soins.length && !b.quick.length && !habitsPendingCount(b.habits);

  let html;
  if(vide){
    // Principe 6 (CONVENTIONS.md §3) : quand c'est bon, l'app le dit et ne
    // propose RIEN d'autre — pas d'entretien encore vert, pas de « 10 minutes »,
    // pas de récapitulatif. Un écran qui remplit son propre silence n'est
    // jamais fini.
    html = emptyState('C’est bon pour aujourd’hui.', 'Rien ne demande ton attention avant ce soir.');
  } else {
    const nCards = (b.overdue.length ? 1 : 0) + (b.soins.length ? 1 : 0) + (b.habits.length ? 1 : 0);
    let i = 0;
    html = '';
    if(b.overdue.length) html += overdueCard(b.overdue, i++, nCards);
    if(b.scheduled.length || b.done.length) html += todaySection(b);
    if(b.soins.length) html += careCard(b.soins, i++, nCards);
    if(b.habits.length) html += todayHabitsCard(b.habits, i++, nCards);
  }
  if(b.shopping) html += shoppingButtonHtml(b.shopping);
  if(b.evening.length) html += softSection('Ce soir', b.evening);
  if(!vide && b.quick.length) html += softSection('Si tu as 10 minutes', b.quick);

  document.getElementById('s-today').innerHTML =
    screenHead(longDate(), 'Aujourd\'hui') + html + captureBarHtml();
}

/* ---------- Actions ---------- */

function toggleTodayMore(){ _todayMore = !_todayMore; renderToday(); }

function todayDone(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  tickToday(id);      // la ligne reste posée, barrée, jusqu'au prochain démarrage
  completeTask(t);    // recalcule l'échéance si récurrente (js/recur.js)
  save();
  renderToday();
}

// Entretien : un tap sur la ligne suffit, comme dans Maison. Retour visuel
// immédiat — la jauge remonte avant le rendu complet.
function tapTodayCare(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const fill = document.getElementById('tfill-'+id);
  if(fill) fill.style.width = '100%';
  // Même célébration sobre qu'en Maison (js/maison.js tapMaisonItem) : les
  // deux surfaces complètent la même tâche, la fête ne doit avoir lieu que
  // depuis l'une ou l'autre, jamais deux fois.
  const firstAnnual = t.repeat && t.repeat.kind === 'year' && !(t.history && t.history.length);
  completeTask(t);
  save();
  if(firstAnnual) toast('Entretien annuel réalisé pour la première fois : « ' + t.title + ' ».');
  setTimeout(renderToday, reduceMotion() ? 0 : 260);
}
