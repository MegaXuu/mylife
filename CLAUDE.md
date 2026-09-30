# CLAUDE.md — MyLife (mémoire de projet)

> Lu automatiquement par Claude Code à chaque session. Garder ce fichier **court et à jour**.
> Les règles permanentes vivent dans `CONVENTIONS.md` (à relire en entier à chaque lot) ; le plan
> complet dans `ROADMAP-V1.md`. Ce fichier ne répète que ce qui est vrai *maintenant*.

## Le projet en une phrase
App PWA **personnelle**, installée sur iPhone, qui répond à « qu'est-ce que je dois faire
maintenant ? » — tâches, entretien de la maison, habitudes, repas, courses. **100 % hors-ligne,
100 % gratuit, aucun compte, aucun serveur.**

## Nature technique
- **JavaScript pur**, aucun framework, **aucune étape de build**. Fichiers statiques servis par
  GitHub Pages.
- **Aucune dépendance de production.** `package.json` n'a que des `devDependencies` (`jsdom`,
  `fake-indexeddb`) pour `npm test`.
- Scripts **classiques** (`<script src=...>`), jamais d'ES modules, jamais d'import/export, jamais
  d'IIFE — une seule portée globale partagée entre tous les fichiers `js/*.js` et `data/*.js`.
  `function foo(){}` déclarée à la racine devient `window.foo`, appelable depuis `onclick=` HTML et
  depuis n'importe quel autre fichier.
- Stockage local : **IndexedDB** (base `mylife`, stores `state` et `photos`), clé `'S'` du store
  `state` = JSON de tout l'état, via `loadState()` / `save()` / `saveNow()`. Repli silencieux sur
  `localStorage['mylife']` si IndexedDB est indisponible.
- Langue de l'interface : **français**, ton sobre, aucun emoji. **Casse : majuscule initiale sur
  toute phrase ET sur toute entrée de liste** (« À faire », « Il y a 5 jours », « Sauté »,
  « Fruits et légumes ») — y compris sur les **données saisies** : `cap()` (`js/ui.js`) est appliqué
  **à la saisie**, jamais au rendu, pour que la donnée stockée et exportée soit déjà propre. Toute
  saisie texte passe par `cap()` + `autocapitalize="sentences"`. Arbitré au Lot 2, remplace la
  consigne « minuscules de phrase » d'origine (`CONVENTIONS.md` §3 est à jour).
- Versionnage affiché : **Bêta N.M** (`N`=1 en V1, `N`=2 en V2, `N`=3 depuis le cycle V3 ouvert au Lot V3-1),
  synchronisé avec `CACHE` dans `sw.js`.

## Identité visuelle — « Canopée » (Lot 2, appliquée)
Crème chaud, cartes posées à un seul niveau d'élévation, jauges pilule qui rougissent par calcul,
teintes douces par domaine.

**Maquette de référence : `maquettes/MyLife Canopée.html`** — export local du projet Claude Design
`7f060dea-25ad-4902-8616-2952e5f6eab6`. Huit écrans : Aujourd'hui, Maison, Habitudes, Courses,
Tâches, Réglages, Aujourd'hui — état vide, Nouvelle tâche (modale). Le contenu est un template JSON
échappé, **ligne 394** ; pour le lire, `JSON.parse()` cette ligne, ou simplement ouvrir le fichier
dans un navigateur.

> **Arbitrage du 27/07/2026 — la maquette fait foi, y compris contre le code déjà livré.**
> Vérification faite au Lot 5 : le code des Lots 3 et 4 s'est écarté de la référence sans que ce
> soit décidé. `.overline` (13 px, `--ink2`) a été généralisé comme titre de groupe à partir du seul
> « Échéance dépassée » de la maquette — qui est en 13 px parce qu'il est en `--due`, pas parce que
> c'est le style des titres. **Avant de dessiner ou de coder un écran, ouvrir la maquette et lire
> l'écran correspondant.** Écarts connus, à corriger au Lot 5 (voir le tableau des lots) :
> - `js/tasks.js` — groupes en `.overline` 13 px ; la référence met **18 px/700 `--ink` + compteur**.
> - `js/maison.js` — cartes de pièce teintées `t-maison` ; la référence les veut **blanches**. Nom de
>   pièce en `.overline` ; la référence met **18 px/700**. Jauges pleine largeur sous le titre ; la
>   référence les pose **à droite, 100–120 px, avec « Il y a 5 j » dessous**.
> - `index.html` — `.empty` a `padding-top:96px` ; la référence pose l'oiseau à **140 px**. Un seul
>   état vide y est dessiné : la valeur vaut pour les six écrans.
>
> Ce qui n'est **pas** un écart : `--shad` de la maquette vaut exactement `--elev`, et `--rad` /
> `--rpad` / `--ft` valent les valeurs retenues (20 px, 12 px, `ui-rounded`). Les couleurs, la typo
> et les espacements du Lot 2 sont conformes ; seule la **structure** a dérivé.
>
> **Les trois écarts ci-dessus ont été corrigés au Lot 5.** Ce qui reste à surveiller : la maquette
> contient des écrans **pas encore codés** (Habitudes, Courses, feuille « Nouvelle tâche »). Les
> ouvrir avant de coder les Lots 8, 9 et suivants.

Maquettes du Lot 5, **validées et codées** : `maquettes/today.html` (journée chargée) et
`maquettes/today-vide.html` (tout est fait). Autonomes, sans script. Au Lot 5, leurs blocs
Habitudes et Courses n'étaient pas encore codés (modèles de données inexistants) ; **c'est fait
depuis** — Habitudes au Lot 8, Courses au Lot 9, CSS désormais dans `index.html` comme le reste.
Les deux maquettes restent la trace de l'écran cible complet, utile pour vérifier un écart.

Maquettes du **Lot V2-3**, validées et codées : `maquettes/today-v2.html` (journée chargée, jeu de
données exact de l'audit B3 — 4 soins dus, 7 tâches, plafond à 7) et `maquettes/today-v2-vide.html`
(tout est fait). Même facture que celles du Lot 5, mais bâties sur le CSS d'`index.html` à l'état
Bêta 2.2 : **ce sont elles la référence de l'écran Aujourd'hui désormais**, les deux du Lot 5 ne
montrant ni le prénom, ni la réserve des soins, ni la barre de saisie collée.

**Discipline chromatique — engage tous les lots suivants.** Elle est aussi écrite en tête du
`<style>` d'`index.html` ; les deux doivent rester d'accord.

> Le **vert** (`--act`) dit « un doigt peut agir ici » : case à cocher, boutons ±, onglet actif,
> bouton primaire, anneau de focus. **Jamais « réussi »**, jamais une félicitation.
> Le **rouge pur** (`--due`) dit « une échéance réelle est dépassée » — en texte, et c'est son seul
> emploi : aucun fond, aucune pastille. **Une seule exception calculée** : la jauge de fraîcheur
> glisse du vert (`--g-ok`) vers l'argile (`--g-low`) à l'approche d'« à faire » (`gaugeColor()`
> dans `js/ui.js`) ; les barres de quota d'habitudes, elles, ne rougissent **jamais** (`--g-hab`).
> Tout le reste est neutre chaud. Les teintes `--t-*` sont des **fonds de carte** qui identifient un
> domaine, pas des sens. **Toute autre couleur est un bug de design.**

Corollaires appliqués : le bouton danger est un **contour** `--due` sur fond transparent (le rouge
plein reste à l'échéance) ; les chips actives sont une **inversion achromatique** (`--ink`/`--bg`),
car un filtre est un état, pas une action ; un toast d'alerte passe son **texte** en `--due`, il ne
prend pas de fond rouge.

**Micro-présences d'oiseaux.** Un tirage au boot (`pickBirds()`) attribue à chaque écran une espèce
et un rang de perchoir, figés pour la session — un re-rendu ne fait pas sauter l'oiseau. Règles :
**un seul oiseau par écran**, posé sur le **bord supérieur d'une carte** et nulle part ailleurs
(jamais un titre, jamais la tab bar) ; ~30 px sur une carte, 64 px sur le filet d'un état vide ;
`aria-hidden`, `pointer-events:none`, **aucune animation, aucune interaction** ; **aucun oiseau en
mode sombre**. Un écran qui pose des cartes appelle `birdOnCard(i, n)` sur chacune (`i` = rang,
`n` = total) — c'est tout ce qu'il y a à faire. Interrupteur « Oiseaux » dans Réglages
(`S.settings.birds`, vrai par défaut).

Mode sombre : bloc `html[data-mode="dark"]` prêt dans `:root` depuis le Lot 2, **interrupteur câblé
au Lot 11** — trois états dans Réglages (Clair/Sombre/Auto, `S.settings.theme`), posés sur
`data-mode` par `applyTheme()` (`js/settings.js`), appelée au boot avant le premier rendu. « Auto »
suit `prefers-color-scheme` via `watchSystemTheme()` (écouteur posé une fois, réagit à un changement
de thème système en direct) ; silencieux et replié sur clair si l'API n'existe pas. Depuis le
**Lot V2-1**, `applyTheme()` pose aussi `<meta name="theme-color">` (`#F3EEE5` clair / `#17140F`
sombre — audit D2) : le bandeau système de la PWA installée suit désormais le thème.

## Fichiers et ordre de chargement
Ordre impératif (CONVENTIONS.md §1), déclaré dans `index.html`, miroir dans `sw.js` (`ASSETS`) et
`test.mjs` (`FILES`) — **18 fichiers** au total depuis le Lot V3-4 (V3-1 : `js/plants.js` et
`data/plantes.js` retirés ; V3-2 : `js/meals.js` ajouté après `js/shopping.js` ; V3-4 :
`js/habits-screen.js` scindé de `js/habits.js`) :
```
data/rayons.js · data/entretien.js · data/oiseaux.js
→ js/state.js → js/ui.js → js/gestures.js → js/recur.js → js/nlp.js → js/today.js → js/tasks.js
→ js/maison.js → js/habits.js → js/habits-screen.js → js/shopping.js → js/meals.js → js/review.js
→ js/settings.js → js/boot.js (toujours en dernier)
```
Deux seules règles dures : `state.js` en premier (socle `S`, aucun rendu DOM), `boot.js` en dernier
(démarrage). Entre les deux l'ordre est libre — aucun code exécuté au chargement dans ces fichiers,
uniquement des déclarations.

- `index.html` — squelette + **tout le CSS** (`<style>` : discipline chromatique en commentaire,
  `:root` complet « Canopée », puis les composants partagés) + conteneurs d'écrans `#s-today
  #s-tasks #s-maison #s-meals #s-shopping #s-habits #s-settings` + tab bar **5 onglets depuis le Lot V2-2**
  (Aujourd'hui · Tâches · Maison · **Repas** (depuis le Lot V3-2, à la place de Courses) · Habitudes,
  icônes SVG inline, zone sûre iOS) + feuille modale (`#sheet-bg`/`#sheet`) +
  toast. Classes disponibles : `.head/.head-over/.head-title/.gear`, `.overline`,
  `.card` + `.t-maison/.t-habitudes` (+ `--t-courses` pour le bouton `.shop`), `.btn` +
  `.primary/.secondary/.danger/.quiet/.btn-full`, `.chip/.chips`, `.gauge/.gauge-fill(.hab)`,
  `.list/.row/.row-main/.row-title/.row-meta/.row.done/.check(.on)/.row-del`, `.field/.addbar/
  .add-btn`, `.sheet/.handle/.sheet-title/.sheet-msg`, `.tabbar/.tab`,
  `.empty/.empty-perch/.empty-title/.empty-sub`, `.toast/.toast-act`, `.switch(.on)`, `.bird`,
  `.repeat-n` (fiche tâche, Lot 4), et le bloc **Lot 5** : `.sec(.soft)/.sec-title/.sec-count`
  (titre de section 18 px + compteur, remplace l'emploi de `.overline` comme titre de groupe),
  `.card-title`, `.list-page` (liste posée hors carte), `.row-low` (registre bas), `.more`,
  `.row-care`, `.gauge-side/.gauge-cell` (`.gauge-cap` retirée au Lot V2-5, orpheline), `.room-head`,
  `.group-toggle`, et le bloc
  **Lot 6** : `.capture`, `.cap-chips`, `.cap-chip`, `.cap-details` (barre de capture — réutilisent
  `.addbar/.field/.add-btn/.chip/.btn.quiet` déjà en place), `.file-input` (posé au Lot 7 pour la photo de plante,
  seul survivant du bloc au Lot V3-1 : il sert au sélecteur d'import JSON de Réglages ;
  `.plant-photo` et `.gauge-cell` retirées avec les plantes), et le bloc **Lot 8** :
  `.hab-val/.step/.skip/.row-soft` (bloc du jour, repris tels quels de `maquettes/today.html`),
  `.habits-head` (en-tête du bloc, seule porte vers `go('habits')`), `.hab-cal/.hab-day` (calendrier mensuel de l'écran Habitudes — quatre
  états `.done/.partial/.skip/.inactive`, jamais un cinquième « manqué », cf. `js/habits.js`), et le
  bloc **Lot 9** : `.shop/.shop-l/.shop-go` (bouton d'Aujourd'hui, repris de `maquettes/today.html`),
  `.row-qty` (quantité à droite d'un article), `.rayon-left` (compteur restant d'un rayon, mode
  magasin), `.shop-store` (gros libellés du mode magasin, ne change que la taille des `.row`/`.check`
  déjà en place), `:disabled` sur `.row-postpone`/`.row-del` (flèches de `rayonOrderSheet()` en haut
  et en bas de liste), et depuis le **Lot V2-2** : `.capture` n'est plus posée en flux normal mais
  **fixée juste au-dessus de la tab bar** (§3.2 de `ROADMAP-V2.md`) — même classe réutilisée telle
  quelle par le champ d'ajout de `js/shopping.js` — sous `.sheet-bg` (`z-index:30` < 50), et
  `body.capture-open` (posée par `go()`, `js/ui.js`) qui augmente le `padding-bottom` de `.app` pour
  qu'aucune liste ne passe dessous. Enfin le bloc **Lot V2-3** : `.row-head` (+ `.row-head .skip`,
  marge négative pour garder 44 px sans épaissir la ligne), `.hab-ctrl`, `.hab-count`, et deux
  modificateurs de `.step` — `.step.num` (pas chiffré « +5 ») et `.step.wide` (« Fait ») — plus
  `body.capture-open .toast`, qui **relève le toast au-dessus de la barre de saisie** : depuis le
  Lot V2-2 la barre occupait 76 → 138 px et le toast était posé à 96 px, donc caché derrière elle
  sur les trois écrans qui en portent une (un « Annuler » invisible n'annule rien). `.hab-num` a été
  **retirée** au même lot, orpheline depuis que le clavier numérique a disparu du bloc du jour.
  Puis le bloc **Lot V2-4** : `.row-note-ic` (indicateur de notes, 14 px, dans `.row-title`),
  `.done-sub` (sous-titre à l'intérieur du groupe « Fait », plus léger qu'un `.sec` entier) et
  `.more-toggle` (respiration propre au bouton « Plus d'options », qui n'est pas un `.field-group`).
  Aucune classe nouvelle pour le balayage lui-même : `.row[data-swipe-left]`/`.swipe-content`/
  `.swipe-bg` du Lot V2-1 suffisaient, posés sur de vraies lignes pour la première fois ici.
  Puis le bloc **Lot V2-5** : `.row-act` (bouton d'action à droite d'une ligne d'entretien/de soin —
  du texte `--act`, comme `.more`/`.group-toggle`, pas de fond) et `.room-count` (remplace la jauge
  agrégée de pièce dans `.room-head`, retirée avec elle : `.room-head .gauge-cell{width:120px}`).
  `.gauge-side` (jauge seule, sans légende) est désormais partagée par Aujourd'hui ET Maison — sa
  légende « Aujourd'hui » d'origine n'était qu'une question de premier usage, pas de portée. Aucune
  classe nouvelle pour la fiche plante allégée (point 6) : `.more-toggle` du Lot V2-4 suffisait.
  Puis le bloc **Lot V2-6** : `.shop-bar` (bascule Liste/Mode magasin devenue collante, porte aussi
  `.shop-progress`) et `.rayon-head` (en-tête de rayon collant, remplace `shopRayonCard()` — reprend
  `.card-title` pour son texte, ne vit plus dans `.room-head`, resté propre à Maison). Aucune classe
  nouvelle pour le balayage des lignes de courses : `.row[data-swipe-left]`/`.swipe-content`/
  `.swipe-bg` du Lot V2-1 suffisaient, comme au Lot V2-4.
  Puis le bloc **Lot V2-7** : `.hab-cal-wrap/.hab-cal-month/.hab-cal-head/.hab-cal-dow` (nom du mois,
  en-tête « L M M J V S D » — le calendrier lui-même, `.hab-cal`/`.hab-day`, reste défini avec le
  reste du Lot V1-8, seulement complété d'un `display:flex` pour centrer le numéro désormais visible
  dans chaque case, et d'un état `.hab-day.future` distinct de `.blank`) et `.hab-plan`/`.hab-stats`/
  `.hab-stat` (méta éclatée en deux blocs — planification/objectif d'un côté, Série/Record/30 jours
  en trois colonnes égales de l'autre — remplace l'usage de `.sheet-msg` sur cet écran). Aucune
  classe nouvelle pour la saisie du jour posée sur l'écran Habitudes : `.hab-ctrl`/`.step`/`.skip`
  du Lot V1-8/V2-3 suffisaient, `habitRowHtml(h, {title:false})` y est rejouée telle quelle.
  Puis le bloc **Lot V3-1** : `.room-list .gauge-side{width:64px}` (les titres du pack maison sont
  plus longs, la ligne porte aussi « Fait » — aucune autre classe : le bloc « Entretien du jour »
  réutilise `.card.t-maison`/`.room-head`/`.room-count`/`.row`/`.check`/`.more`, la feuille du pack
  `.chips`/`.sheet-msg`/`.field-group`). Puis le bloc **Lot V3-2** : `.repas-seg`/`.seg` (contrôle
  segmenté Menus | Courses, distinct des chips posées juste en dessous sur Courses),
  `.meal-nav`/`.meal-week`, `.meal-stats` (reprend `.hab-stats`/`.hab-stat` du Lot V2-7 telles
  quelles, trois chiffres), `.meal-hint`, `.meal-grid`/`.meal-col`/`.meal-day(.today)`,
  `.meal-cell(.todo/.off/.past)`/`.meal-dish`/`.meal-meta`, `.meal-type-save`, `.meal-left` et
  `.meal-nav + .card` (30 px pour que l'oiseau ne couvre pas la flèche). Aucune couleur nouvelle :
  un repas cantine/ailleurs perd son fond pour un filet pointillé, comme `.hab-day.skip`.
  Au-delà de **900 px** : colonne centrée plafonnée à 560 px (desktop V2).
- `js/state.js` — **socle**, aucun rendu DOM : `APP_VERSION`, IndexedDB (`openDb`/`idbGet`/`idbSet`,
  + `idbClearPhotos()` — seul survivant des helpers de photos au Lot V3-1, pour purger à la
  réinitialisation ce que les plantes ont laissé dans le store `photos`), `mealWeekDefault()` (semaine
  type des repas, ici parce que `defaults()` l'appelle au chargement), `defaults()`/`migrate()` (+
  `migratePlants()`, Lot V3-1 : une plante vivante devient un entretien « S'occuper des plantes » par
  pièce, la clé `plants` et la saison froide disparaissent), `let S`, `save()` (débounce
  150 ms) / `saveNow()` (async), `purgeTombstones()` (>90 j, appelée au boot), helpers synchro-ready
  `stamp()`/`touch()`/`live()` (CONVENTIONS.md §2), helpers de date
  `dayKey()`/`todayKey()`/`addDays()`/`daysBetween()`. Depuis le Lot 11, `migrate()` pose
  `onboarded = true` d'office sur une base déjà peuplée qui ne l'avait jamais vu (une tâche, une
  plante, une habitude ou un article existant) : elle ne doit jamais se voir proposer la bienvenue
  après coup, seule une base réellement vierge reste à onboarder (`js/settings.js`,
  `maybeWelcome()`).
- `js/ui.js` — `go(name)` (écrans `today,tasks,maison,meals,shopping,habits,settings` — `meals` et
  `shopping` partagent l'onglet Repas depuis le Lot V3-2 : `TAB_OF`, `goRepas()` ramène au dernier des
  deux quitté), `openSheet()`/
  `closeSheet()` (fermeture par tap dehors + glisser la poignée, Pointer Events), `confirmSheet()`
  (+ `_runConfirm()`), `toast(msg, {danger, action:{label,fn}})` (+ `hideToast()`/`_runToastAct()`),
  `esc()`, `cap()` (majuscule initiale, à la saisie), `icon(d, size)` + `IC_GEAR`/`IC_CLOSE`
  (trait 2 px, terminaisons rondes), `screenHead(surTitre, titre, {noGear})`,
  `emptyState(titre, sousTitre)`, `gaugeColor(f)`, `CURRENT_SCREEN` (posé par `go()`), et les
  oiseaux : `pickBirds()` (appelé une fois au boot), `birdsOn()`, `birdSvg(nom, w, pos)`,
  `birdOnCard(i, n)`, `birdOnPerch()` (en mode sombre aussi depuis le Lot V3-3, `OISEAUX_SOMBRE`).
  Depuis le **Lot V3-3** : `markPop()`/`popClass()`/`popThen()` (animation de coche),
  `switchNative()`/`switchHtml()` (interrupteur natif à retour haptique, repli `.switch`), fondu
  `.enter` et `aria-current` posés par `go()`, Échap ferme la feuille, `openSheet()` nomme le
  dialogue par son `.sheet-title`. Depuis le **Lot V2-1** : `undoable(msg, undoFn)` (enveloppe
  `toast()` avec une action « Annuler » déjà câblée) et `rowAttrs(onTap, opts)` (attributs communs
  d'une ligne cliquable — `role="button"`, `tabindex="0"`, `onclick`, Entrée/Espace — posés sur les
  `.row`/`.row-main` cliquables de `today.js`/`tasks.js`/`maison.js`/`shopping.js`, audit D3).
  Depuis le **Lot V2-2**, `go()` fait deux choses de plus qu'avant : il mémorise la position de
  défilement de l'écran qu'on quitte (`_scrollPos{}`, lue par `scrollPosFor(name)` — exposée en
  fonction exprès pour rester testable sous jsdom, qui ne défile pas) et la restaure en y revenant,
  sauf en retapant l'onglet **déjà actif** (convention iOS : on remonte alors en haut) ; et il pose
  `body.capture-open` selon `CAPTURE_SCREENS` (`today`, `tasks`, `shopping` — les écrans qui posent
  une barre de saisie collée en bas), classe lue par `.app` dans le `<style>` d'`index.html`.
  Depuis le **Lot V2-5** (audit B1), `gaugeWidth(f)` accepte aussi un `f` négatif — la largeur
  décroît alors sous son plancher de 4 % vers une asymptote à 1 %, pour distinguer les degrés de
  retard là où `freshness()` clampait tout à 0. Ce `f` non borné vient de `choreFresh()`
  (`js/maison.js`) depuis le Lot V3-1 ; `rawFreshness()`, qui le calculait ici à la milliseconde, a
  été retirée. `gaugeColor(f)` sature déjà proprement pour `f < 0`.
- `js/gestures.js` — **nouveau au Lot V2-1**, socle de balayage horizontal consommé par les Lots
  V2-4/5/6, sans écran propre. Une ligne devient balayable en portant `data-swipe-left="fn(...)"`
  et/ou `data-swipe-right="fn(...)"` (nom de fonction évalué comme un `onclick=` l'est déjà,
  `swipeRunAttr()`) ; un seul écouteur délégué au `document` (Pointer Events) suit le contenu de la
  ligne en `translateX`, révèle un fond `.swipe-bg` (contour `--due` à gauche/« supprimer », plein
  `--act` à droite/positif — discipline chromatique), et déclenche l'action au relâchement au-delà
  de 33 % de la largeur ou 0,5 px/ms de vélocité (mêmes seuils que `endSheetDrag`, `js/ui.js`).
  Abandonné dès que le vertical dépasse l'horizontal (le défilement gagne toujours) ; rien ne se
  passe sous `prefers-reduced-motion`. Aucune ligne de l'app ne portait encore ces attributs à ce
  stade : c'est au Lot V2-4 de les avoir posées le premier (Tâches), et c'est ce qui a révélé un
  défaut du fichier lui-même — corrigé sur place, toujours au Lot V2-4 : `swipePrepareRow()`
  (reparente le contenu de la ligne dans `.swipe-content`) s'exécutait dès `pointerdown`, sur
  **toute** ligne balayable, y compris un simple tap immobile — ce reparentage synchrone fait
  perdre au navigateur le clic de synthèse qui devait suivre, donc plus aucune ligne ne s'ouvrait
  au tap. `swipePrepareRow()` ne s'appelle désormais qu'au premier `pointermove` qui verrouille le
  balayage horizontal (`s.locked = 'h'`) : un tap qui ne bouge pas ne touche plus jamais au DOM.
- `js/tasks.js` — écran Tâches, **moteur Things 3 posé au Lot 3** : groupes « Aujourd'hui et avant »
  (`bucket:'scheduled'` avec `start` ou `due` ≤ aujourd'hui) / « À venir » (le reste du `scheduled`) /
  « Un jour » (`anytime`) / « Peut-être » (`someday`, replié par défaut, visuellement en retrait),
  filtres par catégorie (`.chips`), recherche titre+notes, tri échéance dépassée → priorité →
  ancienneté (`taskCompare()`). Fiche tâche unique `taskSheet(id|null)` pour créer et éditer (titre,
  notes, catégorie, pièce, début, échéance, ce soir, priorité, effort, bucket — `bucket` devient
  automatiquement `'scheduled'` dès qu'une date est posée, les chips Un jour/Peut-être disparaissent
  alors au profit d'un message). `postponeTask()` pousse `start` à demain, incrémente `postponed`,
  affiche « reportée N fois » à partir de 3. **Récurrence posée au Lot 4** : interrupteur
  « Récurrente » dans la fiche → fréquence (`kind` jour/semaine/mois/an, `n`), jours fixes de semaine
  facultatifs, `from` (« à date fixe » / « après réalisation »), phrase en clair sous les champs
  (`repeatSummary()`). `doneTask()` passe désormais par `completeTask()` (`js/recur.js`) : une tâche
  `from:'due'` reste active et voit son échéance avancer (`doneAt` redevient `null`), une tâche
  `from:'done'` pose `doneAt` sur l'instant présent. **Depuis le Lot 6**, l'ancien champ « Ajouter une
  tâche » (`addTask()`) a été retiré : `renderTasks()` se termine par `captureBarHtml()`
  (`js/nlp.js`), un seul chemin de saisie pour tout l'écran (CONVENTIONS.md §3, principe 5).
  **Depuis le Lot V2-4**, plus aucun bouton permanent sur une ligne : `taskRowHtml()` pose
  `data-swipe-left`/`data-swipe-right` (`js/gestures.js`) — gauche supprime toujours, droite
  reporte uniquement dans le groupe « Aujourd'hui et avant » (`opts.postpone`), jamais dans les
  autres où seule la fiche fait ce travail. `taskGroupHtml()` généralise son repli
  (`opts.toggleFn`/`opts.open`, avant réservé à « Peut-être ») pour aussi porter le groupe
  **« Fait »** (`taskDoneSectionHtml()`/`taskDoneItems()`) : fenêtre de 7 jours, sous-titres
  « Fait aujourd'hui »/« Fait cette semaine », entretien toujours exclu (il garde un `doneAt`
  permanent par construction), et `settings.hideDone` enfin lu — il masque tout le groupe, pas
  seulement son repli, qui reste une préférence de session. La fiche (`taskSheetHtml()`) passe en
  divulgation progressive : `_tSheet._more` (posé par `tsHasExtras()` à l'ouverture, jamais dans le
  DOM — il doit survivre à `refreshTaskSheet()`) ne déplie Notes/Catégorie/Pièce/Ce soir/Priorité/
  Effort/Récurrence/Bucket que si un de ces champs porte déjà une valeur non par défaut. Indicateur
  de notes (`IC_NOTE`) sur la ligne. Recherche et filtres n'apparaissent plus dans `renderTasks()`
  qu'au-delà de `TASK_FILTER_MIN` tâches ouvertes.
  **Depuis le Lot V3-1**, porte aussi les pièces du logement (`ROOM_LABELS`/`ROOM_ORDER`, `partout`
  en tête ; `roomChoices()` masque `exterieur` tant qu'aucune tâche ne l'emploie), `CHORE_MINS`/
  `EFFORT_MINS`/`minsToEffort()` et `DOW_NAMES` ; `repeatSummary()` dit « Chaque samedi. » pour des
  jours fixes ; et `taskSheetHtml()` rend une **fiche d'entretien dédiée** dès que la tâche est un
  entretien (pièce + `from:'done'`) : titre, « Prochaine fois : … », pièce, **durée** (`setTsMins()`,
  l'effort en est déduit), rythme, notes — ni début, ni échéance, ni priorité, ni « ce soir », qui
  n'avaient aucun effet sur un entretien.
- `js/today.js` — écran **« Aujourd'hui », posé au Lot 5**. `todayBuckets()` est le seul endroit où
  se décide ce qui compte : une passe unique qui répartit en `overdue` (échéance réelle dépassée) /
  `evening` / `scheduled` (le bloc du jour) / `quick` (anytime à effort 1) / `chores` (l'entretien du
  jour, `choreDay()` — `js/maison.js` —, plus `choresDone` et `choresWaiting`) / `done`, chaque filtre
  retirant ce que le précédent a pris — **aucun item ne peut être dans deux blocs**. Le bloc 3 n'a
  plus de seuil de jauge depuis le Lot V3-1 : c'est le **budget d'entretien** qui le borne (ce qui est
  dû et tient dans `settings.choreBudget` minutes), et « N autres attendent demain » mène à Maison.
  `S.settings.todayCap` plafonne le bloc du jour (« + N autres »). `todayBadgeCount()` alimente la pastille iOS. Les cochages de la
  session (`tickToday`) gardent une ligne barrée à sa place jusqu'au prochain démarrage : rien n'est
  persisté, ce n'est pas un journal — depuis le **Lot V2-3**, `_ticked` est un objet `{id: cliché}`
  et non plus un tableau d'ids : une ligne barrée et son moyen de la décocher ont exactement la même
  durée de vie, celle de la session (`tickSnapshot()`, `untickToday()`). Porte aussi `longDate()`
  et, depuis le Lot V2-3, `userFirstName()` / `todayOverline()` — le sur-titre devient « Bonjour
  Florian · Mardi 15 septembre », et redevient la date seule si aucun prénom n'est posé (audit C1,
  arbitrage `ROADMAP-V2.md` §3.6) ; l'état vide se personnalise de la même façon.
  `renderToday()` se termine par `captureBarHtml()` (`js/nlp.js`), comme Tâches — depuis le Lot 6.
  Les soins de plantes mêlés au bloc du jour (Lot V1-7) et leur réserve de places sous le plafond
  (`todayShown()`, Lot V2-3) ont disparu avec les plantes au Lot V3-1 : `scheduled` redevient une
  simple liste de tâches. Un entretien coché dans « Entretien du jour » passe par la même
  `todayDone()` que les tâches (ligne barrée dans son bloc, annulable, décochable). `todayDone()` pose un cliché des champs que
  `completeTask()` modifie puis appelle `undoable()` ; `todayUndone()` (case de la ligne barrée,
  plus jamais `disabled`) le restitue — sans lui, décocher une tâche récurrente la laisserait avec
  l'échéance *suivante* et une réalisation de trop dans son historique (audit A2).
  Depuis le **Lot V1-8**, `todayBuckets()` porte aussi `habits` (`getTodayHabits()`, `js/habits.js`) —
  un domaine à part, jamais mêlé aux tâches ni à l'entretien (une série ne se compte pas comme une
  jauge, `CONVENTIONS.md` §6). `todayBadgeCount()` ajoute les habitudes encore actionnables
  (`habitsPendingCount()`) ; l'état vide (`vide` dans `renderToday()`) les prend en compte de la même
  façon : une habitude déjà atteinte ou sautée aujourd'hui ne bloque plus « c'est bon ».
  Depuis le **Lot V1-9**, `todayBuckets()` porte aussi `shopping` (`shoppingOpenCount()`,
  `js/shopping.js`) — un compte, jamais la liste. `shoppingButtonHtml()` rend le bouton pleine
  largeur teinté `--t-courses` (repris de `maquettes/today.html`, jamais posé au Lot 5 faute de
  modèle de données), toujours affiché si la liste n'est pas vide et rendu **hors** du `if(vide)`,
  comme « Ce soir » : un rappel ambiant qui ne bloque jamais l'état vide et n'entre pas dans
  `todayBadgeCount()` (même traitement que le bloc 7, « si tu as 10 minutes »).
- `js/habits.js` — **rempli au Lot 8**. Domaine Habitudes : moteur de **série et quota**, jamais une
  jauge de fraîcheur (frontière posée par `CONVENTIONS.md` §6 — ne réutilise donc pas `js/recur.js`).
  Deux modes de planification traités séparément : `sched:{kind:'days', days:[1..7]}` (jours fixes)
  et `sched:{kind:'week', perWeek:N}` (quota hebdomadaire libre, actionnable n'importe quel jour).
  Le jour « sauté » (`habitLog[jour][id] === 'skip'`) est neutre : `habitStreak()` (jours ou
  semaines selon le mode) l'ignore sans casser la série ; seule l'atteinte de l'objectif (`target`)
  l'alimente, jamais une valeur partielle. `habitBestStreak()` (record) et `habitRate30()` (taux de
  réussite sur 30 jours) complètent l'écran secondaire. Bloc permanent d'« Aujourd'hui »
  (`getTodayHabits()`, `todayHabitsCard()`) : saisie en ligne, jamais « Sauter » et deux boutons
  d'ajout sur la même ligne. **Refondue au Lot V2-3** (audit B8 — noter 30 minutes de marche
  demandait un champ de 64 px et le clavier iOS) : `habStep(h)` (pure, testée) donne un pas adapté à
  l'objectif — 1 jusqu'à 10, 5 jusqu'à 25, 10 jusqu'à 60, 25 au-delà, et l'objectif lui-même pour
  une coche simple — et le bouton **dit** ce qu'il ajoute (« +5 », « +10 »). `reachHabit()` pose
  l'objectif en un geste (« Fait ») ; il remplace le « + » sur une habitude sans unité, qui n'a rien
  à compter. Une habitude chiffrée encore à faire prend une ligne de contrôles (`.hab-ctrl` :
  valeur, pas, « Fait ») sous la série, ~122 px, et retombe à la ligne compacte du Lot V1-8 (~70 px)
  dès qu'elle est atteinte ou sautée : la carte rétrécit à mesure que la journée avance. Les deux
  boutons d'ajout vivent dans cette ligne, jamais sur celle du titre où se trouve « Sauter » — c'est
  ainsi que la règle du Lot V1-8 est tenue à la lettre. `stepHabit()` ne saute jamais **par-dessus**
  l'objectif (de 25 à 30, « +10 » pose 30), puis reprend son pas plein au-delà (on peut toujours
  boire un septième verre). `setHabitValue()` et `HAB_STEP_MAX` ont disparu avec le champ numérique. Écran secondaire `go('habits')` (atteint uniquement en tapant l'en-tête
  du bloc, pas d'onglet) : liste des habitudes, fiche création/édition (`habitSheet()`, comme
  `taskSheet()`), calendrier mensuel de régularité (`habitCalendarHtml()`) à
  **quatre** traitements visuels — fait / partiel / sauté / inactif — et pas un cinquième
  « manqué » : `CONVENTIONS.md` §3 proscrit tout ton culpabilisant, un jour resté sans saisie se lit
  comme « inactif », jamais comme un reproche. **Depuis le Lot 10**, motivation légère sans le
  moindre score : `celebrateHabitRecord()` compare le record (`habitBestStreak()`, capturé *avant*
  d'écrire le jour) à la série une fois la valeur posée — un toast sobre (« Record de série pour…
  ») seulement si elle le dépasse, et jamais le tout premier jour d'une habitude (`prevBest` à 0,
  ce serait un « record » systématique). Appelé depuis `stepHabit()` et `reachHabit()`, jamais
  `skipHabit()` (un jour sauté ne peut pas battre un record). Depuis le Lot V2-3 il **renvoie** s'il
  a parlé, pour que `reachHabit()` n'empile pas son toast d'annulation par-dessus celui du record.
  **Refondu au Lot V2-7** (audits B5/B6/B8) : `habitCalendarHtml()` pose désormais le nom du mois,
  l'en-tête des sept jours et un numéro dans chaque case, et fige toujours `HAB_CAL_CELLS` (42, 6
  semaines) cases — les cases avant le 1er et après le dernier jour du mois restent vides, la carte
  ne bouge donc plus ni du 1er au 31 ni d'un mois à l'autre. `habitCardHtml()` éclate l'ancienne
  phrase de trois lignes en deux blocs : `habitPlanTxt()` (planification + objectif, une ligne) et
  `habitStatsHtml()` (Série/Record/30 jours, trois colonnes avec leur libellé court) — mêmes trois
  chiffres qu'avant, aucun score de plus. Chaque carte pose enfin la même ligne de saisie que le
  bloc d'Aujourd'hui (`habitRowHtml(h, {title:false})` — le paramètre ne fait que taire le titre,
  déjà posé par l'en-tête de la carte : la décision « ligne de contrôles ou ligne compacte » et les
  boutons eux-mêmes restent la même fonction, jamais réimplémentés pour cet écran). Enfin,
  `habitBestStreak()` cherche désormais depuis le plus tôt de `createdAt` et du premier jour déjà
  présent dans `habitLog` (`habitEarliestLogDay()`) : un import de données peut porter des jours
  antérieurs à la création de l'habitude, que `habitStreak()` (non bornée par `createdAt`) prenait
  déjà en compte sans que le record ne les voie jamais — cas rare, corrigé en quelques lignes plutôt
  que noté en dette.
- `js/shopping.js` — écran Courses, **rempli au Lot 9**. Classement automatique par rayon
  (`guessRayon()`, fonction pure testée isolément comme `parseQuick()` : normalise le libellé
  (`normalizeLabel()`), cherche par groupes de mots consécutifs — du plus long au plus court, pour
  qu'une clé à deux mots comme « papier toilette » (`data/rayons.js`) l'emporte sur un mot isolé au
  milieu d'un libellé plus long — puis retombe sur `'autre'`). Une correction de rayon (fiche
  `shopItemSheet()`, un tap) est mémorisée dans `S.settings.rayonOverrides` **pour ce libellé
  précis**, jamais à chaque ajout — sinon le dictionnaire n'aurait plus jamais voix au chapitre sur
  un produit déjà tapé une fois. Triée selon `S.settings.rayonOrder` (réglable via
  `rayonOrderSheet()`, flèches haut/bas plutôt qu'un glisser-déposer). Mode magasin
  (`setShopMode()`, bascule de session) : gros libellés (`.shop-store`), Wake Lock avec garde de
  disponibilité (`acquireWakeLock()`/`releaseWakeLock()`, redemandé au retour visible), coché =
  grisé **en bas** de son rayon (jamais retiré : on doit pouvoir décocher une erreur) —
  `clearCheckedShopping()` vide les cochés en tombstone, jamais automatiquement. `S.frequents[]`
  (`bumpFrequent()`/`frequentShoppingItems()`) : un produit ajouté ≥ 3 fois est proposé en un tap
  sous le champ d'ajout, les plus utilisés d'abord — pas un objet synchro-ready comme `tasks[]`,
  c'est un compteur d'usage recalculable par libellé, pas un objet du domaine. `addShoppingItem()`
  est le chemin unique de création, qu'il vienne du champ ou d'un fréquent en un tap.
  **Depuis le Lot V2-6** (ROADMAP-V2.md §3.8, audit B7), `shopRayonCard()` a disparu : plus aucune
  carte par rayon, `shopRayonSection()`/`shopRayonHeadHtml()` posent une liste continue
  (`.list-page`, hors carte) où l'en-tête de chaque rayon reste collé en haut au défilement
  (`.rayon-head`, CSS `position:sticky`) — 14 articles tiennent désormais en ~1 écran au lieu de
  2,3. `.shop-bar` (bascule Liste/Mode magasin) est collée elle aussi, juste au-dessus, et porte la
  progression globale en mode magasin (« N / M pris ») ; un rayon entièrement coché se signale
  (« Tout pris », dans les deux modes — jamais en vert, ce n'est pas une action). Balayage
  (`js/gestures.js`, Lot V2-1) sur chaque ligne : gauche `deleteShopItem()` (déjà annulable, via
  `undoable()` depuis ce lot plutôt qu'un `toast()` manuel), droite `toggleShopDone()` — les deux
  doublent des chemins déjà là (case, fiche), aucun chemin exclusif. Plus de carte = plus de bird
  sur cet écran, comme `js/tasks.js`. `data/rayons.js` corrigé (audit D5) : « pâtes » seul retombe
  sur `epicerie-salee` (sens courant, pâtes sèches) et non plus `frais` ; le sens frais exige
  désormais les deux mots, `pates fraiches`.
- `js/meals.js` — **nouveau au Lot V3-2**, écran **Menus** (`#s-meals`, `go('meals')`), première
  moitié de l'onglet **Repas** — l'autre est Courses, les deux portent `repasSegHtml()` (contrôle
  segmenté) sous le même titre « Repas ». Une **semaine type** (`settings.mealWeek`, 14 repas :
  `{s:'plan'|'cantine'|'ailleurs', p}` par jour ISO et créneau) réglée une fois
  (`mealTypeSheet()`/`cycleMealType()` : 2 pers. → 1 → cantine → ailleurs ; `mealWeekSet` retient
  la première fois, l'invitation disparaît alors). `S.meals[]` ne stocke **que** ce qui s'écarte de
  la semaine type ou porte un plat, champs à `null` = hérités (`upsertMeal()` remet à null ce qui
  égale la semaine type et tombstone un repas qui n'a plus rien à retenir). Lecture pure :
  `mealAt()` (le plus récent gagne), `mealType()`, `mealSlot()`, `weekSlots()`, `mealWeekStats()`
  (repas et portions sur la semaine entière, « à choisir » à partir d'aujourd'hui seulement),
  `mealDishes()` — **les plats ne se saisissent pas, ils s'apprennent** de l'historique (restes
  exclus), les plus fréquents d'abord, proposés en un tap dans la fiche (`mealSuggestions()`).
  `mealSheet()` : plat (`cap()`), statut, personnes, « Il en restera » (`mealLeftoverAction()` →
  `nextFreeMealSlot()`, annulable), « Ajouter des courses » (`addMealShopping()` → `addShoppingItem()`
  tel quel). `proposeMeals(start, rnd)` (plats connus tirés en proportion de leur fréquence, sans
  doublon ni rien de mangé à ±10 jours, repas ouverts et à venir seulement) et `copyLastWeekMeals()`,
  tous deux annulables d'un bloc (`mealSnapshot()`/`restoreMealSnapshot()`). Pour Aujourd'hui :
  `mealTodayLine(hour)` (le midi avant 14 h s'il est à prévoir, sinon le soir ; **rien tant que
  Menus n'a jamais servi**) et `mealTodayHtml()` (bouton `.shop`, comme les courses — ni pastille,
  ni frein à l'état vide).
- `js/maison.js` — domaine **Entretien** : écran Maison (vue par pièce, Lot 4, refondue au Lot V2-5 puis
  au **Lot V3-1**) + le moteur du **budget d'entretien quotidien** + le **pack maison**. `isChore(t)`
  (pièce + `repeat.from:'done'`, glossaire) et `getMaisonItems()` sont la seule définition de
  l'entretien — `today.js` s'en sert aussi. Moteur pur, **au jour près** (jamais à la milliseconde :
  la liste d'Aujourd'hui ne doit pas bouger d'elle-même dans la journée) : `choreDueKey(t)` (jamais
  fait → aujourd'hui, sinon `nextDue()` depuis `doneAt` — qui sait aussi retrouver le prochain samedi
  d'un entretien **à jour fixe**, `choreFixedDays()`), `choreFresh(t)` (jours restants / intervalle,
  non bornée, pour la jauge et le tri), `choreMins(t)` (`t.mins`, sinon `EFFORT_MINS[effort]`),
  `choreLoad()` (minutes par jour de toute la maison), `choreBudget()`. **`choreDay(today)`** est le
  seul endroit où se décide l'entretien du jour : ce qui est déjà fait aujourd'hui entame le budget ;
  parmi le dû, jour fixe d'abord, puis la fraîcheur la plus basse, puis le plus court ; on prend
  tout ce qui tient, le reste attend demain (`waiting`) ; seule entorse, le premier passe même
  au-delà du budget si rien n'est encore fait ni pris. Rendu : `choreRowHtml()` (légende
  `choreCue()` — « À faire »/« Demain »/« Samedi »/« Dans N j »/« Dans N semaines » — + durée, jauge
  à droite, bouton « Fait » `tapMaisonItem()` annulable, corps → `taskSheet()`, balayage gauche →
  `delTask()`), `maisonRoomSection()` (le plus dû en tête, « N à faire »/« Tout est frais »),
  `renderMaison()` (sur-titre « N entretiens · environ M min par jour » ; une maison vide propose le
  pack). **Pack maison** : `packModels()` (modèles `pack:true` de `data/entretien.js` pas encore
  suivis — clé pièce + titre, `choreKey()`), `packSheet()`/`togglePackRoom()`/`installPack()`
  (annulable d'un bloc), et **`packSchedule(entries)`**, pure : étale les premières échéances en
  simulant la charge journalière sur tout l'horizon, chaque entretien placé (le plus lourd d'abord)
  sur la phase qui augmente le moins la somme des carrés — sans ça 40 entretiens créés d'un coup
  seraient tous dus le même jour. `choreFromModel()` pose `doneAt` à rebours (midi) pour que
  `nextDue()` tombe pile sur la première échéance choisie ; `fixedOffset()` pour un jour fixe.
  `entretienSheet()`/`addEntretienModels()` (ajout un par un depuis le catalogue, « Déjà suivi »
  signalé, dû à mi-intervalle). Les plantes, leurs soins et `PLANT_ACTION` ont disparu au V3-1.
- `js/settings.js` — écran Réglages, **rempli au Lot 11** : six cartes dans cet ordre, chacune un
  groupe. **Profil** : prénom (`setUserName()`, `cap()` posé, vide autorisé), apparence
  (`setTheme('light'|'dark'|'auto')` → `S.settings.theme`, posé sur `data-mode` de `<html>` par
  `applyTheme()` — 'auto' suit `prefers-color-scheme` via `watchSystemTheme()`, silencieux si l'API
  n'existe pas), l'interrupteur Oiseaux (`toggleBirds()`, posé au Lot 2). **Aujourd'hui** :
  `todayCap`, jour de la revue (`reviewDay`, select), et la revue à la demande (`startReview()` sans
  argument, `js/review.js`). **Maison** (depuis le Lot V3-1, à la place de la saison froide des
  plantes) : temps d'entretien par jour (`setChoreBudget()`, par pas de 5, jamais sous 5) avec la
  charge réelle de la maison en regard, et « Installer le pack maison » (`packSheet()`, sans
  doublon). **Courses** : `rayonOrderSheet()` (`js/shopping.js`,
  inchangé, déjà posé au Lot 9). **Données** : export JSON complet de `S` (`exportData()`),
  import (`importDataPrompt()` → `confirmSheet` → `onImportFile()` → `validateImportPayload()` puis
  `applyImportedData()`, qui **valide intégralement avant d'écrire quoi que ce soit dans `S`** — un
  import raté ne modifie rien), réinitialisation en deux temps (`resetSheet()` : proposer l'export
  d'abord, le bouton danger ensuite ; `doReset()` pose `S = defaults()`, vide le store `photos`
  via `idbClearPhotos()`, puis recharge). **À propos** : version, rappel du filet de sécurité
  (export régulier), avertissement sur le lien données/hébergement. Porte aussi la **bienvenue**
  du tout premier lancement (`maybeWelcome()`, appelée par `boot.js` juste après `go('today')`) :
  trois écrans courts (présentation, prénom, première tâche ou « explorer »),
  `_onSheetClose` pose `S.onboarded = true` quel que soit le chemin de fermeture — jamais revue une
  fois fermée. Seul écran en `screenHead(..., {noGear:true})` : l'engrenage y mène, il n'y apparaît
  pas.
- `js/recur.js` — **depuis le Lot V3-4** : `nextOccurrence(r, anchor)` (le calcul pur, mois/années
  bornés, `repeat.dom`), `firstOccurrence(r, ref)`, `completeTask()` à trois cas (entretien → `doneAt` ;
  récurrente ouverte → avance, début compris ; ponctuelle → `doneAt`), `completionSnapshot()`/
  `restoreCompletion()`. L'historique ci-dessous décrit le moteur d'origine.
- `js/recur.js` (historique) — moteur de récurrence, **rempli au Lot 4**, fonctions pures sans DOM, testées
  isolément dans `test.mjs` : `intervalDays(repeat)` (intervalle en jours tous kinds confondus,
  approximation pour la jauge), `nextDue(task, ref)` (distinction `repeat.from:'due'` — depuis
  l'échéance précédente, calendaire exact via `setMonth`/`setFullYear` — / `'done'` — depuis
  la réalisation effective `doneAt` — c'est le cœur du lot), `freshness(task, ref)` (jauge continue
  bornée [0,1], jamais négative), `completeTask(task, ref)` (historise, recalcule `due`, remet
  `postponed` à 0). Partagé entre l'entretien maison (`js/maison.js`, qui s'en sert aussi pour les
  entretiens à jour fixe : `nextDue()` depuis `doneAt` trouve le prochain samedi) et les tâches.
- `js/nlp.js` — **rempli au Lot 6**, toujours **sans conteneur DOM propre** (pas de `#s-nlp`, jamais
  appelé par `go()`) mais plus un placeholder. Deux parties : `parseQuick(texte, ref, ignore)`,
  fonction **pure** (aucun DOM, aucune horloge lue en dehors de `ref`) qui reconnaît dates
  relatives/absolues, échéance explicite (`avant le`/`pour le`/`deadline` → `due`, une date simple
  → `start`), récurrence (`tous les N jours/semaines/mois/ans`, `chaque jour`, jours fixes de
  semaine, suffixe `après`/`après réalisation`/`après la dernière fois` → `repeat.from:'done'`,
  sinon `'due'`), priorité (`!!`/`urgent`, `!`/`important`), effort (`5 min`/`10 min`/`court`,
  `1 h`/`long`), catégorie/pièce par dièse (mots reconnus = `CAT_ORDER`/`ROOM_ORDER`, `js/tasks.js`) ;
  tout le reste reste dans `title`, intégralement — normalise la ponctuation collée à un mot
  (`avant le 5,`) pour les frontières d'espace des règles, puis la recolle en sortie. Le 3ᵉ argument
  `ignore` (tableau de clés `date/repeat/prio/effort/cat/room`) désactive une règle sans réinterpréter
  son fragment, qui revient donc dans le titre. Puis la **barre de capture universelle**
  (`captureBarHtml()`, montée par `today.js` et `tasks.js`, ids scopés `cap-input-<écran>` /
  `cap-preview-<écran>` car les deux écrans restent dans le DOM en même temps) : aperçu à puces sous
  le champ (`capturePreviewHtml()`, une puce par entrée de `matched[]`, chacune supprimable →
  `removeCaptureChip()`), `commitCapture()` crée la tâche directement, `openCaptureDetails()` ouvre
  la fiche du Lot 3 préremplie pour ce que le langage naturel n'a pas couvert. Testé isolément dans
  `test.mjs` (plus de 50 cas sur `parseQuick()`, plus le mécanisme d'ignorance) : c'est le seul
  module de l'app qui mérite de vrais tests unitaires.
- `js/review.js` — **rempli au Lot 10**. La revue hebdomadaire, le « système immunitaire » de
  l'app (ROADMAP §3 point ⑨) : toujours une feuille modale (`startReview()`/`openSheet()`), jamais
  un écran propre — pas de `#s-review`, jamais appelée par `go()`. `reviewCandidates()` (pure) :
  tâches ouvertes dont `touchedAt` dépasse 30 jours (`REVIEW_STALE_DAYS`) ou `postponed` dépasse 3
  (`REVIEW_POSTPONE_MAX`) — l'entretien (`repeat.from:'done'`) en est déjà exclu par le filtre
  `!t.doneAt`, comme dans `getTaskItems()` (`js/tasks.js`), puisqu'il garde toujours un `doneAt`.
  `reviewDue()` : vrai le jour `settings.reviewDay` si `lastReview` est absent ou vieux d'au moins
  6 jours — jamais deux fois dans la même semaine. `maybeStartReview()` (appelée une fois au boot)
  ne propose la feuille que si `reviewCandidates()` n'est pas vide : une revue vide serait un bruit,
  pas un service (principe 6). Flux une tâche à la fois (`reviewStepHtml()`), trois issues —
  `reviewKeep()` (start = aujourd'hui, bucket `scheduled`, `postponed` à 0), `reviewSomeday()`
  (bucket `someday`, start `null`), `reviewDrop()` (tombstone, annulable par toast comme
  `delTask()`) — et un « Plus tard » qui ferme sans rien enregistrer. `S.lastReview` n'est posé
  qu'à la toute dernière tâche triée. Écran de fin (`reviewEndHtml()`) : juste le compte, un mot
  sobre, **aucun score** (CONVENTIONS.md §3). `_onSheetClose = rerender` : l'écran dessous (Aujourd'hui
  au déclenchement automatique, Réglages à la demande) reprend à jour quel que soit le chemin de
  fermeture. Accessible aussi à la demande depuis Réglages (`startReview()` sans argument).
- `data/rayons.js` (`RAYONS`, `RAYON_ORDER_DEFAULT`) — **rempli au Lot 9** : dictionnaire d'environ
  430 libellés normalisés (minuscules, accents retirés) vers une clé de rayon, y compris des clés à
  plusieurs mots pour désambiguïser un mot trop générique pour être une clé seule (« papier
  toilette », « brosse a dents »…). `RAYON_ORDER_DEFAULT` (l'ordre par défaut des 14 rayons) vit ici
  et pas dans `js/shopping.js` : `defaults()` (`js/state.js`) l'utilise dès son premier appel,
  synchrone, avant même que `js/shopping.js` n'ait chargé — chargé en premier comme les deux autres
  catalogues, c'est justement pour ça.
- `data/entretien.js` (`ENTRETIEN`) — catalogue d'entretien, **refondu au Lot V3-1** : chaque modèle
  `{title, room, days, mins, pack, dow?}`. `pack:true` = le **pack maison** de Florian (40 entretiens,
  ~28 min/jour, décidés avec lui le 29/09/2026, `ROADMAP-V3.md` §2.1) ; les autres restent proposés
  un par un. `dow` = jours fixes (la serpillière, `[6]`, pièce `partout`). Modèles génériques, aucune
  donnée personnelle : le dépôt est public.
- `data/oiseaux.js` (`OISEAUX`) — **rempli au Lot 2** : 6 espèces, chacune une liste de formes SVG
  plates. Données pures, aucun rendu : redessiner un oiseau = remplacer son tableau, sans toucher à
  `js/ui.js`. Contrat de dessin en tête du fichier (`viewBox 0 0 120 160`, pattes sur **y = 130**,
  les 30 px du bas débordent sous le perchoir). **Seul endroit du projet où des couleurs en dur sont
  admises** : un oiseau est une image, pas une couleur d'interface.
- `js/boot.js` — `boot()` async (`S = await loadState()` → `purgeTombstones()` → `applyTheme()`
  (mode sombre, avant le premier rendu pour éviter tout flash) → `watchSystemTheme()` →
  `go('today')` → `maybeWelcome()` (Lot 11, uniquement au tout premier lancement) →
  `maybeStartReview()`), `READY` + `window.__ready`, `navigator.storage.persist()`, enregistrement
  du service worker, `saveNow()` sur `pagehide` et `visibilitychange→hidden`, `reg.update()` +
  rechargement sur `controllerchange` au retour au premier plan.
- `sw.js` — cache-first avec mise à jour en arrière-plan (stale-while-revalidate) ; **incrémenter
  `CACHE`** (`mylife-b3-N` en V3) à chaque release.
- `manifest.webmanifest`, `icon-180/192/512.png` — depuis le **Lot V3-3**, le cacatoès rosalbin de
  `data/oiseaux.js` perché sur une branche `--act`, fond `--bg`, rastérisé par `tools/gen-icons.mjs`
  (`node tools/gen-icons.mjs .`, aucune dépendance : balayage + `zlib`) — display `standalone`, portrait.
  `theme_color`/`background_color` = `#F3EEE5` (identique au `<meta name="theme-color">`).
  Les icônes grises des V1/V2 (monogramme « M ») ont été remplacées au Lot V3-3.

## Lancer / tester
- Ouvrir `index.html` dans un navigateur (ou servir en local, ex. `python3 -m http.server`). Les
  fonctions PWA (service worker, stockage persistant, IndexedDB) exigent HTTPS ou `localhost`.
- **Piège de test local, découvert au Lot 6, reconfirmé au Lot 9** : sur une origine déjà visitée
  (ex. `localhost:8765` réutilisé d'une session à l'autre), le service worker sert le cache
  **stale-while-revalidate** — donc l'ancien code, avant même le premier rendu — malgré un `CACHE`
  incrémenté côté serveur, et **le cache HTTP du navigateur lui-même peut aussi retenir une vieille
  réponse** pour un fichier statique servi sans en-têtes de cache par `python3 -m http.server`,
  indépendamment du service worker. `unregister()` + `caches.keys()`/`delete()` suffit rarement à lui
  seul si l'origine a déjà beaucoup servi dans la session : un nouveau `boot()` peut encore échouer
  juste après (ex. `ReferenceError` sur une variable d'un fichier chargé plus tôt — le symptôme d'un
  script qui a avorté plus haut, pas la vraie cause). **Le plus fiable : servir sur un port jamais
  visité dans la session** (nouvelle origine = aucun cache HTTP ni service worker à décharger) plutôt
  que de s'acharner à vider l'ancien.
- **Vérif syntaxe** : `node --check <fichier>` sur chaque fichier `js/`/`data/` modifié.
- **Test de fumée** : `npm test` (après un premier `npm install`) — charge `index.html` sous jsdom
  avec `fake-indexeddb` injecté, inline les 18 fichiers `data/`+`js/` concaténés dans l'ordre de
  chargement, attend `await window.__ready()`, exerce `go()` sur les 6 écrans, le cycle de vie d'une
  tâche (créer/cocher/supprimer), `stamp()`/`touch()`/`live()`, les invariants des oiseaux (un seul
  par écran, `aria-hidden`, aucun en mode sombre, interrupteur effectif), la majuscule initiale
  posée à la saisie, le moteur de récurrence (`intervalDays`/`nextDue`/`freshness`/`completeTask`,
  distinction `from:'due'`/`from:'done'` testée explicitement), l'écran Maison (`getMaisonItems()`,
  `tapMaisonItem()`) et — depuis le Lot 5 — **l'algorithme d'« Aujourd'hui »** attaqué directement
  sur `todayBuckets()` : répartition des blocs sans doublon, un `start` passé qui ne produit jamais
  d'échéance dépassée, `someday` jamais proposé en « 10 minutes », seuil et plafond d'entretien,
  cochage de session, plafond `todayCap` + « + N autres », état vide sans aucune cible tactile,
  pastille — et, depuis le Lot 6, **`parseQuick()`** attaqué directement (plus de 50 cas
  d'entrée/sortie sur une date de référence fixe, plus le mécanisme d'ignorance des puces), sans
  passer par le DOM. Depuis le Lot 7, **les plantes** : `plantSeason()` (bouclage sur l'année),
  `careFreshness()` (suspension `cold:0`), `getPlantCareItems()` traduisant un soin en tâche pour
  `recur.js` sans dupliquer le moteur, l'intégration à Maison et au bloc du jour d'Aujourd'hui, et la
  fiche (`plantSheet()`/`savePlantSheet()`, asynchrone — hors du helper `call()` synchrone, comme le
  flush `saveNow()`). Vérifie enfin la persistance directe en IndexedDB après `saveNow()`. Échoue à
  la moindre erreur runtime. Les scénarios d'« Aujourd'hui » travaillent sur une ardoise vide et
  **restaurent `S.tasks`** derrière eux (helper `scenario()`) : ne pas y pousser de tâche sans passer
  par lui. Depuis le Lot 8, **les habitudes** : `isoDow()`/`habitActiveOn()` (jours fixes vs quota
  libre), le jour sauté neutre et la progression partielle testés directement sur `habitStreak()`,
  le mode quota hebdomadaire (`habitWeekDone()`/`habitStreakWeeks()`), l'intégration à
  `todayBuckets()` et à l'état vide, et la fiche (`habitSheet()`/`saveHabitSheet()`, synchrone).
  Ces scénarios (helper `habitScenario()`) restaurent `S.habits`/`S.habitLog` derrière eux, comme
  `scenario()` le fait pour `S.tasks` — le test de l'état vide isole en plus `S.plants` (le Ficus du
  Lot 7 a un engrais/rempotage jamais faits, donc perpétuellement dus, qui polluerait sinon tout
  état vide calculé après ce point du fichier). Depuis le Lot 9, **les courses** : `guessRayon()`
  attaqué directement (clé exacte, mot dans un libellé plus long, casse/accents indifférents, clé à
  deux mots retrouvée au milieu d'un libellé plus long), `addShoppingItem()` (discipline
  synchro-ready, repli sur `'autre'`), la correction de rayon mémorisée par libellé et pas à chaque
  ajout, les fréquents (seuil à 3), le cochage/vidage en tombstone, l'ordre des rayons réglable
  (`rayonOrderSheet()`/`moveRayon()`/`saveRayonOrder()`) et l'intégration au bloc 5 d'« Aujourd'hui »
  (compte seul, jamais la liste ; ne bloque jamais l'état vide ; absent de la pastille). Ces
  scénarios (helper `shopScenario()`) restaurent `S.shopping`/`S.frequents`/`settings.rayonOrder`/
  `settings.rayonOverrides` derrière eux. Depuis le Lot 10, **la revue hebdomadaire** :
  `reviewCandidates()` (dormance à 30 jours, report à plus de 3 fois), `reviewDue()` (le bon jour,
  jamais deux fois dans la même semaine, dates fixes 26/07 et 02/08/2026 — deux dimanches), le flux
  complet des trois issues jusqu'à `S.lastReview` et l'écran de fin (`reviewScenario()` isole
  `S.tasks`/`S.lastReview`/`settings.reviewDay`, comme `scenario()` le fait pour `S.tasks` seul), et
  **les célébrations sobres** : record de série d'habitude (aucun bruit le tout premier jour) et
  première réalisation d'un entretien annuel — les deux en interceptant `win.toast` plutôt qu'en
  lisant le DOM, pour rester fiables même si un toast précédent est encore affiché. Depuis le
  Lot 11, **Réglages** : la bienvenue est testée en tout premier (c'est ce qui s'ouvre réellement
  au tout premier `boot()` sur une base fake-indexeddb vierge — la tester puis la fermer proprement
  évite de laisser son `_onSheetClose` traîner pour les scénarios suivants), le thème
  (`applyTheme()` retombe sur clair sans planter quand `matchMedia` n'existe pas, comme sous
  jsdom), `validateImportPayload()`/`applyImportedData()` (rejet intégral d'un payload invalide
  **sans aucune écriture dans `S`**, remplacement entier si valide — `applyImportedData()` mute `S`
  en place plutôt que de réassigner le `let S`, pour que la référence déjà capturée par le test
  reste valide), `idbClearPhotos()` (réinitialisation) et l'ordre des six groupes de l'écran.
  L'export réel (téléchargement du fichier) et le rechargement après import/réinitialisation ne
  sont pas exercés par le test de fumée : `URL.createObjectURL` et `File.prototype.text()`
  n'existent pas sous jsdom (comme le canvas de `resizePhoto()`, Lot 7, déjà hors test). Depuis le
  Lot V2-4, **Tâches v2** : plus aucun bouton `row-postpone`/`row-del` rendu, `data-swipe-left`/
  `-right` posés à la place ; reporter annulable ; le groupe « Fait » exclut toujours l'entretien,
  `settings.hideDone` pilote bien son existence, et `unDoneTask()` rouvre correctement une tâche
  décochée depuis ce groupe ; la fiche s'ouvre repliée sur une tâche neuve et dépliée dès qu'un
  champ caché porte une valeur non par défaut ; l'indicateur de notes n'apparaît que si `t.notes`
  n'est pas vide ; recherche et filtres n'apparaissent dans le DOM qu'au-delà de `TASK_FILTER_MIN`.
  Le balayage lui-même ne se simule pas sous jsdom (comme au Lot V2-1) — vérifié en conditions
  réelles de clic dans le panneau de prévisualisation, ce qui a d'ailleurs révélé et fait corriger
  le défaut de `js/gestures.js` documenté plus haut. Depuis le Lot V2-5, **Maison v2** : le bouton
  « Fait »/« Arrosé » est annulable et restaure exactement `doneAt`/`history` d'avant (entretien via
  `tapMaisonItem()`, soin via `waterPlantAction()`) ; le corps de la ligne ouvre le détail
  (`taskSheet()`/`plantSheet()`, jamais une complétion directe) et un entretien reste supprimable
  (`data-swipe-left` vers `delTask()`) ; la légende d'un soin suspendu (`cold:0`) n'affiche toujours
  rien, puisque le soin lui-même n'atteint jamais le rendu ; enregistrer une fiche tâche ouverte
  depuis Maison rafraîchit bien Maison (`rerender()`), jamais Tâches en dur. Depuis le Lot V2-7,
  **Habitudes v2** : `habitCalendarHtml()` attaquée directement pour deux mois de formes très
  différentes (28 jours sans jour de tête, 31 jours avec) — toujours 42 cases, jamais une de plus ou
  de moins ; et l'écran `go('habits')` vérifié en conditions réelles de rendu (pas seulement le bloc
  d'Aujourd'hui) : le titre ne vit qu'une fois (en-tête de carte), le pas d'ajout y suit bien
  l'objectif (« +10 » pour 30 min), et une saisie posée sur cet écran se relit bien depuis le même
  journal que celle du bloc d'Aujourd'hui.
  **Depuis le Lot V3-1**, les tests de plantes (saison, soins, fiche, photos) ont disparu avec elles,
  remplacés par **l'entretien du jour** attaqué directement sur `choreDay()` (seul le dû remonte,
  dans la limite du budget, retard relatif puis le plus court ; ce qui est fait aujourd'hui entame le
  budget ; un entretien plus long que le budget passe s'il est seul ; un jour fixe tombe son jour, en
  premier, et revient sept jours plus tard), son rendu (pièce + durée, pastille, cochage annulable,
  état vide), **`packSchedule()`** (pure : décalages dans leur intervalle, aucun jour à plus de
  2 × la moyenne + 10 min sur 28 jours simulés, premier jour allégé), l'installation du pack (pièce
  décochée ignorée, aucun doublon au deuxième passage, annulable d'un bloc), `migratePlants()`
  (idempotente) et la fiche d'un entretien (durée, pas d'effort ni de dates). Piège mis au jour :
  deux tests d'habitudes ne passaient que parce que le Ficus perpétuellement dû empêchait l'état vide
  — `keepTodayOpen()` pose désormais ce rôle explicitement. **Depuis le Lot V3-2**, **Repas**
  (`mealScenario()` isole `S.meals` et la semaine type) : héritage de la semaine type sans créer
  d'objet, tombstone d'un repas revenu à la semaine type, fiche (casse, suggestion apprise en un tap,
  restes annulables qui ne comptent pas comme un plat, cantine sans plat), « Me proposer »
  (déterministe via `rnd` injecté : ni doublon, ni plat récent, ni repas cantine, ni plat déjà posé
  écrasé, annulable), « Reprendre la semaine dernière », la grille (14 cellules, un oiseau), la ligne
  d'Aujourd'hui (silencieuse tant que Menus n'a jamais servi, midi/soir selon l'heure, hors pastille)
  et l'onglet Repas partagé par Menus et Courses.
- **Serveur de développement (Lot V3-4)** : `node tools/serve.mjs [port]` (configuration
  `mylife-dev` de `.claude/launch.json`, port 8641) sert le projet en `Cache-Control: no-store` —
  plus besoin de changer de port pour échapper au cache. Le service worker, lui, reste actif : après
  une modification, recharger une fois suffit (installation en `cache:'reload'` depuis le V3-4).
- **Piège de prévisualisation, reconfirmé au Lot V3-2** : même après `unregister()` du service worker
  et vidage des caches, le nouveau service worker remplit son cache avec `cache.addAll()` — qui passe
  par le cache HTTP du navigateur, donc peut y reprendre l'ancienne version d'un fichier servi sans
  en-têtes par `python3 -m http.server`. Servir avec `Cache-Control: no-store` (un
  `SimpleHTTPRequestHandler` qui ajoute l'en-tête) ou changer de port règle la question.
- **À chaque release** : incrémenter `CACHE` (`sw.js`) **et** `APP_VERSION` (`js/state.js`), même
  numéro (`mylife-b3-N` / `'Bêta 3.N'` en V3).

## Modèle de données (S) — ROADMAP-V1.md §5
```
S = { v:1, tasks:[], habits:[], habitLog:{}, meals:[], shopping:[], frequents:[],
      settings:{userName,weekStart,rayonOrder,rayonOverrides,choreBudget,mealWeek,mealWeekSet,
                todayCap,reviewDay,hideDone,birds,theme},
      lastReview:null, onboarded:false }
```
Depuis le Lot 4, `tasks[]` porte `{id,createdAt,updatedAt,deletedAt,title,doneAt,notes,cat,room,
bucket,start,due,evening,prio,effort,postponed,touchedAt,repeat,history}` — `repeat` est `null` ou
`{kind:'day'|'week'|'month'|'year', n, days:[1..7]=lundi..dimanche, from:'due'|'done'}`, `history`
est `['YYYY-MM-DD', …]` (réalisations passées). `migrate()` a basculé les tâches du Lot 1 en
`bucket:'anytime', cat:'perso', prio:0, effort:2` et pose `repeat:null, history:[]` sur toute tâche
antérieure au Lot 4. Tout objet persisté suit la discipline synchro-ready :
`id` = `crypto.randomUUID()`, `createdAt`/`updatedAt` (ms), `deletedAt` (tombstone, jamais de
suppression dure), aucun compteur global stocké, aucun ordre implicite par position.

Depuis le **Lot V3-1**, un entretien (`room` + `repeat.from:'done'`) porte aussi `mins` (durée en
minutes, lue par le budget ; absent sur un entretien d'avant → déduit de `effort`), et peut tomber à
**jour fixe** : `repeat:{kind:'week', n:1, days:[6], from:'done'}` (la serpillière du samedi). Pièces :
`partout` · `cuisine` · `sdb` · `wc` · `salon` · `chambre` · `bureau` · `cellier` · `balcon` (+
`exterieur`, gardée pour les données d'avant). `plants[]` (Lot 7) n'existe plus : `migratePlants()`
le traduit en entretiens puis le retire, avec `settings.coldFrom/coldTo`. `settings.choreBudget` =
minutes d'entretien proposées par jour (30).

Depuis le Lot 8, `habits[]` porte `{id,createdAt,updatedAt,deletedAt,name,unit,target,sched,sort}` —
`unit` ∈ `''` (coche simple, `target` forcé à 1) / `'min'` / `'fois'` / `'L'` / `'pages'` ; `sched`
est `{kind:'days', days:[1..7]=lundi..dimanche}` (jours fixes) **ou** `{kind:'week', perWeek}`
(quota hebdomadaire libre, sans jour imposé — deux modes traités séparément, jamais l'un comme cas
particulier de l'autre). `habitLog{}` est `{'YYYY-MM-DD':{habitId: valeur|'skip'}}`, journal séparé
des définitions pour ne pas perdre l'historique en renommant/supprimant une habitude. Une valeur
`'skip'` est neutre (ne casse ni n'alimente la série) ; seule `valeur >= target` alimente
`habitStreak()`.

Depuis le Lot 9, `shopping[]` porte `{id,createdAt,updatedAt,deletedAt,label,rayon,qty,done,sort}` —
`rayon` est deviné par `guessRayon()` (`js/shopping.js`) à l'ajout, corrigeable d'un tap ; `qty` est
un texte libre facultatif (« 6 », « 500 g ») ; `sort` fixe l'ordre au sein d'un rayon (aucun ordre
implicite par position). `S.frequents[]` (`{norm,label,rayon,count}`, sans `id`/tombstone : c'est un
compteur d'usage recalculable par libellé, pas un objet du domaine) alimente les fréquents proposés
sous le champ d'ajout dès `count >= 3`. `settings.rayonOrder` (14 clés de `data/rayons.js`, ordre par
défaut `RAYON_ORDER_DEFAULT`) et `settings.rayonOverrides` (`{libellé normalisé: rayon}`, corrections
mémorisées) complètent les réglages.

Depuis le **Lot V3-2**, `meals[]` porte `{id,createdAt,updatedAt,deletedAt,day,slot,dish,leftover,
status,people}` — `slot` ∈ `'midi'`/`'soir'`, `status` ∈ `null`/`'plan'`/`'cantine'`/`'ailleurs'`,
`people` ∈ `null`/1–4 ; `null` = hérité de la semaine type. Un repas n'existe en mémoire que s'il
porte un plat ou s'écarte de la semaine type. `settings.mealWeek` = `{1..7: {midi:{s,p}, soir:{s,p}}}`
(`mealWeekDefault()` : tout à prévoir, 2 personnes), `settings.mealWeekSet` = la semaine type a été
réglée au moins une fois. La bibliothèque de plats n'est pas stockée : elle se recalcule depuis
`meals[]` (`mealDishes()`).

## Règles et pièges à connaître
- **Ouvrir `maquettes/MyLife Canopée.html` avant de dessiner ou de coder un écran.** Elle contient
  les huit écrans, y compris ceux qui ne sont pas encore codés — ne pas en inventer un qui y est
  déjà. C'est ainsi que le Lot 5 a d'abord produit deux maquettes à jeter, et c'est ainsi que les
  Lots 3 et 4 ont dérivé sans le savoir (écarts listés dans « Identité visuelle »). En cas de
  désaccord entre le code livré et la maquette, **c'est la maquette qui gagne** (arbitrage 27/07).
- **Les trois listes miroir** (`<script>` de `index.html`, `ASSETS` de `sw.js`, `FILES` de
  `test.mjs`) doivent toujours lister les **18 mêmes fichiers** dans le même ordre. Piège classique :
  ajouter un fichier sans mettre à jour les trois — l'app marche en local et casse une fois installée.
  (Décompte : 3 `data/` + 15 `js/` = 18 depuis le Lot V3-4 : le V3-1 a retiré `js/plants.js` et
  `data/plantes.js`, le V3-2 ajouté `js/meals.js`, le V3-4 `js/habits-screen.js`. Avant : le Lot 2 avait ajouté `data/oiseaux.js`, le Lot V2-1
  `js/gestures.js` — à chaque fois le même risque, et les trois listes ont bien été mises à jour
  ensemble.)
- **Incrémenter `CACHE` (sw.js) à chaque release**, synchroniser `APP_VERSION` (`js/state.js`) sur le
  même numéro — sinon l'app installée garde silencieusement l'ancienne version.
- Toujours échapper le texte utilisateur avec `esc()`. Jamais `confirm()`/`alert()`/`prompt()`
  natifs — `confirmSheet()` maison pour toute confirmation destructive.
- Suppression = tombstone (`deletedAt = Date.now()` + `touch()`), jamais un `splice()`.
- `js/nlp.js`, `js/review.js` n'ont pas de conteneur DOM (`js/plants.js` non plus, retiré au V3-1) : ne pas essayer d'y faire
  `document.getElementById('s-nlp')` etc., ça n'existe pas et n'existera jamais (nlp est un moteur +
  une barre montée par d'autres écrans, plants rejoindra Maison, review sera une feuille). `js/recur.js`
  non plus, mais pour une autre raison depuis le Lot 4 : c'est un moteur pur (`nextDue`/`freshness`/
  `intervalDays`/`completeTask`), appelé par `js/tasks.js`, `js/maison.js` et `js/today.js`, jamais
  par `go()`.
- **La barre de capture (`js/nlp.js`, Lot 6) vit dans le DOM d'Aujourd'hui ET de Tâches en même
  temps** (les deux écrans restent montés, seul `.active` change) : ses ids sont scopés par écran
  (`cap-input-<écran>`, `cap-preview-<écran>`, lus via `CURRENT_SCREEN`). Ne jamais revenir à un id
  fixe `cap-input` — collision garantie. Et `commitCapture()` relit `input.value` dans le DOM avant de
  parser plutôt que de faire confiance à la variable `_capText` : elle n'est mise à jour que par
  l'évènement `input`, absent quand on modifie `.value` par code (comme le fait `test.mjs`).
- **Une tâche d'entretien (`room` + `repeat.from:'done'`) a toujours un `doneAt`** : elle disparaît
  donc naturellement de l'écran Tâches (`getTaskItems()` filtre `!t.doneAt`) et ne vit que dans
  Maison — et, si sa jauge est basse, dans le bloc Entretien d'« Aujourd'hui ». C'est voulu, pas un
  bug — ne pas « corriger » ce filtre pour la faire réapparaître dans les listes de tâches.
- **Un item ne doit jamais apparaître dans deux blocs d'« Aujourd'hui ».** `todayBuckets()` est écrit
  en cascade pour ça : chaque filtre retire ce que le précédent a pris (échéance dépassée, puis « ce
  soir », puis le bloc du jour). Ajouter un bloc au Lot 7, 8 ou 9 = l'insérer dans cette cascade, pas
  à côté — même quand, comme les courses (Lot 9), il n'y a rien à filtrer et que le bloc n'est qu'un
  compte (`todayBuckets().shopping`). Le test de fumée vérifie explicitement l'absence de doublon.
- **La fiche tâche s'ouvre depuis deux écrans depuis le Lot 5.** Tout ce qui la ferme en modifiant
  l'état doit appeler `rerender()` (ui.js), jamais `renderTasks()` en dur — sinon l'écran d'origine
  reste figé.
- Déploiement : `git push` → GitHub Pages republie (~1 min), Fastly cache ~10 min ensuite — attendre
  avant de soupçonner un vrai bug.
- **Push : autorisé, mais seulement après l'accord explicite de Florian.** Ne jamais pousser de sa
  propre initiative, même quand la checklist de release est verte et le commit fait : commiter et
  pousser sont deux décisions distinctes. Demander, attendre le oui, puis pousser. Un `--force`
  (réécriture d'historique déjà publié) se redemande à part, il n'est jamais couvert par un accord
  de push ordinaire.
- Stratégie de modèles : planifier/arbitrer en Opus, coder les lots en Sonnet, trivial en Haiku.
- **Ne jamais introduire une couleur hors palette** : relire la discipline chromatique ci-dessus
  avant d'écrire la moindre règle CSS. Un `color:` littéral dans un lot est une erreur, sauf le
  `color-mix()` calculé de `gaugeColor()` et l'assombrissement local de `--ink2` sur `.t-courses`.
- La jauge et le champ `.field` supposent `color-mix(in oklab, …)` et `width:max-content` :
  Safari 16.4+. Cible = iPhone à jour, pas de repli prévu.

## État des lots (ROADMAP-V1.md §7)
| Lot | Version | Statut |
|---|---|---|
| **1 — Socle** | Bêta 1.1 | ✅ Fait. Squelette, IndexedDB + `S` + `save`/`saveNow`, boot async, navigation 4 onglets, écran Tâches minimal, service worker, manifeste, icônes, `test.mjs`, ce fichier. |
| **2 — Identité & design system** | Bêta 1.2 | ✅ Fait. Direction « Canopée » validée puis appliquée : jeu complet de variables CSS (clair + `data-mode="dark"`), composants partagés en classes, discipline chromatique écrite ici et en tête du `<style>`, micro-présences d'oiseaux (`data/oiseaux.js` + interrupteur dans Réglages), règle de casse posée à la saisie (`cap()`), Tâches / tab bar / feuilles restylées, `:focus-visible` + `prefers-reduced-motion` partout, colonne centrée > 900 px, contrastes vérifiés par calcul, `maquettes/` retirée — **remise en place au Lot 5**, la référence y vit désormais. **Dettes laissées** : icônes d'app encore grises (revues au Lot 12, reportées en V2) ; écarts de structure vis-à-vis de la maquette, découverts au Lot 5 et corrigés là. |
| **3 — Moteur de tâches** | Bêta 1.3 | ✅ Fait. Modèle Things 3 (`start`/`due`/`bucket`/`evening`/`prio`/`effort`/`postponed`/`touchedAt`) posé par `migrate()`, écran Tâches en 4 groupes (Aujourd'hui et avant / À venir / Un jour / Peut-être repliable), filtres catégorie + recherche + compteurs, tri échéance dépassée → priorité → ancienneté, fiche tâche unique création/édition, report avec compteur discret dès 3. |
| **4 — Récurrence & Maison v1** | Bêta 1.4 | ✅ Fait. Moteur `js/recur.js` pur et testé isolément (`nextDue`/`freshness`/`intervalDays`/`completeTask`, distinction `from:'due'`/`from:'done'` — le cœur du lot), récurrence dans la fiche tâche (fréquence, jours fixes facultatifs, depuis-date-fixe/après-réalisation, phrase en clair), écran Maison en vue par pièce (jauge agrégée + jauge de fraîcheur par élément, tap = fait avec retour visuel), catalogue `data/entretien.js` (~40 modèles) et feuille d'ajout `entretienSheet()`. |
| **5 — « Aujourd'hui » v1** | Bêta 1.5 | ✅ Fait. Maquettes validées (`maquettes/today.html`, `maquettes/today-vide.html`) puis codées : `js/today.js` (blocs 1, 2, 3, 6, 7 de ROADMAP §6, tri, plafond `todayCap`, seuil d'entretien, cochages de session, état vide), pastille iOS (`updateBadge()` dans `boot.js`), `rerender()` dans `ui.js` (la fiche tâche s'ouvre désormais depuis deux écrans), plancher de jauge `gaugeWidth()`. **Mise en conformité incluse** (arbitrage du 27/07) : titres de groupe en `.sec` 18 px sur Tâches, cartes de pièce blanches + jauge à droite sur Maison, `.empty` à 140 px. **Hors périmètre** : les blocs Habitudes et Courses de la maquette ne sont pas codés — leurs modèles de données n'existent pas encore, et leur CSS n'a donc pas été posé (ce serait du CSS mort). Chaque domaine pose son bloc dans son propre lot : **plantes au 7, habitudes au 8, courses au 9** (contradiction ROADMAP levée le 27/07, cf. §7). |
| **6 — Saisie rapide** | Bêta 1.6 | ✅ Fait. `js/nlp.js` : `parseQuick()` pur (dates relatives/absolues, échéance explicite `avant/pour/deadline` → `due`, récurrence à date fixe ou après réalisation, ce soir, priorité, effort, catégorie/pièce par dièse, tout le non-reconnu reste dans le titre) et la **barre de capture universelle** sur Aujourd'hui et Tâches (aperçu à puces supprimables, `commitCapture()`, bouton discret « Détails… » → fiche du Lot 3 préremplie). Remplace l'ancien champ « Ajouter une tâche » (`addTask()` retiré). Plus de 50 cas de test sur `parseQuick()`. |
| **7 — Maison v2 (plantes)** | Bêta 1.7 | ✅ Fait. Catalogue `data/plantes.js` (~40 espèces, intervalles chaud/froid + rempotage), modulation saisonnière `plantSeason()` (`js/plants.js`) réutilisant `freshness()`/`completeTask()` de `js/recur.js` sans dupliquer le moteur, fiche plante (`plantSheet()` : identité, pièce, photo redimensionnée/recompressée en JPEG, jauges des trois soins, historique, boutons d'action immédiate), intégration à l'écran Maison (mêlée à l'entretien, par pièce) et au bloc du jour d'« Aujourd'hui » (soins réellement dus, jamais le bloc Entretien). |
| **8 — Habitudes** | Bêta 1.8 | ✅ Fait. Moteur `js/habits.js` — série et quota, **jamais** une jauge de fraîcheur (frontière `CONVENTIONS.md` §6, ne réutilise donc pas `js/recur.js`) ; deux modes de planification traités séparément (`sched:{kind:'days',days}` / `sched:{kind:'week',perWeek}`) ; jour sauté neutre et progression partielle (seule l'atteinte de `target` alimente `habitStreak()`) ; bloc permanent d'« Aujourd'hui » en position 4 de la cascade (saisie en ligne, ± sous `HAB_STEP_MAX`, clavier numérique au-delà, jamais « Sauter » et deux boutons sur la même ligne — CSS repris de `maquettes/today.html`) ; écran secondaire `go('habits')` (fiche `habitSheet()`, calendrier mensuel à quatre états fait/partiel/sauté/inactif, **pas** un cinquième « manqué » — CONVENTIONS.md §3 proscrit le ton culpabilisant) ; série en cours, record (`habitBestStreak()`) et taux de réussite sur 30 jours (`habitRate30()`). |
| **9 — Courses** | Bêta 1.9 | ✅ Fait. Dictionnaire `data/rayons.js` (~430 libellés, `guessRayon()` par groupes de mots consécutifs, du plus long au plus court) ; correction de rayon mémorisée par libellé (`settings.rayonOverrides`), pas à chaque ajout ; cartes par rayon triées selon `settings.rayonOrder` (réglable, flèches haut/bas) ; mode magasin (gros libellés, Wake Lock avec garde de disponibilité, coché grisé en bas du rayon jamais retiré) ; produits fréquents (`S.frequents[]`, ≥ 3 ajouts) ; vidage des cochés en tombstone, jamais automatique ; bouton d'Aujourd'hui en position 5 de la cascade (une ligne, jamais la liste, ne bloque jamais l'état vide, absent de la pastille — même traitement que le bloc 7). |
| **10 — « Aujourd'hui » v2 & revue** | Bêta 1.10 | ✅ Fait. Passe de vérification (pas de construction) sur la cascade des 7 blocs de ROADMAP §6 : ordre et absence de doublon confirmés, la pastille ne comptait déjà que les dus. `js/review.js` rempli : la revue hebdomadaire (`reviewCandidates()`, `reviewDue()`, flux une tâche à la fois — faire cette semaine / un jour / abandonner —, écran de fin sobre), déclenchée au boot (`maybeStartReview()`) et accessible à la demande depuis Réglages. Motivation légère sans le moindre score : `celebrateHabitRecord()` (record de série, jamais le premier jour) et un toast à la première réalisation d'un entretien annuel (`tapMaisonItem()`/`tapTodayCare()`). Compteur de reports déjà posé aux Lots 3/5, vérifié conforme. |
| **11 — Réglages & filet de sécurité** | Bêta 1.11 | ✅ Fait. Écran Réglages en six groupes (Profil, Aujourd'hui, Maison, Courses, Données, À propos) : prénom, apparence (interrupteur de mode sombre `setTheme('light'\|'dark'\|'auto')`, 'auto' suit `prefers-color-scheme`), Oiseaux (déjà là depuis le Lot 2), plafond du jour, jour de revue, saison froide des plantes, ordre des rayons (réutilise `rayonOrderSheet()` du Lot 9). Export/import JSON complets de `S` (photos exclues, signalé explicitement à l'écran), import validé intégralement avant toute écriture (`validateImportPayload()`/`applyImportedData()`). Réinitialisation en deux temps (proposer l'export, puis seulement le bouton danger) avec purge du store `photos`. Feuille de bienvenue au tout premier lancement (`maybeWelcome()`, trois écrans, jamais revue une fois fermée) ; `migrate()` marque d'office `onboarded=true` sur une base déjà peuplée. Le mode sombre n'était pas dans les six points du prompt de lot mais explicitement promis ici par ce fichier et par ROADMAP-V1.md §7 (« il arrivera avec Réglages au Lot 11 ») : inclus après arbitrage avec Florian. |
| **12 — Polish, QA, dettes** | Bêta 1.12 | ✅ Fait. Dernier lot du cycle V1, aucune fonctionnalité nouvelle. Audit accessibilité/tactile : une seule cible sous 44 px trouvée (`.chip`, 40 px) et corrigée à 44 ; `:focus-visible`, `prefers-reduced-motion` et zone sûre iOS déjà conformes depuis le premier écran, rien à corriger ; contrastes recalculés par calcul (WCAG) sur toutes les paires ink/ink2 × bg/card/teintes de domaine, clair et sombre : toutes ≥ 4,5:1, aucune régression. `role="checkbox"`/`aria-checked` ajoutés aux 5 boutons `.check` (tasks.js, today.js ×2, shopping.js, maison.js), qui n'exposaient jusque-là qu'un `aria-label` sans état. Audit textuel : aucun emoji, aucune casse fautive, aucun « en retard »/« manqué » hors du seul emploi légitime (échéance réelle d'une tâche, `js/tasks.js`) ; point laissé ouvert au Lot 5 tranché — l'état vide d'Aujourd'hui a désormais deux variantes selon `b.evening.length` (« Rien ne demande ton attention avant ce soir. » s'il reste quelque chose ce soir, « Il ne reste rien à faire aujourd'hui. » sinon). Audit des chemins redondants : une seule vraie redondance trouvée (`rayonOrderSheet()` accessible à l'identique depuis Réglages ET depuis Courses) ; soumise à Florian, qui a choisi de garder les deux (centralisation vs. contexte d'usage) — aucune suppression faite. Dettes techniques : purge des tombstones >90 j déjà en place (rien à faire) ; deux classes CSS orphelines retirées (`.card.t-plantes`, `.card.t-courses` — jamais posées en HTML depuis que Lot 5/7/9 ont gardé Maison et Courses en cartes blanches ; les variables `--t-plantes`/`--t-courses` restent définies, la première est désormais un token dormant) ; aucun `style="..."` non calculé trouvé (les 6 existants sont tous des jauges/oiseaux calculés, légitimes) ; aucune fonction morte détectée (recherche automatisée sur toutes les déclarations `function` de `js/`+`data/`) ; aucun fichier au-dessus de 600 lignes (le plus long est `js/habits.js`, 447 lignes). Les 3 listes miroir revérifiées fichier par fichier : toujours les 17 mêmes, dans le même ordre. `QA-IPHONE.md` créé (checklist à dérouler sur l'iPhone réel : installation, mode avion, pastille, persistance 48 h, photo de plante, mode magasin/Wake Lock, glisser-fermer, zone sûre, mise à jour du service worker, export/import). |

## Cycle V3 « Le vrai usage » — en cours
Plan complet dans `ROADMAP-V3.md` (constat et décisions du 29/09/2026, amendements §3, trois lots).
Florian n'utilisait pas l'app : la remplir coûtait trop cher. Il a donné **carte blanche** pour
préparer et coder la suite ; les deux premiers lots ont été faits dans la même session (entorse
assumée à « un lot = une session »), chacun avec son commit et sa version.
- **V3-1 — Maison prête à l'emploi** (Bêta 3.1) : ✅ Fait. Pack maison de 40 entretiens décrit avec
  Florian (`data/entretien.js`, `pack:true`), installé d'un tap et étalé (`packSchedule()`) ; budget
  d'entretien quotidien de 30 min (`choreDay()`, bloc « Entretien du jour » sur Aujourd'hui, « N autres
  attendent demain ») ; serpillière d'une traite, à jour fixe le samedi (`repeat.days` + `from:'done'`) ;
  durée en minutes sur chaque entretien et fiche d'entretien dédiée (pièce, durée, rythme — sans
  dates, priorité ni « ce soir ») ; pièces du logement (`partout`, `wc`, `cellier`, `balcon`,
  `sdb` libellée « Salle de bain ») ; **plantes retirées** (`js/plants.js`, `data/plantes.js`,
  photos, saison froide), `migratePlants()` pour une base qui en avait.
- **V3-2 — Repas** (Bêta 3.2) : ✅ Fait. `js/meals.js` (17ᵉ fichier) : écran Menus, semaine type,
  exceptions seules stockées, compte (repas, portions, à choisir), plats appris, restes, « Me
  proposer », « Reprendre la semaine dernière », quelques courses depuis un repas ; onglet **Repas**
  (Menus | Courses) à la place de Courses ; « Ce soir : … » sur Aujourd'hui.
- **V3-4 — Qualité du code** (Bêta 3.4) : ✅ Fait, carte blanche de Florian pour « améliorer tout le
  code ». Revue intégrale fichier par fichier ; les bugs trouvés d'abord, la maintenabilité ensuite.
  **Récurrence** (`js/recur.js`) : une tâche « après réalisation » **sans pièce** recevait un `doneAt`
  comme un entretien, quittait Tâches sans jamais entrer dans Maison — elle **disparaissait** après
  sa première réalisation ; et le `start` d'une tâche récurrente ne bougeait pas, qui la gardait dans
  « Aujourd'hui » tous les jours. `completeTask()` distingue désormais l'entretien (pièce +
  `from:'done'`, `doneAt`) de la tâche récurrente **ouverte** (reste active, avance à sa prochaine
  occurrence, le début suit l'échéance en gardant son avance), et pose `touchedAt`. Cœur pur extrait :
  `nextOccurrence(r, anchor)` (mois/années **bornés** au dernier jour — le 31 janvier + 1 mois faisait
  le 3 mars — et `repeat.dom` pour « tous les 31 du mois »), `firstOccurrence()`. Annulation : un seul
  cliché `completionSnapshot()`/`restoreCompletion()` (trois copies avant, aucune ne gardait `start`).
  `migrate()` **répare** l'existant (`repairRecurring()` : les tâches disparues reviennent, les débuts
  coincés s'effacent), **assainit** ce qui finit dans un `onclick=` (`sanitizeKeys()` : id, pièce,
  jour de repas, clé de fréquent — un fichier importé piégé ne peut plus injecter de JS) et tolère les
  structures abîmées. **Jamais de perte silencieuse** : un état stocké illisible est recopié sous
  `S-illisible-<jour>` avant de repartir de zéro (`loadState()`), signalé au démarrage, exportable
  depuis Réglages (`corruptExportAction()`). **Parseur** (`js/nlp.js`) : « court », « long »,
  « urgent », « important » ne sont plus des consignes qu'en fin de phrase (« Réserver le court de
  tennis » perdait son « court ») ; une date impossible (« 31/02 », « le 45 ») reste dans le titre au
  lieu de produire `NaN undefined` ; « le 31 » un mois de 30 jours vise le mois suivant ; une
  récurrence sans date reçoit sa première occurrence (« Sport tous les lundis » tombe lundi, « tous les
  5 du mois » le 5) ; dièses accentués et synonymes (`#toilettes`, `#extérieur`, `#maison`).
  **Revue** : plus jamais une tâche récurrente ni datée dans le futur (« Abandonner » supprimait un
  loyer mensuel). **Service worker** : installation en `cache:'reload'` (après un push, il pouvait
  remplir son cache neuf avec l'ancienne version, encore fraîche dans le cache HTTP de Pages),
  revalidation au serveur (`no-cache`), navigation avec paramètres servie hors-ligne, adresse inconnue
  renvoyée à la racine, rien d'externe. **Robustesse** : bascule de jour (`refreshIfNewDay()`, rouverte
  le lendemain l'app montrait la veille), erreur inattendue signalée par un toast
  (`onUnexpectedError()`), clic fantôme après un balayage avalé, oiseaux re-rendus au changement de
  thème système, habitude à jours fixes sans jour refusée. **Maintenabilité** : `removeWithUndo()`
  (quatre suppressions écrites à la main — celle d'une habitude n'était pas annulable), `isoDow()`
  dans `state.js`, `habits.js` scindé en `habits.js` (moteur + bloc du jour) et `habits-screen.js`
  (écran, fiche, calendrier), `tools/serve.mjs` (serveur de dev sans cache). **Tests** : harnais
  réparé (`String.replace` avec une chaîne interprétait le `$'` d'une regex de l'app), fin de
  processus explicite, une trentaine d'assertions nouvelles.
- **V3-3 — Mouvement, finition, QA** (Bêta 3.3) : ✅ Fait, carte blanche de Florian pour « tout
  améliorer ». Précédé d'un **audit mesuré** de l'app réelle (pack installé, jeu de données complet,
  clair et sombre), dont sont sortis la plupart des correctifs. **Mouvement** : fondu d'écran dans
  `go()` (opacité seule — un transform ferait sauter la barre de saisie `position:fixed`), rebond de
  la case et coche tracée (`markPop()`/`popClass()` sur le nouveau rendu, `popThen()` sur place quand
  la ligne va disparaître, Tâches), délais d'animation remis à zéro sous `prefers-reduced-motion`
  (vérifié : règle CSS dans le CSSOM, chemins JS stubés). **Oiseaux en mode sombre** (audit D4) :
  `birdsOn()` ne les coupe plus, `OISEAUX_SOMBRE` remplace le plumage presque noir au rendu, un voile
  CSS atténue l'éclat. **Haptique** : `switchHtml()` pose `<input type="checkbox" switch>` si le
  navigateur le connaît (Safari 17.4+, `switchNative()`), l'ancien `.switch` sinon — non vérifiable
  hors iPhone, `QA-IPHONE-V3.md` §5. **Accessibilité** : contrastes recalculés sur 48 paires ×
  2 modes (seule `--ink2`/`--t-courses` est sous 4,5, et n'est portée par aucun texte) ; **toutes**
  les cibles mesurées ≥ 44 px, ce qui a révélé que `.row-main` (le tap qui ouvre une fiche) ne
  couvrait que la hauteur de son texte — 24 px pour un article de courses — corrigé pour toute la
  ligne ; `aria-pressed` sur les 27 puces à état (dette V1-12 soldée) ; `aria-current` sur l'onglet ;
  toast en `aria-live` ; feuille en `role="dialog"` nommée par son titre ; Échap ferme la feuille ;
  `.seg` à 44 px. **Correctifs d'audit** : case rognée sur les lignes balayables (`.check` à −7 px) ;
  champ de recherche de Tâches pleine largeur ; respiration entre le bloc du jour et la carte
  suivante ; Maison **replié** (seul le dû à 2 jours est déplié, `MAISON_SOON_DAYS`,
  `toggleMaisonRoom()`, 4 158 → 2 194 px avec le pack) ; un entretien jamais fait n'apparaît plus
  dans Tâches ni dans la revue (`openTasks()`, `isChore()`) ; la barre de saisie retient une durée
  chiffrée (`mins`, « 30 min » restait dans le titre) et annonce « Entretien ajouté à Maison » ;
  habitudes sans « Série 0 j », sans doublon sur l'écran Habitudes, planning dit en mots (« Tous les
  jours », « En semaine », « Le week-end »), « Sauter » calé à droite, boutons `.step` visibles en
  sombre ; bloc Repas unique sur Aujourd'hui (`.repas-block`). **Finitions** : **icônes d'app
  Canopée** (le cacatoès de `data/oiseaux.js` sur une branche verte, fond crème — dette V1-2 soldée,
  générateur gardé dans `tools/gen-icons.mjs`, sans dépendance) ; export par la **feuille de partage
  iOS** (`navigator.share` + fichier, repli sur le téléchargement) et « Dernière sauvegarde : … »
  (`S.lastExport`) ; toast « MyLife est à jour » à l'arrivée d'une version (`announceUpdate()`,
  `S.seenVersion`) ; code mort retiré (`freshness()`, champ `duo`). `QA-IPHONE-V3.md` écrit.

## Cycle V2 « L'usage » — clos à Bêta 2.7
Plan complet dans `ROADMAP-V2.md` (audit du 14/08/2026, arbitrages §3, huit lots) ; `CONVENTIONS.md`
reste la loi permanente, amendée par ce même §3. Le **V2-8** n'a pas été fait : il est reporté en
V3-3, la V3 changeant les écrans qu'il devait finir.
- **V2-1 — Socle d'interaction** (Bêta 2.1) : ✅ Fait. `js/gestures.js` (balayage, non encore posé
  sur aucune ligne — c'est aux Lots V2-4/5/6), `undoable()`/`rowAttrs()` dans `js/ui.js`, `role`/
  `tabindex`/Entrée-Espace posés sur les 7 lignes cliquables existantes (audit D3), correctifs D1
  (`textarea`/`select` en `font:inherit`) et D2 (`theme-color` suit `applyTheme()`).
- **V2-2 — Navigation & saisie** (Bêta 2.2) : ✅ Fait. Cinquième onglet **Habitudes** dans la tab bar
  (icône « répéter », même style que les quatre autres) : `go('habits')` était jusqu'ici inatteignable
  à zéro habitude (audit A3), `renderHabits()` savait déjà rendre un état vide + le bouton « Ajouter
  une habitude » sans défiler (posé au Lot 8) — seule la porte d'entrée manquait. La barre de capture
  (`.capture`, Aujourd'hui/Tâches) et le champ d'ajout de Courses (même classe, réutilisée telle
  quelle par `js/shopping.js`) sont désormais **fixés juste au-dessus de la tab bar** (audit A1),
  sous `.sheet-bg` (z-index 30 < 50) ; `.app` gagne un `padding-bottom` supplémentaire piloté par
  `body.capture-open`, posée par `go()` selon `CAPTURE_SCREENS`. `go()` mémorise aussi la position de
  défilement quittée sur chaque écran (`_scrollPos{}` / `scrollPosFor()`, `js/ui.js`) et la restaure
  au retour, sauf en retapant l'onglet déjà actif (remonte en haut, convention iOS).
- **V2-3 — « Aujourd'hui » v3** (Bêta 2.3) : ✅ Fait. Maquettes d'abord
  (`maquettes/today-v2.html`, `maquettes/today-v2-vide.html`), validées, puis codées. Cinq
  changements et rien d'autre : **le prénom** entre dans le sur-titre et dans l'état vide
  (`todayOverline()`/`userFirstName()`, audit C1 + §3.6 — pas de salutation selon l'heure, pas
  d'emoji, et la date seule si aucun prénom n'est posé) ; **les soins de plantes ne tombent plus
  sous le plafond** (`todayShown()`, jusqu'à 3 places réservées à la tête du bloc, audit B3) ;
  **cocher est annulable et une ligne cochée se décoche** (`todayDone()` pose un cliché et appelle
  `undoable()`, `todayUndone()` le restitue, la case n'est plus `disabled`, audit A2) ; **la saisie
  d'habitude** passe au pas adapté à l'objectif et au bouton « Fait » (`habStep()`/`reachHabit()`,
  audit B8 — le champ numérique et `HAB_STEP_MAX` disparaissent) ; **la barre de saisie collée**
  du Lot V2-2 est enfin dessinée sur cet écran. Un défaut trouvé en dessinant et corrigé au passage :
  le toast était caché derrière la barre de saisie collée depuis le Lot V2-2, donc l'« Annuler »
  inatteignable — `body.capture-open .toast` le relève.
- **V2-4 — Tâches v2** (Bêta 2.4) : ✅ Fait. `js/tasks.js` seul touché (+ son CSS). Les boutons
  permanents `>`/`×` des lignes disparaissent : balayer à gauche supprime (`delTask()`), à droite
  reporte (`postponeTask()`, désormais annulable lui aussi) — seul le groupe « Aujourd'hui et
  avant » porte le sens droit, la fiche reste le chemin de secours partout (§3.3). Fiche tâche en
  divulgation progressive (`_tSheet._more`, `tsHasExtras()`) : titre + dates + Enregistrer
  visibles d'emblée, le reste derrière « Plus d'options » — déplié d'office si la tâche porte déjà
  une valeur non par défaut dans un de ces champs (audit A5). Groupe **« Fait »** repliable en bas
  de l'écran (`taskDoneItems()`, fenêtre de 7 jours, sous-groupes « aujourd'hui »/« cette
  semaine ») : `settings.hideDone` pilote enfin son existence (audit C2) — `true` le masque
  entièrement, son ouverture/fermeture à l'écran reste une préférence de session comme « Peut-être »
  ; un entretien (`room`+`repeat.from:'done'`) en est exclu par construction, il garde toujours un
  `doneAt`. `doneTask()` devient annulable (cliché exact, comme `todayDone()`) ; décocher une ligne
  du groupe « Fait » (`unDoneTask()`) rouvre la tâche sans chercher à restituer l'échéance exacte
  d'avant — une décochage tardive n'a pas le même besoin de fidélité qu'un « Annuler » à chaud.
  Indicateur de notes discret (14 px, `IC_NOTE`) à côté du titre si `t.notes` n'est pas vide (audit
  C3). Recherche et filtres de catégorie n'apparaissent plus qu'au-delà de `TASK_FILTER_MIN` (6
  tâches ouvertes) — en dessous ils sont retirés du DOM et leur état est réinitialisé, pour ne
  jamais laisser un filtre actif sans moyen visible de le lever.
  **Correctif hors périmètre déclaré, nécessaire à l'acceptation du lot** : `js/gestures.js`
  (Lot V2-1) préparait le calque `.swipe-content` dès `pointerdown`, sur toute ligne portant
  `data-swipe-left`/`-right` — donc désormais toutes les lignes de Tâches. Ce lot est le premier à
  poser ces attributs sur de vraies lignes tapables ; le défaut était donc resté invisible jusqu'ici.
  Or ce reparentage synchrone pendant `pointerdown` fait perdre au navigateur le clic de synthèse
  qui devait suivre un simple tap immobile (confirmé en conditions réelles de clic, pas seulement
  sous jsdom) — un tap sur une ligne n'ouvrait plus sa fiche. Corrigé en différant
  `swipePrepareRow()` du `pointerdown` au premier `pointermove` qui verrouille le balayage
  horizontal : un tap qui ne bouge pas ne touche plus jamais au DOM, un vrai balayage se comporte
  à l'identique. À surveiller aux Lots V2-5/V2-6, qui posent `data-swipe-*` sur d'autres écrans.
- **V2-5 — Maison & plantes v2** (Bêta 2.5) : ✅ Fait. `js/maison.js`, `js/plants.js`,
  `gaugeWidth()`/`gaugeColor()` (`js/ui.js`) et leur CSS seuls touchés (ROADMAP-V2.md §3.7, audits
  A4/B1/B2/B4/C4). **Un bouton d'action explicite par ligne** (point 1, audit A4) : `.row-act` à
  droite (« Fait », « Arrosé », « Engrais », « Rempoté ») agit immédiatement et s'annule
  (`undoable()`, restaure `doneAt`/`history` exacts) ; le corps de la ligne (`row-main`) ouvre
  toujours le détail — c'en est fini du tap sur toute la ligne qui complétait un entretien sans
  confirmation. **La légende dit ce qu'il faut faire** (point 2, audit B2) : `freshCue(f, days)`
  remplace « il y a N jours » par « À faire »/« Dans N j »/« Dans N semaines », dérivé de la même
  fraction que la jauge. **La jauge redevient discriminante** (point 3, audit B1) :
  `rawFreshness(doneAt, days)` (`js/ui.js`) n'est plus bornée à 0 comme `freshness()` — la largeur
  décroît sous son plancher de 4 % vers une asymptote à 1 % au lieu de s'y figer, pour que « dû
  depuis 1 jour » se distingue de « dû depuis 30 jours ». **La jauge agrégée de pièce** (point 4,
  audit B4) cède la place à un simple compte (« N élément(s) à faire »/« Tout est frais ») :
  minimum de ses éléments, elle était rouge dès qu'un seul était dû et redondante avec la ligne du
  dessous. **Édition et suppression d'un entretien** (point 5, dette V1/C4) : le détail réutilise
  `taskSheet()` tel quel (édite, y compris la récurrence), un balayage à gauche vers `delTask()` le
  supprime (réutilisé de `js/tasks.js`, jamais dupliqué) — vérifié que l'enregistrement depuis
  Maison rafraîchit bien Maison (`rerender()`), pas Tâches en dur. **Fiche plante allégée**
  (point 6) : divulgation progressive comme la fiche tâche du Lot V2-4, le réglage des intervalles
  derrière « Plus de réglages » (`.more-toggle`, réutilisée telle quelle). `maisonAgo()`/
  `freshLabel()` : la première reste vivante pour `today.js` (`careCard()`), la seconde est retirée
  (orpheline).
- **V2-6 — Courses v2** (Bêta 2.6) : ✅ Fait. `js/shopping.js`, `data/rayons.js` et leur CSS seuls
  touchés (ROADMAP-V2.md §3.8, audits B7/D5). **Liste continue à en-têtes collés** (point 1, cœur du
  lot) : `shopRayonCard()` disparaît, remplacée par `shopRayonSection()`/`shopRayonHeadHtml()` — un
  seul `<ul class="list-page">` (hors carte, comme le bloc du jour d'Aujourd'hui), l'en-tête de
  chaque rayon restant collé en haut au défilement (`.rayon-head`, `position:sticky`) ; 14 articles
  tiennent désormais en ~1 écran au lieu de 2,3. Écart ASSUMÉ vis-à-vis de la maquette Canopée
  (amendement §3.8) : ne pas y revenir. **Mode magasin repensé** (point 2) : `.shop-bar` (bascule
  Liste/Mode magasin) devient elle aussi collante, juste au-dessus des en-têtes de rayon, et porte
  la progression globale en mode magasin (« N / M pris ») ; un rayon entièrement coché se signale
  (« Tout pris », dans les deux modes) — texte neutre, jamais vert : ce n'est pas une action
  possible. Gros libellés, Wake Lock, coché grisé en bas et jamais retiré, vidage explicite :
  inchangés. **Balayage** (point 3) : `data-swipe-left` vers `deleteShopItem()` (déjà annulable,
  refactoré pour appeler `undoable()` plutôt qu'un `toast()` manuel) et `data-swipe-right` vers
  `toggleShopDone()` — les deux doublent des chemins déjà là (case, fiche), aucun chemin exclusif ;
  aucune classe nouvelle, `js/gestures.js` du Lot V2-1 suffisait. Plus de carte sur cet écran = plus
  de bird, comme `js/tasks.js` (même raison). **Dictionnaire** (point 4, audit D5) : « pâtes » seul
  bascule de `frais` vers `epicerie-salee` (sens courant, pâtes sèches) ; le sens frais exige
  désormais les deux mots, `pates fraiches`. Revue du reste du dictionnaire à la recherche du même
  travers (un mot générique ayant perdu son sens courant au profit d'un cas particulier) : aucun
  autre cas trouvé, le reste distingue déjà correctement le générique de ses variantes.
- **V2-7 — Habitudes v2** (Bêta 2.7) : ✅ Fait. `js/habits.js` et son CSS seuls touchés
  (ROADMAP-V2.md §2, audits B5/B6/B8). **Calendrier lisible** (point 1, audit B6) : nom du mois,
  en-tête « L M M J V S D », numéro dans chaque case, et toujours 42 cases (`HAB_CAL_CELLS`, 6
  semaines — le maximum qu'un mois puisse jamais demander) : la carte ne bouge plus ni du 1er au 31,
  ni d'un mois à l'autre. Toujours **quatre** traitements — fait / partiel / sauté / inactif — pas un
  cinquième : un jour à venir (`future`) reste de la chronologie, pas un jugement. **Méta éclatée**
  (point 2, audit B5) : `habitPlanTxt()` (planification + objectif) et `habitStatsHtml()` (Série /
  Record / 30 jours, trois colonnes avec leur libellé court) remplacent la phrase de trois lignes —
  mêmes trois chiffres qu'avant, aucun score de plus. **Saisie par pas adapté** (point 3, audit B8) :
  le pas adapté à l'objectif et le bouton « Fait » existaient déjà depuis le Lot V2-3 pour le bloc
  d'Aujourd'hui ; ce lot les pose aussi sur l'écran Habitudes, **en rejouant la même fonction**
  (`habitRowHtml(h, {title:false})`, le paramètre ne fait que taire le titre déjà posé par l'en-tête
  de la carte) plutôt que de réimplémenter la décision « ligne de contrôles ou ligne compacte ».
  **Écran vérifié** (point 4) : état vide déjà utile, bouton d'ajout déjà accessible sans défiler à
  zéro habitude — rien à corriger. Balayage écarté sciemment : les actions (Sauter/±/Fait) sont déjà
  des taps directs et immédiats, contrairement à Tâches/Maison/Courses où le balayage économise un
  aller-retour vers la fiche ; l'ajouter ici aurait doublé un geste déjà à un tap, pas simplifié un
  chemin. **Note du prompt** (point 5) : `habitBestStreak()` corrigée — elle cherchait depuis
  `createdAt` seul, alors que `habitStreak()` (la série en cours) ne l'est pas ; un import de données
  portant des jours de journal antérieurs à la création pouvait donc afficher un record inférieur à
  la série en cours. Corrigé en quelques lignes (`habitEarliestLogDay()`) plutôt que noté en dette.

## Cycle V1 clos — dettes sciemment laissées pour la V2
Le Lot 12 a fermé le cycle V1. Rien ci-dessous n'est un oubli : chaque point a été examiné et
reporté délibérément, hors périmètre d'un lot « polish sans nouvelle fonctionnalité ».
- ~~Icônes d'app encore grises~~ — **refaites au Lot V3-3** (cacatoès sur sa branche,
  `tools/gen-icons.mjs`). Une icône déjà installée ne change pas d'elle-même : réinstaller, en
  exportant d'abord (supprimer l'app de l'écran d'accueil efface ses données).
- ~~Pas de chemin d'édition/suppression pour une tâche d'entretien~~ — **comblé au Lot V2-5**
  (fiche au tap, balayage pour supprimer), fiche d'entretien dédiée depuis le Lot V3-1.
- ~~Sémantique ARIA des `.chip`~~ — **soldée au Lot V3-3** : `aria-pressed` sur les 27 puces à état.
  Pour mémoire, le constat d'origine : elles servent tantôt de filtre à sélection unique (catégorie,
  pièce, priorité, effort, mode Liste/Mode magasin), tantôt de multi-sélection (jours de semaine
  d'une récurrence), tantôt de puce supprimable (aperçu de capture). Aucune ne porte de rôle ARIA
  au-delà du texte visible. Un passage cohérent (`role="radiogroup"`/`radio` pour le sélecteur
  simple, `aria-pressed` pour le multi-sélection) toucherait une dizaine de générateurs de HTML
  dans `tasks.js`, `habits.js`, `shopping.js`, `settings.js` — non fait au Lot 12 par
  prudence (risque de régression disproportionné pour une amélioration purement sémantique, sans
  impact visuel). Les contrastes et tailles de cible, eux, sont conformes (voir tableau Lot 12).
- ~~`--t-plantes` (variable CSS) dormante~~ — **retirée au Lot V3-1**, avec les plantes.
- ~~`js/habits.js` à 628 lignes~~ — **scindé au Lot V3-4** (`habits.js` 403 lignes, moteur et bloc
  du jour ; `habits-screen.js` 228 lignes, écran, fiche et calendrier).
- **`rayonOrderSheet()` dupliqué** (Réglages → Courses, et l'écran Courses lui-même) : audité au
  Lot 12, Florian a choisi de garder les deux. Ce n'est donc pas une dette, mais une décision à ne
  pas re-questionner sans raison nouvelle.

## Dépôt et mise en ligne — état réel
- Dépôt **public** : `github.com/MegaXuu/mylife`, distant `origin`, branche `main`. **Il existe
  depuis le Lot 1** — ne pas proposer de le créer.
- GitHub Pages : **actif**, branche `main`, racine `/` → **https://megaxuu.github.io/mylife/**.
- Identité git du dépôt : `Florian Perez <305554896+MegaXuu@users.noreply.github.com>`. **Adresse de
  renvoi GitHub, jamais l'adresse personnelle** : le dépôt est public et l'historique est moissonné.
  Elle est posée en config locale du dépôt ; ne pas la remplacer par l'adresse réelle.
- Reste à la main de Florian : installer sur l'iPhone (Safari → Partager → Sur l'écran d'accueil),
  et donner le feu vert à chaque push (cf. règle ci-dessus).
