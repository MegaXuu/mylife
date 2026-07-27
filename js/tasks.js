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

function fmtDateShort(k){
  const d = new Date(k+'T00:00');
  return d.getDate()+' '+MOIS_ABBR[d.getMonth()];
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

function taskRowHtml(t, allowPostpone){
  const today = todayKey();
  const meta = taskMeta(t, today);
  return '<li class="row">'+
    '<button class="check" aria-label="Marquer fait" onclick="doneTask(\''+t.id+'\')"></button>'+
    '<div class="row-main" onclick="taskSheet(\''+t.id+'\')">'+
      '<div class="row-title">'+esc(t.title)+'</div>'+
      (meta ? '<div class="row-meta">'+meta+'</div>' : '')+
    '</div>'+
    (allowPostpone ? '<button class="row-postpone" aria-label="Reporter à demain" onclick="postponeTask(\''+t.id+'\')">'+icon('<path d="M9 6l6 6-6 6"></path>', 20)+'</button>' : '')+
    '<button class="row-del" aria-label="Supprimer" onclick="delTask(\''+t.id+'\')">'+icon(IC_CLOSE, 20)+'</button>'+
  '</li>';
}

function taskGroupHtml(title, list, allowPostpone){
  if(!list.length) return '';
  return '<div class="group-head"><span class="overline">'+esc(title)+' ('+list.length+')</span></div>'+
    '<ul class="list">'+list.map(t=>taskRowHtml(t, allowPostpone)).join('')+'</ul>';
}

function taskGroupSomedayHtml(list){
  if(!list.length) return '';
  return '<div class="group-head"><span class="overline">Peut-être ('+list.length+')</span>'+
    '<button class="group-toggle" onclick="toggleSomeday()">'+(_somedayOpen?'Masquer':'Afficher')+'</button></div>'+
    (_somedayOpen ? '<ul class="list group-someday">'+list.map(t=>taskRowHtml(t, false)).join('')+'</ul>' : '');
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

  const html = taskGroupHtml('Aujourd’hui et avant', gNow, true)+
    taskGroupHtml('À venir', gSoon, false)+
    taskGroupHtml('Un jour', gAny, false)+
    taskGroupSomedayHtml(gSome);
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
    '<div class="addbar">'+
      '<input id="task-input" class="field" type="text" placeholder="Ajouter une tâche…" '+
        'autocomplete="off" autocapitalize="sentences" enterkeyhint="done" '+
        'onkeydown="if(event.key===\'Enter\')addTask()">'+
      '<button class="add-btn" aria-label="Ajouter" onclick="addTask()">'+
        icon('<path d="M12 5v14M5 12h14"></path>', 24)+
      '</button>'+
    '</div>';
}

function addTask(){
  const input = document.getElementById('task-input');
  const title = cap((input && input.value || '').trim()); // majuscule initiale, cf. ui.js
  if(!title) return;
  S.tasks.push(stamp({
    title, notes:'', cat:'perso', room:null, bucket:'anytime',
    start:null, due:null, evening:false, prio:0, effort:2, postponed:0, touchedAt:Date.now()
  }));
  save();
  renderTasks();
  const ni = document.getElementById('task-input');
  if(ni) ni.focus();
}

function doneTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  t.doneAt = Date.now();
  touch(t);
  save();
  renderTasks();
}

function delTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  confirmSheet('Supprimer « '+t.title+' » ?', 'Supprimer', ()=>{
    t.deletedAt = Date.now();
    touch(t);
    save();
    renderTasks();
    // Tombstone, donc annulable tant que le toast est là : on remet deletedAt à null.
    toast('Tâche supprimée', {action:{label:'Annuler', fn:()=>{
      t.deletedAt = null;
      touch(t);
      save();
      renderTasks();
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
    due: t.due || null, evening: !!t.evening, prio: t.prio || 0, effort: t.effort || 2
  } : {
    id: null, title:'', notes:'', cat:'perso', room:null, bucket:'anytime',
    start:null, due:null, evening:false, prio:0, effort:2
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
    t.prio = d.prio; t.effort = d.effort; t.bucket = bucket; t.touchedAt = Date.now();
    touch(t);
  } else {
    t = stamp({
      title, notes, cat:d.cat, room:d.room, start:d.start||null, due:d.due||null,
      evening:!!d.evening, prio:d.prio, effort:d.effort, bucket, postponed:0, touchedAt:Date.now()
    });
    S.tasks.push(t);
  }
  save();
  closeSheet();
  renderTasks();
}
