# QA-IPHONE-V3 — checklist à dérouler sur l'iPhone réel

> Écrit au Lot V3-3. Complète `QA-IPHONE.md` (V1, toujours valable pour le socle : hors-ligne,
> pastille, persistance, wake lock) avec ce que la V3 a ajouté et que ni le test de fumée ni un
> navigateur de bureau ne savent vérifier : retour haptique, feuille de partage iOS, icône
> d'écran d'accueil, « Réduire les animations » du système, VoiceOver.
>
> Avant de commencer : Réglages de l'app → la version affichée doit être **Bêta 3.5**. Au premier
> lancement de cette version, un toast « MyLife est à jour : Bêta 3.5. » l'annonce.
> Le §9 (ajouté au Lot V3-5) couvre ce que ce lot a changé.

## 0. ⚠️ Avant toute réinstallation : exporter

Sur iPhone, **supprimer l'app de l'écran d'accueil efface ses données**. La seule façon de voir la
nouvelle icône (§1) est de la réinstaller : exporter d'abord (§6), importer ensuite.

## 1. Icône et installation

- [ ] (Après export, §0) Supprimer MyLife de l'écran d'accueil, rouvrir
      `https://megaxuu.github.io/mylife/` dans Safari → Partager → Sur l'écran d'accueil.
- [ ] L'icône est le **cacatoès rose sur sa branche verte, fond crème** — plus le « M » gris.
- [ ] Nette à la taille de l'écran d'accueil (pas floue, pas de bord blanc autour).
- [ ] Réglages → Données → Importer le fichier exporté : tout revient.

## 2. Maison et entretien du jour

- [ ] Maison vide → « Installer le pack maison » → 40 entretiens, aucune pièce vide.
- [ ] Maison ne déplie que l'« à faire », demain et après-demain ; « + N autres » déplie une pièce,
      « Réduire » la replie.
- [ ] Aujourd'hui → « Entretien du jour » ≈ 30 min ; cocher une ligne : la case **rebondit et la
      coche se trace**, la ligne reste barrée, « Annuler » la rétablit.
- [ ] Le samedi, « Passer la serpillière » est en tête du bloc.
- [ ] Taper « Nettoyer la voiture #partout tous les 30 jours après 45 min » dans la barre de saisie :
      toast « Entretien ajouté à Maison. », rien dans Tâches, la ligne dans Maison dit « 45 min ».

## 3. Repas

- [ ] Onglet Repas → Menus : régler la semaine type (2 pers. → 1 → Cantine → Ailleurs).
- [ ] Toucher un repas, choisir un plat, « Il en restera » : les restes tombent sur le prochain repas
      libre, « Annuler » les retire.
- [ ] Aujourd'hui : **un seul bloc teinté** avec « Ce soir : … » et « N articles à acheter ».

## 4. Mouvement

- [ ] Changer d'onglet : un fondu court, discret. La barre de saisie en bas **ne saute pas**
      pendant le fondu.
- [ ] Cocher une tâche dans Tâches : la case s'anime avant que la ligne ne quitte son groupe.
- [ ] Réglages iOS → Accessibilité → Mouvement → **Réduire les animations** activé : plus de
      fondu, plus de rebond, cocher agit instantanément, le balayage des lignes est désactivé
      (les boutons et les fiches restent le chemin). Désactiver ensuite.

## 5. Retour haptique (iOS 17.4 et plus)

- [ ] Réglages de l'app → interrupteur « Oiseaux » : il a l'aspect **natif iOS** et donne une
      petite vibration au basculement.
- [ ] Fiche d'une tâche → « Plus d'options » → « Ce soir » et « Récurrente » : même chose.
- [ ] Si l'interrupteur natif n'est pas net (vibration absente, couleur qui jure, taille qui
      décale la ligne) : le noter. Le repli sur l'ancien interrupteur tient en une ligne
      (`switchNative()`, `js/ui.js`) — ne pas laisser un demi-support.

## 6. Sauvegarde

- [ ] Réglages → Données → « Exporter mes données » : la **feuille de partage iOS** s'ouvre
      (Enregistrer dans Fichiers, AirDrop, Mail…). Enregistrer dans Fichiers.
- [ ] La carte Données dit ensuite « Dernière sauvegarde : aujourd'hui. ».
- [ ] « Annuler » dans la feuille de partage ne déclenche aucune erreur ni téléchargement.

## 7. Mode sombre

- [ ] Réglages de l'app → Apparence → Sombre : **les oiseaux restent**, le toucan est gris-brun
      (plus un trou noir), aucun jaune ne brûle l'écran.
- [ ] Écran Habitudes : les boutons « +10 » et « Fait » ont une forme visible (filet), pas du
      texte vert flottant.

## 8. VoiceOver (passage rapide)

- [ ] Tab bar : l'onglet courant est annoncé comme la page actuelle.
- [ ] Une puce de filtre ou d'apparence est annoncée « sélectionnée » quand elle l'est.
- [ ] Cocher une tâche : le toast « … : fait. » est lu sans avoir à aller le chercher.
- [ ] Ouvrir une fiche : elle est annoncée comme un dialogue portant son titre.
- [ ] Toucher n'importe où sur la hauteur d'une ligne (pas seulement sur le texte) ouvre sa fiche.

## 9. Le quotidien sans accroc (Lot V3-5)

Ce que le test de fumée ne peut pas vérifier : le vrai clavier iOS, le vrai balayage au doigt, le
vrai mode avion.

**Hors-ligne**
- [ ] Mode avion activé, quitter l'app (retour à l'écran d'accueil), attendre quelques secondes, la
      rouvrir : **aucun toast rouge** « Un souci inattendu est survenu ». Recommencer deux ou trois
      fois. (Avant ce lot, il s'affichait à chaque retour sans réseau.) Désactiver le mode avion.

**Saisie rapide** — taper dans la barre d'Aujourd'hui, regarder les puces avant de valider :
- [ ] « Appeler maman demain 18h » : une seule puce « Demain » ; la tâche s'appelle
      « Appeler maman 18h » (plus de puce « Long »).
- [ ] « Dîner chez Paul samedi soir » : puce « Samedi soir », la tâche arrive dans « Ce soir » samedi.
- [ ] « Rendre le rapport pour vendredi » : puce « Échéance vendredi ».
- [ ] « Piscine chaque lundi » : puce « Chaque lundi », le titre est « Piscine » (sans « chaque »).
- [ ] « Changer les draps toutes les deux semaines » : puce « Toutes les 2 semaines… ».
- [ ] « Préparer la réunion de vendredi » : **aucune** puce, le titre reste entier.
- [ ] Dictée vocale (micro du clavier) : « acheter du pain demain matin » → puce « Demain matin ».

**Reprogrammer**
- [ ] Aujourd'hui : balayer une tâche du bloc du jour **vers la droite** → fond vert « Demain », la
      ligne s'en va, toast « … : demain. » avec « Annuler », qui la ramène.
- [ ] Balayer une ligne d'« Entretien du jour » ou une échéance dépassée : **rien ne bouge** (voulu).
- [ ] Ouvrir une tâche : sous « Début », quatre puces sur **une seule ligne** (Aujourd'hui, Demain,
      Samedi, Lundi — un vendredi, « Samedi » n'apparaît pas, c'est déjà « Demain »). Toucher
      « Demain » l'allume ; le retoucher l'éteint et efface le début.

**Supprimer sans balayer**
- [ ] Réglages iOS → Accessibilité → Mouvement → **Réduire les animations** activé : ouvrir une tâche,
      puis un entretien (Maison) — chacun a un bouton **« Supprimer »**, qui demande confirmation puis
      propose « Annuler ». Désactiver ensuite.

**Lecture**
- [ ] Tâches : « Échéance vendredi », « Demain soir », « Depuis lundi », « Chaque mercredi » sur les
      lignes ; une échéance passée dit « Passée de N jours » en rouge ; le 1er du mois s'écrit « 1er ».
- [ ] Un toast long passé sur deux lignes ne commence jamais la seconde par « : ».
- [ ] Habitudes : chaque carte montre « Cette semaine » (sept cases, aujourd'hui souligné) ;
      « Voir le mois » déplie le mois, « Réduire » le replie.
- [ ] Fiche d'un repas : le plat prévu ce soir n'est pas proposé pour ce midi ; en tapant ses
      premières lettres, il revient.

**Courses**
- [ ] Taper « Oeufs » (le clavier iOS le transforme souvent en « Œufs ») : l'article va au rayon
      **Frais**, pas « Autre ». Un « Œufs » déjà présent dans la liste avant la mise à jour a été
      rangé à la bonne place au démarrage.

**Sauvegarde**
- [ ] Si le dernier export a plus de 30 jours : au démarrage, un toast « Dernière sauvegarde il y a
      N jours. » avec **« Exporter »**, qui ouvre la feuille de partage. Il ne revient pas avant une
      semaine, et jamais en même temps que « MyLife est à jour ».
