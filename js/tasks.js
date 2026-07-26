/* ==========================================================================
   tasks.js — écran Tâches, périmètre Lot 1 STRICT : ajouter, cocher (fait),
   supprimer (tombstone). Ni date, ni catégorie, ni priorité, ni récurrence —
   ce sera le périmètre des Lots 3 et 4. Habillé au Lot 2 avec les composants
   partagés du design system « Canopée » (index.html + js/ui.js).
   ========================================================================== */
function renderTasks(){
  const items = live(S.tasks).filter(t=>!t.doneAt).sort((a,b)=>b.createdAt-a.createdAt);
  const n = items.length;
  const sur = n === 0 ? 'Aucune tâche ouverte'
                      : n + (n > 1 ? ' tâches ouvertes' : ' tâche ouverte');
  const rows = items.map(t=>
    '<li class="row">'+
      '<button class="check" aria-label="Marquer fait" onclick="doneTask(\''+t.id+'\')"></button>'+
      '<div class="row-main"><div class="row-title">'+esc(t.title)+'</div></div>'+
      '<button class="row-del" aria-label="Supprimer" onclick="delTask(\''+t.id+'\')">'+icon(IC_CLOSE, 20)+'</button>'+
    '</li>'
  ).join('');
  document.getElementById('s-tasks').innerHTML =
    screenHead(sur, 'Tâches')+
    (n
      ? '<ul class="list">'+rows+'</ul>'
      : emptyState('Rien à faire ici.', 'Ajoute une première tâche ci-dessous.'))+
    '<div class="addbar">'+
      '<input id="task-input" class="field" type="text" placeholder="Ajouter une tâche…" '+
        'autocomplete="off" autocapitalize="sentences" enterkeyhint="done" '+
        'onkeydown="if(event.key===\'Enter\')addTask()">'+
      '<button class="add-btn" aria-label="Ajouter" onclick="addTask()">'+
        icon('<path d="M12 5v14M5 12h14"></path>', 24)+
      '</button>'+
    '</div>';
}

function addTask(){
  const input = document.getElementById('task-input');
  const title = cap((input && input.value || '').trim()); // majuscule initiale, cf. ui.js
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
    // Tombstone, donc annulable tant que le toast est là : on remet deletedAt à null.
    toast('Tâche supprimée', {action:{label:'Annuler', fn:()=>{
      t.deletedAt = null;
      touch(t);
      save();
      renderTasks();
    }}});
  });
}
