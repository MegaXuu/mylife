/* ==========================================================================
   settings.js — réglages, profil, export/import JSON, à propos,
   réinitialisation. Logique réelle au Lot 11 ; seul l'interrupteur
   « Oiseaux » existe dès le Lot 2, puisque c'est là que les oiseaux arrivent.
   ========================================================================== */
function renderSettings(){
  const on = !!S.settings.birds;
  const n = reviewCandidates().length;
  document.getElementById('s-settings').innerHTML =
    // Pas d'engrenage ici : c'est l'écran vers lequel il mène.
    screenHead(APP_VERSION, 'Réglages', {noGear:true})+
    '<div class="card">'+birdOnCard(0, 3)+
      '<ul class="list"><li class="row">'+
        '<div class="row-main">'+
          '<div class="row-title">Oiseaux</div>'+
          '<div class="row-meta">De discrètes présences posées sur les cartes.</div>'+
        '</div>'+
        '<button class="switch'+(on ? ' on' : '')+'" role="switch" aria-checked="'+on+'" '+
          'aria-label="Oiseaux" onclick="toggleBirds()"></button>'+
      '</li></ul>'+
    '</div>'+
    '<div class="card">'+birdOnCard(1, 3)+
      '<ul class="list"><li class="row">'+
        '<div class="row-main">'+
          '<div class="row-title">Revue hebdomadaire</div>'+
          '<div class="row-meta">'+(n ? n+(n>1?' tâches dorment.':' tâche dort.') : 'Rien à trier pour l’instant.')+'</div>'+
        '</div>'+
        '<button class="btn secondary" onclick="startReview()">Lancer</button>'+
      '</li></ul>'+
    '</div>'+
    '<div class="card">'+birdOnCard(2, 3)+
      '<div class="row-meta">Profil, préférences, export et import arrivent bientôt.</div>'+
    '</div>';
}

function toggleBirds(){
  S.settings.birds = !S.settings.birds;
  save();
  // Rendu complet : l'écran actif reprend (ou perd) son oiseau immédiatement.
  renderSettings();
}
