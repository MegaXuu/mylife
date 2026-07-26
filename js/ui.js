/* ==========================================================================
   ui.js — coquille d'interface : navigation (go), feuilles modales
   (openSheet/closeSheet/confirmSheet), toast, échappement HTML (esc),
   état vide (emptyState). Aucune logique métier ici.
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

function go(name){
  if(SCREENS.indexOf(name) === -1) return;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById('s-'+name);
  if(el) el.classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.dataset.s === name));
  window.scrollTo(0,0);
  const render = RENDERERS[name];
  if(render) render();
}

function reduceMotion(){
  return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function esc(s){
  return String(s==null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Icône générique unique pour le Lot 1 — un vrai système d'icônes arrive au Lot 2.
const EMPTY_ICON = '<svg viewBox="0 0 24 24" class="empty-ic" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7.5v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor"/></svg>';
function emptyState(texte, icone){
  return '<div class="empty">'+EMPTY_ICON+'<p>'+esc(texte)+'</p></div>';
}

let _toastTimer;
function toast(msg, opts){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.toggle('danger', !!(opts && opts.danger));
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>t.classList.remove('show'), 1900);
}

/* ---------- Feuilles modales ---------- */
function openSheet(html){
  const sheet = document.getElementById('sheet'), bg = document.getElementById('sheet-bg');
  sheet.style.transition = ''; sheet.style.transform = '';
  bg.style.transition = ''; bg.style.background = '';
  sheet.innerHTML = '<div class="handle"></div>'+html;
  bg.classList.add('show');
}
function closeSheet(){
  const bg = document.getElementById('sheet-bg');
  if(bg) bg.classList.remove('show');
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
    '<button class="btn ghost btn-full" onclick="closeSheet()">Annuler</button>'
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
  document.getElementById('sheet-bg').style.background = 'rgba(0,0,0,'+Math.max(0.05, 0.4*(1-y/_sheetDrag.h)).toFixed(3)+')';
});
function endSheetDrag(e){
  if(!_sheetDrag || (e && e.pointerId !== _sheetDrag.pid)) return;
  const sheet = document.getElementById('sheet'), bg = document.getElementById('sheet-bg'), drag = _sheetDrag;
  _sheetDrag = null;
  const dur = reduceMotion() ? '0s' : '.2s';
  sheet.style.transition = 'transform '+dur+' ease';
  bg.style.transition = 'background '+dur+' ease';
  const closing = drag.y > Math.min(120, drag.h*0.28) || (drag.y > 24 && drag.vy > 0.5);
  if(closing){
    sheet.style.transform = 'translateY(100%)';
    bg.style.background = 'rgba(0,0,0,0)';
    setTimeout(closeSheet, reduceMotion() ? 0 : 180);
  } else {
    sheet.style.transform = '';
    bg.style.background = '';
  }
}
document.getElementById('sheet-bg').addEventListener('pointerup', endSheetDrag);
document.getElementById('sheet-bg').addEventListener('pointercancel', endSheetDrag);
