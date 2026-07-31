# QA-IPHONE — checklist à dérouler sur l'iPhone réel

> Écrit au Lot V1-12 (Polish & QA). À dérouler sur l'appareil réel après chaque mise en ligne
> importante — pas seulement à la sortie de la V1. Rien ici ne se vérifie correctement dans un
> simulateur ou un navigateur de bureau : service worker, pastille, mode avion, wake lock et
> persistance longue durée exigent un vrai iPhone.
>
> Avant de commencer : vérifier dans Réglages → À propos que la version affichée est bien la
> dernière (`Bêta 1.N`), et que Safari a bien rechargé (pas une page en cache — fermer l'onglet
> Safari avant d'ouvrir l'icône installée si un doute existe).

## 1. Installation

- [ ] Ouvrir `https://megaxuu.github.io/mylife/` dans Safari (pas Chrome iOS : le bandeau
      d'installation « Sur l'écran d'accueil » n'existe que dans Safari).
- [ ] Partager → Sur l'écran d'accueil. Le nom proposé est « MyLife », l'icône est le monogramme
      « M » (encore grise à ce stade — dette connue, Lot 12 §2).
- [ ] Lancer depuis l'icône installée (pas depuis Safari) : pas de barre d'adresse, pas de barre
      de navigation Safari — l'app occupe tout l'écran (`display: standalone`).
- [ ] La barre de statut a le bon aplat de fond (`#F3EEE5`, crème), pas une bande noire ou blanche
      qui jure avec le reste de l'écran.
- [ ] L'app démarre sur l'écran Aujourd'hui, sans flash de contenu blanc ni de mauvais thème avant
      le premier rendu.

## 2. Hors-ligne complet (mode avion)

- [ ] Ouvrir l'app une première fois connecté (pour laisser le service worker s'installer).
      Attendre quelques secondes, quitter l'app.
- [ ] Activer le mode avion.
- [ ] Relancer l'app depuis l'icône : elle doit s'ouvrir normalement, sans écran d'erreur réseau.
- [ ] Naviguer sur les 4 onglets (Aujourd'hui, Tâches, Maison, Courses) et ouvrir Réglages : tout
      doit fonctionner sans réseau — création de tâche, cochage, ouverture d'une fiche.
- [ ] Forcer la fermeture de l'app (double-tap Home / balayage vers le haut puis relâcher) et la
      rouvrir, toujours en mode avion : elle doit redémarrer sans accroc.
- [ ] Désactiver le mode avion en fin de test.

## 3. Pastille de l'icône (badge)

- [ ] Avec au moins une tâche/un entretien dû aujourd'hui, quitter l'app (bouton Home ou balayage) :
      une pastille numérique apparaît sur l'icône dans les secondes qui suivent.
- [ ] Le nombre correspond à ce que l'écran Aujourd'hui annonçait (échéances dépassées + bloc du
      jour + entretiens + habitudes encore à faire) — **pas** « si tu as 10 minutes », **pas** les
      courses (voir CLAUDE.md, `todayBadgeCount()`).
- [ ] Cocher tout ce qui reste depuis l'app, puis quitter à nouveau : la pastille disparaît
      (revient à zéro, donc invisible).
- [ ] Si rien n'est dû du tout, quitter l'app : aucune pastille ne doit apparaître.

## 4. Persistance après 48 h sans ouvrir l'app

- [ ] Noter l'état actuel (nombre de tâches ouvertes, une habitude cochée aujourd'hui, un article
      de courses ajouté).
- [ ] Ne pas ouvrir l'app pendant au moins 48 h (iOS peut décharger la PWA de la mémoire, voire la
      "tuer" en arrière-plan sans prévenir — c'est justement ce que ce test vérifie).
- [ ] Rouvrir : toutes les données sont intactes (rien n'est revenu à l'état par défaut, aucune
      tâche ni habitude perdue). C'est le test du couple `saveNow()` sur `pagehide` /
      `visibilitychange→hidden` (js/boot.js) — IndexedDB doit avoir tout reçu avant que iOS ne
      coupe l'app.

## 5. Photo de plante

- [ ] Maison → Ajouter une plante. Renseigner un nom, choisir une pièce.
- [ ] Tapoter la zone photo : le sélecteur iOS propose Appareil photo / Photothèque (attribut
      `capture="environment"`).
- [ ] Prendre une photo (ou en choisir une existante) : elle s'affiche dans la fiche avant même
      d'enregistrer.
- [ ] Enregistrer la plante, rouvrir sa fiche : la photo réapparaît (chargement depuis le store
      IndexedDB `photos`, asynchrone — un très bref instant sans image est normal).
- [ ] Remplacer la photo par une autre : l'ancienne est bien remplacée, pas superposée.
- [ ] Supprimer la plante : rouvrir Réglages → Données → Réinitialiser (sans aller jusqu'au bout)
      juste pour confirmer que rien ne bloque — puis annuler. (Vérifie indirectement qu'aucune
      erreur ne traîne côté store `photos`.)

## 6. Mode magasin et Wake Lock

- [ ] Avoir quelques articles dans Courses, dans au moins deux rayons.
- [ ] Basculer sur « Mode magasin » : les libellés grossissent, les cases à cocher aussi.
- [ ] Laisser l'écran seul, sans y toucher, pendant 60-90 secondes : l'écran de l'iPhone ne doit
      **pas** s'éteindre automatiquement (Wake Lock actif).
- [ ] Verrouiller manuellement l'iPhone (bouton latéral) puis le déverrouiller : revenir sur l'app,
      encore en mode magasin — l'écran doit à nouveau rester allumé (le Wake Lock est redemandé au
      retour visible, `visibilitychange`, js/shopping.js).
- [ ] Cocher un article : il descend en bas de son rayon, grisé, mais reste dans la liste (jamais
      retiré).
- [ ] Revenir sur « Liste » (désactiver le mode magasin) : l'écran peut à nouveau s'éteindre tout
      seul après le délai habituel — vérifier que ce n'est plus bloqué.

## 7. Glisser pour fermer une feuille

- [ ] Ouvrir n'importe quelle feuille modale (par exemple une fiche tâche).
- [ ] Poser le doigt sur la poignée en haut de la feuille et glisser lentement vers le bas de
      quelques centimètres puis relâcher **sans** aller jusqu'en bas : la feuille doit revenir à sa
      position d'origine, pas se fermer.
- [ ] Refaire le geste, cette fois plus franchement (au-delà d'environ un quart de la hauteur de la
      feuille, ou un petit glissé rapide) : la feuille se ferme.
- [ ] Vérifier aussi la fermeture par un tap en dehors de la feuille (sur le fond assombri), et par
      un bouton « Annuler »/« Fermer » quand il existe : les trois chemins doivent fonctionner.
- [ ] Si des réglages Accessibilité → Mouvement → Réduire les animations sont activés sur
      l'iPhone : le geste doit rester utilisable, seules les animations disparaissent (pas de saut
      brutal ni de feuille qui reste à moitié fermée).

## 8. Zone sûre en bas (safe area)

- [ ] Sur un iPhone à encoche/île dynamique : la tab bar ne doit pas être masquée par la barre de
      geste du bas, ni coller dessus — un espace clair sépare le dernier onglet du bord de l'écran.
- [ ] Ouvrir une feuille modale longue (par exemple la fiche tâche) et faire défiler jusqu'en bas :
      le dernier bouton (« Annuler ») n'est pas caché derrière la barre de geste.
- [ ] Le toast (message temporaire en bas d'écran) ne chevauche ni la tab bar ni la barre de geste.
- [ ] Faire pivoter en orientation paysage puis revenir en portrait (même si l'app est pensée
      portrait) : rien ne casse visuellement, la zone sûre reste respectée.

## 9. Mise à jour du service worker

- [ ] Avec l'app installée sur une version antérieure (ex. Bêta 1.11), publier la nouvelle version
      (Bêta 1.12) sur GitHub Pages et attendre au moins 10 minutes (cache Fastly, cf.
      CONVENTIONS.md §4).
- [ ] Rouvrir l'app installée : elle peut afficher une dernière fois l'ancienne version en tout
      premier affichage (le cache sert l'ancien pendant que le réseau rafraîchit), **mais** elle se
      recharge automatiquement dès que le nouveau service worker prend la main
      (`controllerchange`, js/boot.js) — pas besoin de forcer un rechargement manuel.
- [ ] Après ce rechargement automatique, vérifier dans Réglages → À propos que le numéro affiché
      est bien le nouveau (`Bêta 1.12`).
- [ ] Revenir au premier plan après avoir mis l'app en arrière-plan quelques minutes : si une
      nouvelle version est disponible entretemps, elle doit être détectée (`reg.update()` appelé à
      chaque retour visible) sans que rien ne casse si aucune mise à jour n'existe.

## 10. Export puis import

- [ ] Réglages → Données → Exporter mes données : iOS propose d'enregistrer ou de partager le
      fichier `mylife-AAAA-MM-JJ.json` — l'enregistrer dans Fichiers.
      **Depuis Safari, cette partie n'est pas testée par le test de fumée** (`URL.createObjectURL`
      n'existe pas sous jsdom) : c'est donc le premier vrai test de cet écran.
- [ ] Modifier quelque chose dans l'app (cocher une tâche, ajouter un article) pour que l'état
      diffère du fichier exporté.
- [ ] Réglages → Données → Importer des données → choisir le fichier tout juste exporté dans
      Fichiers.
- [ ] Confirmer l'avertissement (remplacement complet, irréversible) : l'app affiche « Import
      réussi. Redémarrage… » puis se recharge d'elle-même.
- [ ] Vérifier que l'état après import correspond exactement à celui du moment de l'export (la
      modification faite entretemps a bien disparu — c'est un remplacement intégral, pas une
      fusion).
- [ ] Répéter avec un fichier invalide (renommer un `.txt` quelconque en `.json`, ou éditer le
      JSON exporté pour casser sa structure) : l'import doit être rejeté proprement (toast
      d'erreur), **sans rien modifier** dans l'app.
- [ ] Note : les photos de plantes ne sont jamais dans l'export. Après un import, une plante qui
      avait une photo la perd (c'est documenté à l'écran) — vérifier que l'app ne plante pas pour
      autant sur sa fiche (juste « Ajouter une photo » à la place de l'image).

## 11. En cas d'anomalie

Noter l'écran, le geste exact et l'heure. La plupart des soucis d'affichage sur iPhone réel après
un déploiement viennent du cache : voir « Piège de test local » dans CLAUDE.md et le délai Fastly
d'environ 10 minutes après un `git push`. Si le souci persiste au-delà de 15-20 minutes après la
mise en ligne, c'est probablement un vrai bug.
