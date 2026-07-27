/* ==========================================================================
   maison.js — écran Maison : vue par pièce (ROADMAP-V1.md §6 bis). Réunit les
   tâches d'entretien (repeat.from:'done' rattachée à une pièce, glossaire
   CONVENTIONS.md §6) sous une jauge de fraîcheur continue par élément et une
   jauge agrégée par pièce (la plus basse de ses éléments). Un tap sur une
   ligne marque la tâche faite. Les plantes rejoindront cette même structure
   de ligne au Lot 7 (soins de plantes mêlés à l'entretien, même moteur ⑯) :
   aucun code plantes ici, seulement une structure qui les accueillera.
   ========================================================================== */

// Textuel neutre à côté de la jauge agrégée d'une pièce — jamais « en retard »,
// jamais « manqué » (CONVENTIONS.md §3).
function freshLabel(f){
  if(f <= 0) return 'À faire';
  if(f < 0.4) return 'Bientôt';
  if(f < 0.7) return 'Soin moyen';
  return 'Frais';
}

function getMaisonItems(){
  return live(S.tasks).filter(t=>t.room && t.repeat && t.repeat.from === 'done');
}

function maisonAgo(t){
  if(!t.doneAt) return 'Jamais faite';
  const n = daysBetween(dayKey(new Date(t.doneAt)), todayKey());
  if(n <= 0) return 'Aujourd’hui';
  return 'Il y a '+n+(n>1 ? ' jours' : ' jour');
}

// Jauge posée à droite, sa légende dessous — disposition de la maquette,
// appliquée au Lot V1-5 (c'était une jauge pleine largeur sous le titre).
function maisonItemRow(t){
  const f = freshness(t, Date.now());
  return '<li class="row row-care" onclick="tapMaisonItem(\''+t.id+'\')">'+
    '<div class="row-main"><div class="row-title">'+esc(t.title)+'</div></div>'+
    '<div class="gauge-cell">'+
      '<div class="gauge"><div class="gauge-fill" id="mfill-'+t.id+'" '+
        'style="width:'+gaugeWidth(f)+';background:'+gaugeColor(f)+'"></div></div>'+
      '<div class="gauge-cap">'+esc(maisonAgo(t))+'</div>'+
    '</div>'+
  '</li>';
}

// Carte blanche, nom de pièce en 18 px/700, jauge agrégée à droite sous un
// filet. La jauge de la pièce est plus large que celles des lignes : c'est la
// seule différence de largeur qui porte un sens.
function maisonRoomSection(room, items, i, n){
  const f = items.reduce((min, t)=>Math.min(min, freshness(t, Date.now())), 1);
  const sorted = items.slice().sort((a,b)=>freshness(a, Date.now()) - freshness(b, Date.now()));
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="room-head">'+
      '<h2 class="card-title">'+esc(ROOM_LABELS[room] || room)+'</h2>'+
      '<div class="gauge-cell">'+
        '<div class="gauge"><div class="gauge-fill" style="width:'+gaugeWidth(f)+';background:'+gaugeColor(f)+'"></div></div>'+
        '<div class="gauge-cap">'+esc(freshLabel(f))+'</div>'+
      '</div>'+
    '</div>'+
    '<ul class="list room-list">'+sorted.map(maisonItemRow).join('')+'</ul>'+
  '</div>';
}

function tapMaisonItem(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const fill = document.getElementById('mfill-'+id);
  if(fill) fill.style.width = '100%'; // retour visuel immédiat : la jauge remonte avant le rendu complet
  completeTask(t);
  save();
  setTimeout(renderMaison, reduceMotion() ? 0 : 260);
}

function renderMaison(){
  const items = getMaisonItems();
  const byRoom = {};
  items.forEach(t=>{ (byRoom[t.room] = byRoom[t.room] || []).push(t); });
  const rooms = ROOM_ORDER.filter(r=>byRoom[r] && byRoom[r].length);
  const body = rooms.length
    ? rooms.map((r,i)=>maisonRoomSection(r, byRoom[r], i, rooms.length)).join('')
    : emptyState('Rien à entretenir pour l’instant.', 'Ajoute un modèle d’entretien ci-dessous.');
  const sur = items.length
    ? items.length + (items.length > 1 ? ' éléments suivis' : ' élément suivi')
    : '';
  document.getElementById('s-maison').innerHTML =
    screenHead(sur, 'Maison')+
    body+
    '<button class="btn secondary btn-full" onclick="entretienSheet()">Ajouter un entretien</button>';
}

/* ==========================================================================
   Feuille d'ajout : on choisit une pièce, on coche des modèles du catalogue
   (data/entretien.js), créés en une fois comme tâches récurrentes 'done'.
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
    return '<li class="row" onclick="toggleEntModel('+i+')">'+
      '<button class="check'+(on?' on':'')+'" aria-label="Sélectionner"></button>'+
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
