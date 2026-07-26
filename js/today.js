/* ==========================================================================
   today.js — écran « Aujourd'hui », le cœur de l'app (ROADMAP-V1.md §6).
   Placeholder : agrégation tâches + entretien et algorithme de priorisation
   arrivent au Lot 5. Existe dès maintenant pour figer l'ordre de chargement.
   ========================================================================== */
function renderToday(){
  document.getElementById('s-today').innerHTML =
    '<h1>Aujourd\'hui</h1>'+
    emptyState('bientôt : ce que tu as à faire aujourd\'hui, réuni ici.', 'today');
}
