/* ==========================================================================
   today.js — écran « Aujourd'hui », le cœur de l'app (ROADMAP-V1.md §6).
   Placeholder : agrégation tâches + entretien et algorithme de priorisation
   arrivent au Lot 5. Existe dès maintenant pour figer l'ordre de chargement.
   ========================================================================== */
// Sur-titre de l'écran : « Dimanche 26 juillet ». La casse de phrase impose
// la majuscule initiale que toLocaleDateString ne met pas en français.
function longDate(d){
  const s = (d || new Date()).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderToday(){
  document.getElementById('s-today').innerHTML =
    screenHead(longDate(), 'Aujourd\'hui')+
    emptyState('Bientôt.', 'Ce que tu as à faire aujourd\'hui sera réuni ici.');
}
