/* ==========================================================================
   habits.js — écran secondaire Habitudes (définitions, séries, calendrier).
   Placeholder : logique réelle au Lot 8. Le bloc « Habitudes du jour » vivra
   sur l'écran Aujourd'hui (js/today.js) ; cet écran-ci n'est atteint qu'en
   tapant son en-tête (ROADMAP-V1.md §6 bis) — pas d'onglet dédié.
   ========================================================================== */
function renderHabits(){
  document.getElementById('s-habits').innerHTML =
    screenHead('', 'Habitudes')+
    emptyState('Bientôt.', 'Tes habitudes, tes séries et tes quotas.');
}
