# MyLife — Roadmap V1

> Document de référence du cycle V1. Cadrage du 2026-07-26, révisé le même jour après étude
> comparative du marché. Deviendra la base du `CLAUDE.md` du projet au Lot 1.
> Nom : **MyLife** — confirmé tel quel au Lot 2, avec l'identité visuelle « Canopée ».

---

## 1. Le projet en une phrase

App mobile **personnelle** (PWA installée sur iPhone, puis desktop) qui répond à une seule
question : **« qu'est-ce que je dois faire maintenant ? »** — en agrégeant les tâches ponctuelles,
l'entretien récurrent de la maison, l'arrosage des plantes, les habitudes chiffrées et la liste de
courses. **100 % hors-ligne, 100 % gratuit, aucun compte, aucun serveur.**

### Le problème à résoudre
Aujourd'hui : Apple Rappels (trop bête, ne priorise rien) + Notion (trop lourd, trop lent à ouvrir,
demande trop de saisie). La cible : **rapide comme Rappels, structuré comme Notion**, et surtout
**décisionnel** — l'app propose, tu exécutes.

### Principes directeurs
1. **L'app propose, tu valides.** Chaque écran réduit le nombre de décisions, ne l'augmente pas.
2. **Saisie en 3 secondes.** Si ajouter une tâche prend plus longtemps, l'app est morte.
3. **Rien à tenir à jour pour rien.** Aucune donnée saisie qui ne serve pas à l'écran « Aujourd'hui ».
4. **Piloter par le besoin réel, pas par des dates arbitraires.** (Principe volé à Tody, cf. §3.)
5. **Jamais deux chemins visibles vers la même action.** (Règle héritée du projet piano, cycle V5.)
6. **L'app doit savoir dire « c'est bon pour aujourd'hui ».** Une app de quotidien qui ne se tait
   jamais devient une source d'angoisse.
7. **Zéro dépendance externe.** Pas de compte, pas de serveur, pas d'abonnement, pas de service tiers
   qui peut fermer ou devenir payant.

---

## 2. Décisions de cadrage (validées)

| Sujet | Décision |
|---|---|
| Nom | **MyLife** (provisoire) |
| Périmètre V1 | Tâches · Entretien maison · **Plantes** · Habitudes · Courses |
| Utilisateurs | **Mono-utilisateur en V1.** Partage avec la conjointe reporté en V2 (piste NAS) |
| Synchro | **Aucune en V1** (local pur). Modèle de données conçu synchro-ready dès le départ |
| Accueil | Écran **« Aujourd'hui » unifié** : flux mélangé et priorisé, pas un tableau de bord |
| Navigation | **4 onglets** : Aujourd'hui · Tâches · **Maison** · Courses. Maison = vue par pièce réunissant entretien **et** plantes. Habitudes = écran secondaire atteint depuis l'accueil |
| Tâches | Simple + récurrence. **Pas** de projets, **pas** de sous-tâches, **pas** de contextes GTD |
| Notifications | **Aucune notification programmée** (impossible gratuitement, cf. §8). Remplacées par la **pastille de l'icône iOS** |
| Identité visuelle | **« Canopée »** — crème chaud, cartes posées, jauges qui rougissent par calcul, teintes par domaine, micro-présences d'oiseaux. Validée et appliquée au Lot 2 |
| Motivation | **Légère** : séries, régularité visible, célébrations sobres. Pas de points ni de rangs |
| Plateforme | iPhone d'abord (PWA installée). Desktop en V2 (responsive prévu dès le Lot 2) |

### Explicitement hors périmètre V1
- Synchro et multi-utilisateur (→ V2, voir §9)
- Projets, sous-tâches, dépendances, contextes GTD
- Stock du placard / génération auto des courses
- Notes, journal, humeur · Agenda et rendez-vous · Budget et finances
- Reconnaissance de plantes par photo (nécessite une API payante)
- Recettes de cuisine liées aux courses (piste V2, cf. AnyList)

---

## 3. Étude comparative — ce qu'on vole aux meilleurs

Recherche menée le 2026-07-26 sur les références de chaque domaine. Sources en fin de document.

### Tâches — Things 3, Todoist, Amazing Marvin

**① La distinction date de début / date d'échéance (Things 3).** C'est *la* fonctionnalité qui
distingue Things de tous les autres : `start` = « le jour où je veux m'en occuper », `due` = « la
vraie deadline ». Sans cette séparation, tout ce qu'on planifie devient « en retard » dès le
lendemain, et l'écran des retards devient un mur qu'on n'ose plus regarder. **Adopté, dès le Lot 3.**

**② « Ce soir » (Things 3).** Une sous-section discrète en bas d'« Aujourd'hui ». Les tâches du soir
restent visibles sans polluer la journée. Très bon rapport valeur/effort. **Adopté.**

**③ « Un jour » scindé en deux (Things 3 : Anytime / Someday).** *Anytime* = faisable dès qu'il y a
un trou. *Someday* = pas encore mûr, ne doit apparaître nulle part. Sans cette scission, la boîte
« un jour » devient un cimetière qu'on cesse de consulter. **Adopté.**

**④ Récurrence « à date fixe » vs « après réalisation » (Todoist).** `tous les 3 jours` ≠ `tous les
3 jours après réalisation`. Le loyer, c'est le 5 quoi qu'il arrive ; l'aspirateur, c'est 7 jours
après le dernier passage. **Confirmé — c'était déjà notre design, Todoist valide le modèle.**

**⑤ Saisie en langage naturel (Todoist).** « arroser le ficus tous les 3 jours » écrit d'une traite.
C'est ce qui fait passer la saisie de 20 secondes à 3 secondes, donc c'est ce qui décide si l'app
survit. Un parseur français maison est parfaitement faisable hors-ligne. **Adopté, Lot 6.**

**⑥ Compteur de reports (Amazing Marvin).** Afficher « reportée 5 fois » sur une tâche. Crée une
friction honnête et alimente la revue hebdomadaire (⑨). **Adopté, discret.**

**⑦ Le plan du jour est une intention (Amazing Marvin).** L'écran « Aujourd'hui » est plafonné et
assumé comme un engagement, pas comme un déversoir. **Adopté : plafond visuel sur la liste du jour.**

### Le mal dont meurent toutes les apps de tâches
La recherche est unanime : **le problème n'est pas la saisie, c'est la décomposition.** Ajouter coûte
zéro effort, donc la liste est infinie dans un monde fini ; les vieilles tâches s'accumulent, on
cesse de faire confiance à sa propre liste, et une liste dont on se méfie est une liste qu'on
abandonne. C'est exactement ce qui s'est passé avec Notion.

**⑨ Contre-mesure : la revue hebdomadaire.** Une fois par semaine, l'app remonte les tâches
inchangées depuis 30 jours et propose trois boutons : **Faire cette semaine · Reporter à « un jour » ·
Abandonner**. C'est le système immunitaire de l'app. Presque aucune app grand public ne le fait
d'office, et ça coûte un demi-lot. **Adopté, Lot 10 — c'est un différenciateur majeur.**

### Entretien maison — Tody, Sweepy

**⑩ La jauge de fraîcheur plutôt que la date d'échéance (Tody).** Tody n'affiche pas « en retard de
3 jours », il affiche une jauge vert→rouge qui se dégrade continûment depuis la dernière
réalisation. Formulation de Tody : piloter *« par des indicateurs de besoin réel plutôt que par des
dates arbitraires »*. Psychologiquement, c'est le jour et la nuit : une jauge orange est une
information, une tâche en retard est un reproche. **Adopté — c'est la meilleure idée de toute cette
étude.**

**⑪ Le niveau d'effort (Sweepy).** Sweepy note chaque tâche de 1 à 3 points selon la pénibilité.
Chez nous, `effort` ∈ court (~5 min) / moyen (~20 min) / long (~1 h). Ça transforme le bloc « si tu
as 10 minutes » : au lieu de proposer les tâches les plus vieilles, il propose **celles qui tiennent
dans le temps disponible**. **Adopté.**

**⑫ Découper en gestes courts (Tody).** « Ranger la maison » ne se fait jamais ; « vider le
lave-vaisselle » se fait. Ça relève des libellés proposés par le catalogue embarqué (§5), pas du code.

### Plantes — Planta, Greg, Plant Water Reminder

**⑬ L'intervalle d'arrosage dépend de la saison, et c'est non négociable.** Les sources convergent :
la plupart des plantes d'intérieur ont besoin de **30 à 50 % d'eau en moins d'octobre à février**
(certaines sources disent jusqu'à 50–70 % pour les plantes en dormance). Un intervalle fixe
**surarrose en hiver** — c'est la première cause de mort des plantes d'intérieur. Une app qui rappelle
« arroser tous les 7 jours » toute l'année est activement nuisible. **Adopté : deux intervalles par
plante, saison chaude / saison froide.**

**⑭ Plusieurs types de soin (Planta).** Arrosage, engrais, rempotage, brumisation — intervalles
différents, et l'engrais ne se fait qu'en saison de croissance. **Adopté, en gardant simple :
arrosage + engrais + rempotage.**

**⑮ Ce qu'on ne prend PAS de Planta/Greg.** Le posemètre par appareil photo, la calibration par
géolocalisation/météo, le diagnostic par IA, la calibration communautaire : tout ça exige des API
payantes et/ou un serveur. Planta est d'ailleurs passé **100 % payant** en 2026 — bonne illustration
de pourquoi on ne dépend de personne.

**⑯ Insight d'architecture : les plantes et le ménage, c'est le même moteur.** Arroser un ficus tous
les 7 jours et passer l'aspirateur tous les 7 jours, c'est mathématiquement identique : une
récurrence depuis la dernière réalisation, avec une jauge de fraîcheur. Les plantes ajoutent
seulement une couche (identité, pièce, photo, modulation saisonnière). **Donc ajouter le domaine
« plantes » coûte beaucoup moins cher qu'il n'y paraît** — c'est un écran et une modulation, pas un
moteur.

### Courses — Bring!, AnyList, OurGroceries

**⑰ Le classement automatique par rayon (AnyList).** On tape « lait », l'app le range dans « Frais ».
Un dictionnaire français embarqué de ~300 produits courants suffit, hors-ligne, gratuit. **C'est la
fonctionnalité qui sépare une vraie app de courses d'une note.** **Adopté.**

**⑱ L'ordre des rayons se règle par magasin (AnyList, Grocery).** On réordonne les rayons pour suivre
le plan de *son* supermarché, et la liste se parcourt sans revenir en arrière. **Adopté, un seul
magasin en V1 (l'ordre est global), multi-magasins en V2.**

**⑲ Le mode magasin (Bring!).** Une vue distincte pour le passage en caisse : gros libellés, cases
larges au pouce, coché = grisé en bas du rayon plutôt que disparu (pour pouvoir décocher en cas
d'erreur). **Adopté.**

**⑳ Les produits fréquents en un tap (tous).** Déjà prévu. Confirmé par tout le marché.

### Habitudes — Loop, Way of Life, Streaks

**㉑ Le jour « sauté » ne casse pas la série (Loop, Way of Life).** LA fonctionnalité citée partout.
Sans elle, une grippe de trois jours détruit une série de 200 et on désinstalle l'app. **Adopté :
un état « sauté » explicite, neutre pour la série.**

**㉒ « 3 fois par semaine » n'est pas « lundi/mercredi/vendredi » (Loop).** Deux modèles de
planification distincts : jours fixes, ou quota hebdomadaire libre. Mon modèle initial ne gérait que
les jours fixes. **Corrigé : `days[]` OU `perWeek`.**

**㉓ La progression partielle est visible.** Avec un objectif chiffré (30 min de sport), 20 min
n'est ni un échec ni une réussite : c'est 67 %. **Adopté.**

---

## 4. Architecture technique

### Stack — identique à l'app piano, et c'est un choix assumé

**PWA en JavaScript pur, sans framework, sans étape de build.** Fichiers statiques servis par
GitHub Pages. Stockage IndexedDB.

Pourquoi c'est le bon choix ici :
- **Gratuit à vie et sans maintenance.** Aucune dépendance à mettre à jour. Dans 3 ans, ça marchera
  encore sans y avoir touché.
- **Tu la connais déjà**, moi aussi. La vitesse de développement est prouvée sur piano-app-v2.
- **Zéro latence de build.** On édite, on recharge, c'est fait.
- Le coût habituel (pas de typage, pas de composants) est absorbé par la discipline de modules et par
  le test de fumée.

### Trois leçons du projet piano, appliquées dès le Lot 1
1. **Modules par domaine dès le premier fichier.** Le piano a commencé monolithique (~2130 lignes) et
   a dû être scindé après coup. Ici, `js/` est découpé dès le départ.
2. **Test de fumée dès le Lot 1**, pas après.
3. **Discipline synchro-ready dès le Lot 1** (ci-dessous) : ~20 lignes de rigueur qui rendent la
   synchro NAS possible en V2 **sans réécriture**.

### Discipline synchro-ready (obligatoire, dès le Lot 1)
- **`id` stable et unique** : `crypto.randomUUID()`. Jamais un index de tableau, jamais un compteur.
- **`updatedAt`** (ms) mis à jour à chaque mutation → résolution de conflits « dernière écriture
  gagne », suffisant pour un couple.
- **`deletedAt`** (tombstone) au lieu d'une suppression dure — sinon la synchro ferait réapparaître
  les objets supprimés. Purge des tombstones > 90 jours au boot.
- **`createdAt`** sur tout.
- **Aucun compteur global non-fusionnable** (« nombre total de tâches faites » se recalcule).
- **Aucun ordre implicite par position dans un tableau** — un champ `sort` numérique si nécessaire.

### Structure des fichiers

```
/                       (racine = portée du service worker)
  index.html            squelette + TOUS les styles CSS + conteneurs d'écrans + tab bar
  sw.js                 service worker — CACHE à incrémenter à chaque release
  manifest.webmanifest
  icon-180/192/512.png
  js/
    state.js            constantes, IndexedDB, defaults/migrate, S, helpers purs — AUCUN rendu DOM
    ui.js               navigation go(), toasts, feuilles modales, esc(), emptyState()
    recur.js            moteur de récurrence + jauge de fraîcheur (partagé tâches/plantes)
    nlp.js              parseur français de saisie rapide
    today.js            écran « Aujourd'hui » + algorithme de priorisation + pastille iOS
    tasks.js            écran Tâches + fiche tâche + filtres par catégorie
    maison.js           écran Maison : vue par pièce, entretien + plantes mêlés
    plants.js           fiche plante + soins + modulation saisonnière + photos
    habits.js           écran Habitudes (secondaire) + saisie de valeur + séries + calendrier
    shopping.js         écran Courses + rayons + mode magasin + produits fréquents
    review.js           revue hebdomadaire (le système immunitaire)
    settings.js         réglages, profil, export/import JSON, à propos, réinitialisation
    boot.js             démarrage + premier lancement — TOUJOURS EN DERNIER
  data/
    rayons.js           dictionnaire produit → rayon (~300 entrées, français)
    plantes.js          catalogue de plantes d'intérieur courantes (~40) + intervalles chaud/froid
    entretien.js        modèles de tâches d'entretien maison (~40) + intervalles par défaut
  test.mjs              test de fumée (jsdom + fake-indexeddb)
  package.json          uniquement pour `npm test` (aucune dépendance de production)
  CLAUDE.md             mémoire de projet
  ROADMAP-V1.md         ce fichier
```

**Ordre de chargement impératif** (déclaré dans `index.html`, miroir dans `sw.js` et `test.mjs`) :
`data/*.js` → `state.js` → `ui.js` → `recur.js` → `nlp.js` → `today.js` → `tasks.js` → `maison.js` →
`plants.js` → `habits.js` → `shopping.js` → `review.js` → `settings.js` →
**`boot.js` (toujours en dernier)**.

Scripts classiques (pas d'ES modules) : portée globale unique partagée, `function foo()` devient
`window.foo`, appelable depuis les `onclick=` HTML. Jamais d'IIFE.

### Les catalogues embarqués — l'arme secrète du démarrage
`data/rayons.js`, `data/plantes.js` et `data/entretien.js` sont l'équivalent de `opus.js` dans l'app
piano : des données statiques, hors-ligne, gratuites, qui rendent l'app **utile deux minutes après
l'installation au lieu d'une heure de saisie**.

- Tu tapes « lait » dans les courses → rangé dans « Frais » automatiquement.
- Tu ajoutes un ficus → intervalles 7 j (été) / 14 j (hiver) pré-remplis, modifiables.
- Tu ouvres l'entretien maison → « aspirateur 7 j », « draps 14 j », « salle de bain 7 j »,
  « vitres 90 j », « filtre VMC 180 j », « détartrage 90 j » proposés en un tap.

C'est le meilleur rapport valeur perçue / effort de code de toute la V1.

### Persistance
- État global unique `S` → IndexedDB (base `mylife`, store `state`, clé `'S'`).
- `save()` après chaque mutation : écriture débouncée 150 ms.
- `saveNow()` (async) aux moments critiques : import JSON, `visibilitychange→hidden`, `pagehide`
  (iOS peut tuer une PWA en arrière-plan sans prévenir).
- Boot asynchrone : `S = defaults()` en mémoire dès le parse (jamais `null`), `boot()` charge l'état
  réel puis rend l'écran. `READY` = promesse du boot, à `await` en test.
- Repli sur `localStorage` si IndexedDB est indisponible (mode privé, quota).
- `navigator.storage.persist()` au premier lancement (évite une purge iOS après inutilisation).
- **Store IndexedDB séparé `photos`** pour les photos de plantes (Blob brut, jamais dans `S`) —
  même pattern que le store `recordings` de l'app piano.

---

## 5. Modèle de données

```js
S = {
  v: 1,
  tasks: [],       // tâches ponctuelles + entretien récurrent (ménage, admin)
  plants: [],      // plantes et leurs soins
  habits: [],      // définitions d'habitudes
  habitLog: {},    // { 'YYYY-MM-DD': { habitId: valeur | 'skip' } }
  shopping: [],    // articles de la liste de courses
  frequents: [],   // produits fréquents dérivés de l'historique
  settings: {},
  lastReview: null,
  onboarded: false
}
```

### `tasks[]`
```js
{
  id, createdAt, updatedAt, deletedAt,
  title,                    // seul champ obligatoire
  notes,
  cat,                      // 'perso' | 'menage' | 'entretien' | 'admin'
  room,                     // 'salon' | 'cuisine' | 'chambre' | 'sdb' | 'bureau' | 'exterieur' | null
                            //   → alimente la vue par pièce de l'onglet Maison
  bucket,                   // 'scheduled' | 'anytime' | 'someday'      ← Things 3 ③
  start,                    // 'YYYY-MM-DD' | null — le jour où je veux m'en occuper  ← ①
  due,                      // 'YYYY-MM-DD' | null — la vraie deadline               ← ①
  evening,                  // bool — à faire ce soir                                ← ②
  prio,                     // 0 normal | 1 important | 2 urgent
  effort,                   // 1 court (~5 min) | 2 moyen (~20 min) | 3 long (~1 h)  ← ⑪
  repeat,                   // null | { … } voir ci-dessous
  doneAt,                   // timestamp de la dernière réalisation | null
  history,                  // ['YYYY-MM-DD', …] réalisations passées
  postponed,                // nombre de reports                                     ← ⑥
  touchedAt                 // dernière interaction, alimente la revue hebdo         ← ⑨
}
```

### `repeat` — le moteur de récurrence
```js
repeat = {
  kind,     // 'day' | 'week' | 'month' | 'year'
  n,        // tous les n jours/semaines/mois/ans
  days,     // [1,4] = lundi et jeudi — uniquement si kind === 'week'
  from      // 'due'  → prochaine échéance depuis l'échéance précédente (loyer, impôts)
            // 'done' → prochaine échéance depuis la réalisation effective (aspirateur, arrosage)
}
```

**Jauge de fraîcheur** (⑩) — pour toute tâche `from: 'done'` :
`fraicheur = 1 − (jours écoulés depuis doneAt / intervalle)`, bornée à [0, 1], affichée en jauge
continue plutôt qu'en date d'échéance. Au-delà de 1, la jauge est « à faire », jamais « en retard ».

### `plants[]`
```js
{
  id, createdAt, updatedAt, deletedAt,
  name,                     // « Ficus du salon »
  species,                  // clé du catalogue data/plantes.js, ou libre
  room,                     // 'salon' | 'chambre' | 'cuisine' | 'bureau' | 'exterieur' | …
  photoId,                  // clé dans le store IndexedDB `photos` | null
  care: {
    water:  { warm, cold, lastAt, history },   // intervalles en jours, saison chaude / froide  ← ⑬
    feed:   { warm, cold, lastAt, history },   // engrais — cold souvent 0 = suspendu en hiver  ← ⑭
    repot:  { months, lastAt }                 // rempotage, en mois
  },
  notes, sort
}
```
**Saison** : définie dans `settings.coldFrom` / `coldTo` (défaut octobre → février), pas en dur.
Le calcul de la prochaine échéance est le même `recur.js` que les tâches — seul l'intervalle
sélectionné change selon la saison courante. (⑯)

### `habits[]` + `habitLog{}`
```js
habit = {
  id, createdAt, updatedAt, deletedAt,
  name,           // « Sport », « Lecture », « Eau »
  unit,           // 'min' | 'fois' | 'L' | 'pages' | '' (simple coche si vide)
  target,         // objectif quotidien (nombre) — 1 si unit vide
  sched,          // { kind: 'days', days: [1,2,3,4,5] }  OU  { kind: 'week', perWeek: 3 }  ← ㉒
  sort
}

habitLog = { '2026-07-26': { 'uuid': 30, 'uuid2': 'skip' } }   // 'skip' = jour sauté  ← ㉑
```
Journal séparé des définitions : permet de renommer/supprimer une habitude sans perdre l'historique.
**Série** : jours consécutifs où l'objectif est atteint, en ignorant les jours inactifs **et** les
jours `'skip'`. **Progression partielle** affichée en pourcentage (㉓).

### `shopping[]`
```js
{
  id, createdAt, updatedAt, deletedAt,
  label,          // « Lait »
  rayon,          // déduit automatiquement de data/rayons.js, corrigeable  ← ⑰
  qty,            // texte libre facultatif : « 2 », « 500 g »
  done,
  sort
}
```
`frequents[]` = produits ajoutés ≥ 3 fois, proposés en un tap. Vidage manuel des articles cochés
(tombstones), jamais automatique.

### `settings{}`
```js
{
  userName,        // prénom du salut d'accueil, null par défaut
  weekStart,       // 1 (lundi)
  rayonOrder,      // ordre des rayons, adapté au plan de ton magasin  ← ⑱
  coldFrom, coldTo,// bornes de la saison froide pour les plantes (défaut 10 → 2)
  todayCap,        // plafond visuel de l'écran Aujourd'hui (défaut 7)  ← ⑦
  reviewDay,       // jour de la revue hebdomadaire (défaut dimanche)   ← ⑨
  hideDone
}
```

---

## 6. L'écran « Aujourd'hui » — l'algorithme

C'est le cœur de l'app et sa raison d'être. Il ne liste pas, il **décide**.

**Contenu, dans cet ordre :**
1. **Échéances dépassées** — uniquement les vraies deadlines (`due` passée). Jamais les `start`
   passés : ceux-là remontent simplement dans « Aujourd'hui ». C'est ce qui empêche le mur de honte.
2. **Aujourd'hui** — `start` ≤ aujourd'hui, récurrences dues, **soins de plantes dus**, plafonné à
   `settings.todayCap` avec un « + 4 autres » dépliable.
3. **Entretien** — jusqu'à 3 tâches `from: 'done'` dont la jauge de fraîcheur est la plus basse,
   présentées en jauges, jamais en retards.
4. **Habitudes du jour** — celles pas encore à l'objectif, actives ce jour-là. Saisie en ligne
   (± ou clavier numérique), jamais un écran de plus. Bouton « sauter » discret.
5. **Courses** — une seule ligne si la liste n'est pas vide (« 7 articles »), pas la liste entière.
6. **Ce soir** — sous-section discrète en bas.
7. **« Si tu as 10 minutes »** — 1 à 3 tâches du bucket `anytime` (jamais `someday`) filtrées par
   `effort: 1`. Le mécanisme qui empêche le « un jour » de pourrir silencieusement.

**Tri dans un groupe** : deadline dépassée (la plus ancienne d'abord) → priorité → ancienneté.

**Pastille de l'icône iOS** : `navigator.setAppBadge(n)` à la fermeture de l'app, où `n` = nombre
d'items du jour non faits. Fonctionne sur iOS 16.4+, gratuit, sans serveur. C'est le seul substitut
honnête aux notifications (cf. §8).

**État vide** : quand tout est fait, l'écran le dit clairement **et ne propose rien d'autre**
(principe 6).

### État d'implémentation (Lot 5, Bêta 1.5)

Blocs **1, 2, 3, 6 et 7 codés** dans `js/today.js`. Les blocs **4 (habitudes)** et **5 (courses)**
arrivent avec leurs domaines, aux Lots 8 et 9 : leurs modèles de données n'existent pas avant.

`todayBuckets()` est le seul endroit où se décide ce qui compte, et il est écrit **en cascade** —
chaque filtre retire ce que le précédent a pris, dans l'ordre : échéance dépassée → ce soir → bloc
du jour → « 10 minutes ». **Un item ne peut donc pas apparaître dans deux blocs.** Ajouter un bloc
au Lot 7, 8 ou 9 = l'insérer dans cette cascade, jamais à côté.

Trois décisions prises à l'implémentation, qui ne sont pas dans le texte ci-dessus :

- **Seuil de fraîcheur à 0,4 sur le bloc entretien** (`TODAY_CARE_SEUIL`). « Jusqu'à 3 jauges les
  plus basses » sans seuil rendrait le bloc permanent, et l'écran ne pourrait alors **jamais** dire
  « c'est bon pour aujourd'hui » — l'état vide serait inatteignable et le principe 6 mort. La borne
  reprend celle de « Bientôt » dans `freshLabel()`, aucune valeur nouvelle n'a été inventée.
- **Une tâche cochée reste posée, barrée, jusqu'au prochain démarrage** (`tickToday`). Rien n'est
  persisté : ce n'est pas un journal, c'est le retour qui dit « c'est bien celle-là ». Un item qui
  s'évapore sous le doigt désoriente et fausse le compteur.
- **L'état vide cohabite avec « Ce soir ».** Sa phrase — « Rien ne demande ton attention avant ce
  soir » — le suppose : la tâche du soir reste affichée dessous, donc atteignable. Quand elle est
  faite aussi, la phrase sous-informe sans devenir fausse. **Point resté ouvert.**

La pastille compte les blocs 1, 2, 3 et 6. **Pas le bloc 7** : « si tu as 10 minutes » est une
offre, pas un dû, et une pastille qui compte des offres devient un bruit qu'on apprend à ignorer.

---

## 6 bis. Navigation — 4 onglets

**Aujourd'hui · Tâches · Maison · Courses.** Réglages accessible depuis l'en-tête d'« Aujourd'hui ».

### L'onglet « Maison » est une vue par pièce
Il réunit **l'entretien récurrent et les plantes**, parce que ce sont déjà le même moteur (⑯) et la
même question mentale : *« qu'est-ce qui a besoin de moi dans cette pièce ? »*

```
SALON            ▓▓▓▓▓▓░░░░  soin moyen
  Aspirateur          ▓▓▓▓▓▓▓░░░   il y a 5 j
  Ficus (arrosage)    ▓▓░░░░░░░░   il y a 12 j
  Vitres              ▓▓▓▓▓▓▓▓▓░   il y a 8 j
SALLE DE BAIN    ▓▓▓░░░░░░░  à faire
  …
```
Chaque pièce affiche une jauge agrégée (la plus basse de ses éléments), chaque élément sa propre
jauge de fraîcheur (⑩). Un tap sur une plante ouvre sa fiche, un tap sur une tâche la marque faite.
Les tâches sans pièce (`room: null`) vivent dans l'onglet Tâches uniquement.

### Où sont les habitudes ?
**Pas dans un onglet — et c'est délibéré.** Les habitudes se *vivent* depuis l'accueil : le bloc
« Habitudes du jour » y est permanent et permet de cocher ou de saisir une valeur en ligne. Leur
écran dédié (définitions, séries, calendrier mensuel) n'est visité que rarement : il s'atteint en
tapant l'en-tête du bloc, via `go('habits')`. Les habitudes sont donc **plus** visibles qu'avec un
onglet, pas moins.

### La frontière entretien / habitude
Zone floue assumée (« vider le lave-vaisselle » : corvée ou habitude ?). Règle de tranchage :

> **Si tu rates, est-ce que le monde se dégrade, ou est-ce que ta régularité se dégrade ?**
> L'aspirateur → le monde, c'est de l'**entretien** : jauge de fraîcheur, pas de série.
> Le sport → toi, c'est une **habitude** : série et quota, pas de jauge.

Ne jamais mélanger les deux mécaniques sur un même objet : une jauge ne se compte pas en série, une
série ne se dégrade pas continûment.

### Ce qui est un filtre et non un onglet
Les catégories `perso` / `menage` / `entretien` / `admin` sont des **filtres dans l'onglet Tâches**.
Les pièces sont des **groupes dans l'onglet Maison**. Aucun des deux ne mérite un onglet.

---

## 7. Les lots

Un lot = une release = un commit = une version affichée (`Bêta 1.N`) = `CACHE` du service worker
incrémenté. Chaque lot laisse l'app **installée et utilisable**. Ordre imposé (dépendances).

| Lot | Version | Contenu | Livrable |
|---|---|---|---|
| **1** | Bêta 1.1 | **Socle (fait).** Squelette, IndexedDB + `S` + `save`/`saveNow`, boot async, navigation 4 onglets, écran Tâches minimal (ajouter / cocher / supprimer), service worker, manifeste, icônes, `test.mjs`, `CLAUDE.md`, dépôt Git + GitHub Pages | **App installée sur ton iPhone, déjà utilisable** comme liste de tâches |
| **2** | Bêta 1.2 | **Identité & design system — « Canopée » (fait).** 3 directions en maquette → validée. Puis jeu complet de variables CSS (clair + `data-mode="dark"`), typographie, composants (boutons, cartes, chips, jauges, listes, feuilles modales, tab bar, en-têtes, états vides, toasts, interrupteur), **discipline chromatique** engageant les lots suivants, **micro-présences d'oiseaux** (`data/oiseaux.js` + interrupteur dans Réglages), **règle de casse** (majuscule initiale sur les phrases et les entrées de liste, posée à la saisie par `cap()`), `:focus-visible` + `prefers-reduced-motion`, contrastes vérifiés par calcul, colonne centrée > 900 px | L'app a son visage définitif |
| **3** | Bêta 1.3 | **Moteur de tâches (fait).** `start` / `due` séparés ①, buckets anytime/someday ③, `effort` ⑪, catégories, priorité, « ce soir » ②, fiche tâche, filtres, recherche | Le modèle Things 3 est en place |
| **4** | Bêta 1.4 | **Récurrence & Maison v1 (fait).** `recur.js` : `from: due` / `from: done`, jauge de fraîcheur ⑩, champ `room`, **écran Maison en vue par pièce**, catalogue `data/entretien.js` (~40 modèles en un tap), historique des réalisations | **Le ménage et l'administratif entrent dans l'app** |
| **5** | Bêta 1.5 | **« Aujourd'hui » v1 (fait).** Agrégation tâches + entretien, algorithme de tri, plafond ⑦, « si tu as 10 minutes », pastille iOS, états vides. **Plus** la mise en conformité de Tâches et Maison avec la maquette Canopée (arbitrage du 27/07, cf. `CLAUDE.md`) | L'app commence à décider à ta place |
| **6** | Bêta 1.6 | **Saisie rapide en langage naturel** ⑤. `nlp.js` : « arroser le ficus tous les 3 jours », « impôts le 15 mai », « courses demain soir ». Barre de capture universelle | **La saisie passe à 3 secondes** |
| **7** | Bêta 1.7 | **Maison v2 — Plantes.** Les plantes rejoignent les pièces de l'écran Maison. Catalogue `data/plantes.js`, intervalles saison chaude/froide ⑬, arrosage + engrais + rempotage ⑭, fiche plante, photos (store IndexedDB `photos`), intégration à « Aujourd'hui » | 🪴 Domaine plantes couvert |
| **8** | Bêta 1.8 | **Habitudes.** Bloc permanent sur l'accueil + écran secondaire `go('habits')`. Définitions, unités et objectifs, jours fixes **ou** quota hebdo ㉒, jour sauté ㉑, progression partielle ㉓, séries, calendrier mensuel | Domaine habitudes couvert |
| **9** | Bêta 1.9 | **Courses.** Dictionnaire `data/rayons.js` ⑰, ordre des rayons réglable ⑱, mode magasin ⑲, produits fréquents ⑳, vidage des cochés | Domaine courses couvert |
| **10** | Bêta 1.10 | **« Aujourd'hui » v2 + revue hebdomadaire.** **`review.js`** ⑨ (faire / reporter / abandonner), compteur de reports ⑥, motivation légère (séries, régularité, célébrations sobres), et **relecture de l'ordre des 7 blocs de §6 une fois tous les domaines présents** | **L'app est complète et se défend contre sa propre entropie** |
| **11** | Bêta 1.11 | **Réglages & filet de sécurité.** Profil, préférences, **export/import JSON**, feuille de bienvenue au premier lancement, à propos, réinitialisation, **interrupteur de mode sombre** (les variables existent depuis le Lot 2, rien ne les bascule encore). *L'interrupteur « Oiseaux » y est déjà, posé au Lot 2 avec les oiseaux* | Réinstallable sans perte |
| **12** | Bêta 1.12 | **Polish, QA, dettes.** Relecture des textes, purge des tombstones, code mort, checklist iPhone réel, `CLAUDE.md` final, **icônes d'app aux couleurs Canopée** (restées grises au Lot 2). *Cibles ≥ 44 px, `:focus-visible` et `prefers-reduced-motion` sont faits depuis le Lot 2 : ici, on vérifie, on ne pose plus* | **V1 close** |

**Qui intègre quoi dans « Aujourd'hui »** — contradiction levée le 27/07/2026. Le texte disait à la
fois « bloc permanent sur l'accueil » au Lot 8 et « intégration habitudes et courses » au Lot 10.
Règle retenue : **chaque domaine pose lui-même son bloc sur l'accueil, dans son propre lot.**

| Bloc de §6 | Posé au lot |
|---|---|
| 1 Échéances · 2 Aujourd'hui · 3 Entretien · 6 Ce soir · 7 10 minutes | **5** (fait) |
| 2 Aujourd'hui — les soins de plantes dus s'y ajoutent | **7** |
| 4 Habitudes du jour | **8** |
| 5 Courses (une ligne) | **9** |

Le Lot 10 n'intègre donc rien de neuf : il **relit** l'ordre des 7 blocs une fois tous les domaines
présents, et ajoute la revue. C'est une passe de vérification, pas une passe de construction.

**Rythme** : environ un lot par session. Les lots 3, 4 et 6 sont les plus lourds.

**Validation avant code** obligatoire au **Lot 2** (identité visuelle) et au **Lot 5** (maquette de
l'écran « Aujourd'hui », le seul écran qu'il est cher de rater). Ailleurs, j'avance directement.

**La maquette Canopée fait foi** (`maquettes/MyLife Canopée.html`, arbitrage du 27/07/2026, détail
dans `CLAUDE.md`). Elle contient **huit écrans, dont Habitudes, Courses et la feuille « Nouvelle
tâche » qui ne sont pas encore codés** : l'ouvrir avant de coder un lot, et s'y tenir. C'est faute
de l'avoir fait que les Lots 3 et 4 ont dérivé — dérive corrigée au Lot 5.

**Point de bascule** : à partir du **Lot 6**, l'app doit devenir ton outil quotidien réel. Les lots 7
à 9 se construisent mieux si tu utilises déjà les lots 1 à 6 pour de vrai.

---

## 8. Notifications — précision importante

Correction de ce que j'ai affirmé au premier cadrage : depuis **iOS 16.4**, une PWA **installée sur
l'écran d'accueil peut recevoir des notifications push**. Mais :

- Le push exige un **serveur VAPID** qui pousse le message. C'est un backend à héberger et à
  maintenir → **contraire au principe 7**, et pas gratuit à long terme.
- Il n'existe **aucune API de notification locale programmée** dans Safari (`Notification Triggers`
  n'est pas implémenté). Une PWA fermée ne peut pas se réveiller toute seule.
- iOS ne supporte ni les **widgets**, ni les **raccourcis d'icône** (appui long), ni le **background
  sync**.

**Ce qui marche et qu'on utilise** : la **Badging API** (`navigator.setAppBadge`), supportée depuis
iOS 16.4. Une pastille chiffrée sur l'icône de l'écran d'accueil, mise à jour à chaque fermeture de
l'app. Tu vois « 3 » sur l'icône toute la journée sans que rien ne sonne. Gratuit, sans serveur, et
parfaitement dans l'esprit « l'app ne t'interrompt pas, elle t'informe ».

---

## 9. Après la V1

- **V2 — Synchro & partage (piste NAS Synology).** Le NAS héberge un endpoint (WebDAV ou dossier
  Drive) exposé en HTTPS via DDNS Synology + Let's Encrypt (gratuit). Chaque appareil pousse et tire
  l'état ; fusion par `updatedAt` grâce à la discipline du Lot 1. Comptes locaux (toi / ta
  conjointe), listes marquées partagées ou privées. **C'est un cycle entier, pas un lot.**
- **V2/V3 — Desktop.** Optimisation de l'écran large (colonnes, raccourcis clavier). Le responsive de
  base est déjà prévu au Lot 2.
- **Plus tard** : multi-magasins pour les courses, recettes → liste de courses (AnyList ⑯), export
  vers Apple Rappels/Calendrier pour contourner les notifications, stock du placard, thème clair.

---

## 10. Points de vigilance

- **GitHub Pages gratuit impose un dépôt public.** Le **code** est public, les **données** restent
  sur ton appareil — mais : jamais de secret, de clé d'API ni de donnée personnelle en dur.
- **Les données sont liées à l'origine (l'URL).** Changer d'hébergement = stockage vide. Parade :
  **exporter le JSON avant, réimporter après** (d'où le Lot 11, non négociable).
- **Incrémenter `CACHE` dans `sw.js` à chaque release** et synchroniser la version affichée. Sinon
  l'app installée garde l'ancienne version. Piège classique, déjà vécu sur le piano.
- **GitHub Pages / Fastly cache les fichiers ~10 min.** Après un `git push`, attendre avant de
  soupçonner un bug.
- **iOS peut tuer une PWA en arrière-plan sans prévenir** → `saveNow()` sur `pagehide` et
  `visibilitychange→hidden`, dès le Lot 1.
- **Les photos de plantes peuvent faire grossir le stockage.** Redimensionner à ~1000 px et
  recompresser en JPEG avant stockage (canvas, aucune dépendance).

---

## 11. Méthode de travail

- **`CLAUDE.md` à jour** = mémoire du projet, lue à chaque session. Mise à jour à la fin de chaque lot.
- **Petits diffs ciblés**, jamais de réécriture de fichier entier.
- **`node --check js/<fichier>.js`** après chaque édition (chaque module doit parser seul).
- **`npm test`** (test de fumée) après chaque lot, avant chaque commit.
- **Un commit par lot**, message en français décrivant le lot.
- **Stratégie de modèles** : planifier en Opus, coder en Sonnet, trivial (libellés, CSS, commits) en
  Haiku.

---

## 12. Sources de l'étude comparative (2026-07-26)

- Tâches — [Things 3 : Today / Upcoming / Anytime / Someday](https://culturedcode.com/things/support/articles/4001304/) · [Things 3 review, MacStories](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/) · [Guide des tâches récurrentes Todoist](https://calmevo.com/todoist-recurring-tasks-guide/) · [Comparatif 2026 Todoist / TickTick / Things](https://thesoftwarescout.com/best-to-do-list-apps-2026/) · [Amazing Marvin — battre la procrastination](https://amazingmarvin.com/how-to-beat-procrastination-with-marvin/)
- Échec des listes — [Why Most To-Do Lists Fail](https://www.pocketinformant.com/why-to-do-lists-fail/) · [Why We Abandoned the To-Do List, Quire](https://quire.io/blog/p/Why-We-Abandoned-the-To-Do-List.html)
- Entretien maison — [Tody](https://todyapp.com/) · [Sweepy](https://sweepy.com/)
- Plantes — [Le calendrier d'arrosage de Planta](https://support.getplanta.com/about-plantas-watering-schedule/) · [Ajuster l'arrosage selon la saison](https://blog.plantwaterreminder.app/how-to-adjust-your-watering-schedule-by-season-automatically/) · [Comparatif apps plantes 2026](https://plantcareclub.com/blog/best-plant-apps-2026)
- Courses — [Comparatif AnyList / OurGroceries 2026](https://lystbot.com/blog/best-grocery-list-apps/) · [Listonic / Bring / AnyList / OurGroceries à l'usage](https://smartcartfamily.com/en/blog/grocery-apps-comparison)
- Habitudes — [11 meilleurs trackers d'habitudes 2026, Toggl](https://toggl.com/blog/best-habit-tracker-apps) · [Comparatif Reclaim](https://reclaim.ai/blog/habit-tracker-apps)
- PWA iOS — [PWA sur iOS, guide complet 2026](https://www.mobiloud.com/blog/progressive-web-apps-ios) · [Limites PWA iOS et support Safari 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
