/* ==========================================================================
   gestures.js — balayage horizontal sur les lignes (Lot V2-1, socle
   d'interaction). Ne fait rien tout seul : les lots V2-4/5/6 posent
   data-swipe-left="fn(...)" et/ou data-swipe-right="fn(...)" sur une <li
   class="row"> (ou toute ligne) pour la rendre balayable — le nom de
   fonction est évalué comme un onclick= l'est déjà ailleurs dans le projet
   (portée globale unique, CONVENTIONS.md §1).

   Un seul écouteur délégué au niveau document (Pointer Events) : les écrans
   se re-rendent entièrement en innerHTML à chaque action, des écouteurs posés
   ligne par ligne fuiraient à chaque rendu.

   Comportement : le contenu de la ligne suit le doigt en translateX, révélant
   dessous un fond d'action avec son libellé (data-swipe-left-label /
   data-swipe-right-label, facultatifs). Au relâchement, l'action se déclenche
   si le déplacement dépasse 33 % de la largeur de la ligne OU si la vélocité
   dépasse 0,5 px/ms — mêmes seuils que le glisser de feuille (endSheetDrag,
   js/ui.js), repris ici pour rester cohérent.

   Abandon dès que le déplacement vertical dépasse l'horizontal : le
   défilement de la page gagne toujours. `touch-action:pan-y` (posé en CSS
   sur les lignes balayables) fait la même chose côté navigateur pour les
   gestes tactiles ; la mesure ci-dessous couvre en plus la souris.

   Rien ne se passe sous prefers-reduced-motion (reduceMotion(), js/ui.js) :
   le balayage double toujours un chemin déjà présent dans la fiche ou un
   bouton, il n'est jamais le seul moyen d'agir.
   ========================================================================== */

const SWIPE_COMMIT_RATIO = 0.33;    // % de la largeur de la ligne — cf. endSheetDrag
const SWIPE_COMMIT_VELOCITY = 0.5;  // px/ms — cf. endSheetDrag

// Évalue l'expression posée dans data-swipe-left/right, exactement comme un
// onclick= HTML l'est déjà (portée globale unique du projet).
function swipeRunAttr(expr){
  if(!expr) return;
  try{ (new Function(expr))(); }
  catch(e){ /* une expression invalide ici ne casserait pas plus un onclick= */ }
}

// Prépare la ligne au premier geste : déplace son contenu déjà rendu dans un
// calque .swipe-content (seule cible du transform) et pose une fois pour
// toutes les fonds d'action .swipe-bg sous ce calque. Idempotent : sans effet
// si déjà fait (utile seulement si la même ligne recevait deux gestes sans
// être re-rendue entre-temps, ce qui n'arrive pas ici mais coûte une ligne).
function swipePrepareRow(row){
  let content = row.querySelector('.swipe-content');
  if(content) return content;
  const left = row.dataset.swipeLeft, right = row.dataset.swipeRight;
  if(left){
    const bg = document.createElement('div');
    bg.className = 'swipe-bg left';
    bg.textContent = row.dataset.swipeLeftLabel || 'Supprimer';
    row.appendChild(bg);
  }
  if(right){
    const bg = document.createElement('div');
    bg.className = 'swipe-bg right';
    bg.textContent = row.dataset.swipeRightLabel || 'Fait';
    row.appendChild(bg);
  }
  content = document.createElement('div');
  content.className = 'swipe-content';
  Array.from(row.childNodes)
    .filter(n => !(n.nodeType === 1 && n.classList.contains('swipe-bg')))
    .forEach(n => content.appendChild(n));
  row.appendChild(content);
  return content;
}

function swipeShowBg(row, dir){
  const l = row.querySelector('.swipe-bg.left'), r = row.querySelector('.swipe-bg.right');
  if(l) l.classList.toggle('show', dir === 'left');
  if(r) r.classList.toggle('show', dir === 'right');
}

let _swipe = null;

document.addEventListener('pointerdown', e=>{
  if(reduceMotion()) return;
  if(e.pointerType === 'mouse' && e.button !== 0) return;
  const row = e.target.closest('.row[data-swipe-left],.row[data-swipe-right]');
  if(!row) return;
  // Un contrôle propre (case, bouton, champ) garde son tap normal — le
  // balayage ne fait que doubler le corps de la ligne, pas ses boutons.
  if(e.target.closest('button,input,select,textarea,a')) return;
  const content = swipePrepareRow(row);
  content.style.transition = 'none';
  _swipe = {
    row, content, pid: e.pointerId,
    startX: e.clientX, startY: e.clientY, x: 0, t: Date.now(), vx: 0,
    w: row.getBoundingClientRect().width || 1,
    locked: null // null = indécis, 'h' = balayage engagé, 'v' = laissé au défilement
  };
});

document.addEventListener('pointermove', e=>{
  if(!_swipe || e.pointerId !== _swipe.pid) return;
  const s = _swipe;
  if(s.locked === 'v') return;
  const dx = e.clientX - s.startX, dy = e.clientY - s.startY;
  if(s.locked === null){
    if(Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // pas assez de mouvement pour trancher
    if(Math.abs(dy) >= Math.abs(dx)){ s.locked = 'v'; return; } // le défilement gagne toujours
    s.locked = 'h';
    try{ s.row.setPointerCapture(e.pointerId); }catch(err){}
  }
  let x = dx;
  if(x < 0 && !s.row.dataset.swipeLeft) x = 0;   // pas de fonction posée dans ce sens : rien ne bouge
  if(x > 0 && !s.row.dataset.swipeRight) x = 0;
  const now = Date.now(), dt = Math.max(1, now - s.t);
  s.vx = (x - s.x) / dt;
  s.x = x; s.t = now;
  s.content.style.transform = 'translateX('+x+'px)';
  swipeShowBg(s.row, x < 0 ? 'left' : (x > 0 ? 'right' : null));
  e.preventDefault();
});

function swipeEnd(e){
  if(!_swipe || (e && e.pointerId !== _swipe.pid)) return;
  const s = _swipe;
  _swipe = null;
  if(s.locked !== 'h') return; // rien engagé (tap simple, ou laissé au défilement)
  const commit = Math.abs(s.x) > s.w * SWIPE_COMMIT_RATIO ||
    (Math.abs(s.x) > 24 && Math.abs(s.vx) > SWIPE_COMMIT_VELOCITY);
  const dir = s.x < 0 ? 'left' : 'right';
  const expr = dir === 'left' ? s.row.dataset.swipeLeft : s.row.dataset.swipeRight;
  const dur = reduceMotion() ? '0s' : (commit ? '.22s' : '.12s');
  s.content.style.transition = 'transform '+dur+' var(--ease)';
  if(commit && expr){
    s.content.style.transform = 'translateX('+(dir === 'left' ? '-100%' : '100%')+')';
    setTimeout(()=>swipeRunAttr(expr), reduceMotion() ? 0 : 160);
  } else {
    s.content.style.transform = '';
    swipeShowBg(s.row, null);
  }
}
document.addEventListener('pointerup', swipeEnd);
document.addEventListener('pointercancel', swipeEnd);
