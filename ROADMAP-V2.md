# MyLife — Roadmap V2 « L'usage »

> **La V1 a construit les fonctionnalités. La V2 les rend agréables.**
> Aucun domaine nouveau, aucune donnée nouvelle qui ne serve pas directement un parcours existant.
> Ce fichier remplace `ROADMAP-V1.md` comme référence de planification ; `CONVENTIONS.md` reste la
> loi permanente, amendée par le §3 ci-dessous.

---

## 1. L'objectif en une phrase

Que chaque geste quotidien — ajouter, cocher, corriger, se raviser — se fasse **là où le pouce est
déjà**, **en un tap**, et **soit annulable**. Ce que la V1 sait faire, la V2 le rend évident.

Trois mesures de réussite, vérifiables :

| Mesure | V1 (mesuré le 14/08/2026) | Cible V2 |
|---|---|---|
| Gestes pour ajouter un article de courses depuis n'importe où | 1 onglet + scroll de 2,3 écrans + tap + saisie | 1 onglet + tap + saisie |
| Actions principales annulables | 1 sur 5 (suppression seule) | 5 sur 5 |
| Domaines atteignables depuis la tab bar | 4 sur 5 (Habitudes inatteignable à zéro habitude) | 5 sur 5 |

---

## 2. L'audit — ce qui a été constaté

Audit mené le 14/08/2026 sur Bêta 1.12, code lu intégralement **et** app exercée avec un jeu de
données réaliste (18 tâches, 7 entretiens, 2 plantes, 4 habitudes, 14 articles). Les mesures de
hauteur sont réelles, pas estimées.

### A. Problèmes structurels

| # | Constat | Preuve | Lot |
|---|---|---|---|
| A1 | **La saisie est toujours au fond de l'écran.** `captureBarHtml()` et le champ Courses sont rendus après tout le contenu | Aujourd'hui = 2,4 écrans, Courses = 2,3, Tâches = 2,1 avec un jeu de données modeste | V2-2 |
| A2 | **Aucun retour arrière sur la complétion.** `todayDoneRow()` rend la case `disabled` : une tâche cochée sur Aujourd'hui ne peut plus être décochée. `doneTask()` fait disparaître sans toast. `tapMaisonItem()` écrase la date du dernier entretien en un frôlement | `js/today.js:184`, `js/tasks.js:161`, `js/maison.js:72` | V2-1, V2-3 |
| A3 | **Les Habitudes n'ont aucune porte d'entrée à zéro habitude.** La carte n'existe que si `b.habits.length` ; c'est le seul chemin vers `go('habits')`. Une installation neuve ne peut jamais créer sa première habitude | Vérifié : le HTML d'Aujourd'hui sans habitude ne contient aucun `go('habits')` | V2-2 |
| A4 | **Sur Maison, deux lignes identiques ont deux comportements opposés.** `careRowHtml()` produit la même ligne pour un entretien (tap = fait, destructif, sans retour) et pour une plante (tap = fiche de 700 px) | `js/maison.js:35` | V2-5 |
| A5 | **La fiche tâche est un mur** : 1 285 px, 11 sections toujours dépliées, alors que 90 % des tâches ne demandent qu'un titre et une date | `js/tasks.js:290` | V2-4 |

### B. L'information affichée n'aide pas à décider

| # | Constat | Preuve | Lot |
|---|---|---|---|
| B1 | **Les jauges ne discriminent plus rien** : plancher à 4 %, donc « dû depuis 1 jour » et « dû depuis 30 jours » sont le même pixel | `gaugeWidth()`, `js/ui.js:163` | V2-5 |
| B2 | **La légende contredit la jauge** : « Monstera (rempotage) · Il y a 300 jours » en vert, au-dessus de « Passer l'aspirateur · Il y a 6 jours » en rouge. Le nombre de jours absolu est inutilisable sans l'intervalle | Capture d'écran Maison | V2-5 |
| B3 | **Le plafond d'Aujourd'hui cache les plantes** : les soins sont concaténés après les tâches puis tronqués. Test réel : 11 items, cap à 7 → les 4 soins dus étaient tous repliés dans « + 4 autres » | `js/today.js:100` | V2-3 |
| B4 | **La jauge agrégée par pièce est du bruit** : minimum de ses éléments, donc rouge dès qu'un seul est dû, et redondante avec la ligne d'en dessous | `js/maison.js:58` | V2-5 |
| B5 | **La méta d'habitude est illisible** : « Lun, Mar, Mer, Jeu, Ven, Sam, Dim · 2 L / jour · Série 4 j · Record 0 j · 0 % sur 30 jours » sur 3 lignes | `js/habits.js:325` | V2-7 |
| B6 | **Le calendrier d'habitude est indéchiffrable** : ni nom de mois, ni en-tête de jours, ni numéros ; 400 px de vide en bas du mois en cours | `js/habits.js:306` | V2-7 |
| B7 | **Courses : 230 px de carte pour un rayon à un seul article** | Capture d'écran Courses | V2-6 |
| B8 | **Saisir « 30 min de marche » est pénible** : au-delà de `HAB_STEP_MAX`, champ de 64 px, clavier iOS, taper, refermer | `js/habits.js:213` | V2-7 |

### C. Promesses non tenues

| # | Constat | Preuve | Lot |
|---|---|---|---|
| C1 | **Le prénom demandé à l'accueil n'est jamais affiché.** `userName` n'est lu nulle part hors de son propre champ de réglage | grep sur `js/`, `data/`, `index.html` | V2-3 |
| C2 | **`settings.hideDone` est mort** — déclaré, jamais lu. Corollaire : aucun moyen de voir ce qu'on a fait | `js/state.js:33` | V2-4 |
| C3 | **Les notes sont invisibles** : stockées, cherchables, jamais affichées ni signalées dans une liste | `js/tasks.js:78` | V2-4 |
| C4 | **Un entretien ne peut être ni modifié ni supprimé** une fois créé (dette V1 assumée) | `CLAUDE.md`, § dettes V2 | V2-5 |

### D. Défauts francs

| # | Constat | Preuve | Lot |
|---|---|---|---|
| D1 | **Les `<textarea>` sont en monospace** : `button,input{font:inherit}` oublie `textarea` | `getComputedStyle` renvoie `monospace` sur `#ts-notes` ; `index.html:100` | V2-1 |
| D2 | **`<meta name="theme-color">` reste crème en mode sombre** : le bandeau système de la PWA installée reste clair au-dessus d'une app noire | `index.html:8`, jamais touché par `applyTheme()` | V2-1 |
| D3 | **Les lignes cliquables sont des `<li onclick>`** sans `role` ni `tabindex` : ni focusables au clavier, ni annoncées comme contrôles par VoiceOver. Le Lot V1-12 avait corrigé les `.check`, pas les lignes | `js/maison.js:36`, `js/today.js:160`, `js/shopping.js:143` | V2-1 |
| D4 | **Aucun oiseau en mode sombre** : la moitié de la personnalité disparaît la moitié du temps | `birdsOn()`, `js/ui.js:104` | V2-8 |
| D5 | Dictionnaire : « Pâtes » → **Frais**, « Café » → épicerie sucrée | `RAYONS['pate']` | V2-6 |

---

## 3. Arbitrages du 14/08/2026 — ils engagent tous les lots V2

Tranchés par Florian après présentation de l'audit. **Ils amendent `CONVENTIONS.md` et l'arbitrage
« la maquette fait foi » du 27/07/2026.**

### 3.1 Navigation — cinq onglets
La tab bar passe à **Aujourd'hui · Tâches · Maison · Courses · Habitudes**. Plus aucun écran
orphelin. L'engrenage reste la seule porte vers Réglages. *Amende `CONVENTIONS.md` §3
(« Navigation : go(name) »), qui ne changeait pas mais dont la tab bar à 4 onglets était figée
depuis le Lot 1.*

### 3.2 Saisie — barre collée en bas
La barre de capture (Aujourd'hui, Tâches) et le champ d'ajout (Courses) deviennent **collés
au-dessus de la tab bar**, toujours visibles quelle que soit la position de défilement. Le geste ne
change pas, seule la position change — le principe 5 (« jamais deux chemins visibles vers la même
action ») reste tenu, il n'y a toujours qu'une entrée par écran.

### 3.3 Gestes — le balayage entre dans l'app
Balayer une ligne vers la gauche = supprimer, vers la droite = l'action contextuelle (reporter,
compléter). Les boutons permanents `>` et `×` des lignes de Tâches disparaissent — ce sont eux qui
écrasent les titres sur deux lignes. **Le balayage ne remplace jamais un chemin : il double un
chemin qui existe déjà dans la fiche.** Une ligne reste actionnable au tap et au clavier.
*Amende `CONVENTIONS.md` §3 : les cibles de 44 px restent obligatoires, le balayage s'ajoute.*

### 3.4 Ambition — structure + finition premium
Transitions d'écran, animation de complétion, états vides soignés, oiseaux rendus au mode sombre.

> **Point d'honnêteté sur le retour haptique.** iOS ne l'expose pas au web : `navigator.vibrate`
> n'existe pas dans Safari, ni en onglet ni en PWA installée. La seule voie réelle est
> `<input type="checkbox" switch>` (Safari 17.4+), qui déclenche un retour haptique système sur ce
> seul contrôle. Le Lot V2-8 l'essaiera sur les interrupteurs de Réglages et **ne promettra rien
> ailleurs**. Partout ailleurs, le retour est visuel et sonore-muet, point.

### 3.5 Historique — un groupe repliable, pas un écran
Un groupe **« Fait aujourd'hui » / « Fait cette semaine »** replié en bas de l'écran Tâches, où
l'on peut décocher. `settings.hideDone` devient enfin utile (il pilote ce groupe). Pas d'écran
« Fait » : ce serait une fonctionnalité, pas de l'UX.

### 3.6 Prénom — utilisé, sobrement
Le sur-titre d'Aujourd'hui devient « Bonjour Florian · Vendredi 14 août » et l'état vide se
personnalise. Rien d'autre : ni salutation selon l'heure, ni récapitulatif nommé, ni emoji.
*La règle « ton sobre et adulte » de `CONVENTIONS.md` §3 reste la limite.*

### 3.7 Maison — bouton d'action explicite
Chaque ligne porte un bouton d'action à droite (« Fait », « Arrosé ») : ce bouton agit, avec
annulation ; **le reste de la ligne ouvre le détail**. Même règle pour l'entretien et pour la
plante. Plus aucun geste destructif accidentel, et arroser passe de 4 gestes à 1.

### 3.8 Courses — liste continue à en-têtes collés
On abandonne la carte par rayon au profit d'une liste unique dont l'en-tête de rayon reste collé
en haut pendant le défilement. **Ceci contredit sciemment `maquettes/MyLife Canopée.html`.**

> ### ⚠️ Amendement à l'arbitrage du 27/07/2026 — à lire avant tout lot V2
> La règle « la maquette fait foi, y compris contre le code livré » **reste vraie pour tout ce que
> la V2 ne rouvre pas explicitement**. Elle est levée sur exactement trois points, listés ici et
> nulle part ailleurs :
> 1. **Courses** — liste continue à en-têtes collés, plus de carte par rayon (§3.8).
> 2. **Tâches** — plus de boutons `>` / `×` permanents sur les lignes ; balayage à la place (§3.3).
> 3. **Tab bar** — cinq onglets, pas quatre (§3.1).
>
> Sur tout le reste — couleurs, typo, espacements, cartes, états vides, jauges — **la maquette
> continue de gagner**. Un futur lot qui voudrait s'en écarter doit ajouter une ligne ici.

---

## 4. Les huit lots

Version affichée **Bêta 2.N**, `CACHE = 'mylife-b2-N'` dans `sw.js`, `APP_VERSION = 'Bêta 2.N'`
dans `js/state.js` — même numéro, comme en V1.

| Lot | Version | Titre | Ce qu'il livre | Modèle |
|---|---|---|---|---|
| **V2-1** | Bêta 2.1 | **Socle d'interaction** | `js/gestures.js` (nouveau, 18ᵉ fichier) : balayage sur `.row`, Pointer Events, abandon dès qu'un défilement vertical démarre, désactivé sous `prefers-reduced-motion`. Helper `undoable(msg, undoFn)` dans `ui.js`. Lignes rendues accessibles (`role="button"`, `tabindex="0"`, Entrée/Espace). Correction D1 (`textarea`/`select` en `font:inherit`), D2 (`theme-color` posé par `applyTheme()`), D3 | Sonnet |
| **V2-2** | Bêta 2.2 | **Navigation & saisie** | 5ᵉ onglet Habitudes avec son icône. Barre de capture et champ Courses **collés** au-dessus de la tab bar. `go()` mémorise et restaure la position de défilement par écran. Écran Habitudes atteignable même vide | Sonnet |
| **V2-3** ⚑ | Bêta 2.3 | **« Aujourd'hui » v3** | Maquette d'abord. Prénom dans le sur-titre (C1). Cascade revue pour que les soins de plantes ne tombent plus sous le plafond (B3). Annulation sur `todayDone()` et décochage possible (A2). Densité du bloc du jour. Bloc Habitudes : saisie par pas adapté et bouton « atteint » (B8) | Opus puis Sonnet |
| **V2-4** | Bêta 2.4 | **Tâches v2** | Balayage (supprimer / reporter), suppression des boutons permanents. Fiche tâche en divulgation progressive : titre + date visibles, le reste derrière « Plus d'options ». Groupe « Fait » repliable piloté par `hideDone` (C2). Indicateur de notes (C3). Recherche et filtres qui ne prennent de la place que quand ils servent | Sonnet |
| **V2-5** | Bêta 2.5 | **Maison & plantes v2** | Bouton d'action explicite par ligne (§3.7, A4). Légende utile « À faire » / « Dans 3 j » au lieu de « Il y a N jours » (B2). Jauge qui discrimine à nouveau (B1). Jauge agrégée de pièce repensée ou retirée (B4). **Édition et suppression d'un entretien** (C4, dette V1). Fiche plante allégée | Sonnet |
| **V2-6** | Bêta 2.6 | **Courses v2** | Liste continue à en-têtes collés (§3.8, B7). Champ d'ajout collé. Mode magasin repensé autour de l'en-tête collant et d'une progression lisible. Corrections du dictionnaire (D5) | Sonnet |
| **V2-7** | Bêta 2.7 | **Habitudes v2** | Calendrier lisible : nom du mois, en-tête de jours, numéros, hauteur stable (B6). Méta éclatée en lignes distinctes (B5). Saisie rapide par pas adapté à l'objectif (B8). Écran propre avec son état vide et son bouton d'ajout accessible sans défiler | Sonnet |
| **V2-8** | Bêta 2.8 | **Mouvement, finition, QA** | Transitions d'écran, animation de complétion, oiseaux rendus au mode sombre (D4), essai de l'haptique sur les interrupteurs (§3.4). Audit accessibilité complet. `QA-IPHONE-V2.md`. Mise à jour de `CLAUDE.md` et `CONVENTIONS.md` | Sonnet |

**Dépendances dures :** V2-1 avant V2-4, V2-5, V2-6 (ils consomment `gestures.js` et `undoable()`).
V2-2 avant V2-3 et V2-7 (la tab bar et la barre collée changent la hauteur utile de chaque écran).
V2-8 en dernier, toujours.

---

## 5. Hors périmètre V2 — décidé, pas oublié

- **Synchro et partage (piste NAS)** — reste la V3. Rien en V2 ne doit casser la discipline
  synchro-ready de `CONVENTIONS.md` §2, qui continue de s'appliquer à la lettre.
- **Icônes d'app encore grises** — la dette du Lot V1-2 n'est *pas* rouverte : le §3.4 exclut la
  refonte visuelle. À traiter à part, quand elle sera décidée.
- **Desktop / écran large** — la colonne centrée à 560 px reste ce qu'elle est.
- **Recettes liées aux courses**, **multi-magasins** — fonctionnalités, pas UX.
- **Notifications** — impossible sans serveur ; la pastille iOS reste le seul substitut honnête.

---

## 6. Checklist de release V2 — à dérouler à la fin de chaque lot

```
[ ] node --check sur chaque fichier js/ et data/ modifié
[ ] npm test passe (aucune erreur runtime)
[ ] si un fichier a été ajouté : les 3 listes miroir sont à jour
    (index.html <script>, sw.js ASSETS, test.mjs FILES)
[ ] CACHE incrémenté dans sw.js          → 'mylife-b2-N'
[ ] APP_VERSION synchronisé dans state.js → 'Bêta 2.N'   (MÊME numéro)
[ ] Toute action destructive ou de complétion ajoutée est annulable (undoable)
[ ] Toute ligne cliquable ajoutée est focusable et actionnable au clavier
[ ] Aucune couleur hors palette ; aucun style="..." non calculé ; aucune classe CSS orpheline
[ ] CLAUDE.md mis à jour si quelque chose y est devenu faux
[ ] Un seul commit : « Lot V2-N « Titre » : résumé (Bêta 2.N) »
```
