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
const NLP_DOW_RE = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche';
// Nombres écrits en lettres (Lot V3-5) : « dans deux jours », « toutes les
// deux semaines », « tous les trois mois ». Les plus longs d'abord dans
// l'alternative, pour que « une » ne s'arrête jamais à « un ».
const NLP_NUM = {un:1, une:1, deux:2, trois:3, quatre:4, cinq:5, six:6, sept:7, huit:8, neuf:9, dix:10,
  onze:11, douze:12, quinze:15, vingt:20, trente:30};
const NLP_NUM_RE = '\\d{1,3}|' + Object.keys(NLP_NUM).sort((a, b)=>b.length - a.length).join('|');
function nlpNum(w, unit){
  const n = /^\d/.test(w) ? parseInt(w, 10) : NLP_NUM[String(w).toLowerCase()];
  // « Huit jours » et « quinze jours » sont, dans la langue courante, une
  // semaine et deux semaines — jamais 8 et 15 jours.
  if(unit === 'jour' && /^(huit|quinze)$/i.test(w)) return n - 1;
  return n;
}
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
  function monthEndKey(){ return dayKey(new Date(ref.getFullYear(), ref.getMonth() + 1, 0)); }
  // « Prochain » (Lot V3-5) ne saute une semaine que si ce jour est encore à
  // venir cette semaine, ou aujourd'hui : un mercredi, « vendredi prochain »
  // est celui de la semaine suivante (« vendredi » tout court dit déjà
  // celui-ci), mais « lundi prochain » est le lundi qui vient — il n'y en a
  // plus d'autre. Avant, un mercredi, « mardi prochain » tombait 13 jours
  // plus tard.
  function nextWeekday(dow, forceNextWeek){
    const d = new Date(ref); d.setHours(0, 0, 0, 0);
    const cur = d.getDay() === 0 ? 7 : d.getDay();
    let diff = (dow - cur + 7) % 7;
    if(forceNextWeek && dow >= cur) diff += 7;
    d.setDate(d.getDate() + diff);
    return dayKey(d);
  }

  // La récurrence d'abord (Lot V3-5) : ses tournures portent des noms de
  // jours (« chaque lundi », « tous les mardis et jeudis ») que la règle
  // des dates prenait pour une date, en laissant « chaque » dans le titre.
  if(!ignore.has('repeat')) applyRepeat();
  if(!ignore.has('date')) applyDate();
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
     Priorité : échéance explicite (avant/pour/d'ici/deadline) d'abord —
     sinon « le 15 » tout seul serait avalé par la règle générique et
     l'échéance perdue. Puis les expressions relatives, de la plus
     spécifique (« demain soir ») à la plus générique (« le 15 »).
     Lot V3-5 : le français de tous les jours — « pour vendredi », « d'ici
     la fin du mois », « cette semaine » (échéances) ; « samedi soir »,
     « demain matin », « ce week-end », « lundi 5 octobre », « le 1er mai »,
     « dans deux jours » ; et un jour de la semaine qui complète un nom
     (« la réunion de vendredi », « le lundi » au sens d'une habitude)
     n'est plus pris pour une date — en cas de doute, ne rien avaler. */
  function applyDate(){
    const MOIS_RE = NLP_MOIS.join('|');
    const DOW = NLP_DOW_RE;
    const DUE_PREFIX = '(?:avant le|pour le|d[\'’]ici le|deadline(?: le)?)';
    const DUE_REL = '(?:avant|pour|d[\'’]ici)';
    const START_PREFIX = '(?:(?:à partir du|à partir de|dès le|dès|le) )?';
    const MOMENT = '(?: (matin|midi|après-midi|soir))?';
    let m;

    // Pose une date trouvée — ou rien du tout si elle n'existe pas.
    const put = (field, k, mm, label)=>{
      if(!k) return false;
      result[field] = k;
      if(field === 'due') result.start = null;
      consume(mm, 'date', label(k));
      return true;
    };
    const dueLabel = k=>'Échéance ' + relDay(k, refKey);
    // Un début, et le moment de la journée qui l'accompagne (« demain
    // matin », « samedi soir ») consommé avec lui. Seul « soir » a un effet :
    // la tâche rejoint « Ce soir » ce jour-là. L'app raisonne au jour près,
    // « matin » n'est qu'une façon de le dire.
    const at = (k, mm, label, moment)=>{
      result.start = k;
      if(moment && moment.toLowerCase() === 'soir') result.evening = true;
      consume(mm, 'date', label + (moment ? ' ' + moment.toLowerCase() : ''));
    };

    // 1. Échéance datée : « avant le 15 », « pour le lundi 5 octobre », « d'ici le 3/11 ».
    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (?:(?:' + DOW + ') )?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))? ', 'i'));
    if(m && put('due', dateFromDM(+m[1], +m[2] - 1, m[3] ? normYear(+m[3]) : null), m, dueLabel)) return;

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (?:(?:' + DOW + ') )?(\\d{1,2})(?:er)? (' + MOIS_RE + ')(?: (\\d{4}))? ', 'i'));
    if(m && put('due', dateFromDM(+m[1], NLP_MOIS.indexOf(m[2].toLowerCase()), m[3] ? +m[3] : null), m, dueLabel)) return;

    m = text.match(new RegExp(' ' + DUE_PREFIX + ' (\\d{1,2})(?:er)? ', 'i'));
    if(m && put('due', dateFromDayOnly(+m[1]), m, dueLabel)) return;

    // 2. Échéance relative : « pour vendredi », « avant demain », « d'ici lundi prochain ».
    m = text.match(new RegExp(' ' + DUE_REL + ' (après[- ]demain|demain|' + DOW + ')( prochain)? ', 'i'));
    if(m){
      const w = m[1].toLowerCase();
      const k = w === 'demain' ? addDaysKey(1) : (/^après/.test(w) ? addDaysKey(2) : nextWeekday(NLP_DOW[w], !!m[2]));
      if(put('due', k, m, dueLabel)) return;
    }

    // 3. Fin de semaine, fin de mois : une échéance, jamais un début.
    m = text.match(/ (?:(?:avant|pour|d['’]ici) (?:la )?fin de (?:la |cette )?semaine|(?:en )?fin de semaine|cette semaine) /i);
    if(m && put('due', nextWeekday(7, false), m, dueLabel)) return;

    m = text.match(/ (?:(?:avant|pour|d['’]ici|à) la fin (?:du|de ce) mois|(?:en )?fin (?:du|de) mois) /i);
    if(m && put('due', monthEndKey(), m, dueLabel)) return;

    // 4. Aujourd'hui, et ses moments.
    m = text.match(/ ce soir /i);
    if(m){ result.start = refKey; result.evening = true; consume(m, 'date', 'Ce soir'); return; }

    m = text.match(/ (ce matin|ce midi|cet après-midi) /i);
    if(m){ result.start = refKey; consume(m, 'date', cap(m[1].toLowerCase())); return; }

    m = text.match(/ aujourd['’]?hui /i);
    if(m){ result.start = refKey; consume(m, 'date', 'Aujourd’hui'); return; }

    // 5. Demain, après-demain — « dès demain », « à partir de demain » compris.
    m = text.match(new RegExp(' (?:(?:à partir d[\'’]|dès )?après[- ]demain)' + MOMENT + ' ', 'i'));
    if(m){ at(addDaysKey(2), m, 'Après-demain', m[1]); return; }

    m = text.match(new RegExp(' (?:(?:à partir de |dès )?demain)' + MOMENT + ' ', 'i'));
    if(m){ at(addDaysKey(1), m, 'Demain', m[1]); return; }

    // 6. Une date précise, jour de la semaine facultatif devant : « lundi
    //    5 octobre », « le 1er mai 2027 », « à partir du 3/11 », « 12 octobre ».
    m = text.match(new RegExp(' ' + START_PREFIX + '(?:(?:' + DOW + ') )?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))? ', 'i'));
    if(m && put('start', dateFromDM(+m[1], +m[2] - 1, m[3] ? normYear(+m[3]) : null), m, fmtDateShort)) return;

    m = text.match(new RegExp(' ' + START_PREFIX + '(?:(?:' + DOW + ') )?(\\d{1,2})(?:er)? (' + MOIS_RE + ')(?: (\\d{4}))? ', 'i'));
    if(m && put('start', dateFromDM(+m[1], NLP_MOIS.indexOf(m[2].toLowerCase()), m[3] ? +m[3] : null), m, fmtDateShort)) return;

    // 7. Un jour de la semaine (« vendredi », « samedi soir », « le lundi
    //    prochain », « à partir de jeudi »). Pas quand il complète un nom :
    //    « la réunion de vendredi » garde son titre entier, et « le lundi »
    //    seul se dit d'une habitude plus que d'une date.
    const reDow = new RegExp(' ((?:à partir d[eu]|dès) )?(le )?(' + DOW + ')( prochain)?' + MOMENT + ' ', 'ig');
    while((m = reDow.exec(text))){
      const before = text.slice(0, m.index);
      const prefixed = !!m[1], prochain = !!m[4];
      if(!prefixed && (/ (?:de|du)$/i.test(before) || (!prochain && (m[2] || / le$/i.test(before))))){
        reDow.lastIndex = m.index + 1; // l'espace de tête a été lu : on repart juste après
        continue;
      }
      const d = m[3].toLowerCase();
      at(nextWeekday(NLP_DOW[d], prochain), m, cap(d) + (prochain ? ' prochain' : ''), m[5]);
      return;
    }

    // 8. Le week-end, la semaine ou le mois qui viennent.
    m = text.match(/ ce week-?end /i);
    if(m){ result.start = isoDow(refKey) >= 6 ? refKey : nextWeekday(6, false); consume(m, 'date', 'Ce week-end'); return; }

    m = text.match(/ la semaine prochaine /i);
    if(m){ result.start = addDaysKey(8 - isoDow(refKey)); consume(m, 'date', 'La semaine prochaine'); return; } // le lundi qui vient

    m = text.match(/ le mois prochain /i);
    if(m){ result.start = addMonthsKey(1); consume(m, 'date', 'Le mois prochain'); return; }

    // 9. Dans N jours, semaines, mois — en chiffres ou en lettres.
    m = text.match(new RegExp(' dans (' + NLP_NUM_RE + ') (jours?|semaines?|mois) ', 'i'));
    if(m){
      const unite = m[2].toLowerCase();
      const n = nlpNum(m[1], unite.indexOf('jour') === 0 ? 'jour' : '');
      if(unite.indexOf('jour') === 0){ result.start = addDaysKey(n); consume(m, 'date', 'Dans ' + n + ' jour' + (n > 1 ? 's' : '')); }
      else if(unite.indexOf('semaine') === 0){ result.start = addDaysKey(n * 7); consume(m, 'date', 'Dans ' + n + ' semaine' + (n > 1 ? 's' : '')); }
      else { result.start = addMonthsKey(n); consume(m, 'date', 'Dans ' + n + ' mois'); }
      return;
    }

    // 10. « Le 15 », jour seul.
    m = text.match(/ le (\d{1,2})(?:er)? /i);
    if(m && put('start', dateFromDayOnly(+m[1]), m, fmtDateShort)) return;
  }

  /* ---------- récurrence : à date fixe (from:'due') ou après réalisation (from:'done') ----------
     Lot V3-5 : « chaque » vaut « tous les » partout (« chaque mois »,
     « chaque lundi »), « toutes les N semaines » s'accorde enfin, les
     nombres s'écrivent aussi en lettres (« tous les deux jours »), et
     plusieurs jours fixes se disent d'une traite (« tous les mardis et
     jeudis », « chaque lundi, mercredi et vendredi »). */
  function applyRepeat(){
    const AP = '(?: après(?: réalisation| la dernière fois)?)?';
    const DOW_ONE = '(?:' + NLP_DOW_RE + ')s?';
    let m;

    // Le texte a déjà reçu une espace devant chaque virgule (voir plus haut) :
    // « lundis , mercredis et vendredis ».
    m = text.match(new RegExp(' (?:tous les|chaque) (' + DOW_ONE + '(?:(?: ,| et)(?: les?)? ' + DOW_ONE + ')*)' + AP + ' ', 'i'));
    if(m){
      const days = [];
      (m[1].toLowerCase().match(new RegExp(NLP_DOW_RE, 'g')) || []).forEach(d=>{ if(days.indexOf(NLP_DOW[d]) === -1) days.push(NLP_DOW[d]); });
      setRepeat({kind:'week', n:1, days:days.sort((a, b)=>a - b)}, m);
      return;
    }

    m = text.match(new RegExp(' (?:tous les jours|chaque jour|une fois par jour)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'day', n:1}, m); return; }

    m = text.match(new RegExp(' tous les (' + NLP_NUM_RE + ') jours' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'day', n:nlpNum(m[1], 'jour')}, m); return; }

    // « tous les 15 du mois » : le 15 devient la première occurrence (Lot
    // V3-4) — sans elle, le chiffre se perdait et la tâche tombait n'importe
    // quel jour du mois.
    // « le 5 de chaque mois » et « tous les 1er du mois » aussi (Lot V3-5).
    m = text.match(new RegExp(' (?:tous les|le) (\\d{1,2})(?:er)? (?:du|de chaque) mois' + AP + ' ', 'i'));
    if(m){
      const dom = parseInt(m[1], 10);
      const first = dateFromDayOnly(dom);
      if(first){ setRepeat({kind:'month', n:1, dom}, m); if(!result.start && !result.due) result.start = first; return; }
    }

    m = text.match(new RegExp(' (?:tous les mois|chaque mois|une fois par mois)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'month', n:1}, m); return; }

    m = text.match(new RegExp(' tous les (' + NLP_NUM_RE + ') mois' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'month', n:nlpNum(m[1])}, m); return; }

    m = text.match(new RegExp(' (?:tous les trimestres|chaque trimestre)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'month', n:3}, m); return; }

    m = text.match(new RegExp(' tous les (' + NLP_NUM_RE + ') ans' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'year', n:nlpNum(m[1])}, m); return; }

    m = text.match(new RegExp(' (?:tous les ans|chaque année|une fois par an)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'year', n:1}, m); return; }

    m = text.match(new RegExp(' (?:toutes les semaines|chaque semaine|une fois par semaine)' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'week', n:1}, m); return; }

    m = text.match(new RegExp(' (?:toutes|tous) les (' + NLP_NUM_RE + ') semaines?' + AP + ' ', 'i'));
    if(m){ setRepeat({kind:'week', n:nlpNum(m[1])}, m); return; }

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
     budget du jour.
     Lot V3-5 : une heure du jour n'est jamais une durée. « Appeler maman
     demain 18h » devenait une tâche « longue » de 18 heures, et « 18h »
     disparaissait du titre. Une durée en heures s'arrête désormais à 4 h
     (« 1 h », « 2h », « 1h30 ») et jamais après « à » ; au-delà, c'est une
     heure du jour (« 18h », « à 9h30 ») : elle reste dans le titre, où elle
     se lit — l'app raisonne au jour près, elle n'a pas de champ d'heure. */
  function durationLabel(mins){
    if(mins < 60) return mins + ' min';
    const h = Math.floor(mins / 60), r = mins % 60;
    return h + ' h' + (r ? ' ' + String(r).padStart(2, '0') : '');
  }
  function applyEffort(){
    let m = text.match(/ (\d{1,3})\s*(?:min(?:utes?|s)?|mn) /i);
    if(m && parseInt(m[1], 10) > 0){
      result.mins = parseInt(m[1], 10);
      result.effort = minsToEffort(result.mins);
      consume(m, 'effort', durationLabel(result.mins));
      return;
    }
    const reH = / (à )?(\d{1,2})\s*h(?:eures?)?(?:\s*(\d{2}))? /gi;
    while((m = reH.exec(text))){
      const h = parseInt(m[2], 10), mn = m[3] ? parseInt(m[3], 10) : 0;
      const mins = h * 60 + mn;
      if(m[1] || h > 4 || mn >= 60 || !mins){ reH.lastIndex = m.index + 1; continue; } // une heure du jour : on la laisse
      result.mins = mins;
      result.effort = minsToEffort(mins);
      consume(m, 'effort', durationLabel(mins));
      return;
    }
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

// Une tâche depuis une phrase déjà comprise par parseQuick() — le seul
// chemin de création d'une tâche tapée : la barre de capture, et depuis le
// Lot V3-5 la première tâche de la bienvenue, qui restait un titre brut
// (« Sortir les poubelles tous les mercredis » n'y revenait jamais).
function taskFromParse(p){
  const t = stamp({
    title:p.title, notes:'', cat:p.cat || 'perso', room:p.room || null,
    bucket:(p.start || p.due) ? 'scheduled' : 'anytime',
    start:p.start, due:p.due, evening:p.evening, prio:p.prio, effort:p.effort,
    repeat:p.repeat, history:[], doneAt:null, postponed:0, touchedAt:Date.now()
  });
  if(p.mins) t.mins = p.mins;
  return t;
}

function commitCapture(){
  const input = document.getElementById('cap-input-' + CURRENT_SCREEN);
  if(input) _capText = input.value;
  const p = captureParse();
  if(!p.title) return;
  const t = taskFromParse(p);
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
