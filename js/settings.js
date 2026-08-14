/* ==========================================================================
   settings.js — écran Réglages (Lot V1-11) : profil, préférences des autres
   écrans (plafond du jour, jour de revue, saison froide, ordre des rayons),
   apparence (mode sombre), export/import JSON, à propos, réinitialisation,
   et la feuille de bienvenue du tout premier lancement.
   Groupes dans cet ordre, chacun sa carte : Profil · Aujourd'hui · Maison ·
   Courses · Données · À propos.
   ========================================================================== */

const REVIEW_DAY_LABELS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

function monthOptionsHtml(selected){
  return NLP_MOIS.map((m,i)=>{
    const v = i+1;
    return '<option value="'+v+'"'+(selected===v ? ' selected' : '')+'>'+esc(cap(m))+'</option>';
  }).join('');
}
function reviewDayOptionsHtml(selected){
  return REVIEW_DAY_LABELS.map((l,i)=>
    '<option value="'+i+'"'+(selected===i ? ' selected' : '')+'>'+esc(l)+'</option>'
  ).join('');
}

/* ==========================================================================
   Apparence — 'light' | 'dark' | 'auto' (posé sur data-mode de <html>, lu par
   toutes les variables CSS et par birdsOn() sans rien y changer). 'auto' suit
   prefers-color-scheme ; silencieux si l'API n'existe pas (repli sur clair).
   ========================================================================== */
function applyTheme(){
  const t = (S.settings && S.settings.theme) || 'auto';
  let dark;
  if(t === 'dark') dark = true;
  else if(t === 'light') dark = false;
  else dark = !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
  // Bandeau système de la PWA installée (audit D2) : mêmes valeurs que --bg
  // en clair et en sombre (index.html <style> :root / html[data-mode="dark"]).
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', dark ? '#17140F' : '#F3EEE5');
}
let _themeMql = null;
// Un seul écouteur pour toute la session : en mode 'auto', un changement de
// thème système (nuit tombée, bascule manuelle iOS) doit s'appliquer tout de
// suite, sans attendre une réouverture de l'app.
function watchSystemTheme(){
  if(_themeMql || !window.matchMedia) return;
  _themeMql = matchMedia('(prefers-color-scheme: dark)');
  const onChange = ()=>{ if((S.settings.theme||'auto') === 'auto') applyTheme(); };
  if(_themeMql.addEventListener) _themeMql.addEventListener('change', onChange);
}
function setTheme(t){
  S.settings.theme = t;
  save();
  applyTheme();
  renderSettings();
}

function setUserName(v){
  const name = cap(String(v||'').trim());
  S.settings.userName = name || null;
  save();
  renderSettings();
}
function toggleBirds(){
  S.settings.birds = !S.settings.birds;
  save();
  renderSettings(); // l'écran actif reprend (ou perd) son oiseau immédiatement
}
function setTodayCap(v){
  S.settings.todayCap = Math.max(1, parseInt(v, 10) || 7);
  save();
  renderSettings();
}
function setReviewDay(v){
  S.settings.reviewDay = Math.max(0, Math.min(6, parseInt(v, 10) || 0));
  save();
  renderSettings();
}
function setColdFrom(v){
  S.settings.coldFrom = Math.max(1, Math.min(12, parseInt(v, 10) || 10));
  save();
  renderSettings();
}
function setColdTo(v){
  S.settings.coldTo = Math.max(1, Math.min(12, parseInt(v, 10) || 2));
  save();
  renderSettings();
}

/* ==========================================================================
   Export / import JSON — S en entier. Les photos de plantes (Blobs, store
   IndexedDB 'photos') n'y sont jamais : l'écran le dit explicitement plutôt
   que de laisser Florian le découvrir après un import raté.
   ========================================================================== */
function exportData(){
  saveNow().then(()=>{
    const blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mylife-'+todayKey()+'.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Export téléchargé');
  });
}

// Structure minimale attendue d'un fichier importé — pure, sans DOM, testée
// isolément (test.mjs) comme parseQuick()/guessRayon(). Volontairement peu
// stricte sur le contenu (migrate() sait déjà compléter les champs manquants
// à l'intérieur de chaque tâche/plante/habitude) mais stricte sur la forme
// générale : un fichier qui n'y ressemble pas doit être rejeté d'un bloc.
function validateImportPayload(obj){
  if(!obj || typeof obj !== 'object') return false;
  if(typeof obj.v !== 'number') return false;
  const arrays = ['tasks', 'plants', 'habits', 'shopping', 'frequents'];
  if(!arrays.every(k => Array.isArray(obj[k]))) return false;
  if(!obj.settings || typeof obj.settings !== 'object') return false;
  if(!obj.habitLog || typeof obj.habitLog !== 'object') return false;
  return true;
}

// Remplace S entièrement par des données déjà validées et migrées — jamais un
// écrasement partiel : validateImportPayload() doit passer intégralement
// avant la moindre écriture dans S (point 3 du Lot V1-11). Mute S en place
// (plutôt que réassigner le `let S`) pour que toute référence déjà prise
// ailleurs dans l'app reste valide.
function applyImportedData(raw){
  if(!validateImportPayload(raw)) return false;
  const migrated = migrate(raw);
  Object.keys(S).forEach(k => delete S[k]);
  Object.assign(S, migrated);
  return true;
}

function importDataPrompt(){
  confirmSheet(
    'Importer un fichier remplace entièrement tes données actuelles (tâches, plantes, habitudes, courses, réglages). Cette action est irréversible.',
    'Choisir un fichier',
    () => { const el = document.getElementById('import-input'); if(el) el.click(); }
  );
}
async function onImportFile(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  let text;
  try{ text = await file.text(); }
  catch(e){ toast('Fichier illisible', {danger:true}); return; }
  let obj;
  try{ obj = JSON.parse(text); }
  catch(e){ toast('Fichier JSON invalide', {danger:true}); return; }
  if(!applyImportedData(obj)){
    toast('Structure de données non reconnue', {danger:true});
    return;
  }
  await saveNow();
  toast('Import réussi. Redémarrage…');
  setTimeout(()=>location.reload(), 700);
}

/* ==========================================================================
   Réinitialisation — feuille en deux temps : proposer l'export d'abord, le
   bouton danger seulement ensuite. Vide aussi le store 'photos' (Blobs hors
   de S, sinon orphelins) avant de recharger sur un accueil vierge — la
   bienvenue se rejoue puisque S.onboarded revient à false avec defaults().
   ========================================================================== */
function resetSheet(){ openSheet(resetExportStepHtml()); }
function resetExportStepHtml(){
  return '<p class="sheet-title">Réinitialiser l’application</p>'+
    '<p class="sheet-msg">Tâches, plantes, habitudes, courses, photos et réglages seront tous supprimés. Pense à exporter une sauvegarde avant.</p>'+
    '<button class="btn secondary btn-full" onclick="exportData()">Exporter mes données</button>'+
    '<button class="btn danger btn-full" onclick="openSheet(resetConfirmStepHtml())">Continuer sans exporter</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}
function resetConfirmStepHtml(){
  return '<p class="sheet-title">Confirmer la réinitialisation</p>'+
    '<p class="sheet-msg">Définitif, y compris les photos de plantes : il n’y a pas de retour en arrière.</p>'+
    '<button class="btn danger btn-full" onclick="doReset()">Tout réinitialiser</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}
async function doReset(){
  S = defaults();
  await idbClearPhotos();
  await saveNow();
  closeSheet();
  location.reload();
}

/* ==========================================================================
   Bienvenue — premier lancement uniquement (js/boot.js appelle maybeWelcome()
   juste après le premier rendu). Trois écrans courts, jamais revus une fois
   fermés par quelque chemin que ce soit (_onSheetClose, comme review.js).
   ========================================================================== */
let _welcomeStep = 0, _welcomeName = '', _welcomeTaskTitle = '';

function maybeWelcome(){
  if(S.onboarded) return;
  const hasData = live(S.tasks).length || live(S.plants).length || live(S.habits).length || live(S.shopping).length;
  if(hasData){ S.onboarded = true; save(); return; } // filet de sécurité, cf. migrate()
  startWelcome();
}
function startWelcome(){
  _welcomeStep = 0; _welcomeName = ''; _welcomeTaskTitle = '';
  // Quel que soit le chemin de fermeture, la bienvenue ne doit plus jamais
  // revenir : le hook la marque vue même si elle est abandonnée en route.
  _onSheetClose = ()=>{ S.onboarded = true; save(); rerender(); };
  openSheet(welcomeStepHtml());
}
function welcomeStepHtml(){
  if(_welcomeStep === 0) return welcomeIntroHtml();
  if(_welcomeStep === 1) return welcomeNameHtml();
  return welcomeTaskHtml();
}
function welcomeIntroHtml(){
  return '<p class="sheet-title">Bienvenue dans MyLife</p>'+
    '<p class="sheet-msg">Une seule question, chaque jour : qu’est-ce qu’il y a à faire maintenant ? Tâches, entretien de la maison, plantes, habitudes et courses, réunis en un seul endroit.</p>'+
    '<p class="sheet-msg">Tout reste sur cet appareil : aucun compte, aucun serveur, rien n’est envoyé nulle part.</p>'+
    '<button class="btn primary btn-full" onclick="advanceWelcome()">Suivant</button>';
}
function welcomeNameHtml(){
  return '<p class="sheet-title">Comment veux-tu que je t’appelle ?</p>'+
    '<p class="sheet-msg">Facultatif — tu peux laisser vide.</p>'+
    '<div class="field-group">'+
      '<input id="w-name" class="field field-full" type="text" placeholder="Prénom" value="'+esc(_welcomeName)+'" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_welcomeName=this.value">'+
    '</div>'+
    '<button class="btn primary btn-full" onclick="advanceWelcome()">Suivant</button>';
}
function welcomeTaskHtml(){
  return '<p class="sheet-title">Une première tâche ?</p>'+
    '<p class="sheet-msg">Ajoute-la tout de suite, ou explore l’app d’abord.</p>'+
    '<div class="field-group">'+
      '<input id="w-task" class="field field-full" type="text" placeholder="Ex. Sortir les poubelles" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_welcomeTaskTitle=this.value">'+
    '</div>'+
    '<button class="btn primary btn-full" onclick="finishWelcome()">Ajouter et commencer</button>'+
    '<button class="btn quiet btn-full" onclick="skipWelcomeTask()">Explorer l’app</button>';
}
function advanceWelcome(){
  if(_welcomeStep === 1){
    const name = cap(String(_welcomeName||'').trim());
    S.settings.userName = name || null;
    save();
  }
  _welcomeStep++;
  openSheet(welcomeStepHtml());
}
function skipWelcomeTask(){
  _welcomeTaskTitle = '';
  finishWelcome();
}
function finishWelcome(){
  const title = cap(String(_welcomeTaskTitle||'').trim());
  if(title){
    S.tasks.push(stamp({
      title, notes:'', cat:'perso', room:null, bucket:'anytime',
      start:null, due:null, evening:false, prio:0, effort:2,
      repeat:null, history:[], doneAt:null, postponed:0, touchedAt:Date.now()
    }));
    save();
  }
  closeSheet(); // déclenche _onSheetClose : onboarded = true, jamais revue
}

/* ==========================================================================
   Rendu — six cartes, dans cet ordre : Profil, Aujourd'hui, Maison, Courses,
   Données, À propos.
   ========================================================================== */
function renderSettings(){
  const N = 6;
  const theme = S.settings.theme || 'auto';
  const birds = !!S.settings.birds;
  const nStale = reviewCandidates().length;

  const profil = '<div class="card">'+birdOnCard(0, N)+
    '<h2 class="card-title">Profil</h2>'+
    '<div class="field-group">'+
      '<input id="set-username" class="field field-full" type="text" placeholder="Prénom (facultatif)" '+
        'value="'+esc(S.settings.userName || '')+'" autocomplete="off" autocapitalize="sentences" '+
        'onchange="setUserName(this.value)">'+
    '</div>'+
    '<div class="field-group"><span class="overline">Apparence</span><div class="chips">'+
      '<button class="chip'+(theme==='light' ? ' on' : '')+'" onclick="setTheme(\'light\')">Clair</button>'+
      '<button class="chip'+(theme==='dark' ? ' on' : '')+'" onclick="setTheme(\'dark\')">Sombre</button>'+
      '<button class="chip'+(theme==='auto' ? ' on' : '')+'" onclick="setTheme(\'auto\')">Auto</button>'+
    '</div></div>'+
    '<ul class="list"><li class="row">'+
      '<div class="row-main"><div class="row-title">Oiseaux</div>'+
        '<div class="row-meta">De discrètes présences posées sur les cartes.</div></div>'+
      '<button class="switch'+(birds ? ' on' : '')+'" role="switch" aria-checked="'+birds+'" '+
        'aria-label="Oiseaux" onclick="toggleBirds()"></button>'+
    '</li></ul>'+
  '</div>';

  const aujourdhui = '<div class="card">'+birdOnCard(1, N)+
    '<h2 class="card-title">Aujourd’hui</h2>'+
    '<div class="field-group"><span class="overline">Plafond du bloc du jour</span>'+
      '<div class="repeat-n"><input class="field" type="number" min="1" inputmode="numeric" '+
        'value="'+S.settings.todayCap+'" onchange="setTodayCap(this.value)"><span>tâches avant « + N autres »</span></div>'+
    '</div>'+
    '<div class="field-group"><span class="overline">Jour de la revue hebdomadaire</span>'+
      '<select class="field field-full" onchange="setReviewDay(this.value)">'+reviewDayOptionsHtml(S.settings.reviewDay)+'</select>'+
    '</div>'+
    '<ul class="list"><li class="row">'+
      '<div class="row-main"><div class="row-title">Revue hebdomadaire</div>'+
        '<div class="row-meta">'+(nStale ? nStale+(nStale>1 ? ' tâches dorment.' : ' tâche dort.') : 'Rien à trier pour l’instant.')+'</div></div>'+
      '<button class="btn secondary" onclick="startReview()">Lancer</button>'+
    '</li></ul>'+
  '</div>';

  const maison = '<div class="card">'+birdOnCard(2, N)+
    '<h2 class="card-title">Maison</h2>'+
    '<div class="field-group"><span class="overline">Saison froide, pour les plantes</span>'+
      '<div class="addbar">'+
        '<select class="field" onchange="setColdFrom(this.value)">'+monthOptionsHtml(S.settings.coldFrom)+'</select>'+
        ' au '+
        '<select class="field" onchange="setColdTo(this.value)">'+monthOptionsHtml(S.settings.coldTo)+'</select>'+
      '</div>'+
    '</div>'+
    '<p class="row-meta">Détermine l’intervalle d’arrosage et d’engrais appliqué selon la saison.</p>'+
  '</div>';

  const courses = '<div class="card">'+birdOnCard(3, N)+
    '<h2 class="card-title">Courses</h2>'+
    '<p class="row-meta">Réordonne les rayons pour suivre le plan de ton magasin.</p>'+
    '<button class="btn secondary btn-full" onclick="rayonOrderSheet()">Réordonner les rayons</button>'+
  '</div>';

  const donnees = '<div class="card">'+birdOnCard(4, N)+
    '<h2 class="card-title">Données</h2>'+
    '<p class="row-meta">Export et import complets au format JSON. Les photos de plantes n’y sont pas incluses : elles restent uniquement sur cet appareil.</p>'+
    '<button class="btn secondary btn-full" onclick="exportData()">Exporter mes données</button>'+
    '<button class="btn secondary btn-full" onclick="importDataPrompt()">Importer des données</button>'+
    '<input id="import-input" class="file-input" type="file" accept="application/json" onchange="onImportFile(this)">'+
    '<button class="btn danger btn-full" onclick="resetSheet()">Réinitialiser l’application</button>'+
  '</div>';

  const apropos = '<div class="card">'+birdOnCard(5, N)+
    '<h2 class="card-title">À propos</h2>'+
    '<p class="row-meta">'+esc(APP_VERSION)+' · 100 % hors-ligne, gratuit, sans compte ni serveur.</p>'+
    '<p class="row-meta">Pense à exporter régulièrement une sauvegarde : c’est le seul filet de sécurité.</p>'+
    '<p class="row-meta">Les données sont liées à l’adresse de ce site : changer d’hébergement vide le stockage. Exporte avant tout changement.</p>'+
  '</div>';

  document.getElementById('s-settings').innerHTML =
    // Pas d'engrenage ici : c'est l'écran vers lequel il mène.
    screenHead(APP_VERSION, 'Réglages', {noGear:true})+
    profil + aujourdhui + maison + courses + donnees + apropos;
}
