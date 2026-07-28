/* ==========================================================================
   habits.js — domaine Habitudes (Lot V1-8). Une habitude se mesure en SÉRIE
   et en QUOTA, jamais en jauge de fraîcheur — l'inverse de l'entretien
   (CONVENTIONS.md §6, ROADMAP §6 bis « frontière entretien / habitude »).
   Ne réutilise donc PAS js/recur.js : c'est un moteur différent, à dessein.

   Deux modes de planification (ROADMAP §5, point ㉒), traités séparément :
     sched = {kind:'days', days:[1..7]}   — jours fixes (1=lundi..7=dimanche,
                                             même convention que repeat.days)
     sched = {kind:'week', perWeek:N}     — quota hebdomadaire libre

   Le jour « sauté » (habitLog[jour][id] === 'skip') est NEUTRE : il ne casse
   jamais une série et ne compte jamais comme réussite (point ㉑). La
   progression partielle (valeur < objectif) n'est ni un échec ni une
   réussite : seule l'atteinte de l'objectif alimente la série (point ㉓).

   Ce fichier expose aussi le bloc permanent d'Aujourd'hui (getTodayHabits(),
   appelé depuis js/today.js — today.js est plus tôt dans l'ordre de
   chargement mais ce n'est qu'une déclaration, comme getPlantCareItems()) et
   l'écran secondaire go('habits') : définitions, séries, calendrier mensuel.
   ========================================================================== */

const HAB_STEP_MAX = 10; // au-delà, clavier numérique plutôt que ± (ROADMAP §6.4)
const UNIT_ORDER = ['', 'min', 'fois', 'L', 'pages'];
const UNIT_LABELS = {'': 'Simple (coche)', min: 'Minutes', fois: 'Fois', L: 'Litres', pages: 'Pages'};

/* ---------- Lecture du journal — pures, sans DOM ---------- */

// Jour ISO 1..7 (lundi..dimanche) — même convention que repeat.days (recur.js/tasks.js).
function isoDow(k){
  const d = new Date(k+'T00:00');
  return d.getDay() === 0 ? 7 : d.getDay();
}

// Une habitude « jours fixes » n'est actionnable QUE ces jours-là ; une
// habitude « quota libre » est actionnable n'importe quel jour de la semaine.
function habitActiveOn(h, k){
  if(h.sched.kind === 'days') return (h.sched.days || []).indexOf(isoDow(k)) !== -1;
  return true;
}

function habitLogEntry(k, id){
  const day = S.habitLog[k];
  return day ? day[id] : undefined;
}
function habitSkippedOn(h, k){ return habitLogEntry(k, h.id) === 'skip'; }
function habitValueOn(h, k){
  const v = habitLogEntry(k, h.id);
  return typeof v === 'number' ? v : 0;
}
// Seule l'atteinte de l'objectif compte comme réussite (point ㉓) — jamais
// une valeur partielle, jamais un jour sauté.
function habitReachedOn(h, k){
  const v = habitLogEntry(k, h.id);
  if(v === 'skip' || v === undefined) return false;
  return v >= (h.target || 1);
}

// Écrit la valeur du jour. 0 efface l'entrée (journal qui reste compact) ;
// 'skip' est une valeur explicite distincte de 0 (neutre, pas un échec).
function setHabitLogValue(id, val, k){
  k = k || todayKey();
  const day = S.habitLog[k] || (S.habitLog[k] = {});
  if(val === 0){
    delete day[id];
    if(!Object.keys(day).length) delete S.habitLog[k];
  } else {
    day[id] = val;
  }
  save();
}

/* ---------- Semaine — pour le mode quota (point ㉒) ---------- */

// Premier jour de la semaine contenant k, selon settings.weekStart (0=dimanche, 1=lundi).
function habitWeekStart(k){
  const ws = S.settings.weekStart == null ? 1 : S.settings.weekStart;
  const dow = new Date(k+'T00:00').getDay(); // 0..6, 0=dimanche
  const diff = (dow - ws + 7) % 7;
  return addDays(k, -diff);
}
function habitWeekDone(h, weekStart){
  let n = 0;
  for(let i=0;i<7;i++){ if(habitReachedOn(h, addDays(weekStart, i))) n++; }
  return n;
}

/* ---------- Série (point ㉔ implicite du glossaire §6) ----------
   Jours/semaines consécutifs où l'objectif est atteint, en ignorant les
   jours inactifs ET les jours sautés. Le jour/la semaine de référence (en
   cours) ne casse jamais la série tant qu'il n'est pas « fini » : on ne
   pénalise pas une journée qui n'est simplement pas encore jouée. */
function habitStreakDays(h, ref){
  ref = ref || todayKey();
  let streak = 0, k = ref, current = true;
  for(let guard=0; guard<3660; guard++){
    if(!habitActiveOn(h, k)){ k = addDays(k, -1); continue; }
    if(habitSkippedOn(h, k)){ k = addDays(k, -1); current = false; continue; }
    if(habitReachedOn(h, k)){ streak++; k = addDays(k, -1); current = false; continue; }
    if(current){ current = false; k = addDays(k, -1); continue; } // jour en cours, pas encore joué
    break;
  }
  return streak;
}
function habitStreakWeeks(h, ref){
  ref = ref || todayKey();
  let streak = 0, ws = habitWeekStart(ref), current = true;
  for(let guard=0; guard<520; guard++){
    const reached = habitWeekDone(h, ws) >= (h.sched.perWeek || 1);
    if(reached){ streak++; ws = addDays(ws, -7); current = false; continue; }
    if(current){ current = false; ws = addDays(ws, -7); continue; } // semaine en cours, pas finie
    break;
  }
  return streak;
}
function habitStreak(h, ref){
  return h.sched.kind === 'week' ? habitStreakWeeks(h, ref) : habitStreakDays(h, ref);
}

// Record : plus longue série jamais atteinte, simulée en avançant depuis la
// création de l'habitude. Bornée (10 ans) pour rester un calcul, pas une boucle infinie.
function habitBestStreak(h){
  const today = todayKey();
  if(h.sched.kind === 'week'){
    let ws = habitWeekStart(dayKey(new Date(h.createdAt)));
    const endWs = habitWeekStart(today);
    let best = 0, cur = 0;
    for(let guard=0; guard<520; guard++){
      if(habitWeekDone(h, ws) >= (h.sched.perWeek || 1)){ cur++; best = Math.max(best, cur); }
      else if(ws !== endWs){ cur = 0; }
      if(ws === endWs) break;
      ws = addDays(ws, 7);
    }
    return best;
  }
  let k = dayKey(new Date(h.createdAt)), best = 0, cur = 0;
  for(let guard=0; guard<3660; guard++){
    if(habitActiveOn(h, k) && !habitSkippedOn(h, k)){
      if(habitReachedOn(h, k)){ cur++; best = Math.max(best, cur); }
      else if(k !== today) cur = 0;
    }
    if(k === today) break;
    k = addDays(k, 1);
  }
  return best;
}

// Taux de réussite sur 30 jours : parmi les jours actifs et non sautés,
// proportion où l'objectif a été atteint. Les jours d'avant la création de
// l'habitude ne comptent pas (elle n'existait pas encore).
function habitRate30(h, ref){
  ref = ref || todayKey();
  const debut = dayKey(new Date(h.createdAt));
  let considered = 0, reached = 0;
  for(let i=0;i<30;i++){
    const k = addDays(ref, -i);
    if(k < debut) continue;
    if(!habitActiveOn(h, k)) continue;
    if(habitSkippedOn(h, k)) continue;
    considered++;
    if(habitReachedOn(h, k)) reached++;
  }
  return considered ? Math.round(reached / considered * 100) : 0;
}

// Une ligne est « en retrait » (row-soft) quand il n'y a plus rien à
// pousser : sautée aujourd'hui, ou (mode quota) le quota de la semaine est
// déjà atteint. Reste toujours actionnable (CLAUDE.md — « Verres d'eau »).
function habitRowSoft(h, k){
  if(habitSkippedOn(h, k)) return true;
  if(h.sched.kind === 'week') return habitWeekDone(h, habitWeekStart(k)) >= (h.sched.perWeek || 1);
  return habitReachedOn(h, k);
}

/* ==========================================================================
   Bloc « Habitudes du jour » — appelé depuis todayBuckets() (js/today.js),
   position 4 de la cascade (ROADMAP §6). Montre les habitudes actives
   aujourd'hui, réussies ou non : c'est la maquette qui fait foi (une
   habitude déjà au quota reste visible, en retrait, jamais masquée).
   ========================================================================== */
function getTodayHabits(ref){
  ref = ref || todayKey();
  return live(S.habits).filter(h=>habitActiveOn(h, ref))
    .sort((a,b)=>(a.sort||0)-(b.sort||0) || (a.createdAt||0)-(b.createdAt||0));
}
// Ce qui reste vraiment à faire — alimente la pastille iOS et l'état vide.
function habitsPendingCount(list, k){
  k = k || todayKey();
  return list.filter(h=>!habitRowSoft(h, k)).length;
}

function habitMeta(h, k){
  const skip = habitSkippedOn(h, k);
  const streakUnit = h.sched.kind === 'week' ? ' sem.' : ' j';
  const streakTxt = 'Série ' + habitStreak(h, k) + streakUnit;
  if(skip) return 'Sautée aujourd’hui · ' + streakTxt;
  if(h.sched.kind === 'week'){
    const done = habitWeekDone(h, habitWeekStart(k));
    return '<b class="hab-val">' + done + '</b> / ' + (h.sched.perWeek || 1) + ' cette semaine · ' + streakTxt;
  }
  if(!h.unit) return (habitReachedOn(h, k) ? 'Fait' : 'À faire') + ' · ' + streakTxt;
  return '<b class="hab-val">' + habitValueOn(h, k) + '</b> / ' + (h.target || 1) + ' ' + esc(h.unit) + ' · ' + streakTxt;
}

// ± pour les petits objectifs, clavier numérique au-delà de HAB_STEP_MAX
// (ROADMAP §6.4). Jamais « Sauter » et deux boutons sur la même ligne : à
// zéro, Sauter + un seul contrôle d'ajout ; sinon, un seul contrôle (le champ
// numérique remplace à lui seul + et −, sinon − apparaît à côté de +).
function habitButtonsHtml(h, k, soft){
  const val = habitValueOn(h, k);
  const skip = habitSkippedOn(h, k);
  const big = (h.target || 1) > HAB_STEP_MAX;
  const ctrl = big
    ? '<input class="field hab-num" type="number" min="0" inputmode="numeric" value="'+val+'" onchange="setHabitValue(\''+h.id+'\',this.value)">'
    : '<button class="step" aria-label="Ajouter" onclick="stepHabit(\''+h.id+'\',1)">+</button>';
  if(skip) return ctrl;
  if(val > 0 || soft){
    const sub = big ? '' : '<button class="step" aria-label="Retirer" onclick="stepHabit(\''+h.id+'\',-1)">−</button>';
    return sub + ctrl;
  }
  return '<button class="skip" onclick="skipHabit(\''+h.id+'\')">Sauter</button>' + ctrl;
}

function habitRowHtml(h){
  const k = todayKey();
  const soft = habitRowSoft(h, k);
  return '<li class="row'+(soft ? ' row-soft' : '')+'">'+
    '<div class="row-main"><div class="row-title">'+esc(h.name)+'</div>'+
      '<div class="row-meta">'+habitMeta(h, k)+'</div>'+
    '</div>'+
    habitButtonsHtml(h, k, soft)+
  '</li>';
}

// Un tap sur l'en-tête ouvre l'écran de suivi (ROADMAP §6.5) — seule porte
// vers go('habits'), qui n'a pas d'onglet.
function todayHabitsCard(list, i, n){
  return '<div class="card t-habitudes">'+birdOnCard(i, n)+
    '<button class="habits-head" onclick="go(\'habits\')"><h2 class="card-title">Habitudes du jour</h2></button>'+
    '<ul class="list">'+list.map(habitRowHtml).join('')+'</ul>'+
  '</div>';
}

/* ---------- Actions du bloc du jour ---------- */

// Motivation légère (ROADMAP §2 « Motivation », point 4 du Lot 10) : un seul
// toast sobre quand la série dépasse son record précédent — jamais sur le
// tout premier jour d'une habitude (prevBest à 0, ce serait un « record »
// systématique et donc un bruit). Aucun point, aucun rang, aucune monnaie.
function celebrateHabitRecord(h, prevBest){
  if(!prevBest) return;
  const cur = habitStreak(h, todayKey());
  if(cur <= prevBest) return;
  const unit = h.sched.kind === 'week' ? (cur>1?' semaines':' semaine') : (cur>1?' jours':' jour');
  toast('Record de série pour ' + h.name + ' : ' + cur + unit + '.');
}

function stepHabit(id, delta){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  const step = h.unit === '' ? (h.target || 1) : 1; // coche simple : le tap atteint l'objectif directement
  const prevBest = habitBestStreak(h);
  const v = Math.max(0, habitValueOn(h, todayKey()) + delta * step);
  setHabitLogValue(h.id, v);
  celebrateHabitRecord(h, prevBest);
  rerender();
}
function skipHabit(id){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  setHabitLogValue(h.id, 'skip');
  rerender();
}
function setHabitValue(id, raw){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  const prevBest = habitBestStreak(h);
  setHabitLogValue(h.id, Math.max(0, parseInt(raw, 10) || 0));
  celebrateHabitRecord(h, prevBest);
  rerender();
}

/* ==========================================================================
   Écran secondaire go('habits') — définitions, séries, calendrier mensuel.
   Atteint uniquement en tapant l'en-tête du bloc d'Aujourd'hui (ROADMAP §6 bis) :
   pas d'onglet.
   ========================================================================== */
function schedTxt(sched){
  if(sched.kind === 'week') return (sched.perWeek || 1) + '× par semaine, jour libre';
  if(!sched.days || !sched.days.length) return 'Aucun jour choisi';
  return sched.days.slice().sort((a,b)=>a-b).map(d=>DOW_LABELS[d]).join(', ');
}

// Calendrier mensuel de régularité : quatre traitements visuels distincts —
// fait / partiel / sauté / inactif (ROADMAP §6 bis) — mois courant. Exactement
// quatre, pas cinq : un jour actif resté sans saisie n'est PAS un état à part
// (« manqué ») — CONVENTIONS.md §3 proscrit tout ton culpabilisant, un jour
// silencieux se lit comme « inactif », jamais comme un reproche.
function habitDayState(h, k, today){
  if(k > today) return 'future';
  if(habitSkippedOn(h, k)) return 'skip';
  if(habitReachedOn(h, k)) return 'done';
  if(habitActiveOn(h, k) && habitValueOn(h, k) > 0) return 'partial';
  return 'inactive';
}
function habitCalendarHtml(h){
  const today = todayKey();
  const d0 = new Date(today+'T00:00');
  const y = d0.getFullYear(), m = d0.getMonth();
  const leadBlank = (new Date(y, m, 1).getDay() + 6) % 7; // aligne lundi en première colonne
  const daysInMonth = new Date(y, m+1, 0).getDate();
  let cells = '';
  for(let i=0;i<leadBlank;i++) cells += '<div class="hab-day blank" aria-hidden="true"></div>';
  for(let day=1; day<=daysInMonth; day++){
    const k = dayKey(new Date(y, m, day));
    cells += '<div class="hab-day '+habitDayState(h, k, today)+'" title="'+day+'" aria-hidden="true"></div>';
  }
  return '<div class="hab-cal">'+cells+'</div>';
}

function habitCardHtml(h, i, n){
  const today = todayKey();
  const streakUnit = h.sched.kind === 'week' ? ' sem.' : ' j';
  const unitTxt = h.unit ? (h.target || 1) + ' ' + esc(h.unit) + ' / jour' : 'Coche simple';
  const msg = esc(schedTxt(h.sched)) + ' · ' + unitTxt + ' · Série ' + habitStreak(h, today) + streakUnit +
    ' · Record ' + habitBestStreak(h) + streakUnit + ' · ' + habitRate30(h, today) + ' % sur 30 jours';
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="room-head">'+
      '<h2 class="card-title">'+esc(h.name)+'</h2>'+
      '<button class="row-del" aria-label="Modifier l’habitude" onclick="habitSheet(\''+h.id+'\')">'+icon(IC_EDIT, 20)+'</button>'+
    '</div>'+
    '<p class="sheet-msg">'+msg+'</p>'+
    habitCalendarHtml(h)+
  '</div>';
}

function renderHabits(){
  const items = live(S.habits).sort((a,b)=>(a.sort||0)-(b.sort||0) || (a.createdAt||0)-(b.createdAt||0));
  const body = items.length
    ? items.map((h,i)=>habitCardHtml(h, i, items.length)).join('')
    : emptyState('Aucune habitude.', 'Ajoute ta première habitude ci-dessous.');
  document.getElementById('s-habits').innerHTML =
    screenHead('', 'Habitudes')+
    body+
    '<button class="btn secondary btn-full" onclick="habitSheet(null)">Ajouter une habitude</button>';
}

/* ==========================================================================
   Fiche habitude — création et édition par la même feuille (comme taskSheet/
   plantSheet). Deux modes de planification traités séparément (point ㉒).
   ========================================================================== */
let _hSheet = null;

function habitSheet(id){
  const h = id ? S.habits.find(x=>x.id === id) : null;
  _hSheet = h ? {
    id: h.id, name: h.name || '', unit: h.unit || '', target: h.target || 1,
    schedKind: h.sched.kind, days: (h.sched.days || []).slice(), perWeek: h.sched.perWeek || 3
  } : {
    id: null, name: '', unit: '', target: 1, schedKind: 'days', days: [1,2,3,4,5], perWeek: 3
  };
  openSheet(habitSheetHtml());
  if(!id){
    const el = document.getElementById('h-name');
    if(el) el.focus();
  }
}
function refreshHabitSheet(){ openSheet(habitSheetHtml()); }
function setHUnit(u){ _hSheet.unit = u; if(!u) _hSheet.target = 1; refreshHabitSheet(); }
function setHTarget(v){ _hSheet.target = Math.max(1, parseInt(v, 10) || 1); refreshHabitSheet(); }
function setHSchedKind(k){ _hSheet.schedKind = k; refreshHabitSheet(); }
function toggleHDay(dow){
  const days = _hSheet.days;
  const i = days.indexOf(dow);
  if(i === -1) days.push(dow); else days.splice(i, 1);
  refreshHabitSheet();
}
function setHPerWeek(v){ _hSheet.perWeek = Math.max(1, Math.min(7, parseInt(v, 10) || 1)); refreshHabitSheet(); }

function habitSheetHtml(){
  const d = _hSheet;
  const unitChips = UNIT_ORDER.map(u=>
    '<button class="chip'+(d.unit===u?' on':'')+'" onclick="setHUnit(\''+u+'\')">'+esc(UNIT_LABELS[u])+'</button>'
  ).join('');
  const kindChips =
    '<button class="chip'+(d.schedKind==='days'?' on':'')+'" onclick="setHSchedKind(\'days\')">Jours fixes</button>'+
    '<button class="chip'+(d.schedKind==='week'?' on':'')+'" onclick="setHSchedKind(\'week\')">Quota par semaine</button>';
  const dayChips = DOW_ORDER.map(dw=>
    '<button class="chip'+(d.days.indexOf(dw)!==-1?' on':'')+'" onclick="toggleHDay('+dw+')">'+DOW_LABELS[dw]+'</button>'
  ).join('');
  const schedBlock = d.schedKind === 'days'
    ? '<div class="field-group"><span class="overline">Jours</span><div class="chips">'+dayChips+'</div></div>'
    : '<div class="field-group"><span class="overline">Fois par semaine</span><div class="repeat-n">'+
        '<input class="field" type="number" min="1" max="7" inputmode="numeric" value="'+d.perWeek+'" onchange="setHPerWeek(this.value)"><span>fois</span>'+
      '</div></div>';
  return '<p class="sheet-title">'+(d.id ? 'Modifier l’habitude' : 'Nouvelle habitude')+'</p>'+
    '<div class="field-group">'+
      '<input id="h-name" class="field field-full" type="text" placeholder="Nom" value="'+esc(d.name)+'" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_hSheet.name=this.value">'+
    '</div>'+
    '<div class="field-group"><span class="overline">Unité</span><div class="chips">'+unitChips+'</div></div>'+
    (d.unit ? '<div class="field-group"><span class="overline">Objectif quotidien</span><div class="repeat-n">'+
      '<input class="field" type="number" min="1" inputmode="numeric" value="'+d.target+'" onchange="setHTarget(this.value)"><span>'+esc(UNIT_LABELS[d.unit])+'</span>'+
    '</div></div>' : '')+
    '<div class="field-group"><span class="overline">Planification</span><div class="chips">'+kindChips+'</div></div>'+
    schedBlock+
    '<button class="btn primary btn-full" onclick="saveHabitSheet()">'+(d.id ? 'Enregistrer' : 'Ajouter l’habitude')+'</button>'+
    (d.id ? '<button class="btn danger btn-full" onclick="deleteHabit(\''+d.id+'\')">Supprimer</button>' : '')+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

function saveHabitSheet(){
  const d = _hSheet;
  const name = cap((d.name || '').trim());
  if(!name){
    const el = document.getElementById('h-name');
    if(el) el.focus();
    return;
  }
  const sched = d.schedKind === 'week'
    ? {kind:'week', perWeek:d.perWeek}
    : {kind:'days', days:d.days.slice()};
  let h = d.id ? S.habits.find(x=>x.id === d.id) : null;
  if(h){
    h.name = name; h.unit = d.unit; h.target = d.unit ? d.target : 1; h.sched = sched;
    touch(h);
  } else {
    h = stamp({name, unit:d.unit, target: d.unit ? d.target : 1, sched, sort: live(S.habits).length});
    S.habits.push(h);
  }
  save();
  closeSheet();
  rerender();
  toast(d.id ? 'Habitude enregistrée' : 'Habitude ajoutée');
}

function deleteHabit(id){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  confirmSheet('Supprimer « '+h.name+' » ?', 'Supprimer', ()=>{
    h.deletedAt = Date.now();
    touch(h);
    save();
    rerender();
    toast('Habitude supprimée');
  });
}
