/* ==========================================================================
   shopping.js — écran Courses : rayons (data/rayons.js), mode magasin,
   produits fréquents. Placeholder : logique réelle au Lot 9.
   ========================================================================== */
function renderShopping(){
  document.getElementById('s-shopping').innerHTML =
    screenHead('', 'Courses')+
    emptyState('Bientôt.', 'Ta liste de courses, rangée par rayon.');
}
