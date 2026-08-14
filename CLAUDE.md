# CLAUDE.md — MyLife (mémoire de projet)

> Lu automatiquement par Claude Code à chaque session. Garder ce fichier **court et à jour**.
> Les règles permanentes vivent dans `CONVENTIONS.md` (à relire en entier à chaque lot) ; le plan
> complet dans `ROADMAP-V1.md`. Ce fichier ne répète que ce qui est vrai *maintenant*.

## Le projet en une phrase
App PWA **personnelle**, installée sur iPhone, qui répond à « qu'est-ce que je dois faire
maintenant ? » — tâches, entretien de la maison, plantes, habitudes, courses. **100 % hors-ligne,
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
- Versionnage affiché : **Bêta N.M** (`N`=1 en V1, `N`=2 depuis le cycle V2 ouvert au Lot V2-1),
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
`test.mjs` (`FILES`) — **18 fichiers** au total depuis le Lot V2-1 (`js/gestures.js` ajouté après
`js/ui.js`) :
```
data/rayons.js · data/plantes.js · data/entretien.js · data/oiseaux.js
→ js/state.js → js/ui.js → js/gestures.js → js/recur.js → js/nlp.js → js/today.js → js/tasks.js
→ js/maison.js → js/plants.js → js/habits.js → js/shopping.js → js/review.js
→ js/settings.js → js/boot.js (toujours en dernier)
```
Deux seules règles dures : `state.js` en premier (socle `S`, aucun rendu DOM), `boot.js` en dernier
(démarrage). Entre les deux l'ordre est libre — aucun code exécuté au chargement dans ces fichiers,
uniquement des déclarations.

- `index.html` — squelette + **tout le CSS** (`<style>` : discipline chromatique en commentaire,
  `:root` complet « Canopée », puis les composants partagés) + conteneurs d'écrans `#s-today
  #s-tasks #s-maison #s-shopping #s-habits #s-settings` + tab bar 4 onglets (Aujourd'hui · Tâches ·
  Maison · Courses, icônes SVG inline, zone sûre iOS) + feuille modale (`#sheet-bg`/`#sheet`) +
  toast. Classes disponibles : `.head/.head-over/.head-title/.gear`, `.overline`,
  `.card` + `.t-plantes/.t-maison/.t-habitudes/.t-courses`, `.btn` +
  `.primary/.secondary/.danger/.quiet/.btn-full`, `.chip/.chips`, `.gauge/.gauge-fill(.hab)`,
  `.list/.row/.row-main/.row-title/.row-meta/.row.done/.check(.on)/.row-del`, `.field/.addbar/
  .add-btn`, `.sheet/.handle/.sheet-title/.sheet-msg`, `.tabbar/.tab`,
  `.empty/.empty-perch/.empty-title/.empty-sub`, `.toast/.toast-act`, `.switch(.on)`, `.bird`,
  `.repeat-n` (fiche tâche, Lot 4), et le bloc **Lot 5** : `.sec(.soft)/.sec-title/.sec-count`
  (titre de section 18 px + compteur, remplace l'emploi de `.overline` comme titre de groupe),
  `.card-title`, `.list-page` (liste posée hors carte), `.row-low` (registre bas), `.more`,
  `.row-care`, `.gauge-side/.gauge-cell/.gauge-cap`, `.room-head`, `.group-toggle`, et le bloc
  **Lot 6** : `.capture`, `.cap-chips`, `.cap-chip`, `.cap-details` (barre de capture — réutilisent
  `.addbar/.field/.add-btn/.chip/.btn.quiet` déjà en place), le bloc **Lot 7** : `.plant-photo`,
  `.file-input` (photo de plante — le reste de la fiche et des lignes de soin réutilise
  `.row-care/.gauge-cell/.gauge-side/.repeat-n/.field-group` déjà en place), et le bloc **Lot 8** :
  `.hab-val/.step/.skip/.row-soft` (bloc du jour, repris tels quels de `maquettes/today.html`),
  `.habits-head` (en-tête du bloc, seule porte vers `go('habits')`), `.hab-num` (clavier numérique
  au-delà de `HAB_STEP_MAX`), `.hab-cal/.hab-day` (calendrier mensuel de l'écran Habitudes — quatre
  états `.done/.partial/.skip/.inactive`, jamais un cinquième « manqué », cf. `js/habits.js`), et le
  bloc **Lot 9** : `.shop/.shop-l/.shop-go` (bouton d'Aujourd'hui, repris de `maquettes/today.html`),
  `.row-qty` (quantité à droite d'un article), `.rayon-left` (compteur restant d'un rayon, mode
  magasin), `.shop-store` (gros libellés du mode magasin, ne change que la taille des `.row`/`.check`
  déjà en place), `:disabled` sur `.row-postpone`/`.row-del` (flèches de `rayonOrderSheet()` en haut
  et en bas de liste). Au-delà de **900 px** : colonne centrée plafonnée à 560 px (desktop V2).
- `js/state.js` — **socle**, aucun rendu DOM : `APP_VERSION`, IndexedDB (`openDb`/`idbGet`/`idbSet`,
  + `idbPutPhoto`/`idbGetPhoto`/`idbDelPhoto`/`idbClearPhotos` — ce dernier posé au Lot 11 pour la
  réinitialisation — pour le store `photos`), `defaults()`/`migrate()`, `let S`, `save()` (débounce
  150 ms) / `saveNow()` (async), `purgeTombstones()` (>90 j, appelée au boot), helpers synchro-ready
  `stamp()`/`touch()`/`live()` (CONVENTIONS.md §2), helpers de date
  `dayKey()`/`todayKey()`/`addDays()`/`daysBetween()`. Depuis le Lot 11, `migrate()` pose
  `onboarded = true` d'office sur une base déjà peuplée qui ne l'avait jamais vu (une tâche, une
  plante, une habitude ou un article existant) : elle ne doit jamais se voir proposer la bienvenue
  après coup, seule une base réellement vierge reste à onboarder (`js/settings.js`,
  `maybeWelcome()`).
- `js/ui.js` — `go(name)` (écrans `today,tasks,maison,shopping,habits,settings`), `openSheet()`/
  `closeSheet()` (fermeture par tap dehors + glisser la poignée, Pointer Events), `confirmSheet()`
  (+ `_runConfirm()`), `toast(msg, {danger, action:{label,fn}})` (+ `hideToast()`/`_runToastAct()`),
  `esc()`, `cap()` (majuscule initiale, à la saisie), `icon(d, size)` + `IC_GEAR`/`IC_CLOSE`
  (trait 2 px, terminaisons rondes), `screenHead(surTitre, titre, {noGear})`,
  `emptyState(titre, sousTitre)`, `gaugeColor(f)`, `CURRENT_SCREEN` (posé par `go()`), et les
  oiseaux : `pickBirds()` (appelé une fois au boot), `birdsOn()`, `birdSvg(nom, w, pos)`,
  `birdOnCard(i, n)`, `birdOnPerch()`. Depuis le **Lot V2-1** : `undoable(msg, undoFn)` (enveloppe
  `toast()` avec une action « Annuler » déjà câblée) et `rowAttrs(onTap, opts)` (attributs communs
  d'une ligne cliquable — `role="button"`, `tabindex="0"`, `onclick`, Entrée/Espace — posés sur les
  `.row`/`.row-main` cliquables de `today.js`/`tasks.js`/`maison.js`/`shopping.js`, audit D3).
- `js/gestures.js` — **nouveau au Lot V2-1**, socle de balayage horizontal consommé par les Lots
  V2-4/5/6, sans écran propre. Une ligne devient balayable en portant `data-swipe-left="fn(...)"`
  et/ou `data-swipe-right="fn(...)"` (nom de fonction évalué comme un `onclick=` l'est déjà,
  `swipeRunAttr()`) ; un seul écouteur délégué au `document` (Pointer Events) suit le contenu de la
  ligne en `translateX`, révèle un fond `.swipe-bg` (contour `--due` à gauche/« supprimer », plein
  `--act` à droite/positif — discipline chromatique), et déclenche l'action au relâchement au-delà
  de 33 % de la largeur ou 0,5 px/ms de vélocité (mêmes seuils que `endSheetDrag`, `js/ui.js`).
  Abandonné dès que le vertical dépasse l'horizontal (le défilement gagne toujours) ; rien ne se
  passe sous `prefers-reduced-motion`. Aucune ligne de l'app ne porte encore ces attributs à ce
  stade : c'est aux Lots V2-4/5/6 de les poser.
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
- `js/today.js` — écran **« Aujourd'hui », posé au Lot 5**. `todayBuckets()` est le seul endroit où
  se décide ce qui compte : une passe unique qui répartit en `overdue` (échéance réelle dépassée) /
  `evening` / `scheduled` (le bloc du jour) / `quick` (anytime à effort 1) / `soins` (entretien) /
  `done`, chaque filtre retirant ce que le précédent a pris — **aucun item ne peut être dans deux
  blocs**. Deux seuils y vivent : `TODAY_CARE_SEUIL` (0,4 — sans lui le bloc Entretien serait
  permanent et l'écran ne saurait jamais dire « c'est bon ») et `S.settings.todayCap` (plafond du
  bloc du jour, « + N autres »). `todayBadgeCount()` alimente la pastille iOS. Les cochages de la
  session (`tickToday`) gardent une ligne barrée à sa place jusqu'au prochain démarrage : rien n'est
  persisté, ce n'est pas un journal. Porte aussi `longDate()` (sur-titre « Lundi 27 juillet »).
  `renderToday()` se termine par `captureBarHtml()` (`js/nlp.js`), comme Tâches — depuis le Lot 6.
  Depuis le **Lot V1-7**, le bloc du jour (`todaySection()`) mêle aussi les soins de plantes
  réellement dus (jauge à 0, `getPlantCareItems()`) aux tâches planifiées — jamais le bloc Entretien,
  réservé aux tâches `from:'done'` — via des entrées `{id, kind:'task'|'soin', t|s}` dans
  `todayBuckets().scheduled` ; un tap sur un soin ouvre sa fiche plante plutôt que de le compléter.
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
  (`getTodayHabits()`, `todayHabitsCard()`) : saisie en ligne, ± (`stepHabit()`) sous
  `HAB_STEP_MAX` (10), clavier numérique au-delà (`setHabitValue()`), jamais « Sauter » et deux
  boutons sur la même ligne. Écran secondaire `go('habits')` (atteint uniquement en tapant l'en-tête
  du bloc, pas d'onglet) : liste des habitudes, fiche création/édition (`habitSheet()`, comme
  `taskSheet()`/`plantSheet()`), calendrier mensuel de régularité (`habitCalendarHtml()`) à
  **quatre** traitements visuels — fait / partiel / sauté / inactif — et pas un cinquième
  « manqué » : `CONVENTIONS.md` §3 proscrit tout ton culpabilisant, un jour resté sans saisie se lit
  comme « inactif », jamais comme un reproche. **Depuis le Lot 10**, motivation légère sans le
  moindre score : `celebrateHabitRecord()` compare le record (`habitBestStreak()`, capturé *avant*
  d'écrire le jour) à la série une fois la valeur posée — un toast sobre (« Record de série pour…
  ») seulement si elle le dépasse, et jamais le tout premier jour d'une habitude (`prevBest` à 0,
  ce serait un « record » systématique). Appelé depuis `stepHabit()` et `setHabitValue()`, jamais
  `skipHabit()` (un jour sauté ne peut pas battre un record).
- `js/shopping.js` — écran Courses, **rempli au Lot 9**. Classement automatique par rayon
  (`guessRayon()`, fonction pure testée isolément comme `parseQuick()` : normalise le libellé
  (`normalizeLabel()`), cherche par groupes de mots consécutifs — du plus long au plus court, pour
  qu'une clé à deux mots comme « papier toilette » (`data/rayons.js`) l'emporte sur un mot isolé au
  milieu d'un libellé plus long — puis retombe sur `'autre'`). Une correction de rayon (fiche
  `shopItemSheet()`, un tap) est mémorisée dans `S.settings.rayonOverrides` **pour ce libellé
  précis**, jamais à chaque ajout — sinon le dictionnaire n'aurait plus jamais voix au chapitre sur
  un produit déjà tapé une fois. Une carte par rayon (`shopRayonCard()`, blanche comme Maison, pas
  teintée `t-courses` : seul le bouton d'Aujourd'hui l'est), triée selon `S.settings.rayonOrder`
  (réglable via `rayonOrderSheet()`, flèches haut/bas plutôt qu'un glisser-déposer). Mode magasin
  (`setShopMode()`, bascule de session) : gros libellés (`.shop-store`), Wake Lock avec garde de
  disponibilité (`acquireWakeLock()`/`releaseWakeLock()`, redemandé au retour visible), coché =
  grisé **en bas** de son rayon (jamais retiré : on doit pouvoir décocher une erreur) —
  `clearCheckedShopping()` vide les cochés en tombstone, jamais automatiquement. `S.frequents[]`
  (`bumpFrequent()`/`frequentShoppingItems()`) : un produit ajouté ≥ 3 fois est proposé en un tap
  sous le champ d'ajout, les plus utilisés d'abord — pas un objet synchro-ready comme `tasks[]`,
  c'est un compteur d'usage recalculable par libellé, pas un objet du domaine. `addShoppingItem()`
  est le chemin unique de création, qu'il vienne du champ ou d'un fréquent en un tap.
- `js/maison.js` — écran Maison, **vue par pièce posée au Lot 4** : `getMaisonItems()` regroupe les
  tâches d'entretien (`room` posé + `repeat.from:'done'`, glossaire `CONVENTIONS.md` §6) par pièce ;
  jauge agrégée par pièce (la plus basse de ses éléments, `freshLabel()` pour le texte à côté —
  jamais « en retard ») + jauge de fraîcheur continue par élément ; tap sur une ligne
  (`tapMaisonItem()`) appelle `completeTask()`, avec un retour visuel immédiat (largeur de la jauge
  posée à 100 % avant le rendu complet) que `prefers-reduced-motion` supprime. **Depuis le Lot 10**,
  la toute première réalisation d'un entretien `repeat.kind:'year'` (`history` encore vide juste
  avant `completeTask()`) déclenche un toast sobre, une fois pour toutes — même geste dans
  `tapTodayCare()` (`js/today.js`), qui complète les mêmes tâches depuis Aujourd'hui. `entretienSheet()` :
  feuille d'ajout — on choisit une pièce puis on coche des modèles du catalogue
  `data/entretien.js`, créés en une fois comme tâches récurrentes `'done'` (`doneAt` posé à
  l'instant de la création). Les tâches d'entretien ont toujours un `doneAt`, donc elles
  n'apparaissent plus dans l'écran Tâches (filtré sur `!doneAt`) : elles vivent uniquement ici.
  Depuis le **Lot V1-7**, `renderMaison()` mêle ces tâches et les soins de plantes de la même pièce
  (`getPlantCareItems()`, `js/plants.js`) en une seule liste triée par fraîcheur croissante
  (`careRowHtml()` unifie les deux types de ligne) : un tap sur une tâche la marque faite
  (`tapMaisonItem()`), un tap sur un soin de plante ouvre sa fiche (`plantSheet()`) — c'est là que
  vit le bouton « arrosé ». Bouton « Ajouter une plante » posé à côté de « Ajouter un entretien ».
- `js/settings.js` — écran Réglages, **rempli au Lot 11** : six cartes dans cet ordre, chacune un
  groupe. **Profil** : prénom (`setUserName()`, `cap()` posé, vide autorisé), apparence
  (`setTheme('light'|'dark'|'auto')` → `S.settings.theme`, posé sur `data-mode` de `<html>` par
  `applyTheme()` — 'auto' suit `prefers-color-scheme` via `watchSystemTheme()`, silencieux si l'API
  n'existe pas), l'interrupteur Oiseaux (`toggleBirds()`, posé au Lot 2). **Aujourd'hui** :
  `todayCap`, jour de la revue (`reviewDay`, select), et la revue à la demande (`startReview()` sans
  argument, `js/review.js`). **Maison** : bornes de la saison froide (`coldFrom`/`coldTo`, deux
  select de mois réutilisant `NLP_MOIS`). **Courses** : `rayonOrderSheet()` (`js/shopping.js`,
  inchangé, déjà posé au Lot 9). **Données** : export JSON complet de `S` (`exportData()`, dit
  explicitement que les photos de plantes — des Blobs, store IndexedDB `photos` — n'y sont pas),
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
- `js/recur.js` — moteur de récurrence, **rempli au Lot 4**, fonctions pures sans DOM, testées
  isolément dans `test.mjs` : `intervalDays(repeat)` (intervalle en jours tous kinds confondus,
  approximation pour la jauge), `nextDue(task, ref)` (distinction `repeat.from:'due'` — depuis
  l'échéance précédente, calendaire exact via `setMonth`/`setFullYear` — / `'done'` — depuis
  la réalisation effective `doneAt` — c'est le cœur du lot), `freshness(task, ref)` (jauge continue
  bornée [0,1], jamais négative), `completeTask(task, ref)` (historise, recalcule `due`, remet
  `postponed` à 0). Partagé entre l'entretien maison (`js/maison.js`) et, au Lot 7, les soins de
  plantes.
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
- `js/plants.js` — **rempli au Lot 7**. Toujours sans conteneur DOM propre (pas d'écran Plantes,
  ROADMAP §6 bis) : les plantes vivent dans Maison et dans le bloc du jour d'Aujourd'hui. Modulation
  saisonnière `plantSeason()` (déduite de `settings.coldFrom`/`coldTo`, jamais d'une date en dur) ;
  un soin (arrosage, engrais, rempotage) est traduit en un objet minimal `{doneAt,
  repeat:{kind:'day', n, from:'done'}}` passé tel quel à `freshness()`/`completeTask()` de
  `js/recur.js` — **le moteur du Lot 4 n'est pas dupliqué**. `getPlantCareItems()` expose les soins
  actifs à `js/maison.js` et `js/today.js` (un `feed` à `cold:0` est suspendu et n'est jamais
  proposé). `plantSheet()` : fiche unique création/édition — identité, pièce obligatoire, espèce du
  catalogue `data/plantes.js` (pré-remplit les intervalles, modifiables ensuite par plante), photo,
  jauge des trois soins avec l'intervalle appliqué en clair, historique d'arrosage, boutons
  « Arrosé » / « Fait l'engrais » / « Rempoté » en action immédiate (comme `tapMaisonItem()`).
  Photos : `resizePhoto()` (canvas, 1000 px max, JPEG 0,8) puis `idbPutPhoto()` (store `photos`,
  jamais dans `S`), chargement paresseux (`idbGetPhoto()` seulement à l'ouverture de la fiche), URL
  objet révoquée à la fermeture via le hook `_onSheetClose` posé dans `js/ui.js`.
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
- `data/plantes.js` (`PLANTES`) — **rempli au Lot 7** : une quarantaine de plantes d'intérieur
  courantes (nom, nom latin, intervalles d'arrosage/engrais saison chaude et froide, rempotage en
  mois). Choisir une espèce dans la fiche plante pré-remplit ces intervalles.
- `data/entretien.js` (`ENTRETIEN`) — **rempli au Lot 4** : une quarantaine de modèles d'entretien
  courants (`{title, room, intervalDays, effort}`), proposés en un tap depuis `entretienSheet()`
  (`js/maison.js`).
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
  `CACHE`** (`mylife-b1-N`) à chaque release.
- `manifest.webmanifest`, `icon-180/192/512.png` (monogramme « M » pixelisé sur aplat gris foncé,
  généré par script Node jetable + `zlib`, aucune dépendance) — display `standalone`, portrait.
  `theme_color`/`background_color` = `#F3EEE5` (identique au `<meta name="theme-color">`).
  **Les icônes sont restées grises** : elles ne connaissent pas encore « Canopée » — passées en
  revue au Lot 12 (Polish & QA) et sciemment laissées de côté (hors périmètre du lot, aucune des
  7 tâches ne portait dessus), reportées en dette V2.

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
  n'existent pas sous jsdom (comme le canvas de `resizePhoto()`, Lot 7, déjà hors test).
- **À chaque release** : incrémenter `CACHE` (`sw.js`) **et** `APP_VERSION` (`js/state.js`), même
  numéro (`mylife-b1-N` / `'Bêta 1.N'`).

## Modèle de données (S) — ROADMAP-V1.md §5
```
S = { v:1, tasks:[], plants:[], habits:[], habitLog:{}, shopping:[], frequents:[],
      settings:{userName,weekStart,rayonOrder,rayonOverrides,coldFrom,coldTo,todayCap,reviewDay,hideDone,birds,theme},
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

Depuis le Lot 7, `plants[]` porte `{id,createdAt,updatedAt,deletedAt,name,species,room,photoId,
care:{water:{warm,cold,lastAt,history}, feed:{warm,cold,lastAt,history}, repot:{months,lastAt}},
notes,sort}`. `room` n'est jamais `null` (sinon la plante n'apparaît sur aucun écran). `species` est
une clé de `data/plantes.js` ou une chaîne libre. `water`/`feed` portent deux intervalles (jours),
saison chaude et froide — `cold:0` suspend le soin cette saison-là, `repot` est en mois et ne varie
pas avec la saison. `photoId` est la clé du Blob dans le store IndexedDB `photos` (même id que la
plante), ou `null`.

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

## Règles et pièges à connaître
- **Ouvrir `maquettes/MyLife Canopée.html` avant de dessiner ou de coder un écran.** Elle contient
  les huit écrans, y compris ceux qui ne sont pas encore codés — ne pas en inventer un qui y est
  déjà. C'est ainsi que le Lot 5 a d'abord produit deux maquettes à jeter, et c'est ainsi que les
  Lots 3 et 4 ont dérivé sans le savoir (écarts listés dans « Identité visuelle »). En cas de
  désaccord entre le code livré et la maquette, **c'est la maquette qui gagne** (arbitrage 27/07).
- **Les trois listes miroir** (`<script>` de `index.html`, `ASSETS` de `sw.js`, `FILES` de
  `test.mjs`) doivent toujours lister les **18 mêmes fichiers** dans le même ordre. Piège classique :
  ajouter un fichier sans mettre à jour les trois — l'app marche en local et casse une fois installée.
  (Décompte : 4 `data/` + 14 `js/` = 18. Le Lot 2 a ajouté `data/oiseaux.js`, le Lot V2-1
  `js/gestures.js` — à chaque fois le même risque, et les trois listes ont bien été mises à jour
  ensemble.)
- **Incrémenter `CACHE` (sw.js) à chaque release**, synchroniser `APP_VERSION` (`js/state.js`) sur le
  même numéro — sinon l'app installée garde silencieusement l'ancienne version.
- Toujours échapper le texte utilisateur avec `esc()`. Jamais `confirm()`/`alert()`/`prompt()`
  natifs — `confirmSheet()` maison pour toute confirmation destructive.
- Suppression = tombstone (`deletedAt = Date.now()` + `touch()`), jamais un `splice()`.
- `js/nlp.js`, `js/plants.js`, `js/review.js` n'ont pas de conteneur DOM : ne pas essayer d'y faire
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

## Cycle V2 « L'usage » — en cours
Plan complet dans `ROADMAP-V2.md` (audit du 14/08/2026, arbitrages §3, huit lots) ; `CONVENTIONS.md`
reste la loi permanente, amendée par ce même §3. Ce fichier ne détaille pas ici le tableau des huit
lots V2 (il vit dans `ROADMAP-V2.md`, pas dupliqué pour rester court) ; la synchronisation complète
de `CLAUDE.md`/`CONVENTIONS.md` avec l'état final de la V2 est prévue au Lot V2-8.
- **V2-1 — Socle d'interaction** (Bêta 2.1) : ✅ Fait. `js/gestures.js` (balayage, non encore posé
  sur aucune ligne — c'est aux Lots V2-4/5/6), `undoable()`/`rowAttrs()` dans `js/ui.js`, `role`/
  `tabindex`/Entrée-Espace posés sur les 7 lignes cliquables existantes (audit D3), correctifs D1
  (`textarea`/`select` en `font:inherit`) et D2 (`theme-color` suit `applyTheme()`).

## Cycle V1 clos — dettes sciemment laissées pour la V2
Le Lot 12 a fermé le cycle V1. Rien ci-dessous n'est un oubli : chaque point a été examiné et
reporté délibérément, hors périmètre d'un lot « polish sans nouvelle fonctionnalité ».
- **Icônes d'app encore grises** (`icon-180/192/512.png`) : jamais mises à jour vers « Canopée ».
  Même script Node jetable + `zlib` à reprendre, juste avec les bonnes couleurs.
- **Pas de chemin d'édition/suppression pour une tâche d'entretien** une fois créée depuis
  `entretienSheet()` (`js/maison.js`) : `tapMaisonItem()` ne fait que la compléter, et l'écran
  Tâches l'exclut par construction (`doneAt` toujours posé). Pour corriger un intervalle ou
  supprimer un entretien créé par erreur, il faut aujourd'hui passer par l'export/import JSON.
  Repéré au Lot 12 (audit des chemins d'action) mais hors périmètre — pas une redondance à
  corriger, une lacune à combler en V2.
- **Sémantique ARIA des `.chip`** : elles servent tantôt de filtre à sélection unique (catégorie,
  pièce, priorité, effort, mode Liste/Mode magasin), tantôt de multi-sélection (jours de semaine
  d'une récurrence), tantôt de puce supprimable (aperçu de capture). Aucune ne porte de rôle ARIA
  au-delà du texte visible. Un passage cohérent (`role="radiogroup"`/`radio` pour le sélecteur
  simple, `aria-pressed` pour le multi-sélection) toucherait une dizaine de générateurs de HTML
  dans `tasks.js`, `habits.js`, `shopping.js`, `settings.js`, `plants.js` — non fait au Lot 12 par
  prudence (risque de régression disproportionné pour une amélioration purement sémantique, sans
  impact visuel). Les contrastes et tailles de cible, eux, sont conformes (voir tableau Lot 12).
- **`--t-plantes` (variable CSS) dormante** : les deux classes qui l'utilisaient (`.card.t-plantes`)
  ont été retirées au Lot 12 (orphelines depuis que Maison est resté en cartes blanches). La
  variable reste déclarée dans `:root` et en mode sombre — cohérente avec les 4 teintes de domaine
  documentées dans la discipline chromatique — mais rien ne l'applique plus nulle part. À utiliser
  si les plantes obtiennent un jour leur propre surface teintée, sinon à retirer explicitement.
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
