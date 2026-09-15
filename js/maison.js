/* ==========================================================================
   maison.js — écran Maison : vue par pièce (ROADMAP-V1.md §6 bis). Réunit les
   tâches d'entretien (repeat.from:'done' rattachée à une pièce, glossaire
   CONVENTIONS.md §6) ET, depuis le Lot V1-7, les soins de plantes de la même
   pièce (js/plants.js, même moteur de fraîcheur) sous une jauge continue par
   élément.

   Lot V2-5 (audit A4/B1/B2/B4/C4, ROADMAP-V2.md §3.7) : une ligne d'entretien
   tapait au corps entier pour COMPLÉTER, sans confirmation ni retour arrière
   — un frôlement effaçait la vraie date du dernier passage — quand la même
   ligne pour une plante ouvrait une fiche de 700 px pour trouver « Arrosé ».
   Règle unique désormais : un bouton d'action à droite agit (et s'annule),
   le reste de la ligne ouvre le détail — la fiche tâche (taskSheet(), Lot
   V1-3, qui sait déjà tout éditer y compris la récurrence) pour un entretien,
   la fiche plante pour un soin. La légende ne montre plus « il y a N jours »
   (illisible sans connaître l'intervalle) mais « À faire »/« Dans N j » ; la
   jauge distingue enfin les degrés de retard (rawFreshness(), js/ui.js) ; la
   jauge agrégée de pièce, redondante et toujours rouge dès qu'un élément est
   dû, cède la place à un simple compte.
   ========================================================================== */

// Un entretien créé par erreur se supprime désormais d'un balayage à gauche,
// comme sur Tâches (delTask(), js/tasks.js — réutilisé tel quel, pas dupliqué :
// confirmation, tombstone et annulation par toast lui appartiennent déjà).
// Jamais posé sur une ligne de plante : supprimer une plante entière passe par
// sa fiche (deletePlant()), « supprimer un soin » n'a pas de sens isolément.
const PLANT_ACTION = {
  water: {label:'Arrosé', fn:'waterPlantAction'},
  feed: {label:'Engrais', fn:'feedPlantAction'},
  repot: {label:'Rempoté', fn:'repotPlantAction'}
};

function getMaisonItems(){
  return live(S.tasks).filter(t=>t.room && t.repeat && t.repeat.from === 'done');
}

// Conservée pour today.js (careCard()), qui l'affiche encore telle quelle
// dans son propre bloc Entretien — un contexte différent de celui audité ici
// (une seule ligne à la fois, pas une comparaison de plusieurs jauges).
function maisonAgo(t){
  if(!t.doneAt) return 'Jamais faite';
  const n = daysBetween(dayKey(new Date(t.doneAt)), todayKey());
  if(n <= 0) return 'Aujourd’hui';
  return 'Il y a '+n+(n>1 ? ' jours' : ' jour');
}

// Légende tournée vers l'action (audit B2), à la place de maisonAgo()/
// careAgo() dans cette vue : « il y a 300 jours » en vert juste au-dessus de
// « il y a 6 jours » en rouge ne se lit pas sans connaître l'intervalle
// attendu de chacun. Dérivée de la même fraction que la jauge (f × jours de
// l'intervalle) : les deux ne peuvent jamais se contredire, par construction.
// La date réelle du dernier passage n'est pas perdue : elle reste dans le
// détail (fiche plante ; l'entretien réutilise taskSheet(), point 5).
function freshCue(f, days){
  if(!days || f <= 0) return 'À faire';
  const rem = Math.round(f * days);
  if(rem <= 0) return 'À faire';
  if(rem < 14) return 'Dans '+rem+' j';
  const sem = Math.round(rem/7);
  return 'Dans '+sem+(sem > 1 ? ' semaines' : ' semaine');
}

// Ligne générique — jauge seule à droite (sans légende, elle est montée dans
// row-meta), puis le bouton d'action. `e` unifie une tâche d'entretien et un
// soin de plante : {title, f, cue, onTap, actLabel, actFn, fillId, swipeLeft}.
// `fillId` (entretien seul) : tapMaisonItem() fait remonter la jauge à 100 %
// avant le rendu complet. `swipeLeft` (entretien seul) : voir PLANT_ACTION.
function careRowHtml(e){
  return '<li class="row row-care"'+(e.swipeLeft ? ' data-swipe-left="'+e.swipeLeft+'"' : '')+'>'+
    '<div class="row-main"'+rowAttrs(e.onTap)+'>'+
      '<div class="row-title">'+esc(e.title)+'</div>'+
      '<div class="row-meta">'+esc(e.cue)+'</div>'+
    '</div>'+
    '<div class="gauge gauge-side"><div class="gauge-fill"'+(e.fillId ? ' id="'+e.fillId+'"' : '')+' '+
      'style="width:'+gaugeWidth(e.f)+';background:'+gaugeColor(e.f)+'"></div></div>'+
    '<button class="row-act" onclick="'+e.actFn+'">'+esc(e.actLabel)+'</button>'+
  '</li>';
}

// Carte blanche, nom de pièce en 18 px/700, compte à droite sous un filet.
// `taskItems` (entretien) et `plantItems` (soins, js/plants.js) sont mêlés
// puis triés ensemble par fraîcheur croissante — le plus dû en tête, la
// jauge signée (rawFreshness()) trie désormais correctement même entre deux
// éléments en retard, plutôt que de les départager arbitrairement à f=0.
function maisonRoomSection(room, taskItems, plantItems, i, n){
  const entries = taskItems.map(t=>{
    const days = intervalDays(t.repeat);
    const f = rawFreshness(t.doneAt, days);
    return {
      title:t.title, f, cue:freshCue(f, days),
      onTap:"taskSheet('"+t.id+"')", actLabel:'Fait', actFn:"tapMaisonItem('"+t.id+"')",
      fillId:'mfill-'+t.id, swipeLeft:"delTask('"+t.id+"')"
    };
  }).concat(plantItems.map(s=>{
    const act = PLANT_ACTION[s.kind];
    return {
      title:s.title, f:s.f, cue:freshCue(s.f, s.days),
      onTap:"plantSheet('"+s.plantId+"')", actLabel:act.label, actFn:act.fn+"('"+s.plantId+"')",
      fillId:null, swipeLeft:null
    };
  }));
  const sorted = entries.slice().sort((a, b)=>a.f - b.f);
  // Remplace l'ancienne jauge agrégée (audit B4) : minimum de ses éléments,
  // donc rouge dès qu'un seul était dû et redondante avec la ligne du dessous
  // — elle ne disait jamais rien que la première ligne triée ne disait déjà.
  // Un compte reste utile d'un coup d'œil sans rien répéter.
  const due = entries.filter(e=>e.f <= 0).length;
  const count = due ? due+(due>1 ? ' éléments à faire' : ' élément à faire') : 'Tout est frais';
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="room-head">'+
      '<h2 class="card-title">'+esc(ROOM_LABELS[room] || room)+'</h2>'+
      '<span class="room-count">'+esc(count)+'</span>'+
    '</div>'+
    '<ul class="list room-list">'+sorted.map(careRowHtml).join('')+'</ul>'+
  '</div>';
}

// Bouton d'action (« Fait ») d'une ligne d'entretien — immédiat, annulable
// (point 1) : annuler restaure exactement le doneAt/due/postponed d'avant ET
// retire l'entrée que completeTask() vient d'ajouter à history, même
// discipline que doneTask()/todayDone() (js/tasks.js, js/today.js).
function tapMaisonItem(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const fill = document.getElementById('mfill-'+id);
  if(fill) fill.style.width = '100%'; // retour visuel immédiat : la jauge remonte avant le rendu complet
  // Motivation légère (Lot 10) : la toute première réalisation d'un entretien
  // annuel mérite un mot sobre — après ça, history n'est plus vide, ça ne se
  // reproduit plus jamais pour cette tâche. Le message passe désormais par
  // undoable() comme les autres : rien n'empêche de se raviser sur un jalon.
  const firstAnnual = t.repeat && t.repeat.kind === 'year' && !(t.history && t.history.length);
  const snap = {doneAt:t.doneAt, due:t.due, postponed:t.postponed||0, history:(t.history||[]).slice()};
  completeTask(t);
  save();
  setTimeout(renderMaison, reduceMotion() ? 0 : 260);
  const msg = firstAnnual
    ? 'Entretien annuel réalisé pour la première fois : « ' + t.title + ' ».'
    : t.title + ' : fait.';
  undoable(msg, ()=>{
    const x = S.tasks.find(y=>y.id === id);
    if(!x) return;
    x.doneAt = snap.doneAt; x.due = snap.due; x.postponed = snap.postponed; x.history = snap.history;
    touch(x);
    save();
    renderMaison();
  });
}

function renderMaison(){
  const items = getMaisonItems();
  const soins = getPlantCareItems(); // js/plants.js — soins d'arrosage/engrais/rempotage
  const byRoom = {};
  items.forEach(t=>{ (byRoom[t.room] = byRoom[t.room] || []).push(t); });
  const byRoomSoins = {};
  soins.forEach(s=>{ (byRoomSoins[s.room] = byRoomSoins[s.room] || []).push(s); });
  const rooms = ROOM_ORDER.filter(r=>(byRoom[r] && byRoom[r].length) || (byRoomSoins[r] && byRoomSoins[r].length));
  const body = rooms.length
    ? rooms.map((r,i)=>maisonRoomSection(r, byRoom[r] || [], byRoomSoins[r] || [], i, rooms.length)).join('')
    : emptyState('Rien à entretenir pour l’instant.', 'Ajoute un modèle d’entretien ou une plante ci-dessous.');
  const total = items.length + soins.length;
  const sur = total ? total + (total > 1 ? ' éléments suivis' : ' élément suivi') : '';
  document.getElementById('s-maison').innerHTML =
    screenHead(sur, 'Maison')+
    body+
    '<button class="btn secondary btn-full" onclick="entretienSheet()">Ajouter un entretien</button>'+
    '<button class="btn secondary btn-full" onclick="plantSheet(null)">Ajouter une plante</button>';
}

/* ==========================================================================
   Feuille d'ajout : on choisit une pièce, on coche des modèles du catalogue
   (data/entretien.js), créés en une fois comme tâches récurrentes 'done'.
   L'édition et la suppression d'un entretien déjà créé passent désormais par
   sa ligne dans Maison (taskSheet() au tap, balayage pour supprimer, point 5)
   — cette feuille reste réservée à la création.
   ========================================================================== */
let _entSheet = null;

function entretienSheet(){
  _entSheet = {room: ROOM_ORDER[0], checked: {}};
  openSheet(entretienSheetHtml());
}
function setEntRoom(r){ _entSheet.room = r; _entSheet.checked = {}; openSheet(entretienSheetHtml()); }
function toggleEntModel(i){ _entSheet.checked[i] = !_entSheet.checked[i]; openSheet(entretienSheetHtml()); }

function entretienSheetHtml(){
  const roomChips = ROOM_ORDER.map(r=>
    '<button class="chip'+(_entSheet.room===r?' on':'')+'" onclick="setEntRoom(\''+r+'\')">'+esc(ROOM_LABELS[r])+'</button>'
  ).join('');
  const modelRows = ENTRETIEN.map((m, i)=> m.room === _entSheet.room ? {m, i} : null).filter(Boolean);
  const rows = modelRows.map(({m, i})=>{
    const on = !!_entSheet.checked[i];
    return '<li class="row"'+rowAttrs('toggleEntModel('+i+')')+'>'+
      '<button class="check'+(on?' on':'')+'" role="checkbox" aria-checked="'+on+'" aria-label="Sélectionner"></button>'+
      '<div class="row-main"><div class="row-title">'+esc(m.title)+'</div>'+
        '<div class="row-meta">Tous les '+m.intervalDays+' jours</div></div>'+
    '</li>';
  }).join('');
  const n = Object.keys(_entSheet.checked).filter(k=>_entSheet.checked[k]).length;
  return '<p class="sheet-title">Ajouter un entretien</p>'+
    '<div class="field-group"><span class="overline">Pièce</span><div class="chips">'+roomChips+'</div></div>'+
    '<div class="field-group"><ul class="list">'+
      (rows || '<li class="row"><div class="row-main"><div class="row-meta">Aucun modèle pour cette pièce.</div></div></li>')+
    '</ul></div>'+
    '<button class="btn primary btn-full" onclick="addEntretienModels()"'+(n?'':' disabled')+'>Ajouter'+(n?' ('+n+')':'')+'</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

function addEntretienModels(){
  const idxs = Object.keys(_entSheet.checked).filter(k=>_entSheet.checked[k]).map(Number);
  if(!idxs.length) return;
  idxs.forEach(i=>{
    const m = ENTRETIEN[i];
    if(!m) return;
    S.tasks.push(stamp({
      title: m.title, notes:'', cat:'entretien', room:_entSheet.room, bucket:'anytime',
      start:null, due:null, evening:false, prio:0, effort:m.effort||2,
      repeat:{kind:'day', n:m.intervalDays, days:[], from:'done'},
      doneAt: Date.now(), history:[], postponed:0, touchedAt:Date.now()
    }));
  });
  save();
  closeSheet();
  renderMaison();
  toast(idxs.length>1 ? idxs.length+' entretiens ajoutés' : 'Entretien ajouté');
}
