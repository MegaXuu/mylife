/* ==========================================================================
   meals.js — écran Menus (Lot V3-2), la moitié « Menus » de l'onglet Repas
   (l'autre moitié est Courses, js/shopping.js). ROADMAP-V3.md §2.4.

   Répond à deux questions : combien de repas faut-il prévoir cette semaine,
   et qu'est-ce qu'on mange. Trois idées portent tout l'écran :
     · une SEMAINE TYPE réglée une fois (settings.mealWeek, 14 repas : à
       prévoir à N personnes, cantine ou ailleurs) — chaque semaine en part,
       on n'ajuste que les exceptions ;
     · S.meals[] ne stocke QUE ce qui s'en écarte ou porte un plat : un repas
       sans plat qui suit la semaine type n'existe pas en mémoire. Un champ à
       null hérite de la semaine type, pour qu'un changement de la semaine
       type s'applique à tout ce qui n'a pas été décidé à la main ;
     · juste le NOM du plat. La bibliothèque de plats n'est pas saisie : elle
       se déduit de ce qui a déjà été mangé (mealDishes()), comme les
       produits fréquents des courses — rien à tenir à jour.
   Objets synchro-ready (CONVENTIONS.md §2) : {id, createdAt, updatedAt,
   deletedAt, day, slot, dish, leftover, status, people}.
   ========================================================================== */

const MEAL_SLOTS = ['midi','soir'];
const MEAL_SLOT_LABELS = {midi:'Midi', soir:'Soir'};
const MEAL_STATUS_ORDER = ['plan','cantine','ailleurs'];
const MEAL_STATUS_LABELS = {plan:'À prévoir', cantine:'Cantine', ailleurs:'Ailleurs'};
const MEAL_PEOPLE = [1,2,3,4];
const MEAL_RECENT_DAYS = 10; // « Me proposer » évite un plat mangé il y a moins de 10 jours
const MEAL_SUGG_MAX = 8;     // plats proposés en un tap dans la fiche d'un repas
const MEAL_MIDI_UNTIL = 14;  // avant 14 h, Aujourd'hui parle du midi ; ensuite, du soir
// Couverts : la fourchette et le couteau, même trait que les autres icônes.
const IC_MEAL = '<path d="M6 3v6a3 3 0 0 0 6 0V3"></path><path d="M9 3v18"></path>'+
  '<path d="M18 21V3c-2.2 1.2-3.5 3.6-3.5 7.5 0 1.4.9 2.5 2 2.5H18"></path>';

let _mealWeek = null;   // lundi de la semaine affichée ; null = la semaine en cours

/* ==========================================================================
   Lecture — fonctions pures sur S, testées isolément (test.mjs)
   ========================================================================== */

function weekMonday(k){ return addDays(k, 1 - isoDow(k)); }
function mealWeekStart(){ return _mealWeek || weekMonday(todayKey()); }
function weekDays(start){ return [0,1,2,3,4,5,6].map(i=>addDays(start, i)); }

// Le repas stocké pour ce créneau, ou null. Si deux appareils en ont créé un
// chacun (synchro future), le plus récent gagne.
function mealAt(day, slot){
  let best = null;
  S.meals.forEach(m=>{
    if(!m.deletedAt && m.day === day && m.slot === slot && (!best || (m.updatedAt || 0) > (best.updatedAt || 0))) best = m;
  });
  return best;
}
function mealType(day, slot){
  const w = (S.settings.mealWeek || {})[isoDow(day)] || {};
  const t = w[slot] || {};
  return {s: t.s || 'plan', p: t.p || 2};
}
// Le créneau tel qu'il se lit : la semaine type, puis ce qui s'en écarte.
function mealSlot(day, slot){
  const m = mealAt(day, slot), t = mealType(day, slot);
  return {
    day, slot, meal: m,
    status: (m && m.status) || t.s,
    people: (m && m.people) || t.p,
    dish: (m && m.dish) || '',
    leftover: !!(m && m.leftover)
  };
}
function weekSlots(start){
  const out = [];
  weekDays(start).forEach(d=>MEAL_SLOTS.forEach(s=>out.push(mealSlot(d, s))));
  return out;
}
// Le compte de la semaine : repas à prévoir, dont à deux ou plus, portions
// — sur la semaine entière, pour que le chiffre ne fonde pas au fil des
// jours — et combien restent à choisir, à partir d'aujourd'hui seulement :
// un lundi soir passé sans plat noté n'est plus à choisir.
function mealWeekStats(start){
  const today = todayKey();
  const plan = weekSlots(start).filter(x=>x.status === 'plan');
  return {
    plan: plan.length,
    duo: plan.filter(x=>x.people >= 2).length,
    portions: plan.reduce((s, x)=>s + x.people, 0),
    todo: plan.filter(x=>!x.dish && x.day >= today).length
  };
}

// Les plats déjà mangés, les plus fréquents d'abord (puis les plus récents).
// Les restes n'y comptent pas : ce n'est pas un plat de plus, c'est le même.
function mealDishes(){
  const map = {};
  live(S.meals).forEach(m=>{
    if(!m.dish || m.leftover) return;
    const k = normalizeLabel(m.dish);
    if(!k) return;
    const e = map[k] || (map[k] = {key:k, label:m.dish, count:0, last:''});
    e.count++;
    if(m.day > e.last){ e.last = m.day; e.label = m.dish; }
  });
  return Object.keys(map).map(k=>map[k])
    .sort((a, b)=>(b.count - a.count) || (a.last < b.last ? 1 : (a.last > b.last ? -1 : 0)));
}
function mealSuggestions(q){
  const n = normalizeLabel(q);
  return mealDishes().filter(d=>!n || (d.key.indexOf(n) !== -1 && d.key !== n)).slice(0, MEAL_SUGG_MAX);
}

// Le créneau à prévoir qui suit (day, slot), sur 7 jours au plus : là où
// tombent les restes.
function nextFreeMealSlot(day, slot){
  let d = day, s = slot;
  for(let i = 0; i < 14; i++){
    if(s === 'midi') s = 'soir'; else { s = 'midi'; d = addDays(d, 1); }
    const x = mealSlot(d, s);
    if(x.status === 'plan' && !x.dish) return x;
  }
  return null;
}

/* ==========================================================================
   Écriture
   ========================================================================== */

// Pose des champs sur le repas d'un créneau, en le créant au besoin. Un
// repas qui n'a plus rien à retenir (pas de plat, rien qui s'écarte de la
// semaine type) devient un tombstone plutôt qu'un objet vide qui traîne.
function upsertMeal(day, slot, fields){
  let m = mealAt(day, slot);
  if(!m){
    m = stamp({day, slot, dish:'', leftover:false, status:null, people:null});
    S.meals.push(m);
  }
  Object.assign(m, fields);
  const t = mealType(day, slot);
  if(m.status === t.s) m.status = null;
  if(m.people === t.p) m.people = null;
  if(!m.dish) m.leftover = false;
  if(!m.dish && !m.status && !m.people) m.deletedAt = Date.now();
  touch(m);
  return m;
}

// Cliché de créneaux avant une opération groupée, pour l'annuler d'un coup.
function mealSnapshot(slots){
  return slots.map(x=>{
    const m = mealAt(x.day, x.slot);
    return {day:x.day, slot:x.slot, prev: m ? {id:m.id, dish:m.dish, leftover:m.leftover, status:m.status, people:m.people} : null};
  });
}
function restoreMealSnapshot(snap){
  snap.forEach(e=>{
    const cur = mealAt(e.day, e.slot);
    if(!e.prev){ if(cur){ cur.deletedAt = Date.now(); touch(cur); } return; }
    const m = S.meals.find(x=>x.id === e.prev.id);
    if(!m) return;
    if(cur && cur !== m){ cur.deletedAt = Date.now(); touch(cur); }
    m.dish = e.prev.dish; m.leftover = e.prev.leftover; m.status = e.prev.status; m.people = e.prev.people;
    m.deletedAt = null;
    touch(m);
  });
}

// Créneaux encore ouverts d'une semaine : à prévoir, sans plat, pas passés.
function openMealSlots(start){
  const today = todayKey();
  return weekSlots(start).filter(x=>x.status === 'plan' && !x.dish && x.day >= today);
}

/* « Me proposer » — remplit les repas ouverts de la semaine avec des plats
   déjà connus, tirés au sort en proportion de leur fréquence (on ressert
   plus souvent ce qu'on aime), sans doublon dans la semaine et sans rien
   de mangé dans les 10 jours autour. `rnd` est injectable pour les tests. */
function proposeMeals(start, rnd){
  rnd = rnd || Math.random;
  const open = openMealSlots(start);
  const from = addDays(start, -MEAL_RECENT_DAYS), to = addDays(start, 6 + MEAL_RECENT_DAYS);
  const near = new Set(live(S.meals).filter(m=>m.dish && m.day >= from && m.day <= to).map(m=>normalizeLabel(m.dish)));
  const pool = mealDishes().filter(d=>!near.has(d.key));
  const snap = mealSnapshot(open);
  let filled = 0;
  open.forEach(x=>{
    if(!pool.length) return;
    const total = pool.reduce((s, d)=>s + d.count, 0);
    let r = rnd() * total, i = 0;
    while(i < pool.length - 1 && r >= pool[i].count){ r -= pool[i].count; i++; }
    const d = pool.splice(i, 1)[0];
    upsertMeal(x.day, x.slot, {dish:d.label, leftover:false});
    filled++;
  });
  return {filled, snap};
}

// « Reprendre la semaine dernière » : chaque repas ouvert reprend le plat
// posé au même créneau sept jours plus tôt, restes compris.
function copyLastWeekMeals(start){
  const open = openMealSlots(start);
  const snap = mealSnapshot(open);
  let filled = 0;
  open.forEach(x=>{
    const prev = mealSlot(addDays(x.day, -7), x.slot);
    if(!prev.dish) return;
    upsertMeal(x.day, x.slot, {dish:prev.dish, leftover:prev.leftover});
    filled++;
  });
  return {filled, snap};
}

/* ==========================================================================
   Rendu
   ========================================================================== */

function mealDayName(k){
  const d = new Date(k+'T00:00').getDay();
  return cap(DOW_NAMES[d === 0 ? 7 : d]);
}
function mealWeekLabel(start){
  const diff = Math.round(daysBetween(weekMonday(todayKey()), start) / 7);
  if(diff === 0) return 'Cette semaine';
  if(diff === 1) return 'Semaine prochaine';
  if(diff === -1) return 'Semaine dernière';
  return 'Semaine du '+fmtDateShort(start);
}

// Bascule Menus | Courses, en tête des deux moitiés de l'onglet Repas. Un
// contrôle segmenté plutôt que des chips : sur Courses, elle est posée juste
// au-dessus des chips Liste | Mode magasin, et deux rangées de chips
// identiques ne disaient plus laquelle change d'écran et laquelle change
// d'affichage. Un état, pas une action : aucun vert (discipline chromatique).
function repasSegHtml(active){
  return '<div class="repas-seg" role="tablist" aria-label="Repas">'+
    '<button class="seg'+(active === 'meals' ? ' on' : '')+'" role="tab" aria-selected="'+(active === 'meals')+'" onclick="go(\'meals\')">Menus</button>'+
    '<button class="seg'+(active === 'shopping' ? ' on' : '')+'" role="tab" aria-selected="'+(active === 'shopping')+'" onclick="go(\'shopping\')">Courses</button>'+
  '</div>';
}

function mealCellHtml(x, today){
  let cls = 'meal-cell', main, meta = '';
  if(x.status !== 'plan'){ cls += ' off'; main = MEAL_STATUS_LABELS[x.status] || x.status; }
  else if(x.dish){ main = x.dish; meta = (x.leftover ? 'Restes · ' : '')+x.people+' pers.'; }
  else { cls += ' todo'; main = 'À choisir'; meta = x.people+' pers.'; }
  if(x.day < today) cls += ' past';
  const label = mealDayName(x.day)+' '+MEAL_SLOT_LABELS[x.slot].toLowerCase()+' : '+main+(meta ? ', '+meta : '');
  return '<button class="'+cls+'" aria-label="'+esc(label)+'" onclick="mealSheet(\''+x.day+'\',\''+x.slot+'\')">'+
    '<span class="meal-dish">'+esc(main)+'</span>'+(meta ? '<span class="meal-meta">'+esc(meta)+'</span>' : '')+
  '</button>';
}

// Grille jours × midi/soir. `dates` à faux (semaine type) : ni numéro du
// jour ni repère d'aujourd'hui — une semaine type n'a pas de dates.
function mealGridHtml(start, cellFn, dates){
  const today = todayKey();
  const withDates = dates !== false;
  return '<div class="meal-grid">'+
    '<span></span><span class="meal-col">Midi</span><span class="meal-col">Soir</span>'+
    weekDays(start).map(d=>{
      const dd = new Date(d+'T00:00');
      return '<div class="meal-day'+(withDates && d === today ? ' today' : '')+'">'+
          '<span>'+esc(DOW_LABELS[isoDow(d)])+'</span>'+(withDates ? '<b>'+dd.getDate()+'</b>' : '')+'</div>'+
        MEAL_SLOTS.map(s=>cellFn(d, s, today)).join('');
    }).join('')+
  '</div>';
}

function renderMeals(){
  const start = mealWeekStart();
  const st = mealWeekStats(start);
  const open = openMealSlots(start).length;
  const lastHas = weekSlots(addDays(start, -7)).some(x=>x.dish);
  // Le compte de la semaine en trois chiffres — la grammaire des chiffres de
  // régularité d'une habitude (.hab-stats/.hab-stat, Lot V2-7), reprise telle
  // quelle : repas à prévoir, portions (ce qui dimensionne les courses), et
  // ce qui reste à choisir.
  const stats = '<div class="hab-stats meal-stats">'+
    '<div class="hab-stat"><b>'+st.plan+'</b><span>repas à prévoir</span></div>'+
    '<div class="hab-stat"><b>'+st.portions+'</b><span>'+(st.portions > 1 ? 'portions' : 'portion')+'</span></div>'+
    '<div class="hab-stat"><b>'+st.todo+'</b><span>à choisir</span></div>'+
  '</div>';
  const hint = S.settings.mealWeekSet ? '' :
    '<div class="meal-hint"><p class="sheet-msg">Commence par ta semaine type : les repas à la cantine ou ailleurs ne seront plus à prévoir, chaque semaine.</p>'+
    '<button class="btn primary btn-full" onclick="mealTypeSheet()">Régler ma semaine type</button></div>';
  const actions = !open ? '' :
    '<button class="btn secondary btn-full" onclick="proposeMealsAction()">Me proposer</button>'+
    (lastHas ? '<button class="btn secondary btn-full" onclick="copyLastWeekAction()">Reprendre la semaine dernière</button>' : '');
  document.getElementById('s-meals').innerHTML =
    screenHead('Du '+fmtDateShort(start)+' au '+fmtDateShort(addDays(start, 6)), 'Repas')+
    repasSegHtml('meals')+
    '<div class="meal-nav">'+
      '<button aria-label="Semaine précédente" onclick="shiftMealWeek(-1)">'+icon('<path d="M15 6l-6 6 6 6"></path>', 22)+'</button>'+
      '<h2 class="meal-week">'+esc(mealWeekLabel(start))+'</h2>'+
      '<button aria-label="Semaine suivante" onclick="shiftMealWeek(1)">'+icon('<path d="M9 6l6 6-6 6"></path>', 22)+'</button>'+
    '</div>'+
    hint+
    // Les chiffres dans la carte, au-dessus de la grille : l'oiseau se pose
    // sur le bord supérieur de la carte (birdOnCard()) et ne doit rien
    // cacher de ce qui est posé juste au-dessus.
    '<div class="card">'+birdOnCard(0, 1)+
      stats+
      mealGridHtml(start, (d, s, today)=>mealCellHtml(mealSlot(d, s), today))+
    '</div>'+
    actions+
    '<button class="btn quiet btn-full" onclick="mealTypeSheet()">Semaine type</button>';
}

function shiftMealWeek(n){
  const start = addDays(mealWeekStart(), 7*n);
  _mealWeek = start === weekMonday(todayKey()) ? null : start;
  renderMeals();
}

function proposeMealsAction(){
  const r = proposeMeals(mealWeekStart());
  if(!r.filled){
    toast(mealDishes().length ? 'Aucun plat connu à proposer sans répétition.' : 'Pas encore de plats connus : ils s’apprennent au fil des repas.');
    return;
  }
  save();
  renderMeals();
  undoable(r.filled+(r.filled > 1 ? ' repas proposés.' : ' repas proposé.'), ()=>{
    restoreMealSnapshot(r.snap); save(); renderMeals();
  });
}
function copyLastWeekAction(){
  const r = copyLastWeekMeals(mealWeekStart());
  if(!r.filled){ toast('Rien à reprendre pour les repas encore ouverts.'); return; }
  save();
  renderMeals();
  undoable(r.filled+' repas repris.', ()=>{
    restoreMealSnapshot(r.snap); save(); renderMeals();
  });
}

/* ==========================================================================
   Fiche d'un repas — le plat (une suggestion = un tap, et c'est fini), le
   statut, le nombre de personnes, les restes, et quelques courses à noter
   au passage sans changer d'écran.
   ========================================================================== */
let _mSheet = null;

function mealSheet(day, slot){
  const x = mealSlot(day, slot);
  _mSheet = {day, slot, dish:x.dish, leftover:x.leftover, status:x.status, people:x.people, shop:false, had:!!x.dish};
  openSheet(mealSheetHtml());
}
function refreshMealSheet(){ openSheet(mealSheetHtml()); }
function setMealStatus(s){ _mSheet.status = s; refreshMealSheet(); }
function setMealPeople(p){ _mSheet.people = p; refreshMealSheet(); }
function toggleMealShop(){ _mSheet.shop = !_mSheet.shop; refreshMealSheet(); }
function onMealDishInput(v){
  _mSheet.dish = v;
  _mSheet.leftover = false; // un autre plat tapé n'est plus un reste
  const el = document.getElementById('m-sugg');
  if(el) el.innerHTML = mealSuggHtml();
}
function pickMealDish(i){
  const d = mealSuggestions(_mSheet.dish)[i];
  if(!d) return;
  _mSheet.dish = d.label;
  _mSheet.leftover = false;
  saveMealSheet();
}

function mealSuggHtml(){
  return mealSuggestions(_mSheet.dish).map((d, i)=>
    '<button type="button" class="chip" onclick="pickMealDish('+i+')">'+esc(d.label)+'</button>'
  ).join('');
}

function mealSheetHtml(){
  const d = _mSheet;
  const plan = d.status === 'plan';
  const statusChips = MEAL_STATUS_ORDER.map(s=>
    '<button class="chip'+(d.status === s ? ' on' : '')+'" onclick="setMealStatus(\''+s+'\')">'+esc(MEAL_STATUS_LABELS[s])+'</button>'
  ).join('');
  const peopleChips = MEAL_PEOPLE.map(p=>
    '<button class="chip'+(d.people === p ? ' on' : '')+'" onclick="setMealPeople('+p+')">'+p+' pers.</button>'
  ).join('');
  const shop = !d.shop ? '<button class="btn quiet btn-full" onclick="toggleMealShop()">Ajouter des courses</button>' :
    '<div class="field-group"><span class="overline">Courses</span><div class="addbar meal-shop">'+
      '<input id="m-shop" class="field" type="text" placeholder="Crème, lardons…" autocomplete="off" autocapitalize="sentences" '+
        'enterkeyhint="done" onkeydown="if(event.key===\'Enter\')addMealShopping()">'+
      '<button class="add-btn" aria-label="Ajouter aux courses" onclick="addMealShopping()">'+icon('<path d="M12 5v14M5 12h14"></path>', 24)+'</button>'+
    '</div></div>';
  return '<p class="sheet-title">'+esc(mealDayName(d.day)+' '+new Date(d.day+'T00:00').getDate()+' · '+MEAL_SLOT_LABELS[d.slot])+'</p>'+
    (plan ?
      '<div class="field-group">'+
        '<input id="m-dish" class="field field-full" type="text" placeholder="Plat" value="'+esc(d.dish)+'" '+
          'autocomplete="off" autocapitalize="sentences" enterkeyhint="done" '+
          'oninput="onMealDishInput(this.value)" onkeydown="if(event.key===\'Enter\')saveMealSheet()">'+
        '<div id="m-sugg" class="chips cap-chips">'+mealSuggHtml()+'</div>'+
        (d.leftover ? '<p class="sheet-msg meal-left">Des restes d’un repas précédent.</p>' : '')+
      '</div>' : '')+
    '<div class="field-group"><span class="overline">Ce repas</span><div class="chips">'+statusChips+'</div></div>'+
    (plan ? '<div class="field-group"><span class="overline">Pour</span><div class="chips">'+peopleChips+'</div></div>' : '')+
    (plan && d.dish.trim() && !d.leftover ? '<button class="btn quiet btn-full more-toggle" onclick="mealLeftoverAction()">Il en restera pour un autre repas</button>' : '')+
    (plan ? shop : '')+
    '<button class="btn primary btn-full" onclick="saveMealSheet()">Enregistrer</button>'+
    (d.had ? '<button class="btn quiet btn-full" onclick="clearMealDish()">Retirer le plat</button>' : '')+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

function writeMealSheet(){
  const d = _mSheet;
  const dish = d.status === 'plan' ? cap((d.dish || '').trim()) : '';
  upsertMeal(d.day, d.slot, {dish, leftover: dish ? !!d.leftover : false, status:d.status, people:d.people});
  save();
  return dish;
}
function saveMealSheet(){
  writeMealSheet();
  closeSheet();
  rerender();
}
function clearMealDish(){
  _mSheet.dish = '';
  _mSheet.leftover = false;
  saveMealSheet();
}

// Restes : le plat de ce repas, posé tel quel sur le prochain repas à
// prévoir encore libre. Annulable, comme toute action qui écrit ailleurs
// que là où on a tapé.
function mealLeftoverAction(){
  const dish = writeMealSheet();
  if(!dish) return;
  const d = _mSheet;
  const x = nextFreeMealSlot(d.day, d.slot);
  closeSheet();
  if(!x){ rerender(); toast('Aucun repas libre dans les 7 jours pour les restes.'); return; }
  const snap = mealSnapshot([x]);
  upsertMeal(x.day, x.slot, {dish, leftover:true});
  save();
  rerender();
  undoable('Restes posés : '+mealDayName(x.day).toLowerCase()+' '+MEAL_SLOT_LABELS[x.slot].toLowerCase()+'.', ()=>{
    restoreMealSnapshot(snap); save(); rerender();
  });
}

// Quelques courses notées depuis un repas : même chemin de création que le
// champ de l'écran Courses (addShoppingItem(), js/shopping.js), rayon
// deviné compris. La feuille reste ouverte : on n'a pas fini avec ce repas.
function addMealShopping(){
  const el = document.getElementById('m-shop');
  const labels = String(el ? el.value : '').split(/[,;\n]+/).map(x=>cap(x.trim())).filter(Boolean);
  if(!labels.length) return;
  labels.forEach(addShoppingItem);
  if(el){ el.value = ''; el.focus(); }
  toast(labels.length+(labels.length > 1 ? ' articles ajoutés aux courses.' : ' article ajouté aux courses.'));
}

/* ==========================================================================
   Semaine type — une grille de 14 repas ; toucher un repas le fait passer
   de 2 personnes à 1, à la cantine, ailleurs, puis de nouveau à 2.
   ========================================================================== */
const MEAL_TYPE_CYCLE = [{s:'plan', p:2}, {s:'plan', p:1}, {s:'cantine'}, {s:'ailleurs'}];
let _mType = null;

function mealTypeLabel(t){
  return t.s === 'plan' ? (t.p || 2)+' pers.' : (MEAL_STATUS_LABELS[t.s] || t.s);
}
function mealTypeSheet(){
  _mType = JSON.parse(JSON.stringify(S.settings.mealWeek || mealWeekDefault()));
  openSheet(mealTypeSheetHtml());
}
function cycleMealType(dow, slot){
  const cur = (_mType[dow] || {})[slot] || {s:'plan', p:2};
  const i = MEAL_TYPE_CYCLE.findIndex(c=>c.s === cur.s && (c.s !== 'plan' || c.p === (cur.p || 2)));
  const next = MEAL_TYPE_CYCLE[(i + 1) % MEAL_TYPE_CYCLE.length];
  _mType[dow] = _mType[dow] || {};
  _mType[dow][slot] = next.s === 'plan' ? {s:'plan', p:next.p} : {s:next.s, p:cur.p || 2};
  openSheet(mealTypeSheetHtml());
}
function mealTypeSheetHtml(){
  const start = weekMonday(todayKey());
  const grid = mealGridHtml(start, (d, s)=>{
    const dow = isoDow(d);
    const t = (_mType[dow] || {})[s] || {s:'plan', p:2};
    const off = t.s !== 'plan';
    const label = mealDayName(d)+' '+MEAL_SLOT_LABELS[s].toLowerCase()+' : '+mealTypeLabel(t);
    return '<button class="meal-cell'+(off ? ' off' : '')+'" aria-label="'+esc(label)+'" onclick="cycleMealType('+dow+',\''+s+'\')">'+
      '<span class="meal-dish">'+esc(mealTypeLabel(t))+'</span></button>';
  }, false);
  return '<p class="sheet-title">Semaine type</p>'+
    '<p class="sheet-msg">Touche un repas pour passer de 2 personnes à 1, à la cantine, ailleurs. Chaque semaine part de là : tu n’ajustes plus que les exceptions.</p>'+
    grid+
    '<button class="btn primary btn-full meal-type-save" onclick="saveMealType()">Enregistrer</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}
function saveMealType(){
  S.settings.mealWeek = _mType;
  S.settings.mealWeekSet = true;
  save();
  closeSheet();
  rerender();
}

/* ==========================================================================
   Aujourd'hui — une ligne, le prochain repas à prévoir du jour (le midi
   jusqu'à 14 h, le soir ensuite). Rien tant que Menus n'a jamais servi :
   « Ce soir : à choisir » tous les jours à quelqu'un qui ne planifie pas
   ses repas serait du bruit, pas un service.
   ========================================================================== */
function mealTodayLine(hour){
  if(!live(S.meals).length) return null;
  hour = hour == null ? new Date().getHours() : hour;
  const today = todayKey();
  const slots = hour < MEAL_MIDI_UNTIL ? MEAL_SLOTS : ['soir'];
  for(let i = 0; i < slots.length; i++){
    const x = mealSlot(today, slots[i]);
    if(x.status === 'plan') return x;
  }
  return null;
}
function mealTodayHtml(x){
  const lab = x.slot === 'midi' ? 'Ce midi' : 'Ce soir';
  const txt = x.dish ? x.dish+(x.leftover ? ' (restes)' : '') : 'À choisir';
  return '<button class="shop" onclick="go(\'meals\')">'+
    '<span class="shop-l">'+icon(IC_MEAL, 20)+esc(lab+' : '+txt)+'</span>'+
    '<span class="shop-go">Voir</span>'+
  '</button>';
}
