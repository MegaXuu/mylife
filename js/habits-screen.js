/* ==========================================================================
   habits-screen.js — l'écran Habitudes (onglet depuis le Lot V2-2), la fiche
   de création/édition et le calendrier mensuel. Séparé de js/habits.js au
   Lot V3-4 (CONVENTIONS.md §1 : un fichier au-delà de ~600 lignes se scinde
   par sous-domaine) : là-bas le moteur (série, quota, journal) et le bloc
   d'Aujourd'hui, ici ce qui ne sert qu'à cet écran.

   Depuis le Lot V2-7 (audit B5/B6/B8), l'écran pose la même ligne de saisie
   du jour que le bloc d'Aujourd'hui (habitRowHtml(h, {title:false}) —
   jamais une deuxième implémentation du geste), un calendrier lisible (mois,
   en-tête de jours, numéros, hauteur figée à 6 semaines quel que soit le
   mois — habitCalendarHtml()) et une méta éclatée en planification/objectif
   (habitPlanTxt()) + trois chiffres de régularité nommés (habitStatsHtml()).
   ========================================================================== */

const UNIT_ORDER = ['', 'min', 'fois', 'L', 'pages'];
const UNIT_LABELS = {'': 'Simple (coche)', min: 'Minutes', fois: 'Fois', L: 'Litres', pages: 'Pages'};

/* ---------- Planification, calendrier, chiffres ---------- */
function schedTxt(sched){
  if(sched.kind === 'week') return (sched.perWeek || 1) + '× par semaine, jour libre';
  if(!sched.days || !sched.days.length) return 'Aucun jour choisi';
  const days = sched.days.slice().sort((a,b)=>a-b);
  // Les trois cas courants se disent en mots (Lot V3-3) : « Lun, Mar, Mer,
  // Jeu, Ven, Sam, Dim » se lisait moins vite que « Tous les jours ».
  const key = days.join('');
  if(key === '1234567') return 'Tous les jours';
  if(key === '12345') return 'En semaine';
  if(key === '67') return 'Le week-end';
  return days.map(d=>DOW_LABELS[d]).join(', ');
}

// Calendrier mensuel de régularité : quatre traitements visuels distincts —
// fait / partiel / sauté / inactif (ROADMAP §6 bis) — mois courant. Exactement
// quatre, pas cinq : un jour actif resté sans saisie n'est PAS un état à part
// (« manqué ») — CONVENTIONS.md §3 proscrit tout ton culpabilisant, un jour
// silencieux se lit comme « inactif », jamais comme un reproche. Un jour à
// venir (« future ») n'est pas un cinquième état non plus : ce n'est pas un
// jugement sur la régularité, juste de la chronologie.
function habitDayState(h, k, today){
  if(k > today) return 'future';
  if(habitSkippedOn(h, k)) return 'skip';
  if(habitReachedOn(h, k)) return 'done';
  if(habitActiveOn(h, k) && habitValueOn(h, k) > 0) return 'partial';
  return 'inactive';
}

/* Lot V2-7 (audit B6) : le calendrier d'origine n'avait ni nom de mois, ni
   en-tête de jours, ni numéros — une grille de carrés muets — et sa hauteur
   suivait le nombre de semaines du mois affiché. HAB_CAL_CELLS fige toujours
   42 cases (6 semaines pleines, le maximum qu'un mois puisse jamais demander,
   qu'il commence un lundi avec 31 jours ou tout autre cas) : la carte ne
   bouge plus ni du 1er au 31, ni d'un mois à l'autre. Les cases avant le 1er
   et après le dernier jour restent vides et sans numéro — elles n'appartiennent
   pas au mois, ce n'est pas un cinquième état. */
const HAB_DOW_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const HAB_CAL_CELLS = 42;
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
    cells += '<div class="hab-day '+habitDayState(h, k, today)+'" aria-hidden="true">'+day+'</div>';
  }
  for(let i=leadBlank+daysInMonth; i<HAB_CAL_CELLS; i++) cells += '<div class="hab-day blank" aria-hidden="true"></div>';
  const head = HAB_DOW_LETTERS.map(l=>'<div class="hab-cal-dow" aria-hidden="true">'+l+'</div>').join('');
  return '<div class="hab-cal-wrap">'+
    '<p class="hab-cal-month">'+cap(NLP_MOIS[m])+' '+y+'</p>'+
    '<div class="hab-cal-head">'+head+'</div>'+
    '<div class="hab-cal">'+cells+'</div>'+
  '</div>';
}

/* Lot V2-7 (audit B5) : « Lun, Mar, Mer, Jeu, Ven, Sam, Dim · 2 L / jour ·
   Série 4 j · Record 0 j · 0 % sur 30 jours » sur trois lignes, illisible.
   La planification/objectif (habitPlanTxt) et les trois chiffres de
   régularité (habitStatsHtml) sont désormais deux blocs distincts, chacun
   avec des libellés courts — mêmes trois chiffres qu'avant, aucun nouveau
   score ni rang (CONVENTIONS.md §3). */
function habitPlanTxt(h){
  const unitTxt = h.unit ? (h.target || 1) + ' ' + esc(h.unit) + ' / jour' : 'Coche simple';
  return esc(schedTxt(h.sched)) + ' · ' + unitTxt;
}
function habitStatsHtml(h){
  const today = todayKey();
  const streakUnit = h.sched.kind === 'week' ? ' sem.' : ' j';
  return '<div class="hab-stats">'+
    '<div class="hab-stat"><b>'+habitStreak(h, today)+streakUnit+'</b><span>Série</span></div>'+
    '<div class="hab-stat"><b>'+habitBestStreak(h)+streakUnit+'</b><span>Record</span></div>'+
    '<div class="hab-stat"><b>'+habitRate30(h, today)+' %</b><span>30 jours</span></div>'+
  '</div>';
}

// La ligne du jour (habitRowHtml, sans titre : celui de la carte suffit déjà)
// pose ici exactement le même geste de saisie que le bloc d'Aujourd'hui —
// jamais une deuxième implémentation du pas adapté ou du bouton « Fait ».
function habitCardHtml(h, i, n){
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="room-head">'+
      '<h2 class="card-title">'+esc(h.name)+'</h2>'+
      '<button class="row-del" aria-label="Modifier l’habitude" onclick="habitSheet(\''+h.id+'\')">'+icon(IC_EDIT, 20)+'</button>'+
    '</div>'+
    '<ul class="list">'+habitRowHtml(h, {title:false})+'</ul>'+
    '<p class="hab-plan">'+habitPlanTxt(h)+'</p>'+
    habitStatsHtml(h)+
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
   Fiche habitude — création et édition par la même feuille (comme
   taskSheet()). Deux modes de planification traités séparément (point ㉒).
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
    '<button class="chip'+(d.unit===u ? ' on' : '')+'" aria-pressed="'+!!(d.unit===u)+'" onclick="setHUnit(\''+u+'\')">'+esc(UNIT_LABELS[u])+'</button>'
  ).join('');
  const kindChips =
    '<button class="chip'+(d.schedKind==='days' ? ' on' : '')+'" aria-pressed="'+!!(d.schedKind==='days')+'" onclick="setHSchedKind(\'days\')">Jours fixes</button>'+
    '<button class="chip'+(d.schedKind==='week' ? ' on' : '')+'" aria-pressed="'+!!(d.schedKind==='week')+'" onclick="setHSchedKind(\'week\')">Quota par semaine</button>';
  const dayChips = DOW_ORDER.map(dw=>
    '<button class="chip'+(d.days.indexOf(dw)!==-1 ? ' on' : '')+'" aria-pressed="'+!!(d.days.indexOf(dw)!==-1)+'" onclick="toggleHDay('+dw+')">'+DOW_LABELS[dw]+'</button>'
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
  // Des jours fixes sans aucun jour, c'est une habitude qui ne serait jamais
  // active — ni sur Aujourd'hui, ni dans une série (Lot V3-4).
  if(d.schedKind === 'days' && !d.days.length){ toast('Choisis au moins un jour.'); return; }
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
  // Annulable depuis le Lot V3-4 (checklist V2 §6 : « toute action
  // destructive est annulable ») — la seule suppression de l'app qui ne
  // l'était pas. Le journal (habitLog) n'est jamais touché : annuler rend
  // l'habitude avec toute son histoire.
  confirmSheet('Supprimer « '+h.name+' » ?', 'Supprimer', ()=>{
    removeWithUndo(h, 'Habitude supprimée', rerender);
  });
}
