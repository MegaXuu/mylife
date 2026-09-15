/* ==========================================================================
   tasks.js — écran Tâches (Lot V1-3, moteur Things 3) : groupes Aujourd'hui
   et avant / À venir / Un jour / Peut-être, filtres par catégorie, recherche,
   fiche tâche complète (taskSheet). La récurrence (repeat) arrive au Lot 4.

   Lot V2-4 : les boutons permanents « > »/« × » des lignes disparaissent au
   profit du balayage (js/gestures.js, ROADMAP-V2.md §3.3) ; la fiche tâche
   passe en divulgation progressive (audit A5) ; un groupe « Fait » repliable
   rend enfin utile settings.hideDone (audit C2) ; les notes affichent un
   indicateur discret (audit C3) ; recherche et filtres n'apparaissent plus
   que si l'écran en a vraiment besoin.
   ========================================================================== */

const CAT_LABELS = {perso:'Perso', menage:'Ménage', entretien:'Entretien', admin:'Admin'};
const CAT_ORDER = ['perso','menage','entretien','admin'];
const ROOM_LABELS = {salon:'Salon', cuisine:'Cuisine', chambre:'Chambre', sdb:'Sdb', bureau:'Bureau', exterieur:'Extérieur'};
const ROOM_ORDER = ['salon','cuisine','chambre','sdb','bureau','exterieur'];
const PRIO_LABELS = {0:'Normal', 1:'Important', 2:'Urgent'};
const EFFORT_LABELS = {1:'Court', 2:'Moyen', 3:'Long'};
const MOIS_ABBR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const REPEAT_KIND_LABELS = {day:'Jour', week:'Semaine', month:'Mois', year:'An'};
const REPEAT_KIND_ORDER = ['day','week','month','year'];
const DOW_LABELS = {1:'Lun', 2:'Mar', 3:'Mer', 4:'Jeu', 5:'Ven', 6:'Sam', 7:'Dim'};
const DOW_ORDER = [1,2,3,4,5,6,7];
// Indicateur de notes (audit C3) : un rectangle à deux lignes, même trait
// que le reste des icônes du projet (icon(), js/ui.js).
const IC_NOTE = '<path d="M5 4.5h11l3 3v12h-14z"></path><path d="M8.5 10.5h7M8.5 14.5h5"></path>';
// Seuil au-delà duquel recherche + filtres méritent leur place à l'écran
// (point 5 du lot) : en dessous, ~180 px de contrôles en permanence pour
// trier trois tâches ne sert à rien ; au-delà, retrouver une tâche à l'œil
// devient pénible sans eux.
const TASK_FILTER_MIN = 6;
// Fenêtre du groupe « Fait » (point 3) : au-delà d'une semaine, une tâche
// réalisée n'a plus sa place ici — elle reste dans son historique, juste
// plus affichée.
const TASK_DONE_DAYS = 7;

function fmtDateShort(k){
  const d = new Date(k+'T00:00');
  return d.getDate()+' '+MOIS_ABBR[d.getMonth()];
}

// Phrase en clair sous les champs de récurrence (ex. « Tous les 7 jours
// après la dernière fois. »), cf. Lot V1-4.
function repeatSummary(r){
  if(!r) return '';
  const n = r.n || 1;
  const unitSing = {day:'jour', week:'semaine', month:'mois', year:'an'}[r.kind] || 'jour';
  const unitPlur = {day:'jours', week:'semaines', month:'mois', year:'ans'}[r.kind] || 'jours';
  let base;
  if(r.kind === 'week' && r.days && r.days.length){
    base = 'Chaque '+r.days.slice().sort((a,b)=>a-b).map(d=>DOW_LABELS[d]).join(', ');
  } else {
    base = n === 1 ? 'Tous les '+unitSing : 'Tous les '+n+' '+unitPlur;
  }
  return base + (r.from === 'done' ? ' après la dernière fois.' : ', à date fixe.');
}

/* ---------- Tri : échéance dépassée d'abord (la plus ancienne), puis priorité, puis ancienneté ---------- */
function taskCompare(a, b){
  const today = todayKey();
  const aOver = !!(a.due && a.due < today), bOver = !!(b.due && b.due < today);
  if(aOver !== bOver) return aOver ? -1 : 1;
  if(aOver && bOver && a.due !== b.due) return a.due < b.due ? -1 : 1;
  if((a.prio||0) !== (b.prio||0)) return (b.prio||0) - (a.prio||0);
  return (a.createdAt||0) - (b.createdAt||0);
}

let _taskCat = null;   // filtre catégorie actif, null = toutes
let _taskQuery = '';   // texte de recherche
let _somedayOpen = false; // groupe « Peut-être » replié par défaut

function getTaskItems(){
  let items = live(S.tasks).filter(t=>!t.doneAt);
  if(_taskCat) items = items.filter(t=>t.cat === _taskCat);
  if(_taskQuery){
    const q = _taskQuery.toLowerCase();
    items = items.filter(t=>(t.title||'').toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q));
  }
  return items.sort(taskCompare);
}

function taskMeta(t, today){
  const bits = [];
  if(t.due){
    const overdue = t.due < today;
    bits.push('<span class="'+(overdue?'due':'')+'">'+(overdue?'En retard depuis le ':'Échéance le ')+fmtDateShort(t.due)+'</span>');
  }
  if(t.start) bits.push((t.start<=today?'Depuis le ':'À partir du ')+fmtDateShort(t.start));
  if(t.evening) bits.push('Ce soir');
  if(CAT_LABELS[t.cat]) bits.push(CAT_LABELS[t.cat]);
  if(t.room && ROOM_LABELS[t.room]) bits.push(ROOM_LABELS[t.room]);
  if((t.postponed||0) >= 3) bits.push('Reportée '+t.postponed+' fois');
  return bits.join(' · ');
}

// Ligne de tâche. Depuis le Lot V2-4, plus aucun bouton permanent « > »/« × »
// (c'était eux qui écrasaient un titre long sur deux lignes) : balayer vers
// la gauche supprime, vers la droite reporte — la même action reste toujours
// atteignable dans la fiche, le balayage ne fait que la doubler (§3.3). Une
// ligne du groupe « Fait » (opts.done) n'a que le balayage gauche : le tap
// sur sa case suffit déjà à la décocher, un balayage droit ferait doublon.
function taskRowHtml(t, opts){
  opts = opts || {};
  const done = !!opts.done;
  const today = todayKey();
  const meta = done ? fmtDateShort(dayKey(new Date(t.doneAt))) : taskMeta(t, today);
  const noteIcon = t.notes ? '<span class="row-note-ic" aria-hidden="true">'+icon(IC_NOTE, 14)+'</span>' : '';
  const checkBtn = done
    ? '<button class="check on" role="checkbox" aria-checked="true" aria-label="Marquer non fait" onclick="unDoneTask(\''+t.id+'\')"></button>'
    : '<button class="check" role="checkbox" aria-checked="false" aria-label="Marquer fait" onclick="doneTask(\''+t.id+'\')"></button>';
  const swipe = ' data-swipe-left="delTask(\''+t.id+'\')"'+
    (!done && opts.postpone ? ' data-swipe-right="postponeTask(\''+t.id+'\')" data-swipe-right-label="Reporter"' : '');
  return '<li class="row'+(opts.soft ? ' row-low' : '')+(done ? ' done' : '')+'"'+swipe+'>'+
    checkBtn+
    '<div class="row-main"'+rowAttrs("taskSheet('"+t.id+"')")+'>'+
      '<div class="row-title">'+esc(t.title)+noteIcon+'</div>'+
      (meta ? '<div class="row-meta">'+meta+'</div>' : '')+
    '</div>'+
  '</li>';
}

// Un groupe = un titre 18 px/700 + son compteur, puis la liste posée à même la
// page. Les deux derniers groupes (« Un jour », « Peut-être ») passent au
// registre bas : titre 14 px --ink2 et lignes de 15 px. Mise en conformité
// avec la maquette au Lot V1-5 — c'était `.overline` 13 px auparavant.
// opts.toggleFn (nom de fonction) + opts.open rendent le groupe repliable,
// généralisé au Lot V2-4 pour être réutilisé par le groupe « Fait ».
function taskGroupHtml(title, list, opts){
  if(!list.length) return '';
  opts = opts || {};
  const soft = !!opts.soft;
  const toggle = opts.toggleFn
    ? '<button class="group-toggle" onclick="'+opts.toggleFn+'()">'+(opts.open?'Masquer':'Afficher')+'</button>'
    : '';
  const body = (opts.toggleFn && !opts.open) ? ''
    : '<ul class="list list-page">'+list.map(t=>taskRowHtml(t, opts)).join('')+'</ul>';
  return '<div class="sec'+(soft ? ' soft' : '')+'">'+
      '<h2 class="sec-title">'+esc(title)+'</h2>'+
      '<span class="sec-count">'+list.length+'</span>'+toggle+
    '</div>'+body;
}

/* ==========================================================================
   Groupe « Fait » (point 3, audit C2) — settings.hideDone enfin lu : il
   décide si le groupe existe du tout sur cet écran (« cacher les tâches
   faites »). Sa propre ouverture/fermeture, elle, reste une préférence de
   session comme « Peut-être » (_somedayOpen) : repliée par défaut à chaque
   arrivée sur l'écran, pas un réglage à retenir entre deux visites.
   Un entretien (room + repeat.from:'done') garde toujours un doneAt par
   construction (glossaire CONVENTIONS.md §6) : il est exclu ici comme
   partout ailleurs sur cet écran, sinon le groupe se remplirait de toute la
   maison à chaque rendu.
   ========================================================================== */
let _doneOpen = false;
function toggleDoneGroup(){ _doneOpen = !_doneOpen; refreshTaskGroups(); }

function taskDoneItems(){
  const floor = addDays(todayKey(), -(TASK_DONE_DAYS - 1));
  return live(S.tasks)
    .filter(t => t.doneAt && !(t.room && t.repeat && t.repeat.from === 'done'))
    .filter(t => dayKey(new Date(t.doneAt)) >= floor)
    .sort((a, b) => b.doneAt - a.doneAt);
}

function taskDoneSectionHtml(){
  if(S.settings.hideDone) return '';
  const items = taskDoneItems();
  if(!items.length) return '';
  const today = todayKey();
  const doneToday = items.filter(t => dayKey(new Date(t.doneAt)) === today);
  const doneWeek = items.filter(t => dayKey(new Date(t.doneAt)) !== today);
  const toggle = '<button class="group-toggle" onclick="toggleDoneGroup()">'+(_doneOpen?'Masquer':'Afficher')+'</button>';
  const body = !_doneOpen ? '' :
    taskDoneSubHtml('Fait aujourd’hui', doneToday) + taskDoneSubHtml('Fait cette semaine', doneWeek);
  return '<div class="sec soft">'+
      '<h2 class="sec-title">Fait</h2>'+
      '<span class="sec-count">'+items.length+'</span>'+toggle+
    '</div>'+body;
}

function taskDoneSubHtml(title, list){
  if(!list.length) return '';
  return '<h3 class="done-sub">'+esc(title)+'</h3>'+
    '<ul class="list list-page">'+list.map(t=>taskRowHtml(t, {done:true, soft:true})).join('')+'</ul>';
}

function renderTaskGroups(){
  const items = getTaskItems();
  const doneHtml = taskDoneSectionHtml();
  if(!items.length){
    const filtered = !!(_taskQuery || _taskCat);
    return emptyState(
      filtered ? 'Aucun résultat.' : 'Rien à faire ici.',
      filtered ? 'Essaie une autre recherche ou retire le filtre.' : 'Ajoute une première tâche ci-dessous.'
    ) + doneHtml;
  }
  const today = todayKey();
  const gNow = items.filter(t=> t.bucket==='scheduled' && ((t.start && t.start<=today)||(t.due && t.due<=today)));
  const idsNow = new Set(gNow.map(t=>t.id));
  const gSoon = items.filter(t=> t.bucket==='scheduled' && !idsNow.has(t.id));
  const gAny = items.filter(t=> t.bucket==='anytime');
  const gSome = items.filter(t=> t.bucket==='someday');

  const html = taskGroupHtml('Aujourd’hui et avant', gNow, {postpone:true})+
    taskGroupHtml('À venir', gSoon)+
    taskGroupHtml('Un jour', gAny, {soft:true})+
    taskGroupHtml('Peut-être', gSome, {soft:true, toggleFn:'toggleSomeday', open:_somedayOpen})+
    doneHtml;
  return html || (emptyState('Aucun résultat.', 'Essaie une autre recherche ou retire le filtre.') + doneHtml);
}

function refreshTaskGroups(){
  const el = document.getElementById('task-groups');
  if(el) el.innerHTML = renderTaskGroups();
}

function setTaskCat(c){ _taskCat = c; renderTasks(); }
function onTaskSearch(v){ _taskQuery = v; refreshTaskGroups(); }
function toggleSomeday(){ _somedayOpen = !_somedayOpen; refreshTaskGroups(); }

function renderTasks(){
  const nOpen = live(S.tasks).filter(t=>!t.doneAt).length;
  const sur = nOpen === 0 ? 'Aucune tâche ouverte'
                          : nOpen + (nOpen > 1 ? ' tâches ouvertes' : ' tâche ouverte');
  // Recherche et filtres ne prennent de la place que quand ils servent
  // (point 5) : en dessous du seuil, ils disparaissent — et leur état avec
  // eux, pour ne rien laisser de filtré sans moyen visible de le défiltrer.
  const showFilters = nOpen > TASK_FILTER_MIN;
  if(!showFilters){ _taskCat = null; _taskQuery = ''; }
  const catChips = CAT_ORDER.map(c=>
    '<button class="chip'+(_taskCat===c?' on':'')+'" onclick="setTaskCat(\''+c+'\')">'+esc(CAT_LABELS[c])+'</button>'
  ).join('');
  const filters = !showFilters ? '' :
    '<input id="task-search" class="field search-field" type="search" placeholder="Rechercher…" '+
      'autocomplete="off" autocapitalize="none" value="'+esc(_taskQuery)+'" oninput="onTaskSearch(this.value)">'+
    '<div class="chips filter-chips">'+
      '<button class="chip'+(!_taskCat?' on':'')+'" onclick="setTaskCat(null)">Toutes</button>'+catChips+
    '</div>';
  document.getElementById('s-tasks').innerHTML =
    screenHead(sur, 'Tâches')+
    filters+
    '<div id="task-groups">'+renderTaskGroups()+'</div>'+
    captureBarHtml();
}

// Annulable (point 3) : cliché des champs que completeTask() modifie, pour
// un retour exact si on se ravise dans les secondes qui suivent — même
// discipline que todayDone()/todayUndone() (js/today.js).
function doneTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const snap = {doneAt:t.doneAt, due:t.due, postponed:t.postponed||0, history:(t.history||[]).slice()};
  completeTask(t); // recalcule l'échéance et la fraîcheur si récurrente (js/recur.js)
  save();
  rerender();
  undoable(t.title + ' : fait.', ()=>{
    const x = S.tasks.find(y=>y.id === id);
    if(!x) return;
    x.doneAt = snap.doneAt; x.due = snap.due; x.postponed = snap.postponed; x.history = snap.history;
    touch(x);
    save();
    rerender();
  });
}

// Décoche une tâche depuis le groupe « Fait », potentiellement des jours
// après (le cliché exact de doneTask() n'a plus de raison d'exister à ce
// moment-là) : on rouvre simplement la tâche et on retire sa dernière
// réalisation de l'historique. Ne concerne jamais une tâche from:'due' — elle
// n'a justement jamais de doneAt persistant, donc jamais de ligne « Fait ».
function unDoneTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  if(t.history && t.history.length) t.history.pop();
  t.doneAt = null;
  touch(t);
  save();
  rerender();
}

function delTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  confirmSheet('Supprimer « '+t.title+' » ?', 'Supprimer', ()=>{
    t.deletedAt = Date.now();
    touch(t);
    save();
    rerender();
    // Tombstone, donc annulable tant que le toast est là : on remet deletedAt à null.
    toast('Tâche supprimée', {action:{label:'Annuler', fn:()=>{
      t.deletedAt = null;
      touch(t);
      save();
      rerender();
    }}});
  });
}

// Reporter : pousse le début à demain, jamais l'échéance (la vraie deadline ne bouge pas
// sans décision explicite dans la fiche). Annulable depuis le Lot V2-4 (point 1) :
// le balayage droit double désormais ce geste, il doit se rattraper comme les autres.
function postponeTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  const snap = {start:t.start, bucket:t.bucket, postponed:t.postponed||0};
  t.start = addDays(todayKey(), 1);
  t.bucket = 'scheduled';
  t.postponed = (t.postponed||0) + 1;
  t.touchedAt = Date.now();
  touch(t);
  save();
  refreshTaskGroups();
  undoable('Reportée à demain.', ()=>{
    const x = S.tasks.find(y=>y.id === id);
    if(!x) return;
    x.start = snap.start; x.bucket = snap.bucket; x.postponed = snap.postponed;
    touch(x);
    save();
    refreshTaskGroups();
  });
}

/* ==========================================================================
   Fiche tâche — création et édition par la même feuille modale.

   Divulgation progressive depuis le Lot V2-4 (point 2, audit A5) : titre,
   début, échéance et « Enregistrer » sont seuls visibles d'emblée — le reste
   (notes, catégorie, pièce, ce soir, priorité, effort, récurrence, bucket)
   vit derrière « Plus d'options ». _tSheet._more porte cet état déplié/replié
   : il doit survivre à refreshTaskSheet(), qui remplace tout l'innerHTML de
   la feuille à chaque setter — le DOM n'est donc pas une option pour le
   stocker.
   ========================================================================== */
let _tSheet = null;

// Vrai si la tâche porte déjà une valeur non par défaut dans un champ caché
// derrière « Plus d'options » : la feuille s'ouvre alors dépliée d'emblée,
// pour ne jamais cacher à l'utilisateur ce qu'il a lui-même posé.
function tsHasExtras(d){
  return !!((d.notes||'').trim() || d.cat !== 'perso' || d.room || d.evening ||
    d.prio || d.effort !== 2 || d.repeat || d.bucket === 'someday');
}

function taskSheet(id){
  const t = id ? S.tasks.find(x=>x.id === id) : null;
  _tSheet = t ? {
    id: t.id, title: t.title || '', notes: t.notes || '', cat: t.cat || 'perso',
    room: t.room || null, bucket: t.bucket || 'anytime', start: t.start || null,
    due: t.due || null, evening: !!t.evening, prio: t.prio || 0, effort: t.effort || 2,
    repeat: t.repeat ? {kind:t.repeat.kind, n:t.repeat.n||1, days:(t.repeat.days||[]).slice(), from:t.repeat.from||'done'} : null
  } : {
    id: null, title:'', notes:'', cat:'perso', room:null, bucket:'anytime',
    start:null, due:null, evening:false, prio:0, effort:2, repeat:null
  };
  _tSheet._more = tsHasExtras(_tSheet);
  openSheet(taskSheetHtml());
  if(!_tSheet.id){
    const el = document.getElementById('ts-title');
    if(el) el.focus();
  }
}

function toggleTsMore(){ _tSheet._more = !_tSheet._more; refreshTaskSheet(); }

function refreshTaskSheet(){ openSheet(taskSheetHtml()); }

function setTsCat(c){ _tSheet.cat = c; refreshTaskSheet(); }
function setTsRoom(r){ _tSheet.room = r; refreshTaskSheet(); }
function setTsPrio(p){ _tSheet.prio = p; refreshTaskSheet(); }
function setTsEffort(e){ _tSheet.effort = e; refreshTaskSheet(); }
function setTsBucket(b){ _tSheet.bucket = b; refreshTaskSheet(); }
function setTsDate(field, val){ _tSheet[field] = val || null; refreshTaskSheet(); }
function toggleTsEvening(){ _tSheet.evening = !_tSheet.evening; refreshTaskSheet(); }

// Récurrence (Lot V1-4) : à date fixe (from:'due') ou après réalisation (from:'done').
function toggleTsRepeat(){
  _tSheet.repeat = _tSheet.repeat ? null : {kind:'day', n:7, days:[], from:'done'};
  refreshTaskSheet();
}
function setTsRepeatKind(k){ _tSheet.repeat.kind = k; if(k !== 'week') _tSheet.repeat.days = []; refreshTaskSheet(); }
function setTsRepeatN(v){ _tSheet.repeat.n = Math.max(1, parseInt(v, 10) || 1); refreshTaskSheet(); }
function setTsRepeatFrom(f){ _tSheet.repeat.from = f; refreshTaskSheet(); }
function toggleTsRepeatDay(dow){
  const days = _tSheet.repeat.days || (_tSheet.repeat.days = []);
  const i = days.indexOf(dow);
  if(i === -1) days.push(dow); else days.splice(i, 1);
  refreshTaskSheet();
}

function taskSheetHtml(){
  const d = _tSheet;
  const catChips = CAT_ORDER.map(c=>
    '<button class="chip'+(d.cat===c?' on':'')+'" onclick="setTsCat(\''+c+'\')">'+esc(CAT_LABELS[c])+'</button>'
  ).join('');
  const roomChips = '<button class="chip'+(!d.room?' on':'')+'" onclick="setTsRoom(null)">Aucune</button>'+
    ROOM_ORDER.map(r=>
      '<button class="chip'+(d.room===r?' on':'')+'" onclick="setTsRoom(\''+r+'\')">'+esc(ROOM_LABELS[r])+'</button>'
    ).join('');
  const prioChips = [0,1,2].map(p=>
    '<button class="chip'+(d.prio===p?' on':'')+'" onclick="setTsPrio('+p+')">'+esc(PRIO_LABELS[p])+'</button>'
  ).join('');
  const effortChips = [1,2,3].map(e=>
    '<button class="chip'+(d.effort===e?' on':'')+'" onclick="setTsEffort('+e+')">'+esc(EFFORT_LABELS[e])+'</button>'
  ).join('');
  const rep = d.repeat;
  const repeatKindChips = REPEAT_KIND_ORDER.map(k=>
    '<button class="chip'+(rep && rep.kind===k?' on':'')+'" onclick="setTsRepeatKind(\''+k+'\')">'+esc(REPEAT_KIND_LABELS[k])+'</button>'
  ).join('');
  const repeatFromChips =
    '<button class="chip'+(rep && rep.from==='due'?' on':'')+'" onclick="setTsRepeatFrom(\'due\')">À date fixe</button>'+
    '<button class="chip'+(rep && rep.from==='done'?' on':'')+'" onclick="setTsRepeatFrom(\'done\')">Après réalisation</button>';
  const repeatDayChips = DOW_ORDER.map(dw=>
    '<button class="chip'+(rep && (rep.days||[]).indexOf(dw)!==-1?' on':'')+'" onclick="toggleTsRepeatDay('+dw+')">'+DOW_LABELS[dw]+'</button>'
  ).join('');
  const repeatBlock = !rep ? '' :
    '<div class="field-group"><span class="overline">Fréquence</span><div class="chips">'+repeatKindChips+'</div></div>'+
    '<div class="field-group"><span class="overline">Tous les</span><div class="repeat-n">'+
      '<input class="field" type="number" min="1" inputmode="numeric" value="'+(rep.n||1)+'" onchange="setTsRepeatN(this.value)">'+
      '<span>'+esc({day:'jour(s)', week:'semaine(s)', month:'mois', year:'an(s)'}[rep.kind]||'')+'</span>'+
    '</div></div>'+
    (rep.kind === 'week' ? '<div class="field-group"><span class="overline">Jours fixes (facultatif)</span><div class="chips">'+repeatDayChips+'</div></div>' : '')+
    '<div class="field-group"><span class="overline">Depuis</span><div class="chips">'+repeatFromChips+'</div></div>'+
    '<p class="sheet-msg">'+esc(repeatSummary(rep))+'</p>';
  const hasDate = !!(d.start || d.due);
  const bucketBlock = hasDate
    ? '<p class="sheet-msg">Planifiée automatiquement, grâce à sa date.</p>'
    : '<div class="chips">'+
        '<button class="chip'+(d.bucket!=='someday'?' on':'')+'" onclick="setTsBucket(\'anytime\')">Un jour</button>'+
        '<button class="chip'+(d.bucket==='someday'?' on':'')+'" onclick="setTsBucket(\'someday\')">Peut-être</button>'+
      '</div>';
  // Visible d'emblée : titre + les deux dates. Tout le reste vit derrière
  // « Plus d'options » (point 2, audit A5 — 1 285 px, 11 sections toujours
  // dépliées pour des tâches qui n'ont besoin que d'un titre et d'une date).
  const more = !d._more ? '' :
    '<div class="field-group">'+
      '<textarea id="ts-notes" class="field area field-full" placeholder="Notes" autocapitalize="sentences" '+
        'oninput="_tSheet.notes=this.value">'+esc(d.notes)+'</textarea>'+
    '</div>'+
    '<div class="field-group"><span class="overline">Catégorie</span><div class="chips">'+catChips+'</div></div>'+
    '<div class="field-group"><span class="overline">Pièce</span><div class="chips">'+roomChips+'</div></div>'+
    '<div class="field-group"><ul class="list"><li class="row">'+
      '<div class="row-main"><div class="row-title">Ce soir</div></div>'+
      '<button class="switch'+(d.evening?' on':'')+'" role="switch" aria-checked="'+d.evening+'" '+
        'aria-label="Ce soir" onclick="toggleTsEvening()"></button>'+
    '</li></ul></div>'+
    '<div class="field-group"><span class="overline">Priorité</span><div class="chips">'+prioChips+'</div></div>'+
    '<div class="field-group"><span class="overline">Effort</span><div class="chips">'+effortChips+'</div></div>'+
    '<div class="field-group"><ul class="list"><li class="row">'+
      '<div class="row-main"><div class="row-title">Récurrente</div></div>'+
      '<button class="switch'+(rep?' on':'')+'" role="switch" aria-checked="'+!!rep+'" '+
        'aria-label="Récurrente" onclick="toggleTsRepeat()"></button>'+
    '</li></ul></div>'+
    repeatBlock+
    '<div class="field-group"><span class="overline">Bucket</span>'+bucketBlock+'</div>';
  return '<p class="sheet-title">'+(d.id ? 'Modifier la tâche' : 'Nouvelle tâche')+'</p>'+
    '<div class="field-group">'+
      '<input id="ts-title" class="field field-full" type="text" placeholder="Titre" value="'+esc(d.title)+'" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_tSheet.title=this.value">'+
    '</div>'+
    '<div class="field-group"><span class="overline">Début</span>'+
      '<input class="field field-full" type="date" value="'+(d.start||'')+'" onchange="setTsDate(\'start\', this.value)"></div>'+
    '<div class="field-group"><span class="overline">Échéance</span>'+
      '<input class="field field-full" type="date" value="'+(d.due||'')+'" onchange="setTsDate(\'due\', this.value)"></div>'+
    '<button class="btn quiet btn-full more-toggle" onclick="toggleTsMore()">'+(d._more?'Moins d’options':'Plus d’options')+'</button>'+
    more+
    '<button class="btn primary btn-full" onclick="saveTaskSheet()">Enregistrer</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

function saveTaskSheet(){
  const d = _tSheet;
  const title = cap((d.title||'').trim());
  if(!title){
    const el = document.getElementById('ts-title');
    if(el) el.focus();
    return;
  }
  const notes = cap((d.notes||'').trim());
  const bucket = (d.start || d.due) ? 'scheduled' : (d.bucket === 'someday' ? 'someday' : 'anytime');
  let t = d.id ? S.tasks.find(x=>x.id === d.id) : null;
  if(t){
    t.title = title; t.notes = notes; t.cat = d.cat; t.room = d.room;
    t.start = d.start || null; t.due = d.due || null; t.evening = !!d.evening;
    t.prio = d.prio; t.effort = d.effort; t.bucket = bucket; t.repeat = d.repeat; t.touchedAt = Date.now();
    touch(t);
  } else {
    t = stamp({
      title, notes, cat:d.cat, room:d.room, start:d.start||null, due:d.due||null,
      evening:!!d.evening, prio:d.prio, effort:d.effort, bucket, repeat:d.repeat, history:[],
      postponed:0, touchedAt:Date.now()
    });
    S.tasks.push(t);
  }
  save();
  closeSheet();
  rerender(); // la fiche s'ouvre aussi depuis Aujourd'hui (Lot V1-5)
}
