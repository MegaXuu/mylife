/* ==========================================================================
   tasks.js — écran Tâches, périmètre Lot 1 STRICT : ajouter, cocher (fait),
   supprimer (tombstone). Ni date, ni catégorie, ni priorité, ni récurrence —
   ce sera le périmètre des Lots 3 et 4.
   ========================================================================== */
function renderTasks(){
  const items = live(S.tasks).filter(t=>!t.doneAt).sort((a,b)=>b.createdAt-a.createdAt);
  const rows = items.map(t=>
    '<li class="task-row">'+
      '<button class="task-check" aria-label="Marquer fait" onclick="doneTask(\''+t.id+'\')"></button>'+
      '<span class="task-title">'+esc(t.title)+'</span>'+
      '<button class="task-del" aria-label="Supprimer" onclick="delTask(\''+t.id+'\')">×</button>'+
    '</li>'
  ).join('');
  document.getElementById('s-tasks').innerHTML =
    '<h1>Tâches</h1>'+
    '<div class="task-add">'+
      '<input id="task-input" type="text" placeholder="Ajouter une tâche…" autocomplete="off" '+
        'onkeydown="if(event.key===\'Enter\')addTask()">'+
      '<button class="btn primary" onclick="addTask()">Ajouter</button>'+
    '</div>'+
    (items.length
      ? '<ul class="task-list">'+rows+'</ul>'
      : emptyState('aucune tâche pour l\'instant', 'tasks'));
}

function addTask(){
  const input = document.getElementById('task-input');
  const title = (input && input.value || '').trim();
  if(!title) return;
  S.tasks.push(stamp({title}));
  save();
  renderTasks();
  const ni = document.getElementById('task-input');
  if(ni) ni.focus();
}

function doneTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  t.doneAt = Date.now();
  touch(t);
  save();
  renderTasks();
}

function delTask(id){
  const t = S.tasks.find(x=>x.id === id);
  if(!t) return;
  confirmSheet('Supprimer « '+t.title+' » ?', 'Supprimer', ()=>{
    t.deletedAt = Date.now();
    touch(t);
    save();
    renderTasks();
    toast('Tâche supprimée');
  });
}
