/* ==========================================================================
   maison.js — domaine Entretien : l'écran Maison (vue par pièce), le moteur
   du budget d'entretien quotidien lu par « Aujourd'hui », et le pack maison.

   Entretien = tâche récurrente « après réalisation » rattachée à une pièce
   (glossaire CONVENTIONS.md §6) — isChore(). Depuis le Lot V3-1 :
     · les plantes ne sont plus un domaine à part (js/plants.js retiré) : une
       plante, c'est un entretien « S'occuper des plantes » comme un autre ;
     · un entretien porte une durée (t.mins) : « Aujourd'hui » ne propose
       chaque jour que ce qui tient dans le budget réglé (30 min par défaut),
       le plus urgent d'abord — choreDay(). Sans ce budget, une maison de 40
       entretiens ferait des journées à 8 lignes, et l'app serait abandonnée
       le troisième jour ;
     · un entretien peut tomber à jour fixe (repeat.kind 'week' + days, la
       serpillière du samedi) au lieu de glisser avec sa dernière réalisation ;
     · le pack maison (data/entretien.js, `pack:true`) s'installe d'un tap, ses
       premières échéances étalées par packSchedule() pour que rien ne tombe
       le même jour.
   Règles d'interface du Lot V2-5, inchangées : le bouton « Fait » à droite
   agit (et s'annule), le reste de la ligne ouvre le détail (taskSheet()),
   un balayage à gauche supprime (delTask(), js/tasks.js).
   ========================================================================== */

const CHORE_BUDGET_DEFAULT = 30; // minutes d'entretien proposées par jour

function isChore(t){ return !!(t && t.room && t.repeat && t.repeat.from === 'done'); }
function getMaisonItems(){ return live(S.tasks).filter(isChore); }

/* ==========================================================================
   Moteur — fonctions pures sur une tâche et une date 'YYYY-MM-DD', testées
   isolément (test.mjs). Tout est calculé AU JOUR, jamais à la milliseconde :
   la liste d'« Aujourd'hui » ne doit pas changer d'elle-même entre 9 h et
   21 h, seulement quand on agit ou qu'on change de jour.
   ========================================================================== */

// Jours fixes d'un entretien (serpillière du samedi), ou null.
function choreFixedDays(t){
  const r = t.repeat;
  return (r && r.kind === 'week' && r.days && r.days.length) ? r.days : null;
}

// Prochaine échéance. Jamais fait → aujourd'hui ; sinon nextDue() (js/recur.js)
// depuis la dernière réalisation — c'est lui qui sait aussi retrouver le
// prochain samedi d'un entretien à jour fixe, et faire le calcul calendaire
// exact d'un mois ou d'un an.
function choreDueKey(t, today){
  today = today || todayKey();
  if(!t.doneAt) return today;
  return nextDue(t, today);
}

// Fraîcheur au jour près : jours restants / intervalle. 1 = vient d'être
// fait, 0 = à faire aujourd'hui, négatif = à faire depuis un moment —
// non bornée, pour que la jauge et le tri distinguent les degrés de retard
// (même raison qu'au Lot V2-5, audit B1).
function choreFresh(t, today){
  today = today || todayKey();
  const days = intervalDays(t.repeat) || 1;
  return daysBetween(today, choreDueKey(t, today)) / days;
}

// Durée en minutes : le champ du Lot V3-1, sinon déduite de l'effort pour
// un entretien créé avant lui.
function choreMins(t){ return t.mins || EFFORT_MINS[t.effort || 2] || 15; }

// Charge moyenne de la maison, en minutes par jour — ce que coûte l'ensemble
// des entretiens s'ils sont tous tenus à leur rythme.
function choreLoad(items){
  return (items || getMaisonItems()).reduce((s, t)=>s + choreMins(t) / (intervalDays(t.repeat) || 1), 0);
}

function choreBudget(){
  const b = parseInt(S.settings && S.settings.choreBudget, 10);
  return b > 0 ? b : CHORE_BUDGET_DEFAULT;
}

/* La journée d'entretien — le seul endroit où elle se décide.
   Ce qui a déjà été fait aujourd'hui (depuis Maison comme depuis Aujourd'hui)
   entame le budget. Parmi ce qui est dû, les entretiens à jour fixe passent
   d'abord (c'est leur jour), puis le plus en retard relativement à son propre
   rythme (fraîcheur la plus basse), puis le plus court. On prend tout ce qui
   tient ; ce qui ne tient pas attend demain, où il sera plus urgent et donc
   pris en premier. Une seule entorse : si rien n'est encore fait ni pris, le
   premier passe même s'il dépasse le budget à lui seul — sinon un entretien
   plus long que le budget ne serait jamais proposé. */
function choreDay(today){
  today = today || todayKey();
  const items = getMaisonItems();
  const doneToday = items.filter(t=>t.doneAt && dayKey(new Date(t.doneAt)) === today);
  const used = doneToday.reduce((s, t)=>s + choreMins(t), 0);
  const budget = choreBudget();
  const due = items.filter(t=>doneToday.indexOf(t) === -1 && choreDueKey(t, today) <= today)
    .map(t=>({t, f:choreFresh(t, today), fixed:choreFixedDays(t) ? 1 : 0, m:choreMins(t)}))
    .sort((a, b)=>(b.fixed - a.fixed) || (a.f - b.f) || (a.m - b.m));
  const picked = [];
  let total = used;
  due.forEach(c=>{
    if(total + c.m <= budget || (!picked.length && !doneToday.length)){
      picked.push(c.t);
      total += c.m;
    }
  });
  return {picked, doneToday, used, budget, waiting: due.length - picked.length};
}

/* ==========================================================================
   Rendu de l'écran Maison
   ========================================================================== */

// Légende tournée vers l'action (audit B2, Lot V2-5), dérivée de la même
// échéance que la jauge : les deux ne peuvent jamais se contredire. Un
// entretien à jour fixe dit son jour (« Samedi ») plutôt qu'un compte.
function choreCue(t, today){
  today = today || todayKey();
  const due = choreDueKey(t, today);
  const n = daysBetween(today, due);
  if(n <= 0) return 'À faire';
  if(n === 1) return 'Demain';
  if(choreFixedDays(t) && n < 7){
    const d = new Date(due+'T00:00').getDay();
    return cap(DOW_NAMES[d === 0 ? 7 : d]);
  }
  if(n < 14) return 'Dans '+n+' j';
  const sem = Math.round(n/7);
  if(n < 60) return 'Dans '+sem+' semaines';
  const mois = Math.round(n/30);
  return 'Dans '+mois+' mois';
}

// Ligne d'entretien : légende + durée, jauge à droite, bouton « Fait ». Le
// corps ouvre la fiche (taskSheet() sait tout éditer, récurrence et durée
// comprises), un balayage à gauche supprime.
function choreRowHtml(t, today){
  const f = choreFresh(t, today);
  return '<li class="row row-care" data-swipe-left="delTask(\''+t.id+'\')">'+
    '<div class="row-main"'+rowAttrs("taskSheet('"+t.id+"')")+'>'+
      '<div class="row-title">'+esc(t.title)+'</div>'+
      '<div class="row-meta">'+esc(choreCue(t, today))+' · '+choreMins(t)+' min</div>'+
    '</div>'+
    '<div class="gauge gauge-side"><div class="gauge-fill" id="mfill-'+t.id+'" '+
      'style="width:'+gaugeWidth(f)+';background:'+gaugeColor(f)+'"></div></div>'+
    '<button class="row-act" onclick="tapMaisonItem(\''+t.id+'\')">Fait</button>'+
  '</li>';
}

// Carte blanche par pièce, le plus dû en tête ; le compte d'éléments à faire
// à droite du nom (audit B4, Lot V2-5).
function maisonRoomSection(room, items, i, n, today){
  const sorted = items.slice().sort((a, b)=>choreFresh(a, today) - choreFresh(b, today));
  const due = items.filter(t=>choreFresh(t, today) <= 0).length;
  const count = due ? due+' à faire' : 'Tout est frais';
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="room-head">'+
      '<h2 class="card-title">'+esc(ROOM_LABELS[room] || room)+'</h2>'+
      '<span class="room-count">'+esc(count)+'</span>'+
    '</div>'+
    '<ul class="list room-list">'+sorted.map(t=>choreRowHtml(t, today)).join('')+'</ul>'+
  '</div>';
}

// Bouton « Fait » — immédiat, annulable : annuler restaure exactement
// doneAt/due/postponed ET retire l'entrée que completeTask() vient d'ajouter
// à history, même discipline que doneTask()/todayDone().
function tapMaisonItem(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const fill = document.getElementById('mfill-'+id);
  if(fill) fill.style.width = '100%'; // retour visuel immédiat : la jauge remonte avant le rendu complet
  // Motivation légère (Lot 10) : la toute première réalisation d'un entretien
  // annuel mérite un mot sobre — après ça, history n'est plus vide.
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
  const today = todayKey();
  const items = getMaisonItems();
  const byRoom = {};
  items.forEach(t=>{ (byRoom[t.room] = byRoom[t.room] || []).push(t); });
  // Une pièce inconnue (donnée importée) reste affichée, en dernier : un
  // entretien ne doit jamais devenir invisible faute de pièce reconnue.
  const rooms = ROOM_ORDER.filter(r=>byRoom[r])
    .concat(Object.keys(byRoom).filter(r=>ROOM_ORDER.indexOf(r) === -1));
  const body = rooms.length
    ? rooms.map((r, i)=>maisonRoomSection(r, byRoom[r], i, rooms.length, today)).join('')
    : emptyState('Rien à entretenir pour l’instant.', 'Le pack maison installe d’un coup les entretiens courants, déjà réglés. Tu enlèveras ensuite ce qui ne te sert pas.')+
      '<button class="btn primary btn-full" onclick="packSheet()">Installer le pack maison</button>';
  const sur = items.length
    ? items.length+(items.length > 1 ? ' entretiens' : ' entretien')+' · environ '+Math.round(choreLoad(items))+' min par jour'
    : '';
  document.getElementById('s-maison').innerHTML =
    screenHead(sur, 'Maison')+
    body+
    '<button class="btn secondary btn-full" onclick="entretienSheet()">Ajouter un entretien</button>';
}

/* ==========================================================================
   Création depuis le catalogue (data/entretien.js)
   ========================================================================== */

// Clé de doublon : même pièce, même titre (casse indifférente).
function choreKey(room, title){ return room+'|'+String(title || '').toLowerCase().trim(); }
function trackedChoreKeys(){ return new Set(getMaisonItems().map(t=>choreKey(t.room, t.title))); }

// Décalage (0–6) jusqu'au prochain des jours fixes `dow`, aujourd'hui compris.
function fixedOffset(dow, today){
  const iso = isoDow(today);
  return Math.min.apply(null, dow.map(d=>(d - iso + 7) % 7));
}

// Une tâche d'entretien depuis un modèle, due dans `offset` jours : sa
// dernière réalisation est posée à rebours (midi, pour rester dans le bon
// jour quel que soit le fuseau), de sorte que nextDue() tombe pile dessus.
function choreFromModel(m, room, offset, today){
  const fixed = m.dow && m.dow.length;
  const back = offset - (fixed ? 7 : m.days);
  return stamp({
    title: m.title, notes:'', cat:'entretien', room, bucket:'anytime',
    start:null, due:null, evening:false, prio:0,
    effort: minsToEffort(m.mins), mins: m.mins,
    repeat: fixed ? {kind:'week', n:1, days:m.dow.slice(), from:'done'} : {kind:'day', n:m.days, days:[], from:'done'},
    doneAt: new Date(addDays(today, back)+'T12:00').getTime(),
    history:[], postponed:0, touchedAt:Date.now()
  });
}

/* Étalement des premières échéances — fonction PURE, testée isolément.
   entries = [{days, mins, fixed}] (fixed = décalage imposé d'un entretien à
   jour fixe, ou null) ; renvoie le décalage (en jours, 0 = aujourd'hui) de
   la première échéance de chacun.
   On simule la charge de chaque jour sur tout l'horizon (chaque entretien
   revient tous les `days` jours) et on place chaque entretien, le plus lourd
   en premier, sur la phase qui augmente le moins la somme des carrés des
   charges journalières — la façon classique de lisser : un jour chargé coûte
   plus qu'il ne pèse. Sans ça, 40 entretiens créés d'un coup seraient tous
   dus le même jour, puis encore ensemble à chaque retour de cycle. */
function packSchedule(entries){
  const H = entries.reduce((m, e)=>Math.max(m, e.fixed != null ? 7 : e.days), 7);
  const load = new Array(H).fill(0);
  const out = new Array(entries.length);
  const addAt = (o, per, mins)=>{ for(let d = o; d < H; d += per) load[d] += mins; };
  entries.forEach((e, i)=>{ if(e.fixed != null){ out[i] = e.fixed; addAt(e.fixed, 7, e.mins); } });
  entries.map((e, i)=>i).filter(i=>entries[i].fixed == null)
    .sort((a, b)=>(entries[b].mins/entries[b].days - entries[a].mins/entries[a].days) || (entries[a].days - entries[b].days))
    .forEach(i=>{
      const e = entries[i];
      let best = 0, bestCost = Infinity;
      for(let o = 0; o < e.days; o++){
        let cost = 0;
        for(let d = o; d < H; d += e.days) cost += 2*load[d]*e.mins + e.mins*e.mins;
        if(cost < bestCost){ bestCost = cost; best = o; }
      }
      out[i] = best;
      addAt(best, e.days, e.mins);
    });
  return out;
}

/* ---------- Le pack maison : les entretiens courants, installés d'un tap ---------- */
let _packRooms = null;

function packModels(){
  const have = trackedChoreKeys();
  return ENTRETIEN.filter(m=>m.pack && !have.has(choreKey(m.room, m.title)));
}
function packSheet(){
  _packRooms = {};
  packModels().forEach(m=>{ _packRooms[m.room] = true; });
  openSheet(packSheetHtml());
}
function togglePackRoom(r){ _packRooms[r] = !_packRooms[r]; openSheet(packSheetHtml()); }

function packSheetHtml(){
  const all = packModels();
  if(!all.length){
    return '<p class="sheet-title">Pack maison</p>'+
      '<p class="sheet-msg">Tout le pack est déjà installé.</p>'+
      '<button class="btn quiet btn-full" onclick="closeSheet()">Fermer</button>';
  }
  const chosen = all.filter(m=>_packRooms[m.room]);
  const rooms = ROOM_ORDER.filter(r=>all.some(m=>m.room === r));
  const chips = rooms.map(r=>{
    const n = all.filter(m=>m.room === r).length;
    return '<button class="chip'+(_packRooms[r] ? ' on' : '')+'" aria-pressed="'+!!_packRooms[r]+'" '+
      'onclick="togglePackRoom(\''+r+'\')">'+esc(ROOM_LABELS[r])+' · '+n+'</button>';
  }).join('');
  const load = Math.round(chosen.reduce((s, m)=>s + m.mins/m.days, 0));
  return '<p class="sheet-title">Pack maison</p>'+
    '<p class="sheet-msg">'+chosen.length+' entretiens déjà réglés, environ '+load+' min par jour. '+
      'Les premières échéances sont étalées : rien ne tombe le même jour.</p>'+
    '<div class="field-group"><span class="overline">Pièces</span><div class="chips">'+chips+'</div></div>'+
    '<div class="field-group"><p class="sheet-msg">Ensuite, un balayage vers la gauche enlève ce qui ne te sert pas, et la fiche de chaque ligne règle son rythme.</p></div>'+
    '<button class="btn primary btn-full" onclick="installPack()"'+(chosen.length ? '' : ' disabled')+'>Installer'+(chosen.length ? ' ('+chosen.length+')' : '')+'</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

function installPack(){
  const models = packModels().filter(m=>_packRooms && _packRooms[m.room]);
  if(!models.length) return;
  const today = todayKey();
  const offsets = packSchedule(models.map(m=>({
    days: m.days, mins: m.mins, fixed: (m.dow && m.dow.length) ? fixedOffset(m.dow, today) : null
  })));
  const created = models.map((m, i)=>choreFromModel(m, m.room, offsets[i], today));
  created.forEach(t=>S.tasks.push(t));
  save();
  closeSheet();
  rerender();
  undoable(created.length+' entretiens installés.', ()=>{
    created.forEach(t=>{ t.deletedAt = Date.now(); touch(t); });
    save();
    rerender();
  });
}

/* ==========================================================================
   Feuille d'ajout : on choisit une pièce, on coche des modèles du catalogue.
   Un modèle déjà suivi dans cette pièce est signalé, pas proposé deux fois.
   L'édition et la suppression passent par la ligne dans Maison (fiche au
   tap, balayage pour supprimer) — cette feuille reste réservée à la création.
   ========================================================================== */
let _entSheet = null;

function entretienSheet(){
  _entSheet = {room: ROOM_ORDER.find(r=>ENTRETIEN.some(m=>m.room === r)), checked: {}};
  openSheet(entretienSheetHtml());
}
function setEntRoom(r){ _entSheet.room = r; _entSheet.checked = {}; openSheet(entretienSheetHtml()); }
function toggleEntModel(i){ _entSheet.checked[i] = !_entSheet.checked[i]; openSheet(entretienSheetHtml()); }

function modelRhythm(m){
  return (m.dow && m.dow.length) ? repeatSummary({kind:'week', n:1, days:m.dow, from:'done'}).replace(/\.$/, '')
                                 : 'Tous les '+m.days+' jours';
}

function entretienSheetHtml(){
  const room = _entSheet.room;
  const have = trackedChoreKeys();
  const roomChips = roomChoices(room).map(r=>
    '<button class="chip'+(room===r?' on':'')+'" onclick="setEntRoom(\''+r+'\')">'+esc(ROOM_LABELS[r])+'</button>'
  ).join('');
  const rows = ENTRETIEN.map((m, i)=>m.room === room ? {m, i} : null).filter(Boolean).map(({m, i})=>{
    const meta = modelRhythm(m)+' · '+m.mins+' min';
    if(have.has(choreKey(room, m.title))){
      return '<li class="row row-low"><div class="row-main"><div class="row-title">'+esc(m.title)+'</div>'+
        '<div class="row-meta">Déjà suivi</div></div></li>';
    }
    const on = !!_entSheet.checked[i];
    return '<li class="row"'+rowAttrs('toggleEntModel('+i+')')+'>'+
      '<span class="check'+(on?' on':'')+'" role="checkbox" aria-checked="'+on+'" aria-label="Sélectionner"></span>'+
      '<div class="row-main"><div class="row-title">'+esc(m.title)+'</div>'+
        '<div class="row-meta">'+esc(meta)+'</div></div>'+
    '</li>';
  }).join('');
  const n = Object.keys(_entSheet.checked).filter(k=>_entSheet.checked[k]).length;
  return '<p class="sheet-title">Ajouter un entretien</p>'+
    '<div class="field-group"><span class="overline">Pièce</span><div class="chips">'+roomChips+'</div></div>'+
    '<div class="field-group"><ul class="list">'+
      (rows || '<li class="row"><div class="row-main"><div class="row-meta">Aucun modèle pour cette pièce. Crée-le depuis la barre de saisie, avec « #'+esc(room)+' » et « tous les N jours après ».</div></div></li>')+
    '</ul></div>'+
    '<button class="btn primary btn-full" onclick="addEntretienModels()"'+(n?'':' disabled')+'>Ajouter'+(n?' ('+n+')':'')+'</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

// Un entretien ajouté seul n'a pas de « dernière fois » connue : il est dû à
// mi-intervalle plutôt que tout de suite (ni frais ni en retard), ou à son
// prochain jour fixe.
function addEntretienModels(){
  const idxs = Object.keys(_entSheet.checked).filter(k=>_entSheet.checked[k]).map(Number);
  if(!idxs.length) return;
  const today = todayKey();
  idxs.forEach(i=>{
    const m = ENTRETIEN[i];
    if(!m) return;
    const offset = (m.dow && m.dow.length) ? fixedOffset(m.dow, today) : Math.ceil(m.days/2);
    S.tasks.push(choreFromModel(m, _entSheet.room, offset, today));
  });
  save();
  closeSheet();
  renderMaison();
  toast(idxs.length>1 ? idxs.length+' entretiens ajoutés' : 'Entretien ajouté');
}
