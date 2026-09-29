/* ==========================================================================
   data/entretien.js — catalogue de modèles d'entretien maison (Lot V1-4),
   refondu au Lot V3-1 : il porte désormais le PACK MAISON, l'installation en
   un tap qui évite de tout saisir à la main (ROADMAP-V3.md §2).

   Chaque entrée : { title, room, days, mins, pack, dow? }
     · days — intervalle en jours (jauge de fraîcheur, repeat.from:'done') ;
     · dow  — facultatif : jours fixes de la semaine (1 = lundi … 7 =
              dimanche). Un modèle qui en porte « tombe le même jour à chaque
              fois » (la serpillière, le samedi) au lieu de glisser avec la
              date de la dernière réalisation — days sert alors seulement à
              la jauge (7 pour un jour par semaine) ;
     · mins — durée estimée, lue par le budget d'entretien quotidien
              (choreDay(), js/maison.js) ;
     · pack — vrai si le modèle fait partie du pack installé d'un tap
              (packSheet()). Les autres restent proposés un par un depuis
              « Ajouter un entretien » (entretienSheet()).
   Les pièces sont les clés de ROOM_ORDER (js/tasks.js) ; « partout » désigne
   ce qui se fait dans toute la maison d'une traite. Gestes courts et
   concrets, jamais une corvée vague. Aucune donnée personnelle ici : ce sont
   des modèles génériques, ajustés ensuite sur place (balayage, fiche).
   ========================================================================== */
const ENTRETIEN = [
  // — Toute la maison — la serpillière d'une seule traite, le même jour chaque semaine.
  {title:'Passer la serpillière', room:'partout', days:7, dow:[6], mins:30, pack:true},
  {title:'Aspirateur dans les recoins', room:'partout', days:7, mins:15, pack:true},
  {title:'Aspirateur dans les gros recoins', room:'partout', days:17, mins:30, pack:true}, // sous les meubles, derrière le canapé

  // — Cuisine —
  {title:'Nettoyer le plan de travail et l’évier', room:'cuisine', days:3, mins:5, pack:true},
  {title:'Nettoyer les plaques de cuisson', room:'cuisine', days:7, mins:5, pack:true},
  {title:'Changer les torchons et l’éponge', room:'cuisine', days:7, mins:2, pack:true},
  {title:'Nettoyer le micro-ondes', room:'cuisine', days:14, mins:5, pack:true},
  {title:'Nettoyer le frigo', room:'cuisine', days:30, mins:20, pack:true},
  {title:'Nettoyer les façades et les poignées', room:'cuisine', days:30, mins:10, pack:true},
  {title:'Nettoyer le filtre du lave-vaisselle', room:'cuisine', days:30, mins:10, pack:true},
  {title:'Nettoyer le four', room:'cuisine', days:60, mins:30, pack:true},
  {title:'Nettoyer le filtre de la hotte', room:'cuisine', days:60, mins:15, pack:true},
  {title:'Détartrer le lave-vaisselle', room:'cuisine', days:90, mins:5, pack:true},
  {title:'Nettoyer la bouche de VMC de la cuisine', room:'cuisine', days:90, mins:5, pack:true},
  {title:'Détartrer la bouilloire', room:'cuisine', days:60, mins:5, pack:false},
  {title:'Faire vérifier la chaudière', room:'cuisine', days:365, mins:60, pack:false},

  // — Salle de bain —
  {title:'Nettoyer le lavabo et le miroir', room:'sdb', days:4, mins:5, pack:true},
  {title:'Nettoyer la douche ou la baignoire', room:'sdb', days:7, mins:15, pack:true},
  {title:'Changer les serviettes et le tapis de bain', room:'sdb', days:7, mins:2, pack:true},
  {title:'Détartrer les robinets et le pommeau', room:'sdb', days:30, mins:15, pack:true},
  {title:'Nettoyer les joints', room:'sdb', days:30, mins:15, pack:true},
  {title:'Nettoyer la bouche de VMC de la salle de bain', room:'sdb', days:90, mins:5, pack:true},
  {title:'Trier la pharmacie', room:'sdb', days:180, mins:20, pack:true},

  // — WC —
  {title:'Nettoyer les WC', room:'wc', days:4, mins:5, pack:true},
  {title:'Nettoyer la bouche de VMC des WC', room:'wc', days:90, mins:5, pack:true},

  // — Salon —
  {title:'S’occuper des plantes', room:'salon', days:5, mins:10, pack:true},
  {title:'Dépoussiérer le salon', room:'salon', days:10, mins:10, pack:true},
  {title:'Laver les vitres', room:'salon', days:60, mins:20, pack:true},
  {title:'Tester le détecteur de fumée', room:'salon', days:180, mins:5, pack:true},
  {title:'Laver les rideaux', room:'salon', days:180, mins:30, pack:false},

  // — Chambre —
  {title:'Changer les draps', room:'chambre', days:10, mins:10, pack:true},
  {title:'Dépoussiérer la chambre', room:'chambre', days:14, mins:5, pack:true},
  {title:'Aérer et retourner le matelas', room:'chambre', days:180, mins:10, pack:false},

  // — Bureau — l'aspirateur robot y a sa base.
  {title:'Dépoussiérer le bureau', room:'bureau', days:14, mins:5, pack:true},
  {title:'Nettoyer l’écran et le clavier', room:'bureau', days:14, mins:5, pack:true},
  {title:'Trier les papiers', room:'bureau', days:30, mins:20, pack:true},
  {title:'Nettoyer les brosses et les capteurs du robot', room:'bureau', days:14, mins:10, pack:true},
  {title:'Changer le filtre du robot', room:'bureau', days:90, mins:5, pack:true},
  {title:'Vider le bac du robot', room:'bureau', days:3, mins:2, pack:false},

  // — Cellier — le lave-linge y vit.
  {title:'Nettoyer le bac à lessive', room:'cellier', days:30, mins:5, pack:true},
  {title:'Nettoyer le filtre du lave-linge', room:'cellier', days:60, mins:10, pack:true},
  {title:'Faire un lavage à vide et nettoyer le joint', room:'cellier', days:60, mins:10, pack:true},
  {title:'Ranger le cellier', room:'cellier', days:60, mins:20, pack:true},

  // — Balcon —
  {title:'Balayer le balcon', room:'balcon', days:14, mins:10, pack:true},
  {title:'Nettoyer la rambarde et le mobilier', room:'balcon', days:90, mins:20, pack:true},
  {title:'Arroser les jardinières', room:'balcon', days:3, mins:5, pack:false}
];
