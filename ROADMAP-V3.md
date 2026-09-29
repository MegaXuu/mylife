# MyLife — Roadmap V3 « Le vrai usage »

> **La V1 a construit les fonctionnalités, la V2 les a rendues agréables. La V3 fait que l'app
> serve pour de vrai.** Ce fichier remplace `ROADMAP-V2.md` comme référence de planification ;
> `CONVENTIONS.md` reste la loi permanente, amendée par le §3 ci-dessous.

---

## 1. Le constat — 29/09/2026

Florian n'utilise pas l'app. Pas à cause d'un défaut d'interface — la V2 les a traités — mais
parce que **l'app n'est utile qu'une fois remplie, et la remplir coûte trop cher** : chaque
entretien se créait un par un, chaque plante avec une fiche de sept champs. Des dizaines de fiches
avant le premier bénéfice. Deuxième besoin, exprimé le même jour : **préparer les menus de la
semaine**, en sachant combien de repas prévoir.

Contraintes qui ne bougent pas : 100 % hors-ligne, gratuit, aucun compte, aucun serveur — donc ni
IA embarquée, ni import depuis Rappels, et sur iPhone une PWA installée ne reçoit rien de la
feuille de partage ni des Raccourcis (ils ouvrent Safari, dont le stockage est séparé).

## 2. Ce qui a été décidé avec Florian

### 2.1 Saisie initiale — on ne saisit plus, on élague
- **Un pack maison** (`data/entretien.js`, `pack:true`) décrit une fois pour toutes la maison de
  Florian : salon, cuisine, chambre, bureau, WC, salle de bain, cellier, balcon ; lave-linge (au
  cellier), lave-vaisselle, four, micro-ondes, hotte, VMC, aspirateur robot (base au bureau, se
  vide seul) ; pas d'animaux ; « très propre mais pas impeccable ». 40 entretiens, environ
  28 min par jour. Installé d'un tap depuis Maison vide (ou Réglages → Maison). Ensuite on
  **enlève** ce qui ne sert pas (balayage), on ne saisit rien.
- **Les premières échéances sont étalées** (`packSchedule()`) : sinon 40 entretiens créés d'un
  coup seraient tous dus le même jour, puis encore ensemble à chaque cycle.
- **La serpillière tombe le même jour à chaque fois**, d'une seule traite pour toute la maison :
  un seul entretien « Passer la serpillière », pièce « Toute la maison », à jour fixe le samedi
  (réglable dans sa fiche). Les autres serpillières par pièce ont disparu.
- **Aspirateur** : les recoins de base chaque semaine (7 j, ~10 j en pratique avec le budget),
  les gros recoins toutes les 2 à 3 semaines (17 j). Ni rideaux, ni matelas, ni poubelles, ni bac
  du robot. Plantes au salon, tous les 5 jours.

### 2.2 Un budget d'entretien par jour
Florian veut y passer **environ 30 minutes par jour**. « Aujourd'hui » ne propose donc plus « les
trois jauges les plus basses » mais **ce qui est dû et tient dans 30 min**, le plus urgent d'abord
(`choreDay()`). Le reste attend le lendemain, où il sera plus urgent et donc pris en premier.
Chaque entretien porte une **durée en minutes** (`t.mins`), réglable dans sa fiche. Le budget se
règle dans Réglages → Maison.

### 2.3 Les plantes ne sont plus un domaine
« Une plante devient juste une tâche d'entretien du genre “s'occuper des plantes”. » Retirés :
`js/plants.js`, `data/plantes.js`, les photos, la saison froide, les soins dans Maison et dans le
bloc du jour. Une base qui avait des plantes les retrouve en un entretien par pièce
(`migratePlants()`).

### 2.4 Repas — la page Menus
- Une **semaine type** réglée une fois : pour chacun des 14 repas (midi/soir, lundi → dimanche),
  « à prévoir » à 1 ou 2 personnes, « cantine » ou « ailleurs ». Chaque semaine, on ne touche
  qu'aux **exceptions**.
- **Le compte en tête** : « N repas à prévoir, dont M à deux ».
- **Juste le nom du plat**, pas d'ingrédients. La bibliothèque de plats se construit toute seule à
  partir de ce qui a déjà été tapé (proposé en un tap, les plus fréquents d'abord).
- **Les restes, seulement quand il y en a** : « Il en restera » pose le plat en restes sur le
  prochain repas libre.
- **Contre la page blanche** : « Reprendre la semaine dernière » et « Me proposer ».
- **Un onglet Repas** (Menus | Courses) remplace l'onglet Courses — les deux vont ensemble, et
  une sixième icône serait trop serrée sur iPhone. Sur Aujourd'hui, une ligne « Ce soir : … ».
- Semaine du lundi au dimanche.

## 3. Amendements à `CONVENTIONS.md` et à la maquette

1. **Glossaire** : *Soin* disparaît (plus de plantes). *Entretien* gagne une **durée** et peut
   tomber à **jour fixe** (`repeat.kind:'week'` + `days`, toujours `from:'done'`). Nouveaux
   termes : *Budget d'entretien*, *Repas*, *Semaine type*, *Plat*.
2. **Pièces** : `partout` (Toute la maison) · `cuisine` · `sdb` · `wc` · `salon` · `chambre` ·
   `bureau` · `cellier` · `balcon` (+ `exterieur`, gardée pour les données d'avant, masquée des
   sélecteurs tant qu'elle ne sert pas).
3. **Tab bar** : Aujourd'hui · Tâches · Maison · **Repas** · Habitudes — la maquette Canopée n'a
   pas d'écran Menus ; il suit ses composants (cartes blanches, `.sec`, `.chip`, `.row`) sans
   maquette dédiée, arbitrage de Florian (« carte blanche »).

## 4. Les lots

Version affichée **Bêta 3.N**, `CACHE = 'mylife-b3-N'`, `APP_VERSION = 'Bêta 3.N'`.

| Lot | Version | Titre | Ce qu'il livre |
|---|---|---|---|
| **V3-1** | Bêta 3.1 | **Maison prête à l'emploi** | Pack maison + étalement, budget d'entretien quotidien, entretien à jour fixe, durée en minutes, fiche d'entretien dédiée, retrait des plantes (+ migration), pièces du logement |
| **V3-2** | Bêta 3.2 | **Repas** | Onglet Repas (Menus \| Courses), `js/meals.js`, semaine type, exceptions, compte des repas, plats appris, restes, reprendre la semaine dernière, me proposer, ligne du soir sur Aujourd'hui |
| **V3-3** | Bêta 3.3 | **Mouvement, finition, QA** | L'ancien V2-8 (transitions, animation de complétion, oiseaux en mode sombre, haptique des interrupteurs, audit d'accessibilité), étendu aux écrans V3, `QA-IPHONE-V3.md`, synchronisation de `CLAUDE.md`/`CONVENTIONS.md` — **plus**, carte blanche de Florian, les correctifs d'un audit mesuré (Maison replié, cibles pleine ligne, entretien hors de Tâches…), les icônes Canopée, l'export par la feuille de partage iOS et l'annonce des mises à jour |

**État au 29/09/2026 : les trois lots sont faits.** V3-1 et V3-2 en Bêta 3.2, V3-3 en Bêta 3.3.

Le V2-8 n'a pas été fait avant la V3 : il finit des écrans que la V3 change (tab bar, Maison,
Aujourd'hui). Le faire avant aurait été le refaire après.

## 5. Hors périmètre — décidé, pas oublié

- Ingrédients par plat et courses générées automatiquement (Florian veut le nom seul).
- Rappel des poubelles (écarté par Florian).
- Synchro et partage (piste NAS) — passe en V4.
