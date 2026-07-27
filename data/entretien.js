/* ==========================================================================
   data/entretien.js — catalogue de modèles d'entretien maison (Lot V1-4).
   Chaque entrée : { title, room, intervalDays, effort }. Proposée en un tap
   depuis la feuille d'ajout de l'écran Maison (entretienSheet(), js/maison.js) :
   room, catégorie 'entretien' et repeat:{kind:'day', n:intervalDays, from:'done'}
   sont posés automatiquement, modifiables ensuite comme toute tâche.
   Gestes courts et concrets, jamais une corvée vague.
   ========================================================================== */
const ENTRETIEN = [
  // — Salon —
  {title:'Passer l’aspirateur', room:'salon', intervalDays:7, effort:2},
  {title:'Passer la serpillière', room:'salon', intervalDays:10, effort:2},
  {title:'Dépoussiérer les meubles', room:'salon', intervalDays:14, effort:1},
  {title:'Laver les vitres', room:'salon', intervalDays:60, effort:2},
  {title:'Laver les rideaux', room:'salon', intervalDays:90, effort:2},
  {title:'Vérifier le détecteur de fumée', room:'salon', intervalDays:180, effort:1},
  {title:'Nettoyer les bouches de VMC', room:'salon', intervalDays:120, effort:1},

  // — Cuisine —
  {title:'Vider le lave-vaisselle', room:'cuisine', intervalDays:2, effort:1},
  {title:'Détartrer le lave-vaisselle', room:'cuisine', intervalDays:90, effort:2},
  {title:'Nettoyer le frigo', room:'cuisine', intervalDays:30, effort:2},
  {title:'Nettoyer le four', room:'cuisine', intervalDays:45, effort:3},
  {title:'Nettoyer la hotte', room:'cuisine', intervalDays:60, effort:2},
  {title:'Sortir les poubelles', room:'cuisine', intervalDays:3, effort:1},
  {title:'Nettoyer le plan de travail', room:'cuisine', intervalDays:7, effort:1},
  {title:'Détartrer la bouilloire', room:'cuisine', intervalDays:60, effort:1},
  {title:'Nettoyer le micro-ondes', room:'cuisine', intervalDays:21, effort:1},
  {title:'Laver les torchons', room:'cuisine', intervalDays:7, effort:1},
  {title:'Faire vérifier la chaudière', room:'cuisine', intervalDays:365, effort:3},

  // — Chambre —
  {title:'Changer les draps', room:'chambre', intervalDays:14, effort:2},
  {title:'Passer l’aspirateur', room:'chambre', intervalDays:7, effort:2},
  {title:'Dépoussiérer les meubles', room:'chambre', intervalDays:14, effort:1},
  {title:'Retourner le matelas', room:'chambre', intervalDays:180, effort:2},
  {title:'Aérer et laver les rideaux', room:'chambre', intervalDays:90, effort:2},
  {title:'Vérifier le détecteur de fumée', room:'chambre', intervalDays:180, effort:1},

  // — Salle de bain —
  {title:'Nettoyer la salle de bain', room:'sdb', intervalDays:7, effort:2},
  {title:'Nettoyer les WC', room:'sdb', intervalDays:4, effort:1},
  {title:'Nettoyer les joints de douche', room:'sdb', intervalDays:14, effort:2},
  {title:'Détartrer la robinetterie', room:'sdb', intervalDays:30, effort:2},
  {title:'Nettoyer le bac à lessive du lave-linge', room:'sdb', intervalDays:30, effort:1},
  {title:'Nettoyer le filtre du lave-linge', room:'sdb', intervalDays:60, effort:2},
  {title:'Vérifier la pharmacie (péremptions)', room:'sdb', intervalDays:90, effort:2},
  {title:'Laver le tapis de bain', room:'sdb', intervalDays:14, effort:1},
  {title:'Nettoyer les bouches de VMC', room:'sdb', intervalDays:120, effort:1},

  // — Bureau —
  {title:'Dépoussiérer le bureau', room:'bureau', intervalDays:14, effort:1},
  {title:'Passer l’aspirateur', room:'bureau', intervalDays:14, effort:2},
  {title:'Trier les papiers', room:'bureau', intervalDays:30, effort:2},
  {title:'Nettoyer l’écran et le clavier', room:'bureau', intervalDays:14, effort:1},
  {title:'Vider la corbeille à papier', room:'bureau', intervalDays:7, effort:1},

  // — Extérieur —
  {title:'Arroser les plantes du balcon', room:'exterieur', intervalDays:3, effort:1},
  {title:'Nettoyer les gouttières', room:'exterieur', intervalDays:180, effort:3},
  {title:'Balayer la terrasse', room:'exterieur', intervalDays:14, effort:1},
  {title:'Nettoyer les vitres extérieures', room:'exterieur', intervalDays:90, effort:2}
];
