# MyLife — Les 12 prompts de la V1

> **Mode d'emploi.** Un lot = une session de travail = un commit = une release.
> Ouvre une session neuve, colle le bloc `Prompt à coller` du lot en cours, laisse faire, puis
> vérifie les critères d'acceptation. Ne jamais enchaîner deux lots dans la même session : le
> contexte se dégrade et les erreurs s'accumulent.
>
> **Modèle** indiqué pour chaque lot. Les lots marqués ⚑ demandent une validation de ta part
> **avant** que le code soit écrit — ils se font en deux temps.
>
> Les prompts supposent que `CLAUDE.md`, `CONVENTIONS.md` et `ROADMAP-V1.md` sont dans le dépôt.
>
> **⚠️ À ajouter mentalement à tout prompt de lot qui touche un écran** — leçon du Lot 5 :
> *« Ouvre d'abord `maquettes/MyLife Canopée.html` et lis l'écran correspondant. Elle contient les
> huit écrans, y compris ceux qui ne sont pas encore codés. En cas de désaccord entre le code
> existant et la maquette, c'est la maquette qui fait foi. »*
> Sans cette phrase, les Lots 3 et 4 ont dérivé sans que personne le voie, et le Lot 5 a commencé
> par produire deux maquettes à jeter.

| Lot | Titre | Modèle | Validation | Statut |
|---|---|---|---|---|
| 1 | Socle | Sonnet | — | ✅ Bêta 1.1 |
| 2 | Identité & design system | Opus puis Sonnet | ⚑ | ✅ Bêta 1.2 |
| 3 | Moteur de tâches | Sonnet | — | ✅ Bêta 1.3 |
| 4 | Récurrence & Maison v1 | Sonnet | — | ✅ Bêta 1.4 |
| 5 | « Aujourd'hui » v1 | Opus puis Sonnet | ⚑ | ✅ Bêta 1.5 |
| 6 | Saisie en langage naturel | Sonnet | — | à faire |
| 7 | Maison v2 — Plantes | Sonnet | — | à faire |
| 8 | Habitudes | Sonnet | — | à faire |
| 9 | Courses | Sonnet | — | à faire |
| 10 | « Aujourd'hui » v2 + revue hebdomadaire | Sonnet | — | à faire |
| 11 | Réglages & filet de sécurité | Sonnet | — | à faire |
| 12 | Polish, QA, dettes | Sonnet | — | à faire |

---

## Lot 1 — Socle · Bêta 1.1 · Sonnet

### Prompt à coller

```
Lot V1-1 « Socle » de MyLife. Lis d'abord CONVENTIONS.md en entier, puis ROADMAP-V1.md
sections 4 (architecture) et 5 (modèle de données).

Crée le projet de zéro dans ce dossier. Périmètre exact, rien de plus :

1. index.html — squelette ; <style> avec un :root provisoire en gris neutres (le vrai design
   arrive au Lot 2, ne cherche pas à faire beau) ; conteneurs d'écrans #s-today #s-tasks
   #s-maison #s-shopping #s-habits #s-settings ; tab bar 4 onglets Aujourd'hui / Tâches /
   Maison / Courses avec safe-area iOS ; balises <script> dans l'ordre imposé.

2. js/state.js — APP_VERSION = 'Bêta 1.1' ; ouverture IndexedDB base 'mylife' avec les stores
   'state' et 'photos' ; loadState() ; save() débouncé 150 ms ; saveNow() async ; repli
   localStorage si IndexedDB indisponible ; defaults() ; migrate() ; let S = defaults() ;
   helpers stamp() / touch() / live() de CONVENTIONS.md §2 ; helpers de date todayKey(),
   dayKey(d), addDays(k,n), daysBetween(a,b). Aucun rendu DOM dans ce fichier.

3. js/ui.js — go(name) ; openSheet(html) / closeSheet() avec fermeture par tap extérieur et par
   glisser vers le bas depuis la poignée ; toast(msg, opts) ; confirmSheet(msg, label, onOk) ;
   esc(s) ; emptyState(texte, icone).

4. js/tasks.js — renderTasks() minimal : un champ d'ajout, la liste des tâches non faites,
   cocher, supprimer (tombstone). RIEN d'autre : ni date, ni catégorie, ni priorité, ni
   récurrence — c'est le périmètre des Lots 3 et 4.

5. Placeholders — js/today.js, js/recur.js, js/nlp.js, js/maison.js, js/plants.js, js/habits.js,
   js/shopping.js, js/review.js, js/settings.js : chacun avec sa fonction renderX() qui affiche
   un emptyState « bientôt ». Ils doivent exister dès maintenant pour figer l'ordre de chargement
   et les trois listes miroir.

6. data/rayons.js, data/plantes.js, data/entretien.js — structures vides et commentées, remplies
   aux Lots 9, 7 et 4.

7. js/boot.js — boot() async ; READY ; window.__ready ; saveNow() sur pagehide et sur
   visibilitychange→hidden ; navigator.storage.persist() au premier lancement ; enregistrement du
   service worker ; vérification de mise à jour au retour au premier plan (reg.update() puis
   rechargement sur controllerchange).

8. sw.js — CACHE = 'mylife-b1-1' ; ASSETS = tous les fichiers ; cache-first avec mise à jour en
   arrière-plan.

9. manifest.webmanifest + icon-180/192/512.png — génère des icônes simples mais propres
   (monogramme sur aplat), display standalone, orientation portrait.

10. package.json — uniquement devDependencies jsdom et fake-indexeddb, script "test".
    test.mjs — charge index.html sous jsdom avec fake-indexeddb injecté, inline les fichiers
    data/ et js/ concaténés dans l'ordre du tableau FILES en un seul <script>, await
    window.__ready(), appelle go() sur chacun des 6 écrans, crée puis coche puis supprime une
    tâche, vérifie la persistance après rechargement simulé, et échoue si la moindre erreur
    runtime est levée.

11. CLAUDE.md — mémoire de projet, courte et dense, sur le modèle de celle de piano-app-v2 :
    projet en une phrase, nature technique, fichiers et ordre de chargement, comment lancer et
    tester, architecture et conventions, modèle de données, règles et pièges, état des 12 lots.

12. .gitignore (node_modules), git init, premier commit.

Ne fais rien d'autre. Termine par la checklist de release de CONVENTIONS.md §4 et un compte rendu
court : ce qui est fait, ce qui est volontairement absent, ce que je dois vérifier sur l'iPhone.
```

### Critères d'acceptation
- [ ] `npm test` passe, aucune erreur runtime
- [ ] `node --check` passe sur chacun des 12 fichiers `js/` et `data/`
- [ ] Les 4 onglets naviguent, la tab bar respecte la safe-area iOS
- [ ] Créer, cocher et supprimer une tâche fonctionne ; l'état survit à un rechargement
- [ ] Une tâche supprimée a un `deletedAt`, elle n'est pas retirée du tableau
- [ ] Les trois listes miroir (`index.html`, `sw.js`, `test.mjs`) contiennent les mêmes fichiers
      (16 au Lot 1, 17 depuis que le Lot 2 a ajouté `data/oiseaux.js`)
- [ ] `CLAUDE.md` existe et décrit fidèlement le projet

### À faire toi-même après ce lot
1. Créer le dépôt GitHub **public** nommé `mylife` et le pousser :
   ```bash
   gh repo create mylife --public --source=. --push
   ```
2. Activer GitHub Pages sur la branche `main` (Settings → Pages → Deploy from branch → main → /).
3. Ouvrir l'URL sur ton iPhone dans Safari → Partager → **Sur l'écran d'accueil**.

---

## Lot 2 ⚑ — Identité & design system · Bêta 1.2 · Opus puis Sonnet

### Étape 1 — les propositions (Opus, aucun code d'application)

```
Lot V1-2 « Identité » de MyLife, étape 1 : propositions uniquement, aucun code d'application.

Lis CONVENTIONS.md section 3 et ROADMAP-V1.md sections 1, 6 et 6 bis.

Propose-moi 3 directions visuelles distinctes. Contraintes réelles à respecter :
— app de vie quotidienne consultée plusieurs fois par jour, souvent tôt le matin et tard le soir ;
— elle doit être reposante et non stimulante : elle contient des choses à faire, pas des
  récompenses à collectionner ;
— elle est pleine de jauges continues et de listes denses ; la lisibilité prime sur l'effet ;
— elle doit être lisible d'une main, en marchant, au supermarché ;
— zéro dépendance externe : polices système (-apple-system, ui-serif, ui-rounded…) ou police
  embarquée en base64 légère, jamais de Google Fonts en ligne ;
— sombre et clair doivent être envisagés : dis-moi ce que tu recommandes et pourquoi.

Pour chaque direction, donne : un nom, une phrase d'intention, la palette complète en hex avec le
RÔLE de chaque couleur (pas juste « accent »), les polices, le traitement des jauges de fraîcheur,
le traitement des états vides, et la règle de discipline chromatique (quelle couleur veut dire
quoi, et ce qu'on s'interdit).

Livre-les sous forme de 3 maquettes HTML statiques autonomes dans maquettes/, ouvrables dans un
navigateur, montrant le MÊME écran « Aujourd'hui » fictif dans les 3 styles — avec des retards,
des jauges d'entretien, une plante à arroser, deux habitudes, une ligne de courses.

N'écris rien dans index.html ni dans js/. Termine en me disant laquelle tu recommandes et pourquoi.
```

### Étape 2 — l'exécution (Sonnet, après ton choix)

```
Lot V1-2 « Identité » de MyLife, étape 2 : j'ai retenu la direction « <NOM> ».

Applique-la pour de vrai :
1. Remplace le :root provisoire d'index.html par le jeu complet de variables CSS (couleurs, rôles,
   espacements, rayons, durées et courbes de motion, épaisseurs de trait).
2. Écris les composants partagés en classes CSS : boutons (primaire / secondaire / danger),
   cartes, chips, jauges, listes, feuilles modales, tab bar, en-têtes d'écran, états vides,
   toasts, sur-titres.
3. Ajoute la règle de discipline chromatique en tête du <style>, en commentaire, et reporte-la
   dans CLAUDE.md — elle nous engage pour les 10 lots suivants.
4. Restyle les écrans existants (Tâches, tab bar, feuilles) avec ces classes.
5. Câble :focus-visible sur tout élément interactif et prefers-reduced-motion sur toutes les
   animations. Vérifie les contrastes par calcul et donne-moi les ratios obtenus.
6. Responsive : au-delà de 900 px de large, la mise en page doit rester correcte (colonne
   centrée et plafonnée). On optimisera le desktop en V2, mais rien ne doit casser.
7. GARDE la maquette retenue dans maquettes/, elle est la référence de design des 10 lots
   suivants. Écris dans CLAUDE.md qu'elle fait foi en cas de désaccord avec le code.

Termine par la checklist de release et le compte rendu.
```

> **Correction apportée le 27/07/2026, à ne pas perdre.** Le point 7 disait à l'origine
> « **retire** les maquettes/ du dépôt une fois la direction appliquée ». C'est cette instruction
> qui a coûté le plus cher du cycle : privés de la référence, les Lots 3 et 4 ont dérivé sans le
> voir (`.overline` 13 px généralisé comme titre de groupe alors que la maquette met 18 px/700 ;
> cartes de pièce teintées au lieu de blanches ; jauges sous le titre au lieu d'à droite), et le
> Lot 5 a produit deux maquettes entières avant qu'on s'aperçoive que l'écran existait déjà en
> référence. Tout a été remis en conformité au Lot 5. **Une maquette validée reste dans le dépôt.**

### Critères d'acceptation
- [ ] Aucune couleur en dur hors du `:root` (sauf valeurs calculées)
- [ ] Les ratios de contraste sont donnés par calcul et tous ≥ 4,5:1
- [ ] `:focus-visible` visible partout, `prefers-reduced-motion` respecté
- [ ] Rien ne casse à 900 px et au-delà
- [ ] La règle de discipline chromatique est écrite dans `CLAUDE.md`
- [ ] La maquette retenue est **restée** dans `maquettes/` et `CLAUDE.md` y renvoie

---

## Lot 3 — Moteur de tâches · Bêta 1.3 · Sonnet

### Prompt à coller

```
Lot V1-3 « Moteur de tâches » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md sections 3 et 5.

Enrichis le modèle des tâches et l'écran Tâches. Périmètre exact :

1. Modèle — ajoute à tasks[] : notes, cat ('perso'|'menage'|'entretien'|'admin'), room
   ('salon'|'cuisine'|'chambre'|'sdb'|'bureau'|'exterieur'|null), bucket
   ('scheduled'|'anytime'|'someday'), start, due, evening (bool), prio (0|1|2), effort (1|2|3),
   postponed (nombre), touchedAt. Écris la migration dans migrate() : les tâches existantes
   deviennent bucket 'anytime', prio 0, effort 2. Le champ repeat arrive au Lot 4, ne le fais pas.

2. La distinction start / due est le cœur de ce lot, ne la simplifie pas :
   — start = « le jour où je veux m'en occuper » ; c'est lui qui fait remonter la tâche dans
     « Aujourd'hui » ; un start passé n'est JAMAIS un retard ;
   — due = la vraie deadline ; c'est la seule qui peut produire un « en retard ».
   Une tâche peut avoir l'un, l'autre, les deux ou aucun.
   bucket vaut 'scheduled' dès qu'il y a un start ou un due.

3. Fiche tâche — feuille modale taskSheet(id|null) : titre, notes, catégorie, pièce, début,
   échéance, ce soir, priorité, effort, bucket. Création et édition par la même feuille.
   Suppression par confirmSheet.

4. Écran Tâches — groupes « Aujourd'hui et avant », « À venir », « Un jour » (bucket anytime),
   « Peut-être » (bucket someday, replié par défaut et visuellement en retrait). Chips de filtre
   par catégorie. Champ de recherche. Compteur par groupe. Tri : due dépassée d'abord (la plus
   ancienne), puis priorité, puis ancienneté.

5. Reporter une tâche incrémente postponed et met à jour touchedAt. Affiche « reportée N fois »
   à partir de 3, discrètement, sans jugement.

6. Toute mutation passe par touch(). Toute lecture passe par live().

Ne touche pas à l'écran Aujourd'hui (Lot 5), ni à la récurrence (Lot 4), ni à la saisie en
langage naturel (Lot 6). Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] Une tâche avec `start` passé et sans `due` n'apparaît **jamais** comme en retard
- [ ] Une tâche `someday` n'apparaît dans aucun groupe visible par défaut
- [ ] La migration ne perd aucune tâche existante
- [ ] Les filtres et la recherche se combinent correctement
- [ ] `npm test` couvre la création d'une tâche avec chaque champ

---

## Lot 4 — Récurrence & Maison v1 · Bêta 1.4 · Sonnet

### Prompt à coller

```
Lot V1-4 « Récurrence & Maison » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md sections 3
(points ④ ⑩ ⑫ ⑯), 5 et 6 bis.

C'est le lot le plus structurant de la V1. Périmètre exact :

1. js/recur.js — fonctions PURES, aucun DOM, testables isolément :
   — nextDue(task, ref) : prochaine échéance selon repeat.kind ('day'|'week'|'month'|'year'),
     repeat.n, repeat.days[], et surtout repeat.from :
       'due'  → calcul depuis l'échéance précédente, indépendamment de la réalisation
                (loyer le 5, impôts le 15 mai) ;
       'done' → calcul depuis doneAt, la réalisation effective
                (aspirateur 7 jours après le dernier passage).
     Cette distinction est le cœur du lot, traite-la explicitement et teste-la.
   — freshness(task, ref) : 1 − (jours depuis doneAt / intervalle en jours), borné [0,1].
     1 = frais, 0 = à faire. Au-delà de l'intervalle la valeur reste 0, elle ne devient
     jamais négative et ne produit jamais un « retard ».
   — intervalDays(repeat) : l'intervalle en jours, tous kinds confondus.
   — completeTask(task) : pousse la date dans history, met à jour doneAt, recalcule due si
     récurrente, remet postponed à 0, touch().

2. Récurrence dans la fiche tâche — segment « à date fixe » / « après réalisation », kind, n,
   jours de la semaine si hebdomadaire. Formulation en clair sous les champs : « tous les 7 jours
   après la dernière fois ».

3. Écran Maison — vue par pièce (voir ROADMAP §6 bis). Une section par pièce, une jauge agrégée
   par pièce (la plus basse de ses éléments), une ligne par tâche d'entretien avec sa jauge de
   fraîcheur continue. Tap sur une ligne = marquer fait (avec un retour visuel de la jauge qui
   remonte). Les pièces sans élément ne s'affichent pas. Les tâches sans pièce ne sont pas ici.
   Les plantes arrivent au Lot 7 : prévois la structure d'affichage pour les accueillir, mais ne
   les code pas.

4. VOCABULAIRE — jamais « en retard » ni « manqué » dans cet écran. Une jauge basse dit « à
   faire », c'est tout. Le ton est informatif, jamais accusateur. C'est une décision de
   conception, pas une préférence de style.

5. data/entretien.js — catalogue d'environ 40 modèles d'entretien courants en français, chacun
   avec un libellé, une pièce, un intervalle par défaut en jours et un effort. Couvre au moins :
   aspirateur, serpillière, draps, salle de bain, WC, poussière, vitres, four, frigo,
   lave-vaisselle (détartrage), lave-linge (nettoyage du bac), hotte, VMC, joints de douche,
   poubelles, plantes du balcon, gouttières, chaudière, détecteurs de fumée, pharmacie
   (péremptions). Découpe en gestes COURTS et concrets : « vider le lave-vaisselle », pas
   « ranger la cuisine ».
   Feuille d'ajout depuis l'écran Maison : on choisit une pièce, on coche des modèles, ils sont
   créés en une fois comme tâches récurrentes 'done'.

Ne touche pas à l'écran Aujourd'hui (Lot 5). Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] `recur.js` ne contient **aucune** référence au DOM et est testé en isolation
- [ ] `from:'due'` et `from:'done'` produisent des dates différentes sur un cas de retard, et
      `npm test` le vérifie explicitement
- [ ] La jauge de fraîcheur n'est jamais négative et ne produit jamais le mot « retard »
- [ ] Ajouter 5 modèles d'entretien depuis le catalogue prend moins de 30 secondes
- [ ] Aucune occurrence de « en retard » ou « manqué » dans l'écran Maison

---

## Lot 5 ⚑ — « Aujourd'hui » v1 · Bêta 1.5 · Opus puis Sonnet

### Étape 1 — la maquette (Opus, aucun code d'application)

```
Lot V1-5 « Aujourd'hui » de MyLife, étape 1 : maquette uniquement.

Lis ROADMAP-V1.md section 6 (l'algorithme) et CONVENTIONS.md section 3.

C'est le seul écran qu'il est cher de rater : c'est la raison d'être de l'app. Produis une
maquette HTML statique autonome dans maquettes/today.html, dans le design system du Lot 2, avec
des données fictives réalistes couvrant tous les cas : deux échéances dépassées, quatre tâches du
jour, trois entretiens à jauge basse, deux habitudes dont une déjà atteinte, une ligne de courses,
une tâche « ce soir », et le bloc « si tu as 10 minutes ».

Puis produis une SECONDE maquette, maquettes/today-vide.html : la même journée, mais tout est
fait. L'app doit savoir dire « c'est bon pour aujourd'hui » et ne rien proposer d'autre. Cet
écran-là compte autant que l'autre.

Ne touche pas à js/ ni à index.html. Explique tes arbitrages de hiérarchie visuelle.
```

### Étape 2 — l'exécution (Sonnet, après ta validation)

```
Lot V1-5 « Aujourd'hui » de MyLife, étape 2 : implémente la maquette validée.

1. js/today.js — renderToday() suivant exactement l'algorithme de ROADMAP-V1.md section 6 :
   échéances dépassées (due seulement, jamais start) → aujourd'hui (start ≤ ce jour + récurrences
   dues), plafonné à settings.todayCap avec un « + N autres » dépliable → entretien (les 3 jauges
   les plus basses) → ce soir → « si tu as 10 minutes » (bucket anytime, effort 1, jamais someday,
   1 à 3 items). Les blocs habitudes et courses NE SONT PAS de ce lot : chaque domaine pose son
   bloc dans son propre lot (8 et 9), leurs modèles n'existent pas encore. Ne laisse pas de
   placeholder — un bloc vide est un bloc absent.

2. Actions en ligne : cocher et ouvrir la fiche. Pas de bouton « reporter » : l'écran Tâches en a
   un, le remettre ici ferait deux chemins visibles vers la même action (principe 5).

3. État vide complet quand tout est fait : message clair, aucune suggestion supplémentaire.

4. Pastille iOS — navigator.setAppBadge(n) où n = nombre d'items du jour non faits ; posée à la
   fermeture (visibilitychange→hidden et pagehide), pas au rendu ; setAppBadge(0) efface, il n'y a
   pas besoin de clearAppBadge() ; entourée d'un garde car l'API n'existe pas partout.

Termine par la checklist de release et le compte rendu.
```

> **Prompt corrigé le 27/07/2026, après exécution.** Quatre points de la version d'origine étaient
> faux ou nuisibles, et sont réparés ci-dessus :
> - il demandait des **placeholders** habitudes et courses ; on ne pose pas un bloc vide, et leur
>   CSS aurait été du CSS mort (`CONVENTIONS.md` §3) ;
> - il demandait un bouton **« reporter à demain »** sur l'accueil, ce qui viole le principe 5 ;
> - il demandait la pastille **« au rendu »**, ce qui la recalculerait à chaque tap pour rien —
>   `ROADMAP` §6 dit « à la fermeture », et c'est la bonne lecture ;
> - son point 5 (« l'accueil devient l'écran de démarrage ») était déjà vrai depuis le Lot 1.
>
> **Décisions prises à l'implémentation, absentes du prompt** (détaillées dans `ROADMAP` §6) : le
> seuil de fraîcheur à 0,4 sur le bloc entretien, sans lequel l'état vide serait inatteignable ;
> les cochages de session, pour qu'une ligne ne s'évapore pas sous le doigt.

### Critères d'acceptation
- [ ] Un `start` passé remonte dans « Aujourd'hui », **jamais** dans « échéances dépassées »
- [ ] Aucun item n'apparaît dans deux blocs à la fois
- [ ] La liste du jour est plafonnée et le dépliant fonctionne
- [ ] « Si tu as 10 minutes » ne propose jamais de tâche `someday`
- [ ] Journée terminée → l'écran le dit et ne propose **rien** d'autre, aucune cible tactile
- [ ] La pastille s'affiche sur l'icône de l'écran d'accueil iOS et se met à jour

---

## Lot 6 — Saisie en langage naturel · Bêta 1.6 · Sonnet

### Prompt à coller

```
Lot V1-6 « Saisie rapide » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md section 3 (point ⑤).

Objectif : faire passer la capture d'une tâche de 20 secondes à 3 secondes. C'est ce qui décide
si l'app survit à six mois d'usage.

1. js/nlp.js — parseQuick(texte, ref) → { title, start, due, evening, repeat, cat, room, prio,
   effort, matched[] }. Fonctions PURES, aucun DOM, entièrement testables.

   Grammaire française à couvrir au minimum :
   — dates : aujourd'hui, ce soir, demain, demain soir, après-demain, lundi… dimanche,
     lundi prochain, le 15, le 15 mai, 15/05, 15/05/27, dans 3 jours, dans 2 semaines,
     dans un mois, la semaine prochaine, le mois prochain ;
   — échéance explicite : « avant le 15 », « pour le 15 », « deadline 15/05 » → due,
     par opposition à une date simple qui produit un start ;
   — récurrence : tous les jours, chaque jour, tous les 3 jours, toutes les semaines,
     tous les lundis, tous les 15 du mois, tous les 2 mois, tous les ans ;
   — récurrence depuis la réalisation : « tous les 7 jours après », « … après réalisation »,
     « … après la dernière fois » → repeat.from = 'done' ; sinon 'due' ;
   — soir : « ce soir », « demain soir » → evening = true ;
   — priorité : « !! » ou « urgent » → prio 2 ; « ! » ou « important » → prio 1 ;
   — effort : « 5 min », « 10 min », « court » → effort 1 ; « 1 h », « long » → effort 3 ;
   — catégorie et pièce par dièse : #admin, #menage, #cuisine, #salon… ;
   — tout ce qui n'est pas reconnu RESTE dans le titre, intégralement. Ne jamais avaler un mot
     par erreur : en cas de doute, ne pas interpréter.

2. Barre de capture universelle — accessible depuis Aujourd'hui et depuis Tâches, en un tap.
   Sous le champ, un aperçu en direct de ce qui a été compris, sous forme de chips
   (« demain », « tous les 3 jours après », « #cuisine »). Chaque chip est SUPPRIMABLE d'un tap :
   si l'interprétation est fausse, on la retire et le mot revient dans le titre. C'est ce qui rend
   le parseur acceptable même quand il se trompe.

3. Bouton discret « détails » qui ouvre la fiche complète du Lot 3 pré-remplie, pour les cas que
   le langage naturel ne couvre pas.

4. Tests — ajoute à test.mjs une table d'au moins 30 cas d'entrée/sortie attendus sur
   parseQuick(). C'est le seul module de l'app qui mérite de vrais tests unitaires.

Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] `nlp.js` ne référence pas le DOM
- [ ] Les 30 cas de test passent
- [ ] « acheter du pain demain » → titre « acheter du pain », start = demain (le mot « demain »
      n'apparaît plus dans le titre)
- [ ] « appeler le médecin » → titre intact, aucun champ deviné
- [ ] Retirer une chip remet le mot dans le titre

---

## Lot 7 — Maison v2, les plantes · Bêta 1.7 · Sonnet

### Prompt à coller

```
Lot V1-7 « Plantes » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md sections 3 (points ⑬ ⑭ ⑮ ⑯),
5 et 6 bis.

Les plantes rejoignent l'écran Maison, dans les pièces, à côté de l'entretien. Elles réutilisent
le moteur recur.js du Lot 4 : ne le duplique pas.

1. Modèle plants[] conforme à ROADMAP §5 : name, species, room, photoId, care.water
   {warm, cold, lastAt, history}, care.feed {warm, cold, lastAt, history}, care.repot
   {months, lastAt}, notes, sort.

2. LA règle non négociable : l'intervalle d'arrosage dépend de la saison. La plupart des plantes
   d'intérieur veulent 30 à 50 % d'eau en moins d'octobre à février, et un intervalle fixe les tue
   par surarrosage en hiver. Donc deux intervalles par plante et par soin : warm et cold. La
   saison courante se déduit de settings.coldFrom / settings.coldTo (défaut : mois 10 à 2), jamais
   d'une date en dur. L'engrais est très souvent suspendu en saison froide : cold = 0 signifie
   « pas de ce soin en cette saison », et l'app ne le propose alors pas du tout.

3. data/plantes.js — catalogue d'environ 40 plantes d'intérieur courantes en France, chacune avec
   son nom courant, son nom latin, et des intervalles par défaut arrosage warm/cold et engrais
   warm/cold. Couvre au moins : monstera, ficus lyrata, ficus elastica, pothos, philodendron,
   sansevieria, zamioculcas, spathiphyllum, calathea, aloe vera, cactus, succulentes, orchidée
   phalaenopsis, yucca, dracaena, chlorophytum, aglaonema, alocasia, fougère de Boston,
   pilea, hoya, anthurium, palmier areca, olivier, basilic, menthe.
   Choisir une espèce à la création pré-remplit les intervalles ; ils restent modifiables.

4. Fiche plante — feuille modale : identité, pièce, photo, les trois soins avec leurs jauges de
   fraîcheur, l'historique d'arrosage, un bouton « arrosé » très accessible (c'est l'action
   quotidienne), et l'indication de la saison en cours avec l'intervalle actuellement appliqué
   (« saison froide : tous les 14 jours »). L'utilisateur doit comprendre pourquoi l'intervalle a
   changé tout seul.

5. Photos — capture ou choix de fichier, redimensionnement à 1000 px max et recompression JPEG
   qualité 0,8 via canvas avant stockage, Blob dans le store IndexedDB 'photos' (jamais dans S),
   chargement paresseux, URLs objet révoquées à la fermeture de la feuille.

6. Intégration — les soins dus apparaissent dans l'écran Maison à côté de l'entretien de la même
   pièce, et dans « Aujourd'hui ». Attention : ROADMAP §6.2 les met dans le BLOC DU JOUR (avec
   leur jauge, largeur bridée), pas dans le bloc entretien qui est réservé aux from:'done'.
   C'est toi qui poses ce cas dans la cascade de todayBuckets() (js/today.js) : insère-le dedans,
   jamais à côté, pour qu'un soin ne puisse pas apparaître dans deux blocs.

N'implémente ni reconnaissance par photo, ni météo, ni géolocalisation : elles exigeraient une API
payante. Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] Passer du 30 septembre au 1er octobre allonge l'intervalle d'arrosage sans aucune action
- [ ] `cold: 0` sur l'engrais fait disparaître le soin en hiver, il ne le montre pas « en retard »
- [ ] Une photo de 4 Mo est stockée à moins de 300 Ko
- [ ] La fiche plante explique en clair l'intervalle appliqué et pourquoi
- [ ] Aucun appel réseau ajouté

---

## Lot 8 — Habitudes · Bêta 1.8 · Sonnet

### Prompt à coller

```
Lot V1-8 « Habitudes » de MyLife. Lis CONVENTIONS.md (dont §6, la frontière entretien / habitude)
et ROADMAP-V1.md sections 3 (points ㉑ ㉒ ㉓), 5 et 6 bis.

Rappel de la frontière, à ne jamais brouiller : une habitude se mesure en SÉRIE et en QUOTA,
jamais en jauge de fraîcheur. L'entretien fait l'inverse. Ne mélange pas les deux mécaniques.

1. Modèle habits[] et habitLog{} conformes à ROADMAP §5. Deux modes de planification distincts :
   sched = { kind:'days', days:[1,2,3,4,5] } — jours fixes ;
   sched = { kind:'week', perWeek:3 }        — quota hebdomadaire libre, sans jour imposé.
   Le second n'est pas un cas particulier du premier, traite-le séparément.

2. Le jour sauté — habitLog[jour][id] = 'skip'. Un jour sauté est NEUTRE : il ne casse pas la
   série et ne compte pas comme réussite. C'est la fonctionnalité la plus citée du marché : sans
   elle, trois jours de grippe détruisent une série de 200 et l'app est désinstallée. Bouton
   « sauter » discret mais toujours atteignable.

3. Progression partielle — avec un objectif chiffré, 20 min sur 30 n'est ni un échec ni une
   réussite : c'est 67 %, affiché comme tel. Seul l'atteinte de l'objectif alimente la série.

4. Série — jours consécutifs où l'objectif est atteint, en ignorant les jours inactifs de
   l'habitude ET les jours sautés. Pour le mode quota, la série se compte en semaines où le quota
   est atteint.

5. Bloc permanent sur l'écran Aujourd'hui — c'est TOI qui le poses, il n'existe pas encore (le
   Lot 5 ne l'a volontairement pas fait, ton modèle de données n'existait pas). Insère-le dans la
   cascade de todayBuckets() (js/today.js), en position 4 de ROADMAP §6, jamais à côté. Il montre
   les habitudes du jour non encore atteintes, saisie en ligne (bouton ± pour les petits
   objectifs, clavier numérique sinon), jamais un écran de plus. Un tap sur l'en-tête du bloc
   ouvre l'écran de suivi.
   La maquette Canopée montre ce bloc, respecte-la : AUCUNE barre de progression sur l'accueil
   (valeur en gras, quota, série — la barre --g-hab vit sur l'écran Habitudes), ± en boutons
   blancs 44 px, et jamais « Sauter » et deux boutons sur la même ligne (à zéro : « Sauter » et
   « + » ; dès qu'une valeur est saisie : « − » et « + »). Le CSS de ce bloc est déjà écrit dans
   maquettes/today.html, il n'a simplement pas été porté dans index.html — reprends-le.

6. Écran habits (secondaire, go('habits'), pas d'onglet) — liste des habitudes, création et
   édition, série en cours et record, calendrier mensuel de régularité (fait / partiel / sauté /
   inactif, quatre traitements visuels distincts), taux de réussite sur 30 jours.

Ne crée pas de cinquième onglet. Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] Sauter trois jours ne casse pas une série
- [ ] Une habitude « 3 fois par semaine » ne demande jamais un jour précis
- [ ] 20 min sur un objectif de 30 affiche 67 % et n'incrémente pas la série
- [ ] Le calendrier distingue visuellement fait / partiel / sauté / inactif
- [ ] La tab bar a toujours 4 onglets

---

## Lot 9 — Courses · Bêta 1.9 · Sonnet

### Prompt à coller

```
Lot V1-9 « Courses » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md sections 3 (points ⑰ ⑱ ⑲ ⑳)
et 5.

Cet écran s'utilise debout, une main sur le caddie. Chaque décision doit servir cette situation.

1. data/rayons.js — dictionnaire français d'environ 300 produits courants vers leur rayon.
   Rayons : fruits-legumes, frais, cremerie, viande-poisson, surgele, epicerie-salee,
   epicerie-sucree, boisson, hygiene, entretien, bebe, animaux, maison, autre.
   Normalisation à la recherche : minuscules, accents retirés, pluriels simples. « Lait »,
   « lait demi-écrémé » et « LAIT » tombent tous sur cremerie. Le rayon deviné reste corrigeable
   d'un tap, et la correction est mémorisée pour ce libellé.

2. Écran Courses — champ d'ajout en haut, complétion sur le dictionnaire ET sur frequents[].
   Articles groupés par rayon, dans l'ordre de settings.rayonOrder. Quantité en texte libre
   facultative.

3. Ordre des rayons réglable — l'utilisateur réordonne les rayons pour suivre le plan de SON
   supermarché, et parcourt alors sa liste sans revenir en arrière. Un seul magasin en V1.

4. Mode magasin — bascule dédiée : gros libellés, cases larges au pouce, un article coché passe
   en grisé EN BAS de son rayon (il ne disparaît pas : on doit pouvoir décocher une erreur),
   compteur restant par rayon, écran maintenu allumé pendant le mode magasin (wake lock, avec
   garde de disponibilité).

5. frequents[] — un produit ajouté au moins 3 fois entre dans les fréquents et est proposé en un
   tap sous le champ d'ajout, les plus utilisés d'abord.

6. Vidage — bouton « vider les articles cochés » (tombstones), jamais de vidage automatique.

7. Intégration — une ligne unique dans « Aujourd'hui » (« 7 articles à acheter »), jamais la liste
   entière. C'est toi qui la poses, elle n'existe pas encore : insère-la dans la cascade de
   todayBuckets() (js/today.js), en position 5 de ROADMAP §6. La maquette Canopée la montre en
   bouton pleine largeur teinté courses, icône panier à gauche et le mot « Voir » en vert à
   droite — pas un chevron gris. Son CSS est déjà écrit dans maquettes/today.html, reprends-le.

Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] Taper « lait » range dans Crémerie sans intervention
- [ ] Corriger un rayon une fois le mémorise pour les prochaines fois
- [ ] Réordonner les rayons change l'ordre de parcours en mode magasin
- [ ] En mode magasin, un article coché reste décochable
- [ ] Le dictionnaire fait au moins 300 entrées et ne déclenche aucun appel réseau

---

## Lot 10 — « Aujourd'hui » v2 & revue hebdomadaire · Bêta 1.10 · Sonnet

### Prompt à coller

```
Lot V1-10 « Aujourd'hui v2 & revue » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md sections 3
(points ⑥ ⑦ ⑨) et 6.

C'est le lot qui décide si l'app est encore utilisée dans un an.

1. Aujourd'hui v2 — il n'y a AUCUN placeholder à remplacer : chaque domaine a posé son propre bloc
   (Lot 5 pour les tâches et l'entretien, 7 pour les plantes, 8 pour les habitudes, 9 pour les
   courses). Ce lot est une passe de VÉRIFICATION, pas de construction : relis l'ordre des 7 blocs
   de ROADMAP §6 une fois tous les domaines présents, vérifie qu'il est respecté à la lettre, et
   surtout qu'aucun item ne peut apparaître dans deux blocs (la cascade de todayBuckets() est
   faite pour ça — vérifie que les quatre lots suivants s'y sont bien insérés au lieu d'ajouter
   des filtres à côté). Vérifie aussi ce que compte la pastille : ce qui est dû, jamais les
   offres du bloc « si tu as 10 minutes ».

2. js/review.js — LA revue hebdomadaire, le système immunitaire de l'app.
   Déclenchement : au boot, si on est le jour settings.reviewDay (défaut dimanche) et que
   lastReview date de plus de 6 jours. Jamais deux fois dans la même semaine. Toujours
   reportable d'un tap, jamais bloquante.
   Contenu : les tâches dont touchedAt remonte à plus de 30 jours, plus celles dont postponed
   dépasse 3. Une par une, pas en liste : pour chacune, trois boutons —
     « Faire cette semaine » → start = cette semaine, postponed remis à 0 ;
     « Un jour »             → bucket 'someday', sort de la circulation ;
     « Abandonner »          → tombstone deletedAt.
   Écran de fin : combien de tâches triées, et un mot sobre. Pas de score, pas de félicitations
   exagérées.
   Accessible aussi à la demande depuis Réglages.

3. Compteur de reports — « reportée N fois » à partir de 3, discret, factuel, sans jugement.

4. Motivation légère — et rien de plus : séries des habitudes visibles sur l'accueil, régularité
   des 30 derniers jours, célébration sobre à la première réalisation d'un entretien annuel ou à
   un record de série. AUCUN point, AUCUN rang, AUCUN badge, AUCUNE monnaie. Une app de vie
   quotidienne se lasse d'un score en trois semaines.

Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] La revue ne se déclenche qu'une fois par semaine et se reporte d'un tap
- [ ] Elle traite les tâches une par une, jamais en liste à cocher
- [ ] « Abandonner » pose un tombstone, ne retire pas du tableau
- [ ] L'ordre des blocs de l'accueil est conforme à `ROADMAP-V1.md` §6
- [ ] Aucun point, rang ou badge n'a été introduit

---

## Lot 11 — Réglages & filet de sécurité · Bêta 1.11 · Sonnet

### Prompt à coller

```
Lot V1-11 « Réglages » de MyLife. Lis CONVENTIONS.md et ROADMAP-V1.md section 5 (settings).

1. Écran Réglages, groupes dans cet ordre : Profil (userName, vide autorisé) · Aujourd'hui
   (todayCap, jour de revue) · Maison (bornes de la saison froide coldFrom / coldTo) · Courses
   (ordre des rayons) · Données · À propos.

2. Export JSON — saveNow() puis téléchargement d'un fichier daté contenant tout S. Les photos de
   plantes sont hors du JSON (Blobs) : dis-le explicitement à l'utilisateur dans l'écran, ne le
   laisse pas le découvrir.

3. Import JSON — confirmSheet d'avertissement, lecture du fichier, validation de la structure et
   du numéro de version, migrate(), saveNow(), rechargement. Un import raté ne doit jamais laisser
   l'app dans un état à moitié écrasé : valide entièrement avant d'écrire quoi que ce soit.

4. Première ouverture — maybeWelcome() dans boot.js, uniquement si !S.onboarded ET aucune donnée.
   Trois écrans courts : ce que fait l'app et le fait que tout reste sur l'appareil / le prénom /
   une première tâche ou « explorer ». Puis onboarded = true, jamais revu. Migration : onboarded
   = true d'office si des données existent déjà.

5. À propos — version, rappel que les données sont locales, conseil d'export régulier, et
   avertissement clair : les données sont liées à l'URL du site, changer d'hébergement les vide.

6. Réinitialisation — feuille en deux temps : d'abord proposer l'export, puis seulement le bouton
   danger. S = defaults(), vidage du store photos, saveNow(), retour à l'accueil vierge, la
   bienvenue se rejoue.

Termine par la checklist de release et le compte rendu.
```

### Critères d'acceptation
- [ ] Export puis réinitialisation puis import restitue exactement l'état d'origine
- [ ] Un JSON invalide ou d'une autre app est refusé sans rien écraser
- [ ] La bienvenue ne s'affiche jamais sur une installation contenant déjà des données
- [ ] La perte des photos à l'export est annoncée avant, pas découverte après

---

## Lot 12 — Polish, QA, dettes · Bêta 1.12 · Sonnet

### Prompt à coller

```
Lot V1-12 « Polish & QA » de MyLife, dernier lot du cycle V1. Aucune fonctionnalité nouvelle,
sans exception. Lis CONVENTIONS.md en entier.

1. Audit d'accessibilité et de tactile sur les 6 écrans : cibles ≥ 44 px (étendre par padding et
   marge négative, sans grossir le visuel), :focus-visible partout, prefers-reduced-motion sur
   toutes les animations, contrastes recalculés et rapportés en chiffres.

2. Audit des textes — relis chaque libellé de l'app. MAJUSCULE INITIALE sur toute phrase et toute
   entrée de liste (règle arbitrée au Lot 2, elle remplace la consigne « minuscules de phrase »
   d'origine — cf. CONVENTIONS.md §3), ton sobre, aucun emoji, aucune formulation culpabilisante.
   Vérifie qu'aucun écran d'entretien ou de plante ne dit « en retard » ou « manqué ».
   Tranche aussi le point laissé ouvert au Lot 5 : la phrase de l'état vide d'« Aujourd'hui »
   (« Rien ne demande ton attention avant ce soir ») sous-informe quand la tâche du soir est faite
   elle aussi. Soit on l'accepte, soit il faut une seconde variante.

3. Audit de la règle « jamais deux chemins visibles vers la même action ». Liste les redondances
   que tu trouves, propose-moi les suppressions AVANT de les faire.

4. Dettes techniques : purge des tombstones de plus de 90 jours au boot ; classes CSS orphelines
   retirées ; style="..." non calculés convertis en classes ; fonctions mortes supprimées ;
   fichiers de plus de 600 lignes signalés.

5. Vérifie les trois listes miroir une dernière fois, fichier par fichier.

6. Produis QA-IPHONE.md : une checklist que je déroulerai sur l'iPhone réel — installation,
   hors-ligne complet (mode avion), pastille de l'icône, persistance après 48 h sans ouvrir,
   photo de plante, mode magasin et wake lock, glisser-fermer des feuilles, safe-area en bas,
   comportement après mise à jour du service worker, export puis import.

7. CLAUDE.md final : à jour, exact, dense. C'est la mémoire qui servira au cycle V2.

Termine par la checklist de release, le compte rendu, et une liste des dettes que tu laisses
sciemment derrière toi pour la V2.
```

### Critères d'acceptation
- [ ] Aucune fonctionnalité nouvelle n'a été ajoutée
- [ ] `QA-IPHONE.md` existe et est déroulable sans toi
- [ ] `CLAUDE.md` décrit fidèlement l'app finie
- [ ] Les redondances ont été proposées avant suppression, pas supprimées d'office
- [ ] **V1 close**

---

## Annexes

### Prompt de reprise (si une session est coupée en cours de lot)

```
On reprend le Lot V1-N de MyLife, interrompu en cours de route. Lis CLAUDE.md, CONVENTIONS.md et
la section du Lot N dans PROMPTS-V1.md. Fais d'abord le point : git status, git diff, npm test.
Dis-moi où on en est et ce qu'il reste à faire AVANT de reprendre le code.
```

### Prompt de fin de lot (si tu veux vérifier avant de commiter)

```
Déroule la checklist de release de CONVENTIONS.md §4, point par point, en me montrant le
résultat de chacun. Ne commite pas tant qu'un point n'est pas vert.
```

### Prompt d'idée hors périmètre

```
J'ai une idée : <…>. Ne la code pas. Évalue-la en trois lignes (valeur, coût, risque), puis
ajoute-la à IDEES.md avec cette évaluation, en indiquant si elle relève de la V1 ou de la V2.
```

### Ce qu'on n'a volontairement pas fait en V1
Synchro et partage (V2, piste NAS) · notifications programmées (impossible gratuitement) ·
projets et sous-tâches · stock du placard · recettes vers liste de courses · multi-magasins ·
reconnaissance de plantes par photo · thème clair · optimisation desktop.
