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
- Versionnage affiché : **Bêta 1.N**, synchronisé avec `CACHE` dans `sw.js`.

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
`maquettes/today-vide.html` (tout est fait). Autonomes, sans script. Elles restent la trace de
l'écran cible **complet** : leurs blocs Habitudes et Courses n'ont pas été codés au Lot 5, ils
attendent le Lot 10 — leur CSS vit encore dans les maquettes, pas dans `index.html`.

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

Mode sombre : bloc `html[data-mode="dark"]` prêt dans `:root`, **aucun interrupteur câblé** — il
arrivera avec Réglages au Lot 11. `prefers-color-scheme` n'est volontairement pas branché.

## Fichiers et ordre de chargement
Ordre impératif (CONVENTIONS.md §1), déclaré dans `index.html`, miroir dans `sw.js` (`ASSETS`) et
`test.mjs` (`FILES`) — **17 fichiers** au total :
```
data/rayons.js · data/plantes.js · data/entretien.js · data/oiseaux.js
→ js/state.js → js/ui.js → js/recur.js → js/nlp.js → js/today.js → js/tasks.js
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
  `.row-care`, `.gauge-side/.gauge-cell/.gauge-cap`, `.room-head`, `.group-toggle`.
  Au-delà de **900 px** : colonne centrée plafonnée à 560 px (desktop optimisé en V2).
- `js/state.js` — **socle**, aucun rendu DOM : `APP_VERSION`, IndexedDB (`openDb`/`idbGet`/`idbSet`,
  + `idbPutPhoto`/`idbGetPhoto`/`idbDelPhoto` pour le store `photos`), `defaults()`/`migrate()`,
  `let S`, `save()` (débounce 150 ms) / `saveNow()` (async), `purgeTombstones()` (>90 j, appelée au
  boot), helpers synchro-ready `stamp()`/`touch()`/`live()` (CONVENTIONS.md §2), helpers de date
  `dayKey()`/`todayKey()`/`addDays()`/`daysBetween()`.
- `js/ui.js` — `go(name)` (écrans `today,tasks,maison,shopping,habits,settings`), `openSheet()`/
  `closeSheet()` (fermeture par tap dehors + glisser la poignée, Pointer Events), `confirmSheet()`
  (+ `_runConfirm()`), `toast(msg, {danger, action:{label,fn}})` (+ `hideToast()`/`_runToastAct()`),
  `esc()`, `cap()` (majuscule initiale, à la saisie), `icon(d, size)` + `IC_GEAR`/`IC_CLOSE`
  (trait 2 px, terminaisons rondes), `screenHead(surTitre, titre, {noGear})`,
  `emptyState(titre, sousTitre)`, `gaugeColor(f)`, `CURRENT_SCREEN` (posé par `go()`), et les
  oiseaux : `pickBirds()` (appelé une fois au boot), `birdsOn()`, `birdSvg(nom, w, pos)`,
  `birdOnCard(i, n)`, `birdOnPerch()`.
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
  `from:'done'` pose `doneAt` sur l'instant présent.
- `js/today.js` — écran **« Aujourd'hui », posé au Lot 5**. `todayBuckets()` est le seul endroit où
  se décide ce qui compte : une passe unique qui répartit en `overdue` (échéance réelle dépassée) /
  `evening` / `scheduled` (le bloc du jour) / `quick` (anytime à effort 1) / `soins` (entretien) /
  `done`, chaque filtre retirant ce que le précédent a pris — **aucun item ne peut être dans deux
  blocs**. Deux seuils y vivent : `TODAY_CARE_SEUIL` (0,4 — sans lui le bloc Entretien serait
  permanent et l'écran ne saurait jamais dire « c'est bon ») et `S.settings.todayCap` (plafond du
  bloc du jour, « + N autres »). `todayBadgeCount()` alimente la pastille iOS. Les cochages de la
  session (`tickToday`) gardent une ligne barrée à sa place jusqu'au prochain démarrage : rien n'est
  persisté, ce n'est pas un journal. Porte aussi `longDate()` (sur-titre « Lundi 27 juillet »).
- `js/habits.js`, `js/shopping.js` — placeholders, chacun `renderX()` écrit
  `screenHead(...) + emptyState('Bientôt.', '…')` dans son `#s-x`.
- `js/maison.js` — écran Maison, **vue par pièce posée au Lot 4** : `getMaisonItems()` regroupe les
  tâches d'entretien (`room` posé + `repeat.from:'done'`, glossaire `CONVENTIONS.md` §6) par pièce ;
  jauge agrégée par pièce (la plus basse de ses éléments, `freshLabel()` pour le texte à côté —
  jamais « en retard ») + jauge de fraîcheur continue par élément ; tap sur une ligne
  (`tapMaisonItem()`) appelle `completeTask()`, avec un retour visuel immédiat (largeur de la jauge
  posée à 100 % avant le rendu complet) que `prefers-reduced-motion` supprime. `entretienSheet()` :
  feuille d'ajout — on choisit une pièce puis on coche des modèles du catalogue
  `data/entretien.js`, créés en une fois comme tâches récurrentes `'done'` (`doneAt` posé à
  l'instant de la création). Les tâches d'entretien ont toujours un `doneAt`, donc elles
  n'apparaissent plus dans l'écran Tâches (filtré sur `!doneAt`) : elles vivent uniquement ici.
  Structure de ligne prévue pour accueillir les soins de plantes au Lot 7 (même moteur, §6 bis de
  la roadmap), pas codée.
- `js/settings.js` — deux vraies cartes et **un seul réglage** : l'interrupteur « Oiseaux »
  (`toggleBirds()` → `S.settings.birds`), posé au Lot 2 avec les oiseaux. Le reste (profil, export,
  import, mode sombre) arrive au Lot 11. Seul écran en `screenHead(..., {noGear:true})` :
  l'engrenage y mène, il n'y apparaît pas.
- `js/recur.js` — moteur de récurrence, **rempli au Lot 4**, fonctions pures sans DOM, testées
  isolément dans `test.mjs` : `intervalDays(repeat)` (intervalle en jours tous kinds confondus,
  approximation pour la jauge), `nextDue(task, ref)` (distinction `repeat.from:'due'` — depuis
  l'échéance précédente, calendaire exact via `setMonth`/`setFullYear` — / `'done'` — depuis
  la réalisation effective `doneAt` — c'est le cœur du lot), `freshness(task, ref)` (jauge continue
  bornée [0,1], jamais négative), `completeTask(task, ref)` (historise, recalcule `due`, remet
  `postponed` à 0). Partagé entre l'entretien maison (`js/maison.js`) et, au Lot 7, les soins de
  plantes.
- `js/nlp.js`, `js/plants.js`, `js/review.js` — placeholders **sans conteneur DOM propre** (pas de
  `#s-nlp` etc.) : `renderX()` renvoie juste un fragment `emptyState()`, jamais appelée par `go()`.
  Existent uniquement pour figer l'ordre de chargement et les listes miroir ; logique réelle aux
  Lots 6 (nlp), 7 (plants), 10 (review).
- `data/rayons.js` (`RAYONS`), `data/plantes.js` (`PLANTES`) — structures vides commentées, remplies
  aux Lots 9, 7.
- `data/entretien.js` (`ENTRETIEN`) — **rempli au Lot 4** : une quarantaine de modèles d'entretien
  courants (`{title, room, intervalDays, effort}`), proposés en un tap depuis `entretienSheet()`
  (`js/maison.js`).
- `data/oiseaux.js` (`OISEAUX`) — **rempli au Lot 2** : 6 espèces, chacune une liste de formes SVG
  plates. Données pures, aucun rendu : redessiner un oiseau = remplacer son tableau, sans toucher à
  `js/ui.js`. Contrat de dessin en tête du fichier (`viewBox 0 0 120 160`, pattes sur **y = 130**,
  les 30 px du bas débordent sous le perchoir). **Seul endroit du projet où des couleurs en dur sont
  admises** : un oiseau est une image, pas une couleur d'interface.
- `js/boot.js` — `boot()` async (`S = await loadState()` → `purgeTombstones()` → `go('today')`),
  `READY` + `window.__ready`, `navigator.storage.persist()`, enregistrement du service worker,
  `saveNow()` sur `pagehide` et `visibilitychange→hidden`, `reg.update()` + rechargement sur
  `controllerchange` au retour au premier plan.
- `sw.js` — cache-first avec mise à jour en arrière-plan (stale-while-revalidate) ; **incrémenter
  `CACHE`** (`mylife-b1-N`) à chaque release.
- `manifest.webmanifest`, `icon-180/192/512.png` (monogramme « M » pixelisé sur aplat gris foncé,
  généré par script Node jetable + `zlib`, aucune dépendance) — display `standalone`, portrait.
  `theme_color`/`background_color` = `#F3EEE5` (identique au `<meta name="theme-color">`).
  **Les icônes sont restées grises** : elles ne connaissent pas encore « Canopée » (dette Lot 12).

## Lancer / tester
- Ouvrir `index.html` dans un navigateur (ou servir en local, ex. `python3 -m http.server`). Les
  fonctions PWA (service worker, stockage persistant, IndexedDB) exigent HTTPS ou `localhost`.
- **Vérif syntaxe** : `node --check <fichier>` sur chaque fichier `js/`/`data/` modifié.
- **Test de fumée** : `npm test` (après un premier `npm install`) — charge `index.html` sous jsdom
  avec `fake-indexeddb` injecté, inline les 17 fichiers `data/`+`js/` concaténés dans l'ordre de
  chargement, attend `await window.__ready()`, exerce `go()` sur les 6 écrans, le cycle de vie d'une
  tâche (créer/cocher/supprimer), `stamp()`/`touch()`/`live()`, les invariants des oiseaux (un seul
  par écran, `aria-hidden`, aucun en mode sombre, interrupteur effectif), la majuscule initiale
  posée à la saisie, le moteur de récurrence (`intervalDays`/`nextDue`/`freshness`/`completeTask`,
  distinction `from:'due'`/`from:'done'` testée explicitement), l'écran Maison (`getMaisonItems()`,
  `tapMaisonItem()`) et — depuis le Lot 5 — **l'algorithme d'« Aujourd'hui »** attaqué directement
  sur `todayBuckets()` : répartition des blocs sans doublon, un `start` passé qui ne produit jamais
  d'échéance dépassée, `someday` jamais proposé en « 10 minutes », seuil et plafond d'entretien,
  cochage de session, plafond `todayCap` + « + N autres », état vide sans aucune cible tactile,
  pastille. Vérifie enfin la persistance directe en IndexedDB après `saveNow()`. Échoue à la moindre
  erreur runtime. Les scénarios d'« Aujourd'hui » travaillent sur une ardoise vide et **restaurent
  `S.tasks`** derrière eux (helper `scenario()`) : ne pas y pousser de tâche sans passer par lui.
- **À chaque release** : incrémenter `CACHE` (`sw.js`) **et** `APP_VERSION` (`js/state.js`), même
  numéro (`mylife-b1-N` / `'Bêta 1.N'`).

## Modèle de données (S) — ROADMAP-V1.md §5
```
S = { v:1, tasks:[], plants:[], habits:[], habitLog:{}, shopping:[], frequents:[],
      settings:{userName,weekStart,rayonOrder,coldFrom,coldTo,todayCap,reviewDay,hideDone},
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

## Règles et pièges à connaître
- **Ouvrir `maquettes/MyLife Canopée.html` avant de dessiner ou de coder un écran.** Elle contient
  les huit écrans, y compris ceux qui ne sont pas encore codés — ne pas en inventer un qui y est
  déjà. C'est ainsi que le Lot 5 a d'abord produit deux maquettes à jeter, et c'est ainsi que les
  Lots 3 et 4 ont dérivé sans le savoir (écarts listés dans « Identité visuelle »). En cas de
  désaccord entre le code livré et la maquette, **c'est la maquette qui gagne** (arbitrage 27/07).
- **Les trois listes miroir** (`<script>` de `index.html`, `ASSETS` de `sw.js`, `FILES` de
  `test.mjs`) doivent toujours lister les **17 mêmes fichiers** dans le même ordre. Piège classique :
  ajouter un fichier sans mettre à jour les trois — l'app marche en local et casse une fois installée.
  (Décompte : 4 `data/` + 13 `js/` = 17. Le Lot 2 a ajouté `data/oiseaux.js` — c'était le premier
  test réel de cette règle, et les trois listes ont bien été mises à jour ensemble.)
- **Incrémenter `CACHE` (sw.js) à chaque release**, synchroniser `APP_VERSION` (`js/state.js`) sur le
  même numéro — sinon l'app installée garde silencieusement l'ancienne version.
- Toujours échapper le texte utilisateur avec `esc()`. Jamais `confirm()`/`alert()`/`prompt()`
  natifs — `confirmSheet()` maison pour toute confirmation destructive.
- Suppression = tombstone (`deletedAt = Date.now()` + `touch()`), jamais un `splice()`.
- `js/nlp.js`, `js/plants.js`, `js/review.js` n'ont pas de conteneur DOM : ne pas essayer d'y faire
  `document.getElementById('s-nlp')` etc., ça n'existe pas et n'existera jamais (nlp est un moteur,
  plants rejoindra Maison, review sera une feuille). `js/recur.js` non plus, mais pour une autre
  raison depuis le Lot 4 : c'est un moteur pur (`nextDue`/`freshness`/`intervalDays`/`completeTask`),
  appelé par `js/tasks.js`, `js/maison.js` et `js/today.js`, jamais par `go()`.
- **Une tâche d'entretien (`room` + `repeat.from:'done'`) a toujours un `doneAt`** : elle disparaît
  donc naturellement de l'écran Tâches (`getTaskItems()` filtre `!t.doneAt`) et ne vit que dans
  Maison — et, si sa jauge est basse, dans le bloc Entretien d'« Aujourd'hui ». C'est voulu, pas un
  bug — ne pas « corriger » ce filtre pour la faire réapparaître dans les listes de tâches.
- **Un item ne doit jamais apparaître dans deux blocs d'« Aujourd'hui ».** `todayBuckets()` est écrit
  en cascade pour ça : chaque filtre retire ce que le précédent a pris (échéance dépassée, puis « ce
  soir », puis le bloc du jour). Ajouter un bloc au Lot 7 ou 10 = l'insérer dans cette cascade, pas à
  côté. Le test de fumée vérifie explicitement l'absence de doublon.
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
| **2 — Identité & design system** | Bêta 1.2 | ✅ Fait. Direction « Canopée » validée puis appliquée : jeu complet de variables CSS (clair + `data-mode="dark"`), composants partagés en classes, discipline chromatique écrite ici et en tête du `<style>`, micro-présences d'oiseaux (`data/oiseaux.js` + interrupteur dans Réglages), règle de casse posée à la saisie (`cap()`), Tâches / tab bar / feuilles restylées, `:focus-visible` + `prefers-reduced-motion` partout, colonne centrée > 900 px, contrastes vérifiés par calcul, `maquettes/` retirée — **remise en place au Lot 5**, la référence y vit désormais. **Dettes laissées** : icônes d'app encore grises (Lot 12) ; écarts de structure vis-à-vis de la maquette, découverts au Lot 5 et corrigés là. |
| **3 — Moteur de tâches** | Bêta 1.3 | ✅ Fait. Modèle Things 3 (`start`/`due`/`bucket`/`evening`/`prio`/`effort`/`postponed`/`touchedAt`) posé par `migrate()`, écran Tâches en 4 groupes (Aujourd'hui et avant / À venir / Un jour / Peut-être repliable), filtres catégorie + recherche + compteurs, tri échéance dépassée → priorité → ancienneté, fiche tâche unique création/édition, report avec compteur discret dès 3. |
| **4 — Récurrence & Maison v1** | Bêta 1.4 | ✅ Fait. Moteur `js/recur.js` pur et testé isolément (`nextDue`/`freshness`/`intervalDays`/`completeTask`, distinction `from:'due'`/`from:'done'` — le cœur du lot), récurrence dans la fiche tâche (fréquence, jours fixes facultatifs, depuis-date-fixe/après-réalisation, phrase en clair), écran Maison en vue par pièce (jauge agrégée + jauge de fraîcheur par élément, tap = fait avec retour visuel), catalogue `data/entretien.js` (~40 modèles) et feuille d'ajout `entretienSheet()`. |
| **5 — « Aujourd'hui » v1** | Bêta 1.5 | ✅ Fait. Maquettes validées (`maquettes/today.html`, `maquettes/today-vide.html`) puis codées : `js/today.js` (blocs 1, 2, 3, 6, 7 de ROADMAP §6, tri, plafond `todayCap`, seuil d'entretien, cochages de session, état vide), pastille iOS (`updateBadge()` dans `boot.js`), `rerender()` dans `ui.js` (la fiche tâche s'ouvre désormais depuis deux écrans), plancher de jauge `gaugeWidth()`. **Mise en conformité incluse** (arbitrage du 27/07) : titres de groupe en `.sec` 18 px sur Tâches, cartes de pièce blanches + jauge à droite sur Maison, `.empty` à 140 px. **Hors périmètre, par la roadmap** : les blocs Habitudes et Courses de la maquette sont au **Lot 10** (« Intégration habitudes et courses ») — leurs modèles de données n'existent pas encore ; leur CSS n'a donc pas été posé. |
| 6 — Saisie langage naturel | Bêta 1.6 | À faire |
| 7 — Maison v2 (plantes) | Bêta 1.7 | À faire |
| 8 — Habitudes | Bêta 1.8 | À faire |
| 9 — Courses | Bêta 1.9 | À faire |
| 10 — « Aujourd'hui » v2 & revue | Bêta 1.10 | À faire |
| 11 — Réglages & filet de sécurité | Bêta 1.11 | À faire |
| 12 — Polish, QA, dettes | Bêta 1.12 | À faire |

## Dépôt et mise en ligne — état réel
- Dépôt **public** : `github.com/MegaXuu/mylife`, distant `origin`, branche `main`. **Il existe
  depuis le Lot 1** — ne pas proposer de le créer.
- GitHub Pages : **actif**, branche `main`, racine `/` → **https://megaxuu.github.io/mylife/**.
- Identité git du dépôt : `Florian Perez <305554896+MegaXuu@users.noreply.github.com>`. **Adresse de
  renvoi GitHub, jamais l'adresse personnelle** : le dépôt est public et l'historique est moissonné.
  Elle est posée en config locale du dépôt ; ne pas la remplacer par l'adresse réelle.
- Reste à la main de Florian : installer sur l'iPhone (Safari → Partager → Sur l'écran d'accueil),
  et donner le feu vert à chaque push (cf. règle ci-dessus).
