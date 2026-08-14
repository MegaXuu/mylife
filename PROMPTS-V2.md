# MyLife — Les 8 prompts de la V2

> **Mode d'emploi.** Un lot = une session neuve = un commit = une release. Colle le bloc
> `Prompt à coller`, laisse faire, vérifie les critères d'acceptation, puis donne (ou non) le feu
> vert au push. **Ne jamais enchaîner deux lots dans la même session.**
>
> Les prompts supposent `CLAUDE.md`, `CONVENTIONS.md` et **`ROADMAP-V2.md`** dans le dépôt.
>
> **⚠️ À ajouter mentalement à tout prompt V2 qui touche un écran :**
> *« Ouvre `maquettes/MyLife Canopée.html` et lis l'écran correspondant. La maquette fait toujours
> foi, SAUF sur les trois points levés par ROADMAP-V2.md §3.8 (Courses en liste continue, Tâches
> sans boutons de ligne, tab bar à cinq onglets). Sur tout le reste, elle gagne. »*

| Lot | Titre | Modèle | Validation | Statut |
|---|---|---|---|---|
| V2-1 | Socle d'interaction | Sonnet | — | fait |
| V2-2 | Navigation & saisie | Sonnet | — | à faire |
| V2-3 | « Aujourd'hui » v3 | Opus puis Sonnet | ⚑ | à faire |
| V2-4 | Tâches v2 | Sonnet | — | à faire |
| V2-5 | Maison & plantes v2 | Sonnet | — | à faire |
| V2-6 | Courses v2 | Sonnet | — | à faire |
| V2-7 | Habitudes v2 | Sonnet | — | à faire |
| V2-8 | Mouvement, finition, QA | Sonnet | — | à faire |

---

## Lot V2-1 — Socle d'interaction · Bêta 2.1 · Sonnet

### Prompt à coller

```
Lot V2-1 « Socle d'interaction » de MyLife. Lis d'abord CONVENTIONS.md en entier, puis
ROADMAP-V2.md sections 2 (audit), 3 (arbitrages) et 6 (checklist).

Ce lot ne change aucun écran visuellement. Il pose la couche que les lots V2-4, V2-5 et V2-6
consommeront, et corrige trois défauts francs. Périmètre exact, rien de plus :

1. NOUVEAU FICHIER js/gestures.js — 18e fichier du projet. Balayage horizontal sur les lignes.
   - Un seul écouteur délégué au niveau document (Pointer Events), pas un par ligne : les
     écrans se re-rendent entièrement en innerHTML à chaque action, des écouteurs par ligne
     fuiraient à chaque rendu.
   - Une ligne est balayable si elle porte data-swipe-left="fn(...)" et/ou
     data-swipe-right="fn(...)". Le nom de fonction est évalué comme un onclick l'est déjà
     ailleurs dans le projet (portée globale unique, cf. CONVENTIONS.md §1).
   - Comportement : suivre le doigt en translateX sur la ligne, révéler dessous un fond
     d'action avec son libellé. Au relâchement, déclencher si le déplacement dépasse 33 % de
     la largeur OU si la vélocité dépasse 0,5 px/ms — mêmes seuils que le glisser de feuille
     déjà écrit dans js/ui.js (endSheetDrag), reprends-les pour rester cohérent.
   - ABANDONNER le geste dès que le déplacement vertical dépasse le déplacement horizontal :
     le défilement de la page doit toujours gagner. C'est la règle qui fait qu'un balayage
     est agréable ou insupportable.
   - Ne rien faire du tout si prefers-reduced-motion est actif : les boutons et les fiches
     restent le chemin, le balayage n'est jamais le SEUL chemin vers une action.
   - Couleurs : le fond d'action « supprimer » utilise --due en CONTOUR ou en texte, jamais un
     aplat rouge (discipline chromatique, CLAUDE.md). Le fond d'action positif utilise --act.

2. js/ui.js — helper undoable(msg, undoFn). Il enveloppe toast() avec une action « Annuler »
   déjà câblée, pour que les lots suivants n'aient pas à réécrire le motif à chaque fois.
   Signature : undoable(message, fonctionDAnnulation). Réutilise toast(msg, {action:{...}}) tel
   quel, ne le duplique pas.

3. js/ui.js — helper rowAttrs(onTap, opts) qui produit les attributs communs d'une ligne
   cliquable : role="button", tabindex="0", onclick, et onkeydown qui déclenche sur Entrée et
   sur Espace. Toutes les lignes cliquables de l'app passeront par lui.
   Applique-le dès maintenant aux <li onclick> et <div class="row-main" onclick> existants de
   js/maison.js, js/today.js, js/tasks.js et js/shopping.js — ils ne sont aujourd'hui ni
   focusables au clavier ni annoncés comme contrôles par VoiceOver (audit D3).

4. index.html — corriger `button,input{font:inherit;color:inherit;}` en
   `button,input,textarea,select{font:inherit;color:inherit;}`. Vérifié : les <textarea> de la
   fiche tâche et de la fiche plante s'affichent aujourd'hui en monospace (audit D1).

5. js/settings.js — applyTheme() pose aussi le <meta name="theme-color"> :
   #F3EEE5 en clair, #17140F en sombre (les valeurs exactes de --bg dans les deux modes).
   Aujourd'hui le bandeau système de la PWA installée reste crème au-dessus d'une app noire
   (audit D2).

6. index.html — CSS des fonds d'action de balayage. Aucune autre règle nouvelle.

Contraintes :
- js/gestures.js est le 18e fichier : mets à jour LES TROIS LISTES MIROIR (balises <script>
  d'index.html, ASSETS de sw.js, FILES de test.mjs). Place-le après js/ui.js et avant
  js/recur.js — il ne dépend que de ui.js.
- test.mjs : ajoute des cas pour undoable() et pour rowAttrs() (présence de role/tabindex sur
  les lignes des quatre écrans). Le balayage lui-même n'est pas testable sous jsdom : ne
  tente pas de le simuler, contente-toi de vérifier que gestures.js se charge sans erreur.
- CACHE = 'mylife-b2-1', APP_VERSION = 'Bêta 2.1'.
- Déroule la checklist de ROADMAP-V2.md §6 et produis un court compte rendu à la fin.
```

### Critères d'acceptation
- [ ] `npm test` passe ; `node --check` propre sur les fichiers touchés.
- [ ] Les trois listes miroir contiennent bien **18** fichiers dans le même ordre.
- [ ] Les notes de la fiche tâche s'affichent dans la police de l'app, plus en monospace.
- [ ] En mode sombre, `<meta name="theme-color">` vaut `#17140F`.
- [ ] Une ligne de Maison est atteignable au `Tab` et s'active à `Entrée`.
- [ ] Avec `prefers-reduced-motion` actif, aucun balayage ne se déclenche.

---

## Lot V2-2 — Navigation & saisie · Bêta 2.2 · Sonnet

### Prompt à coller

```
Lot V2-2 « Navigation & saisie » de MyLife. Lis CONVENTIONS.md, puis ROADMAP-V2.md §3.1, §3.2
et §2 (points A1 et A3).

Ce lot corrige les deux défauts de parcours les plus coûteux de l'app. Périmètre exact :

1. CINQ ONGLETS. index.html — la tab bar passe à Aujourd'hui · Tâches · Maison · Courses ·
   Habitudes. Dessine l'icône Habitudes dans le même style que les quatre autres (SVG inline,
   viewBox 0 0 24 24, trait 2 px, terminaisons rondes, fill="none", currentColor). Vérifie que
   les cinq libellés tiennent sur un iPhone SE (375 px) sans troncature : si nécessaire, baisse
   --fs-tab, ne tronque pas.
   Raison : vérifié à l'audit, l'écran Habitudes n'est atteignable QUE par l'en-tête de la carte
   « Habitudes du jour », qui n'existe que s'il y a déjà une habitude active. Une installation
   neuve ne peut jamais créer sa première habitude (audit A3).

2. js/habits.js — renderHabits() doit fonctionner avec zéro habitude : un emptyState qui invite
   à en créer une, et le bouton « Ajouter une habitude » atteignable SANS défiler. Aujourd'hui
   il est rendu après toutes les cartes.
   L'en-tête de la carte d'Aujourd'hui reste un chemin vers l'écran (c'est un raccourci
   contextuel, pas un second chemin visible vers une action — principe 5 tenu).

3. BARRE DE SAISIE COLLÉE. La barre de capture (js/nlp.js, captureBarHtml) sur Aujourd'hui et
   Tâches, et le champ d'ajout de Courses (js/shopping.js), deviennent collés juste au-dessus de
   la tab bar, toujours visibles quelle que soit la position de défilement.
   - position:fixed, bottom calé sur la hauteur de la tab bar + env(safe-area-inset-bottom).
   - Le padding-bas de .app augmente d'autant pour que le dernier élément de liste ne passe
     jamais sous la barre.
   - La barre doit rester visible quand le clavier iOS est levé : cale-toi sur la tab bar
     existante, qui gère déjà ce cas — ne réinvente pas de gestion de viewport visuel.
   - Vérifie le comportement quand une feuille modale est ouverte : la barre doit passer
     DERRIÈRE le scrim (z-index inférieur à .sheet-bg, qui est à 50).
   Raison mesurée : Aujourd'hui fait 2,4 écrans de haut avec un jeu de données modeste, Courses
   2,3. La saisie est aujourd'hui rendue après tout le contenu (audit A1).

4. js/ui.js — go(name) mémorise la position de défilement de l'écran qu'on quitte et la restaure
   quand on y revient. Aujourd'hui go() fait window.scrollTo(0,0) inconditionnellement : revenir
   de Courses vers Aujourd'hui puis retourner à Courses fait tout remonter.
   Garde le retour en haut quand on retape l'onglet DÉJÀ actif — c'est la convention iOS.

Contraintes :
- Aucun fichier nouveau. Les trois listes miroir restent à 18.
- test.mjs : la tab bar a cinq boutons ; go('habits') fonctionne avec S.habits vide et rend un
  état vide ; la mémorisation de défilement est testée sur la valeur stockée, pas sur le DOM
  (jsdom ne défile pas).
- CACHE = 'mylife-b2-2', APP_VERSION = 'Bêta 2.2'.
- Checklist ROADMAP-V2.md §6, puis compte rendu.
```

### Critères d'acceptation
- [ ] Sur une base vierge, on peut créer une habitude sans jamais avoir eu d'habitude.
- [ ] Le champ d'ajout est visible sur Aujourd'hui, Tâches et Courses **sans défiler**, à n'importe quelle position.
- [ ] Aucune ligne de liste ne finit cachée sous la barre collée, en bas de page.
- [ ] Une feuille modale recouvre bien la barre collée.
- [ ] Les cinq libellés d'onglet tiennent sur 375 px.

---

## Lot V2-3 ⚑ — « Aujourd'hui » v3 · Bêta 2.3 · Opus puis Sonnet

> **Lot en deux temps.** Le premier prompt produit une maquette autonome à valider. Le code n'est
> écrit qu'après ton accord — c'est la leçon du Lot V1-5.

### Prompt 1 — la maquette (Opus)

```
Lot V2-3 « Aujourd'hui v3 » de MyLife, PREMIER TEMPS : la maquette, pas de code d'application.

Lis CONVENTIONS.md, ROADMAP-V2.md §2 (A2, B3, C1) et §3.6, puis maquettes/today.html et
maquettes/today-vide.html (les maquettes validées du Lot V1-5), et enfin js/today.js.

Produis maquettes/today-v2.html et maquettes/today-v2-vide.html : autonomes, sans script, tout
le CSS inline dans le fichier, exactement comme les deux maquettes du Lot V1-5.

Ce qui doit changer par rapport à la V1, et rien d'autre :

1. SUR-TITRE PERSONNALISÉ — « Bonjour Florian · Vendredi 14 août ». Le prénom est demandé à
   l'accueil depuis le Lot V1-11 et n'est affiché nulle part (audit C1). Sobre : pas de
   salutation selon l'heure, pas d'emoji, pas de phrase. Prévois le cas où aucun prénom n'est
   posé : le sur-titre redevient la date seule.

2. LES SOINS DE PLANTES NE DOIVENT PLUS DISPARAÎTRE. Vérifié à l'audit : les soins sont
   concaténés APRÈS les tâches dans todayBuckets().scheduled, puis l'ensemble est tronqué à
   settings.todayCap. Avec 7 tâches et 4 soins dus, les 4 soins étaient tous repliés dans
   « + 4 autres » (audit B3). Propose une disposition qui règle ça — entrelacement par urgence,
   quota réservé, ou sous-groupe visible : c'est toi qui arbitres, mais justifie le choix en
   une phrase dans un commentaire du fichier.

3. UNE LIGNE COCHÉE DOIT POUVOIR ÊTRE DÉCOCHÉE. Aujourd'hui la case d'une ligne faite est
   `disabled` : l'action principale de l'app n'a aucun retour arrière (audit A2). Dessine
   l'état « fait, décochable ».

4. LE BLOC HABITUDES, saisie revue. Aujourd'hui, noter 30 minutes de marche demande de taper
   dans un champ de 64 px avec le clavier iOS (audit B8). Dessine une saisie où l'objectif se
   pose en un geste : pas adapté à la valeur cible, et un moyen direct de dire « objectif
   atteint ». La règle du Lot V1-8 tient toujours : jamais « Sauter » et deux boutons d'ajout
   sur la même ligne.

5. LA BARRE DE SAISIE EST COLLÉE en bas (posée au Lot V2-2) : dessine-la à sa nouvelle place,
   au-dessus de la tab bar.

Contraintes de dessin :
- Discipline chromatique de CLAUDE.md : le vert dit « un doigt peut agir », le rouge pur dit
  « une échéance réelle est dépassée », tout le reste est neutre chaud. Toute autre couleur est
  un bug de design.
- Un seul niveau d'élévation. Les variables :root de « Canopée » telles quelles, sans en
  inventer.
- Le bloc du jour reste la seule liste posée hors carte : c'est ce qui le rend dominant.
- Un seul oiseau, sur le bord supérieur d'une carte.

Ne touche à AUCUN fichier de js/ ni à index.html. Présente-moi les deux maquettes et attends
mon accord.
```

### Prompt 2 — le code (Sonnet, après validation)

```
Lot V2-3 « Aujourd'hui v3 » de MyLife, SECOND TEMPS : coder la maquette validée.

Lis CONVENTIONS.md, ROADMAP-V2.md §2 et §3, puis maquettes/today-v2.html et
maquettes/today-v2-vide.html — elles font foi, y compris contre le code existant.

Périmètre : js/today.js, le bloc du jour de js/habits.js, le CSS correspondant dans index.html.
Rien d'autre.

Règles de fond à respecter, elles n'ont pas changé :
- todayBuckets() reste LE seul endroit où se décide ce qui compte, écrit en cascade : chaque
  filtre retire ce que le précédent a pris. Un item ne doit JAMAIS apparaître dans deux blocs.
  Le test de fumée le vérifie explicitement — ne le contourne pas, fais-le passer.
- todayBadgeCount() ne compte que les dus : « Si tu as 10 minutes » et le bouton Courses n'y
  entrent pas.
- Le principe 6 tient : quand c'est bon, l'app le dit et ne propose RIEN d'autre.

Ce qui change :
1. Prénom dans le sur-titre (S.settings.userName), avec repli sur la date seule.
2. Les soins de plantes ne peuvent plus tomber sous le plafond todayCap — implémente la
   disposition retenue dans la maquette.
3. todayDone() devient annulable : appelle undoable() (js/ui.js, Lot V2-1), et la case d'une
   ligne faite redevient actionnable pour décocher. Attention : completeTask() (js/recur.js)
   historise et avance l'échéance — le décochage doit défaire les trois effets (history,
   doneAt/due, postponed). Écris untickToday() proprement plutôt que de bricoler à l'envers.
4. Bloc Habitudes : la saisie de la maquette validée.

test.mjs : étends les scénarios d'Aujourd'hui existants (helper scenario()) — absence de doublon
toujours vérifiée, soins de plantes présents malgré un plafond bas, décochage qui rend
exactement l'état d'avant complétion. Les scénarios doivent restaurer S.tasks derrière eux comme
aujourd'hui.

CACHE = 'mylife-b2-3', APP_VERSION = 'Bêta 2.3'. Checklist §6, puis compte rendu.
```

### Critères d'acceptation
- [ ] Avec 12 tâches du jour et 3 soins dus, les soins sont visibles sans déplier « + N autres ».
- [ ] Cocher puis décocher une tâche récurrente rend exactement l'état d'avant (`history`, `due`, `doneAt`).
- [ ] Sans prénom posé, le sur-titre est la date seule.
- [ ] Noter 30 min de marche se fait sans ouvrir le clavier.
- [ ] Le test de non-doublon de `todayBuckets()` passe toujours.

---

## Lot V2-4 — Tâches v2 · Bêta 2.4 · Sonnet

### Prompt à coller

```
Lot V2-4 « Tâches v2 » de MyLife. Lis CONVENTIONS.md, ROADMAP-V2.md §2 (A5, C2, C3) et §3.3,
§3.5. Le Lot V2-1 a posé js/gestures.js, undoable() et rowAttrs() — utilise-les, ne les
réécris pas.

Périmètre : js/tasks.js et le CSS correspondant. Rien d'autre.

1. BALAYAGE À LA PLACE DES BOUTONS DE LIGNE.
   Retire les boutons permanents « > » (reporter) et « × » (supprimer) de taskRowHtml().
   Vérifié à l'audit : ce sont eux qui écrasent les titres sur deux lignes (« Acheter un cadeau
   pour Léa » passe à la ligne à cause d'eux).
   À la place : balayage vers la gauche = supprimer, vers la droite = reporter à demain.
   Les deux actions restent atteignables autrement — dans la fiche tâche — donc le balayage ne
   crée aucun chemin exclusif (ROADMAP-V2.md §3.3).
   La suppression passe par confirmSheet() comme aujourd'hui, puis undoable().
   Le report devient annulable lui aussi (il ne l'était pas).

2. FICHE TÂCHE EN DIVULGATION PROGRESSIVE.
   Mesuré : 1 285 px, 11 sections toujours dépliées, alors que la grande majorité des tâches
   n'a besoin que d'un titre et d'une date (audit A5).
   Visible d'emblée : Titre, Début, Échéance, et le bouton Enregistrer.
   Derrière un « Plus d'options » replié : Notes, Catégorie, Pièce, Ce soir, Priorité, Effort,
   Récurrente + son bloc, Bucket.
   La section se déplie automatiquement à l'ouverture SI la tâche a déjà une valeur non par
   défaut dans l'un de ces champs — sinon on cacherait à l'utilisateur ce qu'il a lui-même
   posé.
   Attention : chaque setter (setTsCat, setTsPrio…) appelle refreshTaskSheet() qui remplace
   tout l'innerHTML de la feuille. L'état déplié/replié doit survivre à ce re-rendu : stocke-le
   dans _tSheet, pas dans le DOM.

3. GROUPE « FAIT » REPLIABLE — et settings.hideDone enfin utilisé.
   Vérifié : hideDone est déclaré dans defaults() et lu NULLE PART (audit C2). Conséquence,
   aucun écran de l'app ne montre ce qui a été fait, et une tâche cochée sur Tâches disparaît
   sans toast ni annulation.
   Ajoute en bas de renderTaskGroups() un groupe « Fait aujourd'hui » (et « Fait cette
   semaine » s'il y a plus loin), replié par défaut, dont l'état est piloté par
   settings.hideDone. Une ligne y est décochable — même exigence de réversibilité qu'au Lot
   V2-3, réutilise la même fonction de décochage.
   L'entretien n'y entre JAMAIS : une tâche room + repeat.from:'done' garde toujours un doneAt
   par construction, elle vit dans Maison. Filtre-la explicitement, sinon le groupe « Fait »
   se remplira de tous les entretiens de la maison à chaque rendu.
   doneTask() devient annulable via undoable().

4. INDICATEUR DE NOTES. Les notes sont stockées et cherchables mais jamais affichées ni
   signalées (audit C3). Ajoute un indicateur discret sur la ligne quand t.notes est non vide —
   une icône de 14 px dans .row-meta, dans le style d'icône du projet. Pas d'extrait de texte.

5. RECHERCHE ET FILTRES QUI NE PRENNENT PAS LA PLACE POUR RIEN.
   Aujourd'hui le champ de recherche et les cinq chips de catégorie occupent ~180 px en haut de
   l'écran en permanence, y compris avec trois tâches. Fais-les apparaître seulement quand ils
   servent — par exemple au-delà d'un seuil de tâches ouvertes, ou derrière une icône de
   recherche dans l'en-tête. Arbitre, et justifie en une ligne de commentaire.

test.mjs : le groupe « Fait » ne contient jamais d'entretien ; hideDone pilote bien le repli ;
la fiche tâche s'ouvre dépliée sur une tâche qui a une catégorie non par défaut ; le report est
annulable.

CACHE = 'mylife-b2-4', APP_VERSION = 'Bêta 2.4'. Checklist §6, puis compte rendu.
```

### Critères d'acceptation
- [ ] Aucun titre de tâche ne passe à la ligne à cause de boutons de ligne.
- [ ] La fiche d'une tâche neuve tient en un écran, sans défiler.
- [ ] Une tâche cochée sur Tâches est retrouvable et décochable dans « Fait aujourd'hui ».
- [ ] Aucun entretien n'apparaît dans « Fait ».
- [ ] Reporter et supprimer sont tous deux annulables.

---

## Lot V2-5 — Maison & plantes v2 · Bêta 2.5 · Sonnet

### Prompt à coller

```
Lot V2-5 « Maison & plantes v2 » de MyLife. Lis CONVENTIONS.md, ROADMAP-V2.md §2 (A4, B1, B2,
B4, C4) et §3.7. Le Lot V2-1 a posé undoable() et rowAttrs().

Périmètre : js/maison.js, js/plants.js, gaugeWidth()/gaugeColor() dans js/ui.js, le CSS
correspondant. Rien d'autre.

1. UN BOUTON D'ACTION EXPLICITE PAR LIGNE — c'est le cœur du lot.
   Constat : careRowHtml() produit la MÊME ligne pour un entretien et pour un soin de plante,
   avec deux comportements opposés. Un tap sur « Passer l'aspirateur » complète immédiatement,
   sans confirmation ni retour arrière — un frôlement efface la date réelle du dernier
   entretien. Un tap sur « Monstera (arrosage) » ouvre une fiche de 700 px où il faut chercher
   le bouton « Arrosé » (audit A4).
   Nouvelle règle, identique pour les deux : un bouton d'action à droite de la ligne
   (« Fait », « Arrosé »), et le RESTE de la ligne ouvre le détail.
   - Le bouton agit immédiatement et appelle undoable() — annuler doit restaurer le doneAt
     précédent ET retirer l'entrée ajoutée à history par completeTask().
   - Arroser passe ainsi de 4 gestes à 1, et compléter un entretien cesse d'être accidentel.
   - Cible tactile 44 px, comme partout.

2. LA LÉGENDE DOIT DIRE CE QU'IL FAUT FAIRE, PAS CE QUI S'EST PASSÉ.
   Constat : « Monstera (rempotage) · Il y a 300 jours » avec une jauge VERTE, juste au-dessus
   de « Passer l'aspirateur · Il y a 6 jours » en ROUGE (audit B2). Le nombre de jours absolu
   est inutilisable sans connaître l'intervalle.
   Remplace maisonAgo()/careAgo() dans la légende par un texte tourné vers l'action :
   « À faire », « Dans 3 j », « Dans 2 semaines ». Le vocabulaire de CONVENTIONS.md §3 tient :
   jamais « en retard », jamais « manqué » — l'entretien se mesure en fraîcheur.
   La date réelle du dernier passage reste disponible dans le détail : on ne la perd pas, on
   cesse de l'afficher là où elle induit en erreur.

3. LA JAUGE DOIT REDEVENIR DISCRIMINANTE.
   Constat : gaugeWidth() a un plancher à 4 %, donc « dû depuis 1 jour » et « dû depuis
   30 jours » sont le même pixel rouge ; trois lignes d'entretien = trois points identiques
   (audit B1).
   Le plancher a une bonne raison — une pilule vide passe pour une donnée manquante — mais il
   écrase toute l'information sous le seuil. Trouve une solution qui garde la lisibilité de
   l'état « à faire » ET distingue les degrés de retard. Justifie ton choix en commentaire.
   Contrainte non négociable : la rampe de couleur reste celle de gaugeColor(), du vert --g-ok
   vers l'argile --g-low, et les barres de quota d'habitudes ne rougissent JAMAIS.

4. LA JAUGE AGRÉGÉE DE PIÈCE.
   Constat : c'est le minimum de ses éléments, donc elle est rouge dès qu'un seul est dû, et
   elle répète l'information de la ligne juste en dessous (audit B4). Soit tu la rends
   informative (proportion d'éléments frais, par exemple), soit tu la remplaces par un simple
   compteur, soit tu la retires. Arbitre et justifie.

5. ÉDITION ET SUPPRESSION D'UN ENTRETIEN — dette V1 explicitement listée dans CLAUDE.md.
   Aujourd'hui, un entretien créé par erreur depuis entretienSheet() ne peut être ni corrigé ni
   supprimé autrement que par un aller-retour export/import JSON.
   Ouvrir le détail d'une ligne d'entretien doit mener à sa fiche — réutilise taskSheet() du
   Lot V1-3, qui sait déjà tout éditer, y compris la récurrence. Vérifie que l'enregistrement
   depuis Maison rappelle bien rerender() et pas renderTasks() en dur.

6. FICHE PLANTE ALLÉGÉE. Elle empile aujourd'hui identité, espèce, pièce, deux intervalles par
   soin, rempotage, trois jauges avec leurs boutons, historique et notes. Applique la même
   divulgation progressive qu'au Lot V2-4 : ce qui sert au quotidien visible, le réglage des
   intervalles derrière un repli.

test.mjs : annuler une complétion d'entretien restaure doneAt ET history ; la légende d'un soin
suspendu (cold:0) n'affiche toujours rien ; taskSheet() ouvert depuis Maison rafraîchit Maison.

CACHE = 'mylife-b2-5', APP_VERSION = 'Bêta 2.5'. Checklist §6, puis compte rendu.
```

### Critères d'acceptation
- [ ] Un tap au milieu d'une ligne n'a plus jamais d'effet destructif.
- [ ] Arroser une plante depuis Maison se fait en un geste.
- [ ] Deux entretiens dus depuis 2 et 40 jours se distinguent à l'œil.
- [ ] Un entretien créé par erreur se supprime depuis l'écran Maison.
- [ ] Annuler une complétion restaure `doneAt` **et** `history`.

---

## Lot V2-6 — Courses v2 · Bêta 2.6 · Sonnet

### Prompt à coller

```
Lot V2-6 « Courses v2 » de MyLife. Lis CONVENTIONS.md, ROADMAP-V2.md §2 (B7, D5) et §3.8 —
en particulier l'encadré « Amendement à l'arbitrage du 27/07/2026 ». Le Lot V2-1 a posé
js/gestures.js et undoable() ; le Lot V2-2 a collé le champ d'ajout en bas.

Périmètre : js/shopping.js, data/rayons.js, le CSS correspondant. Rien d'autre.

1. LISTE CONTINUE À EN-TÊTES COLLÉS — c'est le cœur du lot, et c'est un écart ASSUMÉ vis-à-vis
   de maquettes/MyLife Canopée.html, autorisé par ROADMAP-V2.md §3.8. Ne « corrige » pas vers
   la maquette.
   Constat mesuré : 14 articles produisent 8 cartes de rayon et 2,3 écrans de haut ; un rayon à
   un seul produit occupe ~230 px (audit B7).
   Remplace shopRayonCard() par une liste unique où l'en-tête de rayon reste collé en haut
   pendant le défilement (position:sticky). On sait toujours dans quel rayon on est — ce qui
   compte précisément quand on est debout dans le magasin.
   Objectif chiffré : la même liste de 14 articles doit tenir en un peu plus d'un écran.

2. MODE MAGASIN REPENSÉ AUTOUR DE L'EN-TÊTE COLLANT.
   Ce qui ne change pas : gros libellés, cases larges, Wake Lock avec garde de disponibilité,
   coché = grisé EN BAS de son rayon et jamais retiré (on doit pouvoir décocher une erreur),
   vidage des cochés explicite et jamais automatique.
   Ce qui s'ajoute : l'en-tête collant porte le reste à prendre dans ce rayon, et la progression
   globale est lisible sans défiler. Un rayon entièrement coché doit se signaler.

3. BALAYAGE. Vers la gauche = supprimer l'article (avec undoable). Vers la droite = cocher.
   Le tap sur la ligne continue d'ouvrir shopItemSheet(), la case continue de cocher : le
   balayage double des chemins existants, il n'en crée aucun d'exclusif.

4. DICTIONNAIRE. data/rayons.js : « pate »/« pates » renvoie aujourd'hui « frais » (pâtes
   fraîches), alors que l'usage courant est le paquet de pâtes sèches — bascule vers
   epicerie-salee et ajoute « pates fraiches » comme clé à deux mots pour le cas inverse : le
   mécanisme de guessRayon() cherche par groupes de mots du plus long au plus court, il gérera.
   Passe le dictionnaire en revue à la recherche d'autres cas du même genre (un mot générique
   dont le sens le plus courant a été perdu au profit d'un cas particulier) et corrige-les.
   Ne touche pas au mécanisme lui-même : guessRayon() est correct et testé.

test.mjs : guessRayon('Pâtes') = epicerie-salee ; guessRayon('Pâtes fraîches') = frais ; les
tests existants sur les corrections mémorisées par libellé et sur l'ordre des rayons passent
toujours (l'ordre des rayons reste piloté par settings.rayonOrder, la liste continue ne change
rien à ça).

CACHE = 'mylife-b2-6', APP_VERSION = 'Bêta 2.6'. Checklist §6, puis compte rendu.
```

### Critères d'acceptation
- [ ] 14 articles tiennent en ~1 écran au lieu de 2,3.
- [ ] En défilant, on sait toujours dans quel rayon on se trouve.
- [ ] `guessRayon('Pâtes')` renvoie `epicerie-salee`, `guessRayon('Pâtes fraîches')` renvoie `frais`.
- [ ] Le Wake Lock et le décochage d'une erreur fonctionnent toujours en mode magasin.
- [ ] `settings.rayonOrder` pilote toujours l'ordre.

---

## Lot V2-7 — Habitudes v2 · Bêta 2.7 · Sonnet

### Prompt à coller

```
Lot V2-7 « Habitudes v2 » de MyLife. Lis CONVENTIONS.md (en particulier §6, la frontière
entretien / habitude) et ROADMAP-V2.md §2 (B5, B6, B8).

Périmètre : js/habits.js et le CSS correspondant. Rien d'autre.

Rappel de la frontière, elle ne bouge pas : une habitude se mesure en SÉRIE et en QUOTA, jamais
en jauge de fraîcheur. js/habits.js ne réutilise pas js/recur.js, à dessein. Les barres de quota
ne rougissent jamais (--g-hab).

1. LE CALENDRIER DOIT DEVENIR LISIBLE.
   Constat : habitCalendarHtml() produit une grille de carrés sans nom de mois, sans en-tête de
   jours, sans numéros — indéchiffrable — et laisse ~400 px de vide sous le mois en cours
   (audit B6).
   Ajoute le nom du mois, l'en-tête des sept jours (L M M J V S D), et rends chaque jour
   identifiable. Donne au bloc une hauteur stable quelle que soit la position dans le mois : la
   carte ne doit pas changer de taille du 1er au 31.
   Les QUATRE états restent quatre — fait / partiel / sauté / inactif — et il n'y en aura
   jamais un cinquième « manqué » : CONVENTIONS.md §3 proscrit tout ton culpabilisant, un jour
   silencieux se lit « inactif », jamais comme un reproche.

2. LA MÉTA DOIT SE LIRE D'UN COUP D'ŒIL.
   Constat : « Lun, Mar, Mer, Jeu, Ven, Sam, Dim · 2 L / jour · Série 4 j · Record 0 j · 0 %
   sur 30 jours » sur trois lignes (audit B5). Éclate-la : la planification et l'objectif d'un
   côté, les trois chiffres de régularité de l'autre, chacun avec son libellé court. Pas de
   nouveau chiffre, pas de score, pas de rang — CONVENTIONS.md §3.

3. SAISIE RAPIDE PAR PAS ADAPTÉ.
   Constat : au-delà de HAB_STEP_MAX (10), le seul contrôle est un champ numérique de 64 px qui
   lève le clavier iOS (audit B8). Noter 30 minutes de marche est le geste le plus pénible de
   l'app.
   Fais dépendre le pas de l'objectif plutôt que d'un seuil binaire (un objectif de 30 min
   avance par 10, un objectif de 2 L par 1…), et donne un moyen direct de poser « objectif
   atteint ». Le champ numérique reste disponible pour une valeur exacte, il cesse d'être le
   seul chemin.
   Règle du Lot V1-8 toujours valable : jamais « Sauter » et deux boutons d'ajout sur la même
   ligne.
   Applique la même saisie au bloc d'Aujourd'hui et à l'écran Habitudes — c'est le même geste,
   il ne doit pas exister en deux versions.

4. ÉCRAN HABITUDES. Il a maintenant son onglet (Lot V2-2). Vérifie qu'il se tient debout tout
   seul : état vide utile, bouton d'ajout accessible sans défiler, et le balayage de
   js/gestures.js sur les lignes si ça a du sens ici.

5. NOTE SUR habitBestStreak() — signalé à l'audit, à traiter si c'est rapide, à laisser sinon :
   le record se calcule en partant de h.createdAt, donc une habitude dont le journal contient
   des jours antérieurs à sa création peut afficher un record inférieur à sa série en cours.
   Cas rare (import de données, essentiellement). Ne réécris pas le moteur pour ça : si la
   correction ne tient pas en quelques lignes, note-la en dette et passe.

test.mjs : les scénarios d'habitudes existants (helper habitScenario()) passent toujours — jour
sauté neutre, progression partielle, quota hebdomadaire, intégration à todayBuckets() et à
l'état vide. Ajoute : le calendrier a une hauteur de cellules constante quel que soit le jour du
mois ; le pas de saisie suit bien l'objectif.

CACHE = 'mylife-b2-7', APP_VERSION = 'Bêta 2.7'. Checklist §6, puis compte rendu.
```

### Critères d'acceptation
- [ ] On peut lire le calendrier et dire de quel jour il s'agit.
- [ ] La carte d'une habitude ne change pas de hauteur entre le 1er et le 31 du mois.
- [ ] Noter 30 min de marche se fait sans clavier, depuis Aujourd'hui **et** depuis Habitudes.
- [ ] Toujours quatre états, jamais un « manqué ».
- [ ] Les barres de quota restent `--g-hab` en toute circonstance.

---

## Lot V2-8 — Mouvement, finition, QA · Bêta 2.8 · Sonnet

### Prompt à coller

```
Lot V2-8 « Mouvement, finition, QA » de MyLife. Dernier lot du cycle V2. Lis CONVENTIONS.md en
entier et ROADMAP-V2.md §3.4 et §6.

AUCUNE fonctionnalité nouvelle, aucun écran nouveau. Ce lot pose la couche de mouvement, rend
les oiseaux au mode sombre, et ferme le cycle.

1. TRANSITIONS D'ÉCRAN. go() remplace aujourd'hui l'affichage d'un coup sec. Pose une transition
   sobre entre écrans (fondu ou glissement court), calée sur --d1/--d2 et --ease déjà définis.
   Rien de spectaculaire : l'app est un outil quotidien, une animation qu'on remarque deux fois
   est une animation de trop.

2. ANIMATION DE COMPLÉTION. Cocher une tâche est l'acte central de l'app et il ne produit
   aujourd'hui aucun retour. Pose une animation courte et satisfaisante sur .check — sans
   confetti, sans son, sans félicitation textuelle (CONVENTIONS.md §3 : jamais de score, jamais
   de félicitation exagérée).

3. prefers-reduced-motion : la règle globale existe déjà dans index.html et coupe animations et
   transitions. Vérifie qu'elle couvre bien TOUT ce que ce lot ajoute, y compris le balayage de
   js/gestures.js (Lot V2-1) et les transitions d'écran. Teste-le réellement, ne le suppose pas.

4. OISEAUX EN MODE SOMBRE. birdsOn() renvoie false dès que data-mode vaut « dark », depuis le
   Lot V1-2 : la moitié de la personnalité de l'app disparaît la moitié du temps (audit D4).
   Les oiseaux de data/oiseaux.js sont dessinés en couleurs dures pour le crème — c'est le seul
   endroit du projet où des couleurs en dur sont admises, et ce contrat reste valable.
   Rends-les au mode sombre : soit une variante de palette dans data/oiseaux.js, soit un
   traitement au rendu dans birdSvg(). Ne casse pas le contrat de dessin (viewBox 0 0 120 160,
   pattes sur y = 130).

5. RETOUR HAPTIQUE — attention, lis ceci avant de coder quoi que ce soit.
   iOS n'expose PAS d'API de vibration au web : navigator.vibrate n'existe ni dans Safari
   onglet ni en PWA installée. N'écris pas d'appel à navigator.vibrate « au cas où ».
   La seule voie réelle est <input type="checkbox" switch> (Safari 17.4+), qui déclenche un
   retour haptique système sur ce seul contrôle. Essaie-la sur les interrupteurs de Réglages,
   avec repli propre sur le .switch actuel là où l'attribut n'est pas reconnu. Si le résultat
   n'est pas net sur l'iPhone réel, abandonne et note-le en dette — ne laisse pas un demi-support.

6. AUDIT D'ACCESSIBILITÉ COMPLET, comme au Lot V1-12 : cibles ≥ 44 px, :focus-visible sur tout
   élément interactif y compris ceux ajoutés en V2, contrastes recalculés PAR CALCUL (pas à
   l'œil) sur toutes les paires ink/ink2 × fonds, clair et sombre. Toute ligne cliquable est
   focusable et actionnable au clavier (rowAttrs() du Lot V2-1 doit être partout).

7. AUDIT DE DETTES : aucune classe CSS orpheline laissée par les sept lots précédents, aucun
   style="..." non calculé, aucune fonction morte, aucun fichier au-dessus de 600 lignes
   (CONVENTIONS.md §1 — scinder par sous-domaine plutôt que laisser grossir). Les trois listes
   miroir revérifiées fichier par fichier.

8. QA-IPHONE-V2.md sur le modèle de QA-IPHONE.md : checklist à dérouler sur l'iPhone réel.
   Doit couvrir au minimum ce que la V2 a introduit — balayage sur les quatre écrans concernés,
   barre de saisie collée avec le clavier levé, cinq onglets sur petit écran, en-têtes collants
   de Courses en mode magasin, annulation de chaque action principale, transitions sous
   reduced-motion, oiseaux en sombre — en plus des points V1 toujours valables (mode avion,
   pastille, persistance 48 h, mise à jour du service worker, export/import).

9. CLAUDE.md et CONVENTIONS.md mis à jour : la tab bar à cinq onglets, js/gestures.js et les 18
   fichiers, undoable()/rowAttrs(), les trois écarts assumés vis-à-vis de la maquette
   (ROADMAP-V2.md §3.8), et le tableau d'état des lots V2. Retire de CLAUDE.md les dettes V1 que
   la V2 a effectivement réglées — ne laisse pas traîner des « à faire » déjà faits.

CACHE = 'mylife-b2-8', APP_VERSION = 'Bêta 2.8'. Checklist §6, puis compte rendu de fin de
cycle : ce qui a été fait, ce qui a été écarté et pourquoi, ce qui reste à vérifier sur
l'iPhone réel.
```

### Critères d'acceptation
- [ ] Aucune animation ne se déclenche sous `prefers-reduced-motion`, balayage compris.
- [ ] Les oiseaux sont présents et lisibles en mode sombre.
- [ ] Aucun appel à `navigator.vibrate` dans le code.
- [ ] Tous les contrastes recalculés sont ≥ 4,5:1, clair et sombre.
- [ ] `QA-IPHONE-V2.md` existe et couvre les nouveautés V2.
- [ ] `CLAUDE.md` ne mentionne plus une dette V1 déjà réglée.
