/* ==========================================================================
   tasks.js — écran Tâches (Lot V1-3, moteur Things 3) : groupes Aujourd'hui
   et avant / À venir / Un jour / Peut-être, filtres par catégorie, recherche,
   fiche tâche complète (taskSheet). La récurrence (repeat) arrive au Lot 4.
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

function taskRowHtml(t, allowPostpone, soft){
  const today = todayKey();
  const meta = taskMeta(t, today);
  return '<li class="row'+(soft ? ' row-low' : '')+'">'+
    '<button class="check" role="checkbox" aria-checked="false" aria-label="Marquer fait" onclick="doneTask(\''+t.id+'\')"></button>'+
    '<div class="row-main"'+rowAttrs("taskSheet('"+t.id+"')")+'>'+
      '<div class="row-title">'+esc(t.title)+'</div>'+
      (meta ? '<div class="row-meta">'+meta+'</div>' : '')+
    '</div>'+
    (allowPostpone ? '<button class="row-postpone" aria-label="Reporter à demain" onclick="postponeTask(\''+t.id+'\')">'+icon('<path d="M9 6l6 6-6 6"></path>', 20)+'</button>' : '')+
    '<button class="row-del" aria-label="Supprimer" onclick="delTask(\''+t.id+'\')">'+icon(IC_CLOSE, 20)+'</button>'+
  '</li>';
}

// Un groupe = un titre 18 px/700 + son compteur, puis la liste posée à même la
// page. Les deux derniers groupes (« Un jour », « Peut-être ») passent au
// registre bas : titre 14 px --ink2 et lignes de 15 px. Mise en conformité
// avec la maquette au Lot V1-5 — c'était `.overline` 13 px auparavant.
function taskGroupHtml(title, list, opts){
  if(!list.length) return '';
  opts = opts || {};
  const soft = !!opts.soft;
  const toggle = opts.toggle
    ? '<button class="group-toggle" onclick="toggleSomeday()">'+(_somedayOpen?'Masquer':'Afficher')+'</button>'
    : '';
  const body = opts.collapsed ? ''
    : '<ul class="list list-page">'+list.map(t=>taskRowHtml(t, opts.postpone, soft)).join('')+'</ul>';
  return '<div class="sec'+(soft ? ' soft' : '')+'">'+
      '<h2 class="sec-title">'+esc(title)+'</h2>'+
      '<span class="sec-count">'+list.length+'</span>'+toggle+
    '</div>'+body;
}

function renderTaskGroups(){
  const items = getTaskItems();
  if(!items.length){
    const filtered = !!(_taskQuery || _taskCat);
    return emptyState(
      filtered ? 'Aucun résultat.' : 'Rien à faire ici.',
      filtered ? 'Essaie une autre recherche ou retire le filtre.' : 'Ajoute une première tâche ci-dessous.'
    );
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
    taskGroupHtml('Peut-être', gSome, {soft:true, toggle:true, collapsed:!_somedayOpen});
  return html || emptyState('Aucun résultat.', 'Essaie une autre recherche ou retire le filtre.');
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
  const catChips = CAT_ORDER.map(c=>
    '<button class="chip'+(_taskCat===c?' on':'')+'" onclick="setTaskCat(\''+c+'\')">'+esc(CAT_LABELS[c])+'</button>'
  ).join('');
  document.getElementById('s-tasks').innerHTML =
    screenHead(sur, 'Tâches')+
    '<input id="task-search" class="field search-field" type="search" placeholder="Rechercher…" '+
      'autocomplete="off" autocapitalize="none" value="'+esc(_taskQuery)+'" oninput="onTaskSearch(this.value)">'+
    '<div class="chips filter-chips">'+
      '<button class="chip'+(!_taskCat?' on':'')+'" onclick="setTaskCat(null)">Toutes</button>'+catChips+
    '</div>'+
    '<div id="task-groups">'+renderTaskGroups()+'</div>'+
    captureBarHtml();
}

function doneTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  completeTask(t); // recalcule l'échéance et la fraîcheur si récurrente (js/recur.js)
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
// sans décision explicite dans la fiche). Discret, sans jugement : pas de toast.
function postponeTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  t.start = addDays(todayKey(), 1);
  t.bucket = 'scheduled';
  t.postponed = (t.postponed||0) + 1;
  t.touchedAt = Date.now();
  touch(t);
  save();
  refreshTaskGroups();
}

/* ==========================================================================
   Fiche tâche — création et édition par la même feuille modale.
   ========================================================================== */
let _tSheet = null;

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
  openSheet(taskSheetHtml());
  if(!_tSheet.id){
    const el = document.getElementById('ts-title');
    if(el) el.focus();
  }
}

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
  return '<p class="sheet-title">'+(d.id ? 'Modifier la tâche' : 'Nouvelle tâche')+'</p>'+
    '<div class="field-group">'+
      '<input id="ts-title" class="field field-full" type="text" placeholder="Titre" value="'+esc(d.title)+'" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_tSheet.title=this.value">'+
    '</div>'+
    '<div class="field-group">'+
      '<textarea id="ts-notes" class="field area field-full" placeholder="Notes" autocapitalize="sentences" '+
        'oninput="_tSheet.notes=this.value">'+esc(d.notes)+'</textarea>'+
    '</div>'+
    '<div class="field-group"><span class="overline">Catégorie</span><div class="chips">'+catChips+'</div></div>'+
    '<div class="field-group"><span class="overline">Pièce</span><div class="chips">'+roomChips+'</div></div>'+
    '<div class="field-group"><span class="overline">Début</span>'+
      '<input class="field field-full" type="date" value="'+(d.start||'')+'" onchange="setTsDate(\'start\', this.value)"></div>'+
    '<div class="field-group"><span class="overline">Échéance</span>'+
      '<input class="field field-full" type="date" value="'+(d.due||'')+'" onchange="setTsDate(\'due\', this.value)"></div>'+
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
    '<div class="field-group"><span class="overline">Bucket</span>'+bucketBlock+'</div>'+
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
