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

   Depuis le Lot V2-3 (audit B8), la saisie du bloc d'Aujourd'hui ne passe plus
   par un champ numérique et le clavier iOS : le pas d'incrémentation s'adapte
   à l'objectif (habStep(), pure et testée) et le bouton dit ce qu'il ajoute
   (« +5 », « +10 »), doublé d'un « Fait » qui pose l'objectif en un geste.

   Ce fichier expose aussi le bloc permanent d'Aujourd'hui (getTodayHabits(),
   appelé depuis js/today.js — today.js est plus tôt dans l'ordre de
   chargement mais ce n'est qu'une déclaration, comme getPlantCareItems()) et
   l'écran secondaire go('habits') : définitions, séries, calendrier mensuel.
   ========================================================================== */

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

/* Pas d'incrémentation adapté à l'objectif (Lot V2-3, audit B8) — fonction
   pure, testée isolément. Noter 30 minutes de marche passait par un champ de
   64 px et le clavier iOS ; trois taps de « +10 » suffisent désormais, ou un
   seul sur « Fait ». Une habitude sans unité n'a rien à compter : son pas est
   l'objectif lui-même, un tap le pose (et un « − » le retire). */
function habStep(h){
  if(!h.unit) return h.target || 1;
  const t = h.target || 1;
  if(t <= 10) return 1;
  if(t <= 25) return 5;
  if(t <= 60) return 10;
  return 25;
}

// Le bouton d'ajout DIT ce qu'il ajoute : « + » quand le pas vaut 1,
// « +5 »/« +10 » sinon. On lit avant d'appuyer.
function habPlusHtml(h){
  const step = habStep(h);
  const big = step > 1;
  return '<button class="step'+(big ? ' num' : '')+'" aria-label="'+esc('Ajouter '+step+(h.unit ? ' '+h.unit : ''))+'" '+
    'onclick="stepHabit(\''+h.id+'\',1)">'+(big ? '+'+step : '+')+'</button>';
}
function habMinusHtml(h){
  return '<button class="step" aria-label="'+esc('Retirer '+habStep(h)+(h.unit ? ' '+h.unit : ''))+'" '+
    'onclick="stepHabit(\''+h.id+'\',-1)">−</button>';
}
// « Fait » pose l'objectif en un geste : c'est le cas le plus fréquent, on a
// marché ses 30 minutes et on ne veut pas compter. Vert parce qu'un doigt agit
// dessus, jamais parce que c'est bien (discipline chromatique).
function habDoneHtml(h, aria){
  return '<button class="step wide" aria-label="'+esc(aria)+'" onclick="reachHabit(\''+h.id+'\')">Fait</button>';
}

// `ctrl` dit si la ligne porte une ligne de contrôles : la valeur du jour y est
// déjà affichée, la méta ne la répète pas.
function habitMeta(h, k, ctrl){
  const skip = habitSkippedOn(h, k);
  const streakUnit = h.sched.kind === 'week' ? ' sem.' : ' j';
  const streakTxt = 'Série ' + habitStreak(h, k) + streakUnit;
  if(skip) return 'Sautée aujourd’hui · ' + streakTxt;
  const bits = [];
  if(h.sched.kind === 'week'){
    bits.push('<b class="hab-val">' + habitWeekDone(h, habitWeekStart(k)) + '</b> / ' +
      (h.sched.perWeek || 1) + ' cette semaine');
  } else if(!h.unit){
    bits.push(habitReachedOn(h, k) ? 'Fait' : 'À faire');
  } else if(!ctrl){
    bits.push('<b class="hab-val">' + habitValueOn(h, k) + '</b> / ' + (h.target || 1) + ' ' + esc(h.unit));
  }
  bits.push(streakTxt);
  return bits.join(' · ');
}

/* Ligne de contrôles d'une habitude chiffrée encore à faire : la valeur, le
   pas adapté, et « Fait ». Les DEUX boutons d'ajout vivent ici, jamais sur la
   ligne du titre où se trouve « Sauter » — la règle du Lot V1-8 tient à la
   lettre (« jamais Sauter et deux boutons d'ajout sur la même ligne »), et le
   geste neutre reste loin du geste positif. Aucune barre de quota : une
   habitude se mesure en série et en quota, jamais en jauge (CONVENTIONS.md
   §6) — la barre --g-hab vit sur l'écran Habitudes. */
function habitCtrlHtml(h, k){
  const val = habitValueOn(h, k);
  return '<div class="hab-ctrl">'+
    (val > 0 ? habMinusHtml(h) : '')+
    '<span class="hab-count"><b class="hab-val">'+val+'</b> / '+(h.target || 1)+' '+esc(h.unit)+'</span>'+
    habPlusHtml(h)+
    habDoneHtml(h, 'Objectif atteint')+
  '</div>';
}

// Contrôles compacts, à droite de la ligne (disposition du Lot V1-8, gardée
// telle quelle) : la ligne est sautée, ou déjà au quota, ou sans unité — dans
// les trois cas il n'y a pas de valeur à composer.
function habitButtonsHtml(h, k, soft){
  const plus = h.unit ? habPlusHtml(h) : habDoneHtml(h, 'Marquer fait');
  if(habitSkippedOn(h, k)) return plus;           // changer d'avis reste possible
  if(soft){
    // Au quota : plus rien à pousser, mais toujours de quoi se dédire. Sur une
    // coche simple le « − » retire l'objectif entier (habStep), donc il suffit.
    if(!h.unit) return '<button class="step" aria-label="Marquer non fait" '+
      'onclick="stepHabit(\''+h.id+'\',-1)">−</button>';
    return habMinusHtml(h) + plus;
  }
  return '<button class="skip" onclick="skipHabit(\''+h.id+'\')">Sauter</button>' + plus;
}

/* Une habitude chiffrée encore à faire prend une ligne de contrôles (~122 px) ;
   dès qu'elle est atteinte ou sautée, elle retombe à la ligne compacte du Lot
   V1-8 (~70 px). La carte rétrécit donc à mesure que la journée avance — c'est
   le remboursement de la densité que coûte la saisie en un geste. */
function habitRowHtml(h){
  const k = todayKey();
  const soft = habitRowSoft(h, k);
  const ctrl = (h.unit && !soft && !habitSkippedOn(h, k)) ? habitCtrlHtml(h, k) : '';
  if(!ctrl){
    return '<li class="row'+(soft ? ' row-soft' : '')+'">'+
      '<div class="row-main"><div class="row-title">'+esc(h.name)+'</div>'+
        '<div class="row-meta">'+habitMeta(h, k, false)+'</div>'+
      '</div>'+
      habitButtonsHtml(h, k, soft)+
    '</li>';
  }
  return '<li class="row">'+
    '<div class="row-main">'+
      '<div class="row-head"><div class="row-title">'+esc(h.name)+'</div>'+
        (habitValueOn(h, k) > 0 ? '' : '<button class="skip" onclick="skipHabit(\''+h.id+'\')">Sauter</button>')+
      '</div>'+
      '<div class="row-meta">'+habitMeta(h, k, true)+'</div>'+
      ctrl+
    '</div>'+
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
// Renvoie true s'il a effectivement parlé : reachHabit() s'en sert pour ne
// pas empiler son toast d'annulation par-dessus celui du record.
function celebrateHabitRecord(h, prevBest){
  if(!prevBest) return false;
  const cur = habitStreak(h, todayKey());
  if(cur <= prevBest) return false;
  const unit = h.sched.kind === 'week' ? (cur>1?' semaines':' semaine') : (cur>1?' jours':' jour');
  toast('Record de série pour ' + h.name + ' : ' + cur + unit + '.');
  return true;
}

function stepHabit(id, delta){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  const k = todayKey();
  const cur = habitValueOn(h, k);
  const target = h.target || 1;
  const prevBest = habitBestStreak(h);
  let v = Math.max(0, cur + delta * habStep(h));
  // Le pas ne saute jamais PAR-DESSUS l'objectif : de 25 à 30, « +10 » pose 30.
  // Une fois l'objectif franchi il reprend sa valeur pleine — on peut toujours
  // boire un septième verre (règle du Lot V1-8, intacte).
  if(delta > 0 && cur < target && v > target) v = target;
  setHabitLogValue(h.id, v);
  celebrateHabitRecord(h, prevBest);
  rerender();
}

/* « Fait » : la valeur du jour devient l'objectif, en un geste (audit B8).
   Annulable — checklist V2 §6, « toute action de complétion ajoutée est
   annulable » — mais jamais deux toasts à la fois : quand la série bat son
   record, c'est ce toast-là qui parle, et le retour arrière reste sous le
   doigt, dans le « − » de la ligne devenue compacte. */
function reachHabit(id){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  const k = todayKey();
  const before = habitLogEntry(k, h.id);
  const prevBest = habitBestStreak(h);
  setHabitLogValue(h.id, h.target || 1);
  const dit = celebrateHabitRecord(h, prevBest);
  if(!dit) undoable(h.name + ' : fait.', ()=>{
    setHabitLogValue(h.id, before === undefined ? 0 : before);
    hideToast();
    rerender();
  });
  rerender();
}
function skipHabit(id){
  const h = S.habits.find(x=>x.id === id);
  if(!h) return;
  setHabitLogValue(h.id, 'skip');
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
