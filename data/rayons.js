/* ==========================================================================
   data/rayons.js — dictionnaire produit → rayon (~300 entrées, français).
   Rempli au Lot 9 (Courses). Clé = nom de produit normalisé (minuscules, sans
   accent, ex. « lait »), valeur = nom du rayon (ex. « Frais »). Alimente le
   rangement automatique d'un article ajouté aux courses, corrigeable à la main.
   Vide pour l'instant — chargé en premier (avant state.js) comme les deux
   autres catalogues, cf. CONVENTIONS.md §1 (ordre de chargement).
   ========================================================================== */
const RAYONS = {};
