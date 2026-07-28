/* ==========================================================================
   plants.js — plantes (Lot V1-7). Pas d'écran propre : les plantes vivent
   dans l'écran Maison (js/maison.js, vue par pièce, mêlées à l'entretien) et
   dans le bloc du jour d'« Aujourd'hui » (js/today.js). Ce fichier porte :
   la modulation saisonnière, la jauge de fraîcheur des soins (arrosage,
   engrais, rempotage), la fiche plante et les photos.

   Le moteur de récurrence n'est PAS dupliqué : un soin est traduit en un
   objet « tâche » minimal ({doneAt, repeat:{kind:'day', n, from:'done'}})
   passé tel quel à freshness()/completeTask() de js/recur.js (Lot V1-4).
   ========================================================================== */

const CARE_LABELS = {water:'arrosage', feed:'engrais', repot:'rempotage'};

// Saison courante : 'cold' | 'warm', déduite de settings.coldFrom/coldTo
// (mois 1-12, jamais une date en dur). Gère l'intervalle qui « boucle » sur
// la nouvelle année (défaut 10 → 2 : octobre, novembre, décembre, janvier,
// février).
function plantSeason(ref){
  const m = (ref || new Date()).getMonth() + 1;
  const from = S.settings.coldFrom || 10, to = S.settings.coldTo || 2;
  const cold = from <= to ? (m >= from && m <= to) : (m >= from || m <= to);
  return cold ? 'cold' : 'warm';
}

// Intervalle appliqué à un soin {warm,cold} selon la saison. 0 = suspendu.
function careInterval(care, season){
  return season === 'cold' ? (care.cold || 0) : (care.warm || 0);
}

// Jauge de fraîcheur d'un soin, ou null si suspendu cette saison (cold:0) —
// dans ce cas l'appelant ne doit rien afficher du tout, pas une jauge à 1.
function careFreshness(care, season){
  const days = careInterval(care, season);
  if(!days) return null;
  return freshness({doneAt:care.lastAt, repeat:{kind:'day', n:days}}, Date.now());
}

function careAgo(lastAt){
  if(!lastAt) return 'Jamais fait';
  const n = daysBetween(dayKey(new Date(lastAt)), todayKey());
  if(n <= 0) return 'Aujourd’hui';
  return 'Il y a '+n+(n>1 ? ' jours' : ' jour');
}

/* ==========================================================================
   Intégration Maison / Aujourd'hui — un soin par plante par type (arrosage,
   engrais si actif cette saison, rempotage), jamais un par plante seule :
   c'est ce qui permet de le mêler ligne à ligne avec l'entretien maison.
   ========================================================================== */
function getPlantCareItems(){
  const season = plantSeason();
  const now = Date.now();
  const out = [];
  live(S.plants).forEach(p=>{
    if(!p.room) return; // une plante vit forcément dans une pièce (sinon aucun écran ne l'affiche)
    ['water','feed'].forEach(kind=>{
      const f = careFreshness(p.care[kind], season);
      if(f === null) return; // suspendu cette saison : l'app ne le propose pas du tout
      out.push({id:p.id+'-'+kind, plantId:p.id, room:p.room, f, ago:careAgo(p.care[kind].lastAt), title:p.name+' ('+CARE_LABELS[kind]+')'});
    });
    const repot = p.care.repot;
    const days = (repot.months || 12) * 30;
    const f = freshness({doneAt:repot.lastAt, repeat:{kind:'day', n:days}}, now);
    out.push({id:p.id+'-repot', plantId:p.id, room:p.room, f, ago:careAgo(repot.lastAt), title:p.name+' ('+CARE_LABELS.repot+')'});
  });
  return out;
}

/* ---------- Actions de soin — immédiates, comme tapMaisonItem()/tapTodayCare() ---------- */
function doPlantCare(id, kind){
  const p = S.plants.find(x=>x.id === id);
  if(!p) return;
  const season = plantSeason();
  const care = p.care[kind];
  const days = careInterval(care, season) || 1;
  const adapter = {doneAt:care.lastAt, due:null, repeat:{kind:'day', n:days, from:'done'}, history:care.history || (care.history = []), postponed:0};
  completeTask(adapter); // réutilise le moteur du Lot V1-4, sans le dupliquer
  care.lastAt = adapter.doneAt;
  touch(p);
  save();
  refreshPlantDraftFrom(id);
  rerender();
  toast(kind === 'water' ? 'Arrosage enregistré' : 'Engrais enregistré');
}
function waterPlantAction(id){ doPlantCare(id, 'water'); }
function feedPlantAction(id){ doPlantCare(id, 'feed'); }

function repotPlantAction(id){
  const p = S.plants.find(x=>x.id === id);
  if(!p) return;
  p.care.repot.lastAt = Date.now();
  touch(p);
  save();
  refreshPlantDraftFrom(id);
  rerender();
  toast('Rempotage enregistré');
}

// Rafraîchit les soins affichés dans la feuille ouverte après une action,
// sans la refermer ni recharger la photo déjà affichée.
function refreshPlantDraftFrom(id){
  const p = S.plants.find(x=>x.id === id);
  if(!p || !_pSheet || _pSheet.id !== id) return;
  _pSheet.water = Object.assign({}, p.care.water);
  _pSheet.feed = Object.assign({}, p.care.feed);
  _pSheet.repot = Object.assign({}, p.care.repot);
  refreshPlantSheet();
}

/* ==========================================================================
   Photos — capture ou choix de fichier, redimensionnement 1000 px max et
   recompression JPEG 0,8 via canvas, Blob dans le store IndexedDB 'photos'
   (jamais dans S). Chargement paresseux : seule la fiche ouverte en demande
   une, jamais les lignes de Maison/Aujourd'hui.
   ========================================================================== */
let _pPhotoUrl = null;  // URL objet de la photo actuellement affichée dans la feuille
let _pPhotoBlob = null; // Blob en attente d'enregistrement (posé au « Enregistrer »)

function revokePlantPhoto(){
  if(_pPhotoUrl){ URL.revokeObjectURL(_pPhotoUrl); _pPhotoUrl = null; }
  _pPhotoBlob = null;
}

function resizePhoto(file, maxDim, quality){
  return new Promise(resolve=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale) || 1, h = Math.round(img.height * scale) || 1;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b=>resolve(b), 'image/jpeg', quality);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function onPlantPhoto(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  resizePhoto(file, 1000, 0.8).then(blob=>{
    if(!blob || !_pSheet) return;
    _pPhotoBlob = blob;
    if(_pPhotoUrl) URL.revokeObjectURL(_pPhotoUrl);
    _pPhotoUrl = URL.createObjectURL(blob);
    refreshPlantSheet();
  });
}

/* ==========================================================================
   Fiche plante — identité, pièce, photo, les trois soins et leur jauge,
   historique d'arrosage, bouton « arrosé » (l'action quotidienne).
   ========================================================================== */
let _pSheet = null;

function plantSheet(id){
  const p = id ? S.plants.find(x=>x.id === id) : null;
  revokePlantPhoto();
  _pSheet = p ? {
    id:p.id, _isNew:false, name:p.name || '', species:p.species || '', room:p.room || ROOM_ORDER[0],
    water:Object.assign({warm:7, cold:14, lastAt:null, history:[]}, p.care.water),
    feed:Object.assign({warm:30, cold:0, lastAt:null, history:[]}, p.care.feed),
    repot:Object.assign({months:12, lastAt:null}, p.care.repot),
    notes:p.notes || ''
  } : {
    id:null, _isNew:true, name:'', species:'', room:ROOM_ORDER[0],
    water:{warm:7, cold:14}, feed:{warm:30, cold:0}, repot:{months:12}, notes:''
  };
  openSheet(plantSheetHtml());
  _onSheetClose = revokePlantPhoto;
  if(p && p.photoId){
    idbGetPhoto(p.photoId).then(blob=>{
      if(!blob || !_pSheet || _pSheet.id !== id) return;
      _pPhotoUrl = URL.createObjectURL(blob);
      refreshPlantSheet();
    });
  }
  if(_pSheet._isNew){
    const el = document.getElementById('p-name');
    if(el) el.focus();
  }
}

function refreshPlantSheet(){ openSheet(plantSheetHtml()); }

function setPRoom(r){ _pSheet.room = r; refreshPlantSheet(); }
function setPSpecies(key){
  _pSheet.species = key;
  const c = PLANTES[key];
  if(c){
    _pSheet.water.warm = c.water.warm; _pSheet.water.cold = c.water.cold;
    _pSheet.feed.warm = c.feed.warm; _pSheet.feed.cold = c.feed.cold;
    _pSheet.repot.months = c.repot.months;
  }
  refreshPlantSheet();
}
function setPInterval(kind, season, v){
  _pSheet[kind][season] = Math.max(0, parseInt(v, 10) || 0);
  refreshPlantSheet();
}
function setPRepotMonths(v){
  _pSheet.repot.months = Math.max(1, parseInt(v, 10) || 1);
  refreshPlantSheet();
}

function speciesOptionsHtml(selected){
  const keys = Object.keys(PLANTES).sort((a,b)=>PLANTES[a].name.localeCompare(PLANTES[b].name, 'fr'));
  return '<option value="">Espèce libre</option>'+
    keys.map(k=>'<option value="'+k+'"'+(selected===k ? ' selected' : '')+'>'+esc(PLANTES[k].name)+'</option>').join('');
}

function soinGaugeRow(label, f, ago, actionLabel, actionFn, primary){
  return '<div class="field-group">'+
    '<div class="row row-care">'+
      '<div class="row-main"><div class="row-title">'+esc(label)+'</div><div class="row-meta">'+esc(ago)+'</div></div>'+
      '<div class="gauge-cell"><div class="gauge"><div class="gauge-fill" style="width:'+gaugeWidth(f)+';background:'+gaugeColor(f)+'"></div></div></div>'+
    '</div>'+
    '<button class="btn '+(primary ? 'primary' : 'secondary')+' btn-full" onclick="'+actionFn+'">'+esc(actionLabel)+'</button>'+
  '</div>';
}

function plantSheetHtml(){
  const d = _pSheet;
  const isNew = d._isNew;
  const season = plantSeason();
  const roomChips = ROOM_ORDER.map(r=>
    '<button class="chip'+(d.room===r?' on':'')+'" onclick="setPRoom(\''+r+'\')">'+esc(ROOM_LABELS[r])+'</button>'
  ).join('');
  const photoBlock =
    '<div class="field-group">'+
      '<button type="button" class="plant-photo" onclick="document.getElementById(\'p-photo-input\').click()">'+
        (_pPhotoUrl ? '<img src="'+_pPhotoUrl+'" alt="">' : 'Ajouter une photo')+
      '</button>'+
      '<input id="p-photo-input" class="file-input" type="file" accept="image/*" capture="environment" onchange="onPlantPhoto(this)">'+
    '</div>';
  const careField = (kind, label)=>{
    const c = d[kind];
    const applied = careInterval(c, season);
    return '<div class="field-group"><span class="overline">'+esc(label)+'</span>'+
        '<div class="repeat-n"><input class="field" type="number" min="0" inputmode="numeric" value="'+c.warm+'" onchange="setPInterval(\''+kind+'\',\'warm\',this.value)"><span>j., saison chaude</span></div>'+
      '</div>'+
      '<div class="field-group">'+
        '<div class="repeat-n"><input class="field" type="number" min="0" inputmode="numeric" value="'+c.cold+'" onchange="setPInterval(\''+kind+'\',\'cold\',this.value)"><span>j., saison froide (0 = suspendu)</span></div>'+
      '</div>'+
      '<p class="sheet-msg">'+esc(applied
        ? 'Saison actuelle : '+(season==='cold'?'froide':'chaude')+', intervalle appliqué : tous les '+applied+' jours.'
        : 'Suspendu en cette saison.')+'</p>';
  };
  let soinsBlock = '';
  if(!isNew){
    const wF = careFreshness(d.water, season);
    const fF = careFreshness(d.feed, season);
    const rF = freshness({doneAt:d.repot.lastAt, repeat:{kind:'day', n:(d.repot.months||12)*30}}, Date.now());
    soinsBlock =
      (wF !== null ? soinGaugeRow('Arrosage', wF, careAgo(d.water.lastAt), 'Arrosé', "waterPlantAction('"+d.id+"')", true) : '')+
      (fF !== null ? soinGaugeRow('Engrais', fF, careAgo(d.feed.lastAt), 'Fait l’engrais', "feedPlantAction('"+d.id+"')", false) : '')+
      soinGaugeRow('Rempotage', rF, careAgo(d.repot.lastAt), 'Rempoté', "repotPlantAction('"+d.id+"')", false);
    const hist = (d.water.history || []).slice(-8).reverse();
    if(hist.length){
      soinsBlock += '<div class="field-group"><span class="overline">Historique d’arrosage</span>'+
        '<p class="sheet-msg">'+esc(hist.map(fmtDateShort).join(', '))+'</p></div>';
    }
  }
  return '<p class="sheet-title">'+(isNew ? 'Nouvelle plante' : 'Modifier la plante')+'</p>'+
    photoBlock+
    '<div class="field-group">'+
      '<input id="p-name" class="field field-full" type="text" placeholder="Nom" value="'+esc(d.name)+'" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_pSheet.name=this.value">'+
    '</div>'+
    '<div class="field-group">'+
      '<select class="field field-full" onchange="setPSpecies(this.value)">'+speciesOptionsHtml(d.species)+'</select>'+
    '</div>'+
    '<div class="field-group"><span class="overline">Pièce</span><div class="chips">'+roomChips+'</div></div>'+
    careField('water', 'Arrosage')+
    careField('feed', 'Engrais')+
    '<div class="field-group"><span class="overline">Rempotage</span>'+
      '<div class="repeat-n"><input class="field" type="number" min="1" inputmode="numeric" value="'+d.repot.months+'" onchange="setPRepotMonths(this.value)"><span>mois</span></div>'+
    '</div>'+
    soinsBlock+
    '<div class="field-group">'+
      '<textarea class="field area field-full" placeholder="Notes" autocapitalize="sentences" oninput="_pSheet.notes=this.value">'+esc(d.notes)+'</textarea>'+
    '</div>'+
    '<button class="btn primary btn-full" onclick="savePlantSheet()">'+(isNew ? 'Ajouter la plante' : 'Enregistrer')+'</button>'+
    (isNew ? '' : '<button class="btn danger btn-full" onclick="deletePlant(\''+d.id+'\')">Supprimer</button>')+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

async function savePlantSheet(){
  const d = _pSheet;
  const name = cap((d.name || '').trim());
  if(!name){
    const el = document.getElementById('p-name');
    if(el) el.focus();
    return;
  }
  const notes = cap((d.notes || '').trim());
  let p = !d._isNew ? S.plants.find(x=>x.id === d.id) : null;
  if(p){
    p.name = name; p.species = d.species; p.room = d.room; p.notes = notes;
    p.care.water.warm = d.water.warm; p.care.water.cold = d.water.cold;
    p.care.feed.warm = d.feed.warm; p.care.feed.cold = d.feed.cold;
    p.care.repot.months = d.repot.months;
    touch(p);
  } else {
    p = stamp({
      name, species:d.species, room:d.room, photoId:null,
      care:{
        water:{warm:d.water.warm, cold:d.water.cold, lastAt:Date.now(), history:[]},
        feed:{warm:d.feed.warm, cold:d.feed.cold, lastAt:Date.now(), history:[]},
        repot:{months:d.repot.months, lastAt:Date.now()}
      },
      notes, sort:0
    });
    S.plants.push(p);
  }
  if(_pPhotoBlob){
    await idbPutPhoto(p.id, _pPhotoBlob);
    p.photoId = p.id;
    touch(p);
  }
  save();
  closeSheet();
  rerender();
  toast(d._isNew ? 'Plante ajoutée' : 'Plante enregistrée');
}

function deletePlant(id){
  const p = S.plants.find(x=>x.id === id);
  if(!p) return;
  confirmSheet('Supprimer « '+p.name+' » ?', 'Supprimer', ()=>{
    p.deletedAt = Date.now();
    touch(p);
    if(p.photoId) idbDelPhoto(p.photoId);
    save();
    rerender();
    toast('Plante supprimée');
  });
}
