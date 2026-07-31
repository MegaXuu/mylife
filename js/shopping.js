/* ==========================================================================
   shopping.js — écran Courses (Lot V1-9). Rayons devinés depuis un
   dictionnaire embarqué (data/rayons.js, ⑰), ordre des rayons réglable (⑱),
   mode magasin (⑲), produits fréquents (⑳). Cet écran s'utilise debout, une
   main sur le caddie : chaque choix (gros libellés en mode magasin, coché =
   grisé en bas plutôt que disparu, un seul geste pour ajouter) sert ça.
   ========================================================================== */

// RAYON_ORDER_DEFAULT (l'ordre par défaut) vit dans data/rayons.js, chargé
// avant state.js — voir le commentaire là-bas. RAYON_LABELS n'est lu qu'au
// rendu, donc peut vivre ici sans contrainte d'ordre.
const RAYON_LABELS = {
  'fruits-legumes':'Fruits et légumes', 'frais':'Frais', 'cremerie':'Crèmerie',
  'viande-poisson':'Viande et poisson', 'surgele':'Surgelé',
  'epicerie-salee':'Épicerie salée', 'epicerie-sucree':'Épicerie sucrée',
  'boisson':'Boisson', 'hygiene':'Hygiène', 'entretien':'Entretien', 'bebe':'Bébé',
  'animaux':'Animaux', 'maison':'Maison', 'autre':'Autre'
};
const FREQUENT_MIN = 3;    // un produit ajouté ≥ 3 fois devient un fréquent (⑳)
const FREQUENT_MAX = 8;    // proposés sous le champ d'ajout, les plus utilisés d'abord

/* ==========================================================================
   Classement automatique par rayon (⑰) — fonctions pures, sans DOM, testables
   isolément comme parseQuick() (js/nlp.js) : normalisation, puis clé exacte,
   puis mot à mot. « Lait », « lait demi-écrémé » et « LAIT » tombent tous sur
   cremerie : la première par clé exacte, la seconde par le mot « lait ».
   ========================================================================== */

// Minuscules, accents retirés, ponctuation réduite à une espace — la clé de
// comparaison pour le dictionnaire ET pour les corrections mémorisées.
function normalizeLabel(s){
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pluriel simple : un « s » final sur un mot de plus de 3 lettres, jamais sur
// un mot qui se termine déjà par deux « s » (pas de cas courant en V1).
function singularizeWord(w){
  return (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) ? w.slice(0, -1) : w;
}

// Recherche par groupes de mots consécutifs, du plus long au plus court : un
// « papier toilette » au milieu d'un libellé plus long (« papier toilette
// double épaisseur ») l'emporte sur un mot isolé — c'est ce qui permet des
// clés à plusieurs mots dans data/rayons.js pour désambiguïser des mots trop
// génériques pour être des clés seules (« papier » à lui seul ne l'est pas).
// Le pluriel simple n'est essayé que sur un seul mot : sur un groupe, il
// tronquerait n'importe quoi (« steaks hachés » → « steaks hache », faux).
function guessRayon(label){
  const norm = normalizeLabel(label);
  if(!norm) return null;
  const overrides = (S.settings && S.settings.rayonOverrides) || {};
  const words = norm.split(' ').filter(Boolean);
  for(let n = words.length; n >= 1; n--){
    for(let i = 0; i + n <= words.length; i++){
      const phrase = words.slice(i, i + n).join(' ');
      const hit = overrides[phrase] || RAYONS[phrase] || (n === 1 ? RAYONS[singularizeWord(phrase)] : null);
      if(hit) return hit;
    }
  }
  return null;
}

/* ==========================================================================
   Produits fréquents (⑳) — S.frequents[] : {norm, label, rayon, count}, tenu
   à jour à chaque ajout. Pas de discipline synchro-ready ici (pas d'id, pas
   de tombstone) : c'est un compteur d'usage recalculable, pas un objet du
   domaine — dans le même esprit que « aucun compteur global stocké »
   (CONVENTIONS.md §2), mais par libellé plutôt que global.
   ========================================================================== */
function bumpFrequent(label, rayon){
  const norm = normalizeLabel(label);
  if(!norm) return;
  const f = S.frequents.find(x => x.norm === norm);
  if(f){ f.label = label; f.rayon = rayon; f.count = (f.count || 0) + 1; }
  else S.frequents.push({norm, label, rayon, count: 1});
}
function frequentShoppingItems(){
  return S.frequents.filter(f => (f.count || 0) >= FREQUENT_MIN)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, FREQUENT_MAX);
}

/* ---------- Ajout d'un article — chemin unique, que ce soit depuis le champ
   ou depuis un fréquent en un tap (principe 5 : jamais deux chemins visibles
   vers la même action ; ici, deux ENTRÉES, un seul chemin de création). ---------- */
function addShoppingItem(label){
  const rayon = guessRayon(label) || 'autre';
  const it = stamp({label, rayon, qty: '', done: false, sort: live(S.shopping).length});
  S.shopping.push(it);
  bumpFrequent(label, rayon);
  save();
  return it;
}

function shoppingOpenCount(){
  return live(S.shopping).filter(it => !it.done).length;
}

/* ==========================================================================
   Mode magasin (⑲) — bascule de session (jamais persistée, comme les filtres
   de l'écran Tâches) : gros libellés, cases larges, coché grisé en bas du
   rayon plutôt que disparu (on doit pouvoir décocher une erreur). Écran
   maintenu allumé (Wake Lock), avec garde de disponibilité — l'API n'existe
   pas partout et peut refuser silencieusement, ce n'est jamais une erreur.
   ========================================================================== */
let _shopStore = false;
let _wakeLock = null;

function acquireWakeLock(){
  if(!('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then(wl => {
    _wakeLock = wl;
    wl.addEventListener('release', () => { _wakeLock = null; });
  }).catch(() => { _wakeLock = null; });
}
function releaseWakeLock(){
  if(_wakeLock){ _wakeLock.release().catch(() => {}); _wakeLock = null; }
}
// Safari relâche le Wake Lock quand l'onglet passe en arrière-plan (verrouillage,
// changement d'app) : on le redemande au retour, tant que le mode magasin tient.
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible' && _shopStore && !_wakeLock) acquireWakeLock();
});

function setShopMode(store){
  _shopStore = !!store;
  if(_shopStore) acquireWakeLock(); else releaseWakeLock();
  renderShopping();
}

/* ==========================================================================
   Rendu
   ========================================================================== */

function shopRowHtml(it){
  return '<li class="row'+(it.done ? ' done' : '')+'">'+
    '<button class="check'+(it.done ? ' on' : '')+'" role="checkbox" aria-checked="'+it.done+'" '+
      'aria-label="'+(it.done ? 'Décocher' : 'Marquer acheté')+'" onclick="toggleShopDone(\''+it.id+'\')"></button>'+
    '<div class="row-main" onclick="shopItemSheet(\''+it.id+'\')"><div class="row-title">'+esc(it.label)+'</div></div>'+
    (it.qty ? '<div class="row-qty">× '+esc(it.qty)+'</div>' : '')+
  '</li>';
}

// Une carte par rayon, blanche (la maquette Canopée ne teinte pas les cartes
// de Courses — seul le bouton d'Aujourd'hui porte --t-courses). Les articles
// cochés restent dans leur rayon, poussés en bas (jamais retirés : on doit
// pouvoir décocher une erreur).
function shopRayonCard(rayon, items, i, n){
  const open = items.filter(it => !it.done).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const done = items.filter(it => it.done).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return '<div class="card">'+birdOnCard(i, n)+
    '<div class="room-head">'+
      '<h2 class="card-title">'+esc(RAYON_LABELS[rayon] || rayon)+'</h2>'+
      (_shopStore ? '<span class="rayon-left">'+open.length+(open.length > 1 ? ' restants' : ' restant')+'</span>' : '')+
    '</div>'+
    '<ul class="list">'+open.map(shopRowHtml).join('')+done.map(shopRowHtml).join('')+'</ul>'+
  '</div>';
}

function shopFrequentsHtml(){
  const list = frequentShoppingItems();
  if(!list.length) return '';
  return '<div class="chips cap-chips">'+list.map(f=>
    '<button type="button" class="chip" onclick="addFrequentShopItem(\''+f.norm+'\')">'+esc(f.label)+'</button>'
  ).join('')+'</div>';
}

function renderShopping(){
  const items = live(S.shopping);
  const open = items.filter(it => !it.done);
  const done = items.filter(it => it.done);
  const sur = open.length ? open.length + (open.length > 1 ? ' articles' : ' article') : 'Aucun article';
  const order = (S.settings.rayonOrder && S.settings.rayonOrder.length) ? S.settings.rayonOrder : RAYON_ORDER_DEFAULT;
  const byRayon = {};
  items.forEach(it => { (byRayon[it.rayon] = byRayon[it.rayon] || []).push(it); });
  const rayons = order.filter(r => byRayon[r] && byRayon[r].length);
  const body = rayons.length
    ? '<div class="'+(_shopStore ? 'shop-store' : '')+'">'+
        rayons.map((r, i) => shopRayonCard(r, byRayon[r], i, rayons.length)).join('')+
      '</div>'
    : emptyState('Liste vide.', 'Ajoute ton premier article ci-dessous.');
  document.getElementById('s-shopping').innerHTML =
    screenHead(sur, 'Courses')+
    '<div class="chips filter-chips">'+
      '<button class="chip'+(!_shopStore ? ' on' : '')+'" onclick="setShopMode(false)">Liste</button>'+
      '<button class="chip'+(_shopStore ? ' on' : '')+'" onclick="setShopMode(true)">Mode magasin</button>'+
    '</div>'+
    body+
    '<div class="addbar">'+
      '<input id="shop-input" class="field" type="text" placeholder="Ajouter un article…" '+
        'autocomplete="off" autocapitalize="sentences" enterkeyhint="done" '+
        'onkeydown="if(event.key===\'Enter\')commitShopItem()">'+
      '<button class="add-btn" aria-label="Ajouter" onclick="commitShopItem()">'+icon('<path d="M12 5v14M5 12h14"></path>', 24)+'</button>'+
    '</div>'+
    shopFrequentsHtml()+
    (done.length ? '<button class="btn quiet btn-full" onclick="clearCheckedShopping()">Vider les articles cochés ('+done.length+')</button>' : '')+
    '<button class="btn quiet btn-full" onclick="rayonOrderSheet()">Réordonner les rayons</button>';
}

/* ---------- Actions de la liste ---------- */

function commitShopItem(){
  const input = document.getElementById('shop-input');
  const label = cap((input ? input.value : '').trim());
  if(!label) return;
  addShoppingItem(label);
  renderShopping();
  const ni = document.getElementById('shop-input');
  if(ni) ni.focus();
}

function addFrequentShopItem(norm){
  const f = S.frequents.find(x => x.norm === norm);
  if(!f) return;
  addShoppingItem(f.label);
  renderShopping();
}

function toggleShopDone(id){
  const it = S.shopping.find(x => x.id === id);
  if(!it) return;
  it.done = !it.done;
  touch(it);
  save();
  renderShopping();
}

// Tombstone, jamais un vidage automatique (point 6) : geste explicite, confirmé.
function clearCheckedShopping(){
  const checked = live(S.shopping).filter(it => it.done);
  if(!checked.length) return;
  confirmSheet(
    'Vider '+checked.length+' article'+(checked.length > 1 ? 's' : '')+' coché'+(checked.length > 1 ? 's' : '')+' ?',
    'Vider',
    () => {
      checked.forEach(it => { it.deletedAt = Date.now(); touch(it); });
      save();
      renderShopping();
      toast('Articles vidés');
    }
  );
}

/* ==========================================================================
   Fiche article — label, quantité libre, rayon corrigeable d'un tap. Une
   correction de rayon est mémorisée pour ce libellé (S.settings.rayonOverrides),
   pas à chaque ajout : sinon le dictionnaire n'aurait plus jamais voix au
   chapitre sur un libellé déjà tapé une fois.
   ========================================================================== */
let _shItem = null;

function shopItemSheet(id){
  const it = S.shopping.find(x => x.id === id);
  if(!it) return;
  _shItem = {id: it.id, label: it.label, qty: it.qty || '', rayon: it.rayon};
  openSheet(shopItemSheetHtml());
  const el = document.getElementById('sh-label');
  if(el) el.focus();
}
function refreshShopItemSheet(){ openSheet(shopItemSheetHtml()); }
function setShRayon(r){ _shItem.rayon = r; refreshShopItemSheet(); }

function shopItemSheetHtml(){
  const d = _shItem;
  const rayonChips = RAYON_ORDER_DEFAULT.map(r=>
    '<button class="chip'+(d.rayon === r ? ' on' : '')+'" onclick="setShRayon(\''+r+'\')">'+esc(RAYON_LABELS[r])+'</button>'
  ).join('');
  return '<p class="sheet-title">Modifier l’article</p>'+
    '<div class="field-group">'+
      '<input id="sh-label" class="field field-full" type="text" placeholder="Article" value="'+esc(d.label)+'" '+
        'autocomplete="off" autocapitalize="sentences" oninput="_shItem.label=this.value">'+
    '</div>'+
    '<div class="field-group">'+
      '<input id="sh-qty" class="field field-full" type="text" placeholder="Quantité (facultatif)" value="'+esc(d.qty)+'" '+
        'autocomplete="off" oninput="_shItem.qty=this.value">'+
    '</div>'+
    '<div class="field-group"><span class="overline">Rayon</span><div class="chips">'+rayonChips+'</div></div>'+
    '<button class="btn primary btn-full" onclick="saveShopItemSheet()">Enregistrer</button>'+
    '<button class="btn danger btn-full" onclick="deleteShopItem(\''+d.id+'\')">Supprimer</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}

function saveShopItemSheet(){
  const d = _shItem;
  const it = S.shopping.find(x => x.id === d.id);
  if(!it) return;
  const label = cap((d.label || '').trim());
  if(!label){
    const el = document.getElementById('sh-label');
    if(el) el.focus();
    return;
  }
  const rayonChanged = it.rayon !== d.rayon;
  it.label = label; it.qty = (d.qty || '').trim(); it.rayon = d.rayon;
  touch(it);
  if(rayonChanged){
    S.settings.rayonOverrides[normalizeLabel(label)] = d.rayon;
  }
  save();
  closeSheet();
  renderShopping();
}

function deleteShopItem(id){
  const it = S.shopping.find(x => x.id === id);
  if(!it) return;
  confirmSheet('Supprimer « '+it.label+' » ?', 'Supprimer', () => {
    it.deletedAt = Date.now();
    touch(it);
    save();
    renderShopping();
    toast('Article supprimé', {action:{label:'Annuler', fn:()=>{
      it.deletedAt = null;
      touch(it);
      save();
      renderShopping();
    }}});
  });
}

/* ==========================================================================
   Ordre des rayons (⑱) — l'utilisateur réordonne pour suivre le plan de SON
   supermarché. Flèches haut/bas plutôt qu'un glisser-déposer : mêmes cibles
   de 44 px que le reste de l'app (.row-postpone), sans code de glissé
   supplémentaire à maintenir pour un seul lot.
   ========================================================================== */
let _rayonSheetOrder = null;

function rayonOrderSheet(){
  const cur = (S.settings.rayonOrder && S.settings.rayonOrder.length) ? S.settings.rayonOrder : RAYON_ORDER_DEFAULT;
  _rayonSheetOrder = cur.slice();
  openSheet(rayonOrderSheetHtml());
}
function moveRayon(i, dir){
  const j = i + dir;
  if(j < 0 || j >= _rayonSheetOrder.length) return;
  const tmp = _rayonSheetOrder[i]; _rayonSheetOrder[i] = _rayonSheetOrder[j]; _rayonSheetOrder[j] = tmp;
  openSheet(rayonOrderSheetHtml());
}
function rayonOrderSheetHtml(){
  const rows = _rayonSheetOrder.map((r, i)=>
    '<li class="row">'+
      '<div class="row-main"><div class="row-title">'+esc(RAYON_LABELS[r] || r)+'</div></div>'+
      '<button class="row-postpone" aria-label="Monter" onclick="moveRayon('+i+',-1)"'+(i===0?' disabled':'')+'>'+icon('<path d="M6 15l6-6 6 6"></path>', 20)+'</button>'+
      '<button class="row-postpone" aria-label="Descendre" onclick="moveRayon('+i+',1)"'+(i===_rayonSheetOrder.length-1?' disabled':'')+'>'+icon('<path d="M6 9l6 6 6-6"></path>', 20)+'</button>'+
    '</li>'
  ).join('');
  return '<p class="sheet-title">Ordre des rayons</p>'+
    '<p class="sheet-msg">Suis le plan de ton supermarché : la liste se parcourt alors sans revenir en arrière.</p>'+
    '<ul class="list">'+rows+'</ul>'+
    '<button class="btn primary btn-full" onclick="saveRayonOrder()">Enregistrer</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>';
}
function saveRayonOrder(){
  S.settings.rayonOrder = _rayonSheetOrder.slice();
  save();
  closeSheet();
  renderShopping();
}
