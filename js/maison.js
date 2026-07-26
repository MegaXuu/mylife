/* ==========================================================================
   maison.js — écran Maison : vue par pièce, entretien et plantes mêlés
   (ROADMAP-V1.md §6 bis). Placeholder : la vue par pièce arrive au Lot 4,
   les plantes la rejoignent au Lot 7.
   ========================================================================== */
function renderMaison(){
  document.getElementById('s-maison').innerHTML =
    '<h1>Maison</h1>'+
    emptyState('bientôt : l\'entretien et les plantes, réunis par pièce.', 'maison');
}
