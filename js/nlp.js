/* ==========================================================================
   nlp.js — Lot V1-6 « Saisie rapide ». Deux parties :
   1. parseQuick(texte, ref, ignore) — parseur français PUR, aucun DOM,
      entièrement testable (test.mjs). Lit une phrase et une date de
      référence, ne touche jamais l'horloge ni le stockage.
   2. La barre de capture universelle (Aujourd'hui, Tâches) qui l'utilise :
      aperçu en direct sous forme de puces, chacune supprimable — le mot
      revient alors dans le titre via le 3ᵉ argument `ignore` de
      parseQuick(). Remplace l'ancien champ « Ajouter une tâche » : un seul
      chemin de saisie (CONVENTIONS.md §3, principe 5).
   ========================================================================== */

const NLP_MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const NLP_DOW = {lundi:1, mardi:2, mercredi:3, jeudi:4, vendredi:5, samedi:6, dimanche:7};
const NLP_DOW_PLUR = {lundis:1, mardis:2, mercredis:3, jeudis:4, vendredis:5, samedis:6, dimanches:7};

function normYear(y){ return y < 100 ? 2000 + y : y; }

/* ==========================================================================
   parseQuick — grammaire française minimale (ROADMAP-V1.md §3 point ⑤) :
   dates relatives et absolues, échéance explicite (avant/pour/deadline),
   récurrence à date fixe ou après réalisation, ce soir, priorité, effort,
   catégorie/pièce par dièse. Tout ce qui n'est pas reconnu reste dans le
   titre, intégralement — en cas de doute, ne rien avaler.
   `ignore` (tableau de clés : 'date','repeat','prio','effort','cat','room')
   désactive une règle : le fragment qu'elle aurait consommé reste alors
   dans le titre. C'est ce qui permet à la barre de capture de « rendre »
   un mot quand on retire sa puce.
   ========================================================================== */
function parseQuick(texte, ref, ignore){
  ref = ref || new Date();
  ignore = new Set(ignore || []);
  let text = ' ' + String(texte == null ? '' : texte).trim().replace(/\s+/g, ' ') + ' ';
  // Une virgule/point collé à un mot (« avant le 5, ») casse les frontières
  // d'espace des règles ci-dessous : on lui fait de la place ici, et on la
  // recolle au mot voisin à la fin si elle a survécu (cf. result.title).
  text = text.replace(/(\S)([,;.])/g, '$1 $2');
  const matched = [];
  const result = {title:'', start:null, due:null, evening:false, repeat:null, cat:null, room:null, prio:0, effort:2, matched};
  const refKey = dayKey(ref);

  function consume(m, key, label){
    text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
    matched.push({key, label, raw: m[0].trim()});
  }
  function fmtKey(y, mIdx, day){ return y + '-' + String(mIdx + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }
  function dateFromDM(day, mIdx, year){
    let y = year != null ? year : ref.getFullYear();
    let k = fmtKey(y, mIdx, day);
    if(year == null && k < refKey){ y = ref.getFullYear() + 1; k = fmtKey(y, mIdx, day); }
    return k;
  }
  function dateFromDayOnly(day){
    let k = fmtKey(ref.getFullYear(), ref.getMonth(), day);
    if(k < refKey) k = dayKey(new Date(ref.getFullYear(), ref.getMonth() + 1, day));
    return k;
  }
  function addDaysKey(n){ return addDays(refKey, n); }
  function addMonthsKey(n){ const d = new Date(refKey + 'T00:00'); d.setMonth(d.getMonth() + n); return dayKey(d); }
  function nextWeekday(dow, forceNextWeek){
    const d = new Date(ref); d.setHours(0, 0, 0, 0);
    const cur = d.getDay() === 0 ? 7 : d.getDay();
    let diff = (dow - cur + 7) % 7;
    if(forceNextWeek) diff += 7;
    d.setDate(d.getDate() + diff);
    return dayKey(d);
  }

  if(!ignore.has('date')) applyDate();
  if(!ignore.has('repeat')) applyRepeat();
  if(!ignore.has('prio')) applyPrio();
  if(!ignore.has('effort')) applyEffort();
  applyHash();

  let leftover = text.trim().replace(/\s+/g, ' ').replace(/\s+([,;.])/g, '$1');
  // Une virgule orpheline (son mot voisin vient d'être avalé par une règle)
  // ne veut plus rien dire en bout ou en tête de titre : elle disparaît.
  leftover = leftover.replace(/^[,;]+\s*/, '').replace(/\s*[,;]+$/, '');
  result.title = cap(leftover);
  return result;

  /* ---------- date : start (« quand je veux m'en occuper ») ou due (« la vraie deadline ») ----------
     Priorité : échéance explicite (avant/pour/deadline) d'abord — sinon
     « le 15 » tout seul serait avalé par la règle générique et l'échéance
     perdue. Puis les expressions relatives, de la plus spécifique
     (« demain soir ») à la plus générique (« le 15 »). */
  function applyDate(){
    const MOIS_RE = NLP_MOIS.join('|');
    const DUE_PREFIX = '(?:avant le|pour le|deadline(?: le)?)';
    let m;

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))? ', 'i'));
    if(m){ result.due = dateFromDM(+m[1], +m[2] - 1, m[3] ? normYear(+m[3]) : null); result.start = null; consume(m, 'date', 'Échéance le ' + fmtDateShort(result.due)); return; }

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2}) (' + MOIS_RE + ') ', 'i'));
    if(m){ result.due = dateFromDM(+m[1], NLP_MOIS.indexOf(m[2].toLowerCase()), null); result.start = null; consume(m, 'date', 'Échéance le ' + fmtDateShort(result.due)); return; }

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2}) ', 'i'));
    if(m){ result.due = dateFromDayOnly(+m[1]); result.start = null; consume(m, 'date', 'Échéance le ' + fmtDateShort(result.due)); return; }

    m = text.match(/ ce soir /i);
    if(m){ result.start = refKey; result.evening = true; consume(m, 'date', 'Ce soir'); return; }

    m = text.match(/ après[- ]demain( soir)? /i);
    if(m){ result.start = addDaysKey(2); result.evening = !!m[1]; consume(m, 'date', m[1] ? 'Après-demain soir' : 'Après-demain'); return; }

    m = text.match(/ demain( soir)? /i);
    if(m){ result.start = addDaysKey(1); result.evening = !!m[1]; consume(m, 'date', m[1] ? 'Demain soir' : 'Demain'); return; }

    m = text.match(/ aujourd['’]?hui /i);
    if(m){ result.start = refKey; consume(m, 'date', 'Aujourd’hui'); return; }

    m = text.match(new RegExp(' (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) prochain ', 'i'));
    if(m){ result.start = nextWeekday(NLP_DOW[m[1].toLowerCase()], true); consume(m, 'date', cap(m[1].toLowerCase()) + ' prochain'); return; }

    m = text.match(new RegExp(' (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) ', 'i'));
    if(m){ result.start = nextWeekday(NLP_DOW[m[1].toLowerCase()], false); consume(m, 'date', cap(m[1].toLowerCase())); return; }

    m = text.match(/ la semaine prochaine /i);
    if(m){ result.start = addDaysKey(7); consume(m, 'date', 'La semaine prochaine'); return; }

    m = text.match(/ le mois prochain /i);
    if(m){ result.start = addMonthsKey(1); consume(m, 'date', 'Le mois prochain'); return; }

    m = text.match(/ dans (un|\d+) (jours?|semaines?|mois) /i);
    if(m){
      const n = /^un$/i.test(m[1]) ? 1 : parseInt(m[1], 10);
      const unite = m[2].toLowerCase();
      if(unite.indexOf('jour') === 0){ result.start = addDaysKey(n); consume(m, 'date', 'Dans ' + n + ' jour' + (n > 1 ? 's' : '')); }
      else if(unite.indexOf('semaine') === 0){ result.start = addDaysKey(n * 7); consume(m, 'date', 'Dans ' + n + ' semaine' + (n > 1 ? 's' : '')); }
      else { result.start = addMonthsKey(n); consume(m, 'date', 'Dans ' + n + ' mois'); }
      return;
    }

    m = text.match(/ (\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))? /);
    if(m){ result.start = dateFromDM(+m[1], +m[2] - 1, m[3] ? normYear(+m[3]) : null); consume(m, 'date', fmtDateShort(result.start)); return; }

    m = text.match(new RegExp(' le (\\d{1,2}) (' + MOIS_RE + ') ', 'i'));
    if(m){ result.start = dateFromDM(+m[1], NLP_MOIS.indexOf(m[2].toLowerCase()), null); consume(m, 'date', fmtDateShort(result.start)); return; }

    m = text.match(/ le (\d{1,2}) /i);
    if(m){ result.start = dateFromDayOnly(+m[1]); consume(m, 'date', fmtDateShort(result.start)); return; }
  }

  /* ---------- récurrence : à date fixe (from:'due') ou après réalisation (from:'done') ---------- */
  function applyRepeat(){
    const AP = '(?: après(?: réalisation| la dernière fois)?)?';
    let m;

    m = text.match(new RegExp(' tous les (lundis|mardis|mercredis|jeudis|vendredis|samedis|dimanches)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'week', n:1, days:[NLP_DOW_PLUR[m[1].toLowerCase()]]}, m); return; }

    m = text.match(new RegExp(' tous les (\\d+) jours' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'day', n:parseInt(m[1], 10)}, m); return; }

    m = text.match(new RegExp(' (?:tous les jours|chaque jour)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'day', n:1}, m); return; }

    m = text.match(new RegExp(' tous les (\\d+) du mois' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'month', n:1}, m); return; }

    m = text.match(new RegExp(' tous les (\\d+) mois' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'month', n:parseInt(m[1], 10)}, m); return; }

    m = text.match(new RegExp(' tous les (\\d+) ans' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'year', n:parseInt(m[1], 10)}, m); return; }

    m = text.match(new RegExp(' (?:tous les ans|chaque année)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'year', n:1}, m); return; }

    m = text.match(new RegExp(' toutes les semaines' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'week', n:1}, m); return; }

    m = text.match(new RegExp(' tous les (\\d+) semaines?' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'week', n:parseInt(m[1], 10)}, m); return; }

    function setRepeat(base, mm){
      const r = {kind:base.kind, n:base.n || 1, days:base.days || [], from: /après/i.test(mm[0]) ? 'done' : 'due'};
      result.repeat = r;
      consume(mm, 'repeat', repeatSummary(r).replace(/\.$/, ''));
    }
  }

  /* ---------- priorité : !! / urgent → 2, ! / important → 1 ---------- */
  function applyPrio(){
    let m = text.match(/!!+/);
    if(m){ result.prio = 2; consume(m, 'prio', 'Urgent'); return; }
    m = text.match(/ urgent /i);
    if(m){ result.prio = 2; consume(m, 'prio', 'Urgent'); return; }
    m = text.match(/!/);
    if(m){ result.prio = 1; consume(m, 'prio', 'Important'); return; }
    m = text.match(/ important /i);
    if(m){ result.prio = 1; consume(m, 'prio', 'Important'); }
  }

  /* ---------- effort : court (~5 min) / long (~1 h) — sinon la valeur par défaut (moyen) ---------- */
  function applyEffort(){
    let m = text.match(/ (\d{1,3})\s*min(?:utes?)? /i);
    if(m && parseInt(m[1], 10) <= 15){ result.effort = 1; consume(m, 'effort', 'Court'); return; }
    m = text.match(/ (\d{1,2})\s*h(?:eures?)? /i);
    if(m){ result.effort = 3; consume(m, 'effort', 'Long'); return; }
    m = text.match(/ court /i);
    if(m){ result.effort = 1; consume(m, 'effort', 'Court'); return; }
    m = text.match(/ long /i);
    if(m){ result.effort = 3; consume(m, 'effort', 'Long'); }
  }

  /* ---------- #catégorie / #pièce — seuls les mots connus (CAT_ORDER/ROOM_ORDER, js/tasks.js) sont interprétés ---------- */
  function applyHash(){
    const re = /#(\w+)/g;
    let m;
    while((m = re.exec(text))){
      const mot = m[1].toLowerCase();
      if(!result.room && !ignore.has('room') && ROOM_ORDER.indexOf(mot) !== -1){
        result.room = mot;
        matched.push({key:'room', label:ROOM_LABELS[mot], raw:m[0]});
        text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
        re.lastIndex = 0;
        continue;
      }
      if(!result.cat && !ignore.has('cat') && CAT_ORDER.indexOf(mot) !== -1){
        result.cat = mot;
        matched.push({key:'cat', label:CAT_LABELS[mot], raw:m[0]});
        text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
        re.lastIndex = 0;
        continue;
      }
    }
  }
}

/* ==========================================================================
   Barre de capture universelle (Aujourd'hui, Tâches). L'aperçu se recalcule
   à chaque frappe SANS re-rendre tout l'écran — ça perdrait le focus du
   champ : seul #cap-preview-<écran> est remplacé. `_capIgnore` retient les
   puces écartées d'un tap ; le mot revient alors dans le titre.
   ========================================================================== */
let _capText = '';
let _capIgnore = new Set();

function captureParse(){
  return parseQuick(_capText, new Date(), Array.from(_capIgnore));
}

function captureBarHtml(){
  const scr = CURRENT_SCREEN;
  return '<div class="capture">' +
      '<div class="addbar">' +
        '<input id="cap-input-' + scr + '" class="field" type="text" placeholder="Ajouter une tâche…" ' +
          'value="' + esc(_capText) + '" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" ' +
          'oninput="onCaptureInput(this.value)" onkeydown="if(event.key===\'Enter\')commitCapture()">' +
        '<button class="add-btn" aria-label="Ajouter" onclick="commitCapture()">' +
          icon('<path d="M12 5v14M5 12h14"></path>', 24) +
        '</button>' +
      '</div>' +
      '<div id="cap-preview-' + scr + '">' + capturePreviewHtml() + '</div>' +
    '</div>';
}

function capturePreviewHtml(){
  if(!_capText.trim()) return '';
  const p = captureParse();
  const chips = p.matched.length ? '<div class="chips cap-chips">' +
    p.matched.map(x =>
      '<button type="button" class="chip on cap-chip" aria-label="Retirer : ' + esc(x.label) + '" ' +
        'onclick="removeCaptureChip(\'' + x.key + '\')">' + esc(x.label) + icon(IC_CLOSE, 14) + '</button>'
    ).join('') + '</div>' : '';
  return chips + '<button type="button" class="btn quiet cap-details" onclick="openCaptureDetails()">Détails…</button>';
}

function onCaptureInput(v){
  _capText = v;
  refreshCapturePreview();
}
function refreshCapturePreview(){
  const el = document.getElementById('cap-preview-' + CURRENT_SCREEN);
  if(el) el.innerHTML = capturePreviewHtml();
}
function removeCaptureChip(key){
  _capIgnore.add(key);
  refreshCapturePreview();
}

function commitCapture(){
  const input = document.getElementById('cap-input-' + CURRENT_SCREEN);
  if(input) _capText = input.value;
  const p = captureParse();
  if(!p.title) return;
  S.tasks.push(stamp({
    title:p.title, notes:'', cat:p.cat || 'perso', room:p.room || null,
    bucket:(p.start || p.due) ? 'scheduled' : 'anytime',
    start:p.start, due:p.due, evening:p.evening, prio:p.prio, effort:p.effort,
    repeat:p.repeat, history:[], postponed:0, touchedAt:Date.now()
  }));
  save();
  _capText = ''; _capIgnore = new Set();
  rerender();
  const ni = document.getElementById('cap-input-' + CURRENT_SCREEN);
  if(ni) ni.focus();
}

// Bouton discret : ce que le langage naturel n'a pas su couvrir se termine
// dans la fiche complète du Lot V1-3, préremplie avec ce qui a déjà été compris.
function openCaptureDetails(){
  const p = captureParse();
  taskSheet(null);
  Object.assign(_tSheet, {
    title:p.title, cat:p.cat || 'perso', room:p.room || null,
    start:p.start, due:p.due, evening:p.evening, prio:p.prio, effort:p.effort,
    bucket:(p.start || p.due) ? 'scheduled' : 'anytime', repeat:p.repeat
  });
  refreshTaskSheet();
  _capText = ''; _capIgnore = new Set();
  refreshCapturePreview();
}
