/* ==========================================================================
   ui.js — coquille d'interface : navigation (go), en-tête d'écran
   (screenHead), feuilles modales (openSheet/closeSheet/confirmSheet), toast,
   échappement HTML (esc), état vide (emptyState), couleur de jauge
   (gaugeColor). Aucune logique métier ici.
   Les classes CSS employées ici vivent dans le <style> d'index.html
   (design system « Canopée », Lot V1-2).
   ========================================================================== */

const SCREENS = ['today','tasks','maison','shopping','habits','settings'];
const RENDERERS = {
  today: ()=>renderToday(),
  tasks: ()=>renderTasks(),
  maison: ()=>renderMaison(),
  shopping: ()=>renderShopping(),
  habits: ()=>renderHabits(),
  settings: ()=>renderSettings()
};

let CURRENT_SCREEN = 'today'; // écran en cours de rendu — lu par birdOnCard/birdOnPerch

function go(name){
  if(SCREENS.indexOf(name) === -1) return;
  CURRENT_SCREEN = name;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById('s-'+name);
  if(el) el.classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.dataset.s === name));
  window.scrollTo(0,0);
  const render = RENDERERS[name];
  if(render) render();
}

// Re-rend l'écran affiché, quel qu'il soit. Depuis le Lot V1-5, la fiche
// tâche s'ouvre aussi bien depuis Tâches que depuis Aujourd'hui : enregistrer
// ou supprimer doit rafraîchir l'écran d'où l'on vient, pas Tâches par défaut.
function rerender(){
  const render = RENDERERS[CURRENT_SCREEN];
  if(render) render();
}

function reduceMotion(){
  return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function esc(s){
  return String(s==null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Majuscule initiale — règle de casse du projet : toute phrase ET toute entrée
// de liste commence par une majuscule. À appliquer À LA SAISIE (pas au rendu),
// pour que la donnée stockée et exportée soit déjà propre.
function cap(s){
  s = String(s == null ? '' : s);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- Icônes : un seul trait de 2 px, terminaisons rondes ---------- */
function icon(d, size){
  return '<svg viewBox="0 0 24 24" width="'+(size||20)+'" height="'+(size||20)+'" fill="none" '+
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
}
const IC_GEAR = '<circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18"></path>';
const IC_CLOSE = '<path d="M7 7l10 10M17 7L7 17"></path>';
const IC_EDIT = '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"></path><path d="M14 8l2 2"></path>';

/* ---------- En-tête d'écran : sur-titre, titre, engrenage discret ---------- */
// sur = date ou compte (« 9 tâches ouvertes »), titre = nom de l'écran.
// L'engrenage est la seule porte vers Réglages : il n'apparaît donc pas dessus.
function screenHead(sur, titre, opts){
  const gear = (opts && opts.noGear) ? '' :
    '<button class="gear" aria-label="Réglages" onclick="go(\'settings\')">'+icon(IC_GEAR)+'</button>';
  return '<header class="head"><div>'+
    (sur ? '<div class="head-over">'+esc(sur)+'</div>' : '')+
    '<h1 class="head-title">'+esc(titre)+'</h1>'+
    '</div>'+gear+'</header>';
}

/* ---------- Micro-présences d'oiseaux (data/oiseaux.js) ----------
   Un tirage par ouverture de l'app : une espèce et un rang de perchoir par
   écran. Un seul oiseau par écran, posé sur le BORD SUPÉRIEUR D'UNE CARTE —
   jamais sur un titre, jamais sur la tab bar. Décoratif et rien d'autre :
   aria-hidden, pointer-events:none, aucune animation, aucun clic.
   Aucun oiseau en mode sombre (ils sont dessinés pour le crème). */
let BIRDS_PICK = {};

function pickBirds(){
  const noms = Object.keys(OISEAUX);
  if(!noms.length) return;
  // Mélange de Fisher-Yates : des espèces distinctes tant qu'il y en a assez.
  for(let i = noms.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const t = noms[i]; noms[i] = noms[j]; noms[j] = t;
  }
  BIRDS_PICK = {};
  SCREENS.forEach((s, i)=>{
    // r fige le perchoir pour la session : un re-rendu ne fait pas sauter l'oiseau.
    BIRDS_PICK[s] = {sp: noms[i % noms.length], r: Math.random()};
  });
}

function birdsOn(){
  if(typeof OISEAUX === 'undefined') return false;
  if(document.documentElement.getAttribute('data-mode') === 'dark') return false;
  return !!(S && S.settings && S.settings.birds);
}

// Construit le SVG. w = largeur ; la hauteur suit (4/3) et les 18,75 % du bas
// débordent SOUS la ligne de perchoir, pattes posées dessus (cf. data/oiseaux.js).
function birdSvg(nom, w, pos){
  const formes = OISEAUX[nom];
  if(!formes) return '';
  const h = Math.round(w * 4 / 3), sous = Math.round(h * 0.1875);
  const corps = formes.map(x=> x.d != null
    ? '<path d="'+x.d+'" fill="'+(x.f || 'none')+'"'+
        (x.s ? ' stroke="'+x.s+'" stroke-width="'+x.w+'" stroke-linecap="round"' : '')+
        (x.o != null ? ' opacity="'+x.o+'"' : '')+'/>'
    : '<circle cx="'+x.cx+'" cy="'+x.cy+'" r="'+x.r+'" fill="'+x.f+'"/>'
  ).join('');
  return '<svg class="bird" viewBox="0 0 120 160" aria-hidden="true" focusable="false" '+
    'style="width:'+w+'px;height:'+h+'px;bottom:calc(100% - '+sous+'px);'+(pos || '')+'">'+corps+'</svg>';
}

// À appeler depuis un renderX() qui pose des cartes : `i` = rang de la carte,
// `n` = nombre total de cartes de l'écran. Renvoie le SVG si cette carte est le
// perchoir tiré, sinon ''. La carte doit porter la classe .card (position:relative).
function birdOnCard(i, n){
  if(!birdsOn() || !n) return '';
  const p = BIRDS_PICK[CURRENT_SCREEN];
  if(!p || Math.floor(p.r * n) !== i) return '';
  return birdSvg(p.sp, 30, 'right:22px;');
}

// L'oiseau de l'écran courant, 64 px, posé sur le filet d'un état vide.
function birdOnPerch(){
  if(!birdsOn()) return '';
  const p = BIRDS_PICK[CURRENT_SCREEN];
  return p ? birdSvg(p.sp, 64, 'left:50%;margin-left:-32px;') : '';
}

/* ---------- État vide : perchoir, phrase, sous-ligne. Même structure partout. ---------- */
function emptyState(titre, sous){
  return '<div class="empty">'+
    '<div class="empty-perch">'+birdOnPerch()+'</div>'+
    '<p class="empty-title">'+esc(titre)+'</p>'+
    (sous ? '<p class="empty-sub">'+esc(sous)+'</p>' : '')+
    '</div>';
}

/* ---------- Jauge de fraîcheur : la seule couleur calculée de l'app ----------
   f ∈ [0,1] : 1 = frais, 0 = à faire. Le remplissage glisse du vert vers
   l'argile à l'approche de « à faire ». Les quotas d'habitudes n'utilisent
   JAMAIS cette rampe : ils gardent --g-hab (classe .gauge-fill.hab). */
function gaugeColor(f){
  const p = f >= 0.7 ? 0 : Math.min(100, Math.round((0.7 - f) * 150));
  return p === 0 ? 'var(--g-ok)' : 'color-mix(in oklab, var(--g-low) '+p+'%, var(--g-ok))';
}

// Largeur du remplissage. Plancher à 4 % : à zéro, une jauge de fraîcheur doit
// se lire « au bout », pas « absente » — une pilule entièrement vide passe pour
// une donnée manquante. Réservé à la fraîcheur : un quota d'habitude à zéro
// (Lot 10) doit bien afficher zéro.
function gaugeWidth(f){
  return Math.max(4, Math.round(f * 100)) + '%';
}

/* ---------- Toast : carte posée, une seule action facultative ---------- */
let _toastTimer, _toastAct = null;
function toast(msg, opts){
  const t = document.getElementById('toast');
  if(!t) return;
  _toastAct = (opts && opts.action) || null;
  t.innerHTML = '<span>'+esc(msg)+'</span>'+
    (_toastAct ? '<button class="toast-act" onclick="_runToastAct()">'+esc(_toastAct.label)+'</button>' : '');
  t.classList.toggle('danger', !!(opts && opts.danger));
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(hideToast, _toastAct ? 4500 : 1900);
}
function hideToast(){
  const t = document.getElementById('toast');
  if(t) t.classList.remove('show');
  _toastAct = null;
}
function _runToastAct(){
  const a = _toastAct;
  hideToast();
  if(a && a.fn) a.fn();
}

/* ---------- Feuilles modales ---------- */
function openSheet(html){
  const sheet = document.getElementById('sheet'), bg = document.getElementById('sheet-bg');
  sheet.style.transition = ''; sheet.style.transform = '';
  bg.style.transition = ''; bg.style.background = '';
  sheet.innerHTML = '<div class="handle"></div>'+html;
  bg.classList.add('show');
}
// Hook générique, posé par un écran qui a besoin de nettoyer une ressource
// à la fermeture de la feuille (Lot V1-7 : révoquer l'URL objet d'une photo
// de plante), quel que soit le chemin de fermeture (bouton, tap en dehors,
// glisser la poignée).
let _onSheetClose = null;
function closeSheet(){
  const bg = document.getElementById('sheet-bg');
  if(bg) bg.classList.remove('show');
  if(_onSheetClose){ const fn = _onSheetClose; _onSheetClose = null; fn(); }
}
document.getElementById('sheet-bg').addEventListener('click', e=>{
  if(e.target.id === 'sheet-bg') closeSheet(); // fermeture par tap en dehors de la feuille
});

let _confirmCb = null;
function confirmSheet(message, label, onConfirm){
  _confirmCb = onConfirm;
  openSheet(
    '<p class="sheet-msg">'+esc(message)+'</p>'+
    '<button class="btn danger btn-full" onclick="_runConfirm()">'+esc(label)+'</button>'+
    '<button class="btn quiet btn-full" onclick="closeSheet()">Annuler</button>'
  );
}
function _runConfirm(){
  const cb = _confirmCb; _confirmCb = null;
  closeSheet();
  if(cb) cb();
}

/* ---------- Fermeture de la feuille par glisser vers le bas depuis la poignée ---------- */
let _sheetDrag = null;
document.getElementById('sheet-bg').addEventListener('pointerdown', e=>{
  const handle = e.target.closest('.handle');
  if(!handle) return;
  const sheet = document.getElementById('sheet');
  _sheetDrag = {startY:e.clientY, y:0, h:sheet.getBoundingClientRect().height || 1, pid:e.pointerId, t:Date.now(), vy:0};
  sheet.style.transition = 'none';
  try{ handle.setPointerCapture(e.pointerId); }catch(err){}
});
document.getElementById('sheet-bg').addEventListener('pointermove', e=>{
  if(!_sheetDrag || e.pointerId !== _sheetDrag.pid) return;
  const now = Date.now(), dt = Math.max(1, now-_sheetDrag.t), y = Math.max(0, e.clientY-_sheetDrag.startY);
  _sheetDrag.vy = (y-_sheetDrag.y)/dt; // px/ms, positif si le geste va vers le bas
  _sheetDrag.y = y; _sheetDrag.t = now;
  document.getElementById('sheet').style.transform = 'translateY('+y+'px)';
  // Scrim chaud du design system (--scrim = rgba(42,37,30,.25)), atténué au glissé.
  document.getElementById('sheet-bg').style.background = 'rgba(42,37,30,'+Math.max(0.03, 0.25*(1-y/_sheetDrag.h)).toFixed(3)+')';
});
function endSheetDrag(e){
  if(!_sheetDrag || (e && e.pointerId !== _sheetDrag.pid)) return;
  const sheet = document.getElementById('sheet'), bg = document.getElementById('sheet-bg'), drag = _sheetDrag;
  _sheetDrag = null;
  const dur = reduceMotion() ? '0s' : '.22s';
  const ease = 'cubic-bezier(.2,.7,.3,1)';
  sheet.style.transition = 'transform '+dur+' '+ease;
  bg.style.transition = 'background '+dur+' '+ease;
  const closing = drag.y > Math.min(120, drag.h*0.28) || (drag.y > 24 && drag.vy > 0.5);
  if(closing){
    sheet.style.transform = 'translateY(100%)';
    bg.style.background = 'rgba(42,37,30,0)';
    setTimeout(closeSheet, reduceMotion() ? 0 : 180);
  } else {
    sheet.style.transform = '';
    bg.style.background = '';
  }
}
document.getElementById('sheet-bg').addEventListener('pointerup', endSheetDrag);
document.getElementById('sheet-bg').addEventListener('pointercancel', endSheetDrag);
