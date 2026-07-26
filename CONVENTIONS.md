# MyLife — Consignes permanentes

> **Règles valables pour tous les lots, du premier au dernier.** Chaque prompt de lot renvoie ici.
> Si une consigne d'un lot contredit ce fichier, **ce fichier gagne** — sauf mention explicite.
> À lire en entier avant le Lot 1, puis à relire au début de chaque lot.

---

## 0. Le projet en une phrase

App PWA **personnelle**, installée sur iPhone, qui répond à **« qu'est-ce que je dois faire
maintenant ? »** — tâches, entretien de la maison, plantes, habitudes, courses. **100 % hors-ligne,
100 % gratuit, aucun compte, aucun serveur.** Détail complet dans `ROADMAP-V1.md`.

---

## 1. Règles de code — non négociables

### Stack
- **JavaScript pur.** Aucun framework, aucun transpileur, **aucune étape de build**.
- **Aucune dépendance de production.** `package.json` n'existe que pour `npm test` et ne contient
  que des `devDependencies` (`jsdom`, `fake-indexeddb`).
- **Fichiers statiques uniquement.** Ce qui est dans le dépôt est ce qui est servi.

### Modules
- Scripts **classiques** (`<script src="...">`), **jamais** d'ES modules, **jamais** d'`import` /
  `export`. Le projet n'a pas de bundler et n'en aura pas.
- Tous les fichiers partagent **une seule portée globale**. Une `function foo()` déclarée à la racine
  d'un fichier devient `window.foo` et est appelable depuis n'importe quel autre fichier et depuis
  les attributs `onclick=` du HTML.
- **Jamais d'IIFE**, jamais de `(function(){…})()`. Une fonction enfermée dans une IIFE devient
  invisible aux `onclick=` et casse silencieusement l'app.
- **Un fichier = un domaine.** Si un fichier dépasse ~600 lignes, le scinder par sous-domaine plutôt
  que de le laisser grossir. (Leçon du projet piano : un monolithe de 2130 lignes a dû être scindé
  après coup, au prix d'un lot entier.)

### Ordre de chargement — impératif
```
data/rayons.js · data/plantes.js · data/entretien.js
state.js → ui.js → recur.js → nlp.js → today.js → tasks.js → maison.js
→ plants.js → habits.js → shopping.js → review.js → settings.js → boot.js
```
Deux seules règles dures : **`state.js` en premier** (socle, `S`, aucun rendu DOM) et
**`boot.js` en dernier** (il touche presque tout au démarrage). Entre les deux, l'ordre est libre
car ces fichiers ne contiennent que des déclarations, aucun code exécuté au chargement.

### Les trois listes miroir — piège classique
La liste des fichiers JS existe **à trois endroits** qui doivent rester synchronisés :
1. les balises `<script>` de `index.html`
2. le tableau `ASSETS` de `sw.js`
3. le tableau `FILES` de `test.mjs`

**Ajouter un fichier sans mettre à jour les trois = l'app marche en local et casse une fois
installée.** À vérifier systématiquement.

### Style
- Identifiants (fonctions, variables) en **anglais court** : `renderToday`, `taskSheet`, `freshness`.
- **Tous les textes visibles en français.** Minuscules de phrase, ton sobre.
- Chaque écran a une fonction `renderX()` qui construit l'`innerHTML` de `#s-x`.
- **Toujours échapper le texte saisi par l'utilisateur avec `esc()`.** Sans exception.
- **Petits diffs ciblés.** Ne jamais réécrire un fichier entier pour changer trois lignes.

---

## 2. Règles de données — la discipline synchro-ready

La V1 ne synchronise rien, mais la V2 synchronisera via le NAS. Ces règles coûtent quelques lignes
maintenant et évitent une réécriture complète plus tard. **Elles s'appliquent à tout objet persisté.**

| Règle | Pourquoi |
|---|---|
| `id` = `crypto.randomUUID()` | Deux appareils doivent pouvoir créer un objet sans collision. **Jamais** un index de tableau, **jamais** un compteur incrémental |
| `createdAt` (ms) sur tout | Tri stable, ancienneté |
| `updatedAt` (ms) à **chaque** mutation | Résolution de conflits « dernière écriture gagne », suffisante pour un couple |
| `deletedAt` (ms) au lieu de supprimer | Une suppression dure serait annulée par la synchro : l'autre appareil recréerait l'objet. Purge des tombstones > 90 jours au boot |
| Aucun compteur global stocké | « Nombre total de tâches faites » se **recalcule**, ne se stocke pas : deux compteurs ne fusionnent pas |
| Aucun ordre implicite par position | Si un ordre manuel est nécessaire, champ `sort` numérique explicite |

**Helper obligatoire** dans `state.js` :
```js
function touch(o){ o.updatedAt = Date.now(); return o; }
function stamp(o){ o.id = crypto.randomUUID(); o.createdAt = o.updatedAt = Date.now();
                   o.deletedAt = null; return o; }
function live(arr){ return arr.filter(o => !o.deletedAt); }
```
Toute lecture de collection passe par `live()`. Toute mutation passe par `touch()`.

### Persistance
- État global unique `S` → IndexedDB, base `mylife`, store `state`, clé `'S'`.
- `save()` après **chaque** mutation — écriture débouncée 150 ms (coalesce les rafales).
- `saveNow()` (async, attend le disque) aux moments critiques : import JSON,
  `visibilitychange → hidden`, `pagehide`. **iOS peut tuer une PWA en arrière-plan sans prévenir.**
- Boot asynchrone : `S = defaults()` en mémoire dès le parse (**jamais `null`**), puis `boot()`
  charge l'état réel et rend l'écran. `READY` = promesse du boot, à `await` dans les tests.
- Repli silencieux sur `localStorage` si IndexedDB est indisponible (mode privé, quota).
- Les **Blobs ne sont jamais dans `S`** : store IndexedDB séparé (`photos`), clé = `id`.

---

## 3. Règles d'interface

### Principes (rappel de la roadmap, §1)
1. **L'app propose, tu valides.** Chaque écran réduit le nombre de décisions.
2. **Saisie en 3 secondes**, sinon l'app est morte.
3. **Rien à tenir à jour pour rien.** Toute donnée saisie sert à l'écran « Aujourd'hui ».
4. **Piloter par le besoin réel, pas par des dates arbitraires.** Une jauge qui descend, pas un
   retard qui accuse.
5. **Jamais deux chemins visibles vers la même action.**
6. **L'app doit savoir dire « c'est bon pour aujourd'hui »** — et alors ne rien proposer d'autre.
7. **Zéro dépendance externe.**

### Ton et vocabulaire
- Français partout, ton sobre et adulte.
- **Règle de casse (arbitrée au Lot 2, remplace la consigne « minuscules de phrase » d'origine) :
  majuscule initiale sur toute phrase ET sur toute entrée de liste.** Cela vaut pour les textes
  d'interface (« À faire », « Il y a 5 jours », « Sauté », « Fruits et légumes ») **comme pour les
  données saisies** — un titre de tâche, un article de courses, un nom de plante commencent par une
  majuscule. Elle est posée **à la saisie** par `cap()` (`js/ui.js`), jamais au rendu : la donnée
  stockée et exportée doit déjà être propre. Toute nouvelle saisie texte passe par `cap()` et porte
  `autocapitalize="sentences"` pour que le clavier iOS aille dans le même sens.
  Pas de capitale ailleurs : à l'intérieur d'une phrase, la casse reste normale.
- **Aucun emoji dans l'interface.**
- Jamais de ton culpabilisant : « à faire » et non « en retard » pour l'entretien ; « sauté » et non
  « manqué » pour une habitude. Le vocabulaire est un choix de conception, pas de la décoration.

### Accessibilité et tactile — dès le premier écran, pas au Lot 12
- **Cibles tactiles ≥ 44 × 44 px.** Si le visuel doit rester petit, étendre la zone par
  `padding` + `margin` négative, pas en grossissant l'élément.
- `:focus-visible` visible sur tout élément interactif (boutons, onglets, chips, liens).
- `@media (prefers-reduced-motion: reduce)` coupe animations et transitions.
- Contraste texte / fond ≥ 4,5:1 (AA). À vérifier par calcul, pas à l'œil.
- Zone sûre iOS : `env(safe-area-inset-bottom)` sur la tab bar.

### Composants
- Navigation : `go(name)` — écrans `today, tasks, maison, shopping, habits, settings`.
- Feuilles modales : `openSheet(html)` / `closeSheet()`. Fermeture par bouton, par tap en dehors et
  par glisser vers le bas depuis la poignée.
- Confirmations destructives : **jamais `confirm()` natif** — feuille `confirmSheet(message, label,
  onConfirm)` avec bouton danger + Annuler.
- États vides : `emptyState(texte, icone)` — jamais un écran blanc, jamais un texte seul et sec.
- Messages transitoires : `toast(message)` / `toast(message, {danger:true})`.

### Styles
- **Tout le CSS vit dans le `<style>` de `index.html`.** Pas de fichier `.css` séparé.
- Les couleurs, espacements, durées passent par des **variables CSS** définies dans `:root`
  (établies au Lot 2, direction « Canopée »). Les `style="..."` inline ne sont acceptables que pour
  des valeurs **calculées** (largeur d'une jauge, couleur dérivée d'un pourcentage).
- **La discipline chromatique du Lot 2 (en tête du `<style>` et dans `CLAUDE.md`) est une règle
  permanente au même titre que ce fichier.** Toute couleur hors palette est un bug de design.
- Une classe CSS créée dans un lot et devenue inutile dans un lot suivant **doit être retirée**.

---

## 4. Checklist de release — à dérouler à la fin de chaque lot

```
[ ] node --check sur chaque fichier js/ et data/ modifié
[ ] npm test passe (aucune erreur runtime)
[ ] si un fichier a été ajouté : les 3 listes miroir sont à jour
    (index.html <script>, sw.js ASSETS, test.mjs FILES)
[ ] CACHE incrémenté dans sw.js          → 'mylife-b1-N'
[ ] APP_VERSION synchronisé dans state.js → 'Bêta 1.N'   (MÊME numéro que CACHE)
[ ] CLAUDE.md mis à jour si quelque chose y est devenu faux
[ ] Aucun style="..." non calculé ajouté ; aucune classe CSS orpheline laissée
[ ] Un seul commit, message en français : « Lot V1-N « Titre » : résumé (Bêta 1.N) »
```

**Le piège numéro un du projet piano :** oublier d'incrémenter `CACHE`. L'app installée sur l'iPhone
garde alors silencieusement l'ancienne version et on cherche le bug ailleurs pendant une heure.

**Après un `git push`** : GitHub Pages republie en ~1 min, mais Fastly cache les fichiers ~10 min.
Attendre avant de soupçonner un vrai problème.

---

## 5. Garde-fous — ce qu'il ne faut jamais faire

| Interdit | Raison |
|---|---|
| Ajouter une dépendance npm de production | Le projet doit encore fonctionner dans 5 ans sans maintenance |
| Introduire un framework, un bundler, TypeScript | Même raison. Ce choix est définitif pour la V1 |
| Appeler un service tiers, une API distante, un CDN | Principe 7 : zéro dépendance externe. Les polices sont soit système, soit embarquées |
| Mettre une donnée personnelle, une clé ou un secret dans le code | Le dépôt GitHub est **public** (contrainte de Pages gratuit) |
| Supprimer un objet en le retirant du tableau | Tombstone `deletedAt`, sinon la synchro V2 le ressuscite |
| Utiliser `confirm()`, `alert()` ou `prompt()` natifs | Feuilles modales maison |
| Réécrire un fichier entier pour un petit changement | Diffs ciblés, revue possible |
| Élargir le périmètre d'un lot en cours de route | Une idée hors périmètre se note dans `IDEES.md`, elle ne se code pas |
| Coder un écran structurant sans maquette validée | Concerne les Lots 2 et 5 uniquement |
| Ajouter un métronome, un son, une vibration non demandés | — |

---

## 6. Glossaire du domaine

Vocabulaire à employer dans le code **et** dans l'interface, sans synonyme flottant.

| Terme | Sens précis |
|---|---|
| **Tâche** | Une chose à faire, ponctuelle ou récurrente. Collection `tasks[]` |
| **Entretien** | Une tâche récurrente `from: 'done'` rattachée à une pièce. Se mesure en **jauge de fraîcheur**, jamais en retard |
| **Soin** | Une action récurrente sur une plante : arrosage, engrais, rempotage |
| **Habitude** | Un engagement de régularité personnel. Se mesure en **série** et en **quota**, jamais en jauge |
| **Jauge de fraîcheur** | `1 − (jours depuis la dernière fois / intervalle)`, borné [0,1]. 1 = frais, 0 = à faire |
| **Série** | Jours consécutifs où l'objectif d'une habitude est atteint. Les jours inactifs et les jours **sautés** ne la cassent pas |
| **Sauté** | Jour explicitement neutralisé sur une habitude. Ni réussite ni échec |
| **Bucket** | `scheduled` (a une date) · `anytime` (faisable dès qu'il y a un trou) · `someday` (pas mûr, n'apparaît nulle part) |
| **Début** (`start`) | Le jour où je veux **m'en occuper**. Fait apparaître la tâche dans « Aujourd'hui » |
| **Échéance** (`due`) | La **vraie** deadline. Seule elle peut produire un « en retard » |
| **Effort** | 1 court (~5 min) · 2 moyen (~20 min) · 3 long (~1 h). Alimente « si tu as 10 minutes » |
| **Revue** | Le tri hebdomadaire des tâches dormantes : faire · reporter · abandonner |
| **Pièce** | `salon` · `cuisine` · `chambre` · `sdb` · `bureau` · `exterieur` · `autre` |

---

## 7. Comment travailler ensemble

- **Un lot = une session = une release = un commit.** Ne jamais entamer le lot suivant dans la
  même session.
- **`CLAUDE.md` est la mémoire du projet**, relue à chaque session. Elle est mise à jour à la fin de
  chaque lot, pas au début du suivant.
- **Stratégie de modèles** : planifier et arbitrer en **Opus**, coder les lots en **Sonnet**, faire
  le trivial (libellés, CSS, messages de commit) en **Haiku**.
- **Contexte minimal** : ne lire que les fichiers utiles au lot en cours.
- Toute idée hors périmètre va dans `IDEES.md` avec une ligne de justification. On la traitera au
  moment de planifier la V2.
- En fin de lot, produire un **court compte rendu** : ce qui a été fait, ce qui a été écarté et
  pourquoi, ce qui reste à vérifier sur l'iPhone réel.
