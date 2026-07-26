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
- Langue de l'interface : **français**, minuscules de phrase, ton sobre, aucun emoji.
- Versionnage affiché : **Bêta 1.N**, synchronisé avec `CACHE` dans `sw.js`.

## Fichiers et ordre de chargement
Ordre impératif (CONVENTIONS.md §1), déclaré dans `index.html`, miroir dans `sw.js` (`ASSETS`) et
`test.mjs` (`FILES`) — **16 fichiers** au total :
```
data/rayons.js · data/plantes.js · data/entretien.js
→ js/state.js → js/ui.js → js/recur.js → js/nlp.js → js/today.js → js/tasks.js
→ js/maison.js → js/plants.js → js/habits.js → js/shopping.js → js/review.js
→ js/settings.js → js/boot.js (toujours en dernier)
```
Deux seules règles dures : `state.js` en premier (socle `S`, aucun rendu DOM), `boot.js` en dernier
(démarrage). Entre les deux l'ordre est libre — aucun code exécuté au chargement dans ces fichiers,
uniquement des déclarations.

- `index.html` — squelette + **tout le CSS** (`<style>`, `:root` provisoire en gris neutres, le vrai
  design system arrive au Lot 2) + conteneurs d'écrans `#s-today #s-tasks #s-maison #s-shopping
  #s-habits #s-settings` + tab bar 4 onglets (Aujourd'hui · Tâches · Maison · Courses, zone sûre
  iOS) + feuille modale (`#sheet-bg`/`#sheet`) + toast.
- `js/state.js` — **socle**, aucun rendu DOM : `APP_VERSION`, IndexedDB (`openDb`/`idbGet`/`idbSet`,
  + `idbPutPhoto`/`idbGetPhoto`/`idbDelPhoto` pour le store `photos`), `defaults()`/`migrate()`,
  `let S`, `save()` (débounce 150 ms) / `saveNow()` (async), `purgeTombstones()` (>90 j, appelée au
  boot), helpers synchro-ready `stamp()`/`touch()`/`live()` (CONVENTIONS.md §2), helpers de date
  `dayKey()`/`todayKey()`/`addDays()`/`daysBetween()`.
- `js/ui.js` — `go(name)` (écrans `today,tasks,maison,shopping,habits,settings`), `openSheet()`/
  `closeSheet()` (fermeture par tap dehors + glisser la poignée, Pointer Events), `confirmSheet()`
  (+ `_runConfirm()`), `toast()`, `esc()`, `emptyState()` (une seule icône générique pour l'instant,
  vrai système d'icônes au Lot 2).
- `js/tasks.js` — écran Tâches, **périmètre Lot 1 strict** : ajouter / cocher (`doneAt`) / supprimer
  (tombstone `deletedAt`). Aucune date, catégorie, priorité ni récurrence (Lots 3/4).
- `js/today.js`, `js/maison.js`, `js/habits.js`, `js/shopping.js`, `js/settings.js` — placeholders,
  chacun `renderX()` écrit un `emptyState('bientôt…')` dans son `#s-x`.
- `js/recur.js`, `js/nlp.js`, `js/plants.js`, `js/review.js` — placeholders **sans conteneur DOM
  propre** (pas de `#s-recur` etc.) : `renderX()` renvoie juste un fragment `emptyState()`, jamais
  appelée par `go()`. Existent uniquement pour figer l'ordre de chargement et les listes miroir ;
  logique réelle aux Lots 4 (recur), 6 (nlp), 7 (plants), 10 (review).
- `data/rayons.js` (`RAYONS`), `data/plantes.js` (`PLANTES`), `data/entretien.js` (`ENTRETIEN`) —
  structures vides commentées, remplies aux Lots 9, 7, 4.
- `js/boot.js` — `boot()` async (`S = await loadState()` → `purgeTombstones()` → `go('today')`),
  `READY` + `window.__ready`, `navigator.storage.persist()`, enregistrement du service worker,
  `saveNow()` sur `pagehide` et `visibilitychange→hidden`, `reg.update()` + rechargement sur
  `controllerchange` au retour au premier plan.
- `sw.js` — cache-first avec mise à jour en arrière-plan (stale-while-revalidate) ; **incrémenter
  `CACHE`** (`mylife-b1-N`) à chaque release.
- `manifest.webmanifest`, `icon-180/192/512.png` (monogramme « M » pixelisé sur aplat gris foncé,
  généré par script Node jetable + `zlib`, aucune dépendance) — display `standalone`, portrait.

## Lancer / tester
- Ouvrir `index.html` dans un navigateur (ou servir en local, ex. `python3 -m http.server`). Les
  fonctions PWA (service worker, stockage persistant, IndexedDB) exigent HTTPS ou `localhost`.
- **Vérif syntaxe** : `node --check <fichier>` sur chaque fichier `js/`/`data/` modifié.
- **Test de fumée** : `npm test` (après un premier `npm install`) — charge `index.html` sous jsdom
  avec `fake-indexeddb` injecté, inline les 16 fichiers `data/`+`js/` concaténés dans l'ordre de
  chargement, attend `await window.__ready()`, exerce `go()` sur les 6 écrans, le cycle de vie d'une
  tâche (créer/cocher/supprimer), `stamp()`/`touch()`/`live()`, et vérifie la persistance directe en
  IndexedDB après `saveNow()`. Échoue à la moindre erreur runtime.
- **À chaque release** : incrémenter `CACHE` (`sw.js`) **et** `APP_VERSION` (`js/state.js`), même
  numéro (`mylife-b1-N` / `'Bêta 1.N'`).

## Modèle de données (S) — ROADMAP-V1.md §5
```
S = { v:1, tasks:[], plants:[], habits:[], habitLog:{}, shopping:[], frequents:[],
      settings:{userName,weekStart,rayonOrder,coldFrom,coldTo,todayCap,reviewDay,hideDone},
      lastReview:null, onboarded:false }
```
Au Lot 1, `tasks[]` n'a que `{id,createdAt,updatedAt,deletedAt,title,doneAt}` — les champs `notes,
cat, room, bucket, start, due, evening, prio, effort, repeat, history, postponed, touchedAt`
arrivent aux Lots 3/4 via `migrate()`. Tout objet persisté suit la discipline synchro-ready :
`id` = `crypto.randomUUID()`, `createdAt`/`updatedAt` (ms), `deletedAt` (tombstone, jamais de
suppression dure), aucun compteur global stocké, aucun ordre implicite par position.

## Règles et pièges à connaître
- **Les trois listes miroir** (`<script>` de `index.html`, `ASSETS` de `sw.js`, `FILES` de
  `test.mjs`) doivent toujours lister les **16 mêmes fichiers** dans le même ordre. Piège classique :
  ajouter un fichier sans mettre à jour les trois — l'app marche en local et casse une fois installée.
  (Note : l'acceptance criteria de `PROMPTS-V1.md` pour le Lot 1 mentionne « 15 fichiers » — décompte
  fait ici : 3 `data/` + 13 `js/` = 16. Écart probable dans le document source, pas une omission ici.)
- **Incrémenter `CACHE` (sw.js) à chaque release**, synchroniser `APP_VERSION` (`js/state.js`) sur le
  même numéro — sinon l'app installée garde silencieusement l'ancienne version.
- Toujours échapper le texte utilisateur avec `esc()`. Jamais `confirm()`/`alert()`/`prompt()`
  natifs — `confirmSheet()` maison pour toute confirmation destructive.
- Suppression = tombstone (`deletedAt = Date.now()` + `touch()`), jamais un `splice()`.
- `js/recur.js`, `js/nlp.js`, `js/plants.js`, `js/review.js` n'ont pas de conteneur DOM : ne pas
  essayer d'y faire `document.getElementById('s-recur')` etc., ça n'existe pas et n'existera jamais
  (recur/nlp sont des moteurs, plants rejoindra Maison, review sera une feuille).
- Déploiement : `git push` → GitHub Pages republie (~1 min), Fastly cache ~10 min ensuite — attendre
  avant de soupçonner un vrai bug.
- Stratégie de modèles : planifier/arbitrer en Opus, coder les lots en Sonnet, trivial en Haiku.

## État des lots (ROADMAP-V1.md §7)
| Lot | Version | Statut |
|---|---|---|
| **1 — Socle** | Bêta 1.1 | ✅ Fait. Squelette, IndexedDB + `S` + `save`/`saveNow`, boot async, navigation 4 onglets, écran Tâches minimal, service worker, manifeste, icônes, `test.mjs`, ce fichier. |
| 2 — Identité & design system | Bêta 1.2 | À faire (validation maquette avant code) |
| 3 — Moteur de tâches | Bêta 1.3 | À faire |
| 4 — Récurrence & Maison v1 | Bêta 1.4 | À faire |
| 5 — « Aujourd'hui » v1 | Bêta 1.5 | À faire (validation maquette avant code) |
| 6 — Saisie langage naturel | Bêta 1.6 | À faire |
| 7 — Maison v2 (plantes) | Bêta 1.7 | À faire |
| 8 — Habitudes | Bêta 1.8 | À faire |
| 9 — Courses | Bêta 1.9 | À faire |
| 10 — « Aujourd'hui » v2 & revue | Bêta 1.10 | À faire |
| 11 — Réglages & filet de sécurité | Bêta 1.11 | À faire |
| 12 — Polish, QA, dettes | Bêta 1.12 | À faire |

**À faire par l'utilisateur après le Lot 1** : créer le dépôt GitHub public `mylife` et pousser
(`gh repo create mylife --public --source=. --push`), activer GitHub Pages (branche `main`, `/`),
installer sur l'iPhone (Safari → Partager → Sur l'écran d'accueil).
