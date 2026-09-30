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
// Synonymes de pièce reconnus après un dièse (Lot V3-4), accents retirés :
// « #toilettes », « #salledebain », « #maison »… en plus des clés elles-mêmes.
const NLP_ROOM_ALIASES = {toilettes:'wc', toilette:'wc', salledebain:'sdb', salledebains:'sdb', bain:'sdb',
  douche:'sdb', maison:'partout', tout:'partout', jardin:'exterieur', dehors:'exterieur', terrasse:'balcon'};
function nlpBare(w){ return String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

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
  const result = {title:'', start:null, due:null, evening:false, repeat:null, cat:null, room:null, prio:0, effort:2, mins:null, matched};
  const refKey = dayKey(ref);

  function consume(m, key, label){
    text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
    matched.push({key, label, raw: m[0].trim()});
  }
  function fmtKey(y, mIdx, day){ return y + '-' + String(mIdx + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }
  // Une date qui n'existe pas (« 31/02 », « 13/13 », « le 45 ») n'est jamais
  // fabriquée (Lot V3-4) : ces fonctions renvoient null, la règle ne consomme
  // rien et le fragment reste dans le titre. Avant, « 2026-02-31 » partait
  // tel quel en start et s'affichait « NaN undefined ».
  function realDate(y, mIdx, day){
    const d = new Date(y, mIdx, day);
    return (d.getFullYear() === y && d.getMonth() === mIdx && d.getDate() === day) ? fmtKey(y, mIdx, day) : null;
  }
  function dateFromDM(day, mIdx, year){
    if(year != null) return realDate(year, mIdx, day);
    const k = realDate(ref.getFullYear(), mIdx, day);
    if(k && k >= refKey) return k;
    // Déjà passé cette année (ou 29 février d'une année non bissextile) : la
    // prochaine année où ce jour existe.
    for(let y = ref.getFullYear() + 1; y <= ref.getFullYear() + 8; y++){ const k2 = realDate(y, mIdx, day); if(k2) return k2; }
    return null;
  }
  // « Le 31 » un 12 septembre : le 31 n'existe pas en septembre, c'est le 31
  // octobre — le prochain mois qui porte ce jour, aujourd'hui compris.
  function dateFromDayOnly(day){
    if(day < 1 || day > 31) return null;
    for(let i = 0; i < 13; i++){
      const y = ref.getFullYear() + Math.floor((ref.getMonth() + i) / 12), mIdx = (ref.getMonth() + i) % 12;
      const k = realDate(y, mIdx, day);
      if(k && k >= refKey) return k;
    }
    return null;
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
  // Une tâche récurrente sans date reçoit sa première occurrence (Lot V3-4) :
  // « Sport tous les lundis » tombe lundi, « Arroser tous les jours »
  // aujourd'hui. Jamais pour un entretien (pièce + « après ») : lui se
  // pilote par sa jauge, jamais fait = à faire aujourd'hui.
  if(result.repeat && !result.start && !result.due && !(result.repeat.from === 'done' && result.room)){
    result.start = firstOccurrence(result.repeat, refKey);
  }

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

    // Pose une date trouvée — ou rien du tout si elle n'existe pas.
    const put = (field, k, mm, label)=>{
      if(!k) return false;
      result[field] = k;
      if(field === 'due') result.start = null;
      consume(mm, 'date', label(k));
      return true;
    };
    const dueLabel = k=>'Échéance le ' + fmtDateShort(k);

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))? ', 'i'));
    if(m && put('due', dateFromDM(+m[1], +m[2] - 1, m[3] ? normYear(+m[3]) : null), m, dueLabel)) return;

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2}) (' + MOIS_RE + ') ', 'i'));
    if(m && put('due', dateFromDM(+m[1], NLP_MOIS.indexOf(m[2].toLowerCase()), null), m, dueLabel)) return;

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2}) ', 'i'));
    if(m && put('due', dateFromDayOnly(+m[1]), m, dueLabel)) return;

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
    if(m && put('start', dateFromDM(+m[1], +m[2] - 1, m[3] ? normYear(+m[3]) : null), m, fmtDateShort)) return;

    m = text.match(new RegExp(' le (\\d{1,2}) (' + MOIS_RE + ') ', 'i'));
    if(m && put('start', dateFromDM(+m[1], NLP_MOIS.indexOf(m[2].toLowerCase()), null), m, fmtDateShort)) return;

    m = text.match(/ le (\d{1,2}) /i);
    if(m && put('start', dateFromDayOnly(+m[1]), m, fmtDateShort)) return;
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

    // « tous les 15 du mois » : le 15 devient la première occurrence (Lot
    // V3-4) — sans elle, le chiffre se perdait et la tâche tombait n'importe
    // quel jour du mois.
    m = text.match(new RegExp(' tous les (\\d+) du mois' + AP + ' ', 'i'));
    if(m){
      const dom = parseInt(m[1], 10);
      const first = dateFromDayOnly(dom);
      if(first){ setRepeat({kind:'month', n:1, dom}, m); if(!result.start && !result.due) result.start = first; return; }
    }

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
      if(base.dom) r.dom = base.dom;
      result.repeat = r;
      consume(mm, 'repeat', repeatSummary(r).replace(/\.$/, ''));
    }
  }

  /* ---------- priorité : !! / urgent → 2, ! / important → 1 ---------- */
  /* Les mots-clés (« urgent », « important », « court », « long ») ne sont
     reconnus qu'en fin de phrase, dièses éventuels mis à part (Lot V3-4) :
     au milieu, ce sont des mots comme les autres. « Réserver le court de
     tennis » perdait son « court » (effort 1), « Ranger le long couloir » son
     « long ». En queue — « Relire le contrat important », « Sortir les
     poubelles court » — ils restent des consignes. */
  function tailWord(re){
    const m = text.match(new RegExp(' (' + re + ')((?: #[\\p{L}\\d_-]+)*) $', 'iu'));
    if(!m) return null;
    // Ne consommer que le mot, pas les dièses qui le suivent (applyHash()).
    return {0: ' ' + m[1] + ' ', index: m.index, length: 1};
  }
  function applyPrio(){
    let m = text.match(/!!+/);
    if(m){ result.prio = 2; consume(m, 'prio', 'Urgent'); return; }
    m = tailWord('urgent');
    if(m){ result.prio = 2; consume(m, 'prio', 'Urgent'); return; }
    m = text.match(/!/);
    if(m){ result.prio = 1; consume(m, 'prio', 'Important'); return; }
    m = tailWord('important');
    if(m){ result.prio = 1; consume(m, 'prio', 'Important'); }
  }

  /* ---------- effort : court (~5 min) / long (~1 h) — sinon la valeur par défaut (moyen) ----------
     Depuis le Lot V3-3, une durée chiffrée est retenue telle quelle (mins),
     à toute valeur — « 30 min » restait auparavant dans le titre — et
     l'effort en est déduit comme partout ailleurs (minsToEffort(),
     js/tasks.js). Un entretien tapé ici garde donc sa vraie durée pour le
     budget du jour. */
  function applyEffort(){
    let m = text.match(/ (\d{1,3})\s*min(?:utes?)? /i);
    if(m && parseInt(m[1], 10) > 0){
      result.mins = parseInt(m[1], 10);
      result.effort = minsToEffort(result.mins);
      consume(m, 'effort', result.mins + ' min');
      return;
    }
    m = text.match(/ (\d{1,2})\s*h(?:eures?)? /i);
    if(m){ result.mins = parseInt(m[1], 10) * 60; result.effort = 3; consume(m, 'effort', 'Long'); return; }
    m = tailWord('court');
    if(m){ result.effort = 1; consume(m, 'effort', 'Court'); return; }
    m = tailWord('long');
    if(m){ result.effort = 3; consume(m, 'effort', 'Long'); }
  }

  /* ---------- #catégorie / #pièce — seuls les mots connus (CAT_ORDER/ROOM_ORDER, js/tasks.js) sont interprétés ---------- */
  function applyHash(){
    const re = /#([\p{L}\d_-]+)/gu;
    let m;
    while((m = re.exec(text))){
      const bare = nlpBare(m[1]);
      const mot = ROOM_ORDER.indexOf(bare) !== -1 ? bare : (NLP_ROOM_ALIASES[bare] || bare);
      if(!result.room && !ignore.has('room') && ROOM_ORDER.indexOf(mot) !== -1){
        result.room = mot;
        matched.push({key:'room', label:ROOM_LABELS[mot], raw:m[0]});
        text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
        re.lastIndex = 0;
        continue;
      }
      if(!result.cat && !ignore.has('cat') && CAT_ORDER.indexOf(bare) !== -1){
        const mot = bare;
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
  const t = stamp({
    title:p.title, notes:'', cat:p.cat || 'perso', room:p.room || null,
    bucket:(p.start || p.due) ? 'scheduled' : 'anytime',
    start:p.start, due:p.due, evening:p.evening, prio:p.prio, effort:p.effort,
    repeat:p.repeat, history:[], postponed:0, touchedAt:Date.now()
  });
  if(p.mins) t.mins = p.mins;
  S.tasks.push(t);
  save();
  _capText = ''; _capIgnore = new Set();
  rerender();
  // Un entretien (pièce + « après ») ne s'affiche pas dans Tâches : il vit
  // dans Maison (Lot V3-3). Le dire, sinon il semble s'être évaporé.
  if(isChore(t)) toast('Entretien ajouté à Maison.');
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
    mins:p.mins || EFFORT_MINS[p.effort] || 15, // la durée tapée ne se perd plus en passant à la fiche (Lot V3-4)
    bucket:(p.start || p.due) ? 'scheduled' : 'anytime', repeat:p.repeat
  });
  _tSheet._more = tsHasExtras(_tSheet);
  refreshTaskSheet();
  _capText = ''; _capIgnore = new Set();
  refreshCapturePreview();
}
