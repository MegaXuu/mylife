/* ==========================================================================
   data/plantes.js — catalogue de plantes d'intérieur courantes (~40) et de
   leurs intervalles de soin saison chaude / saison froide.
   Rempli au Lot 7 (Maison v2 — Plantes). Clé = identifiant de l'espèce,
   valeur attendue : { name, water:{warm,cold}, feed:{warm,cold}, repot:{months} }
   (intervalles en jours pour l'arrosage/engrais, en mois pour le rempotage).
   Vide pour l'instant.
   ========================================================================== */
const PLANTES = {};
