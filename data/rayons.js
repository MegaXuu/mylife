/* ==========================================================================
   data/rayons.js — dictionnaire produit → rayon (Lot V1-9). Clé = libellé
   normalisé (minuscules, accents retirés, ponctuation réduite à une espace —
   cf. normalizeLabel(), js/shopping.js), valeur = clé de rayon (RAYON_ORDER,
   js/shopping.js). Alimente le rangement automatique d'un article ajouté aux
   courses ⑰ : « lait », « lait demi-écrémé » et « LAIT » tombent tous sur
   cremerie, la première par clé exacte, la seconde par le mot « lait » trouvé
   dans la phrase (guessRayon() découpe et cherche mot à mot après l'échec
   d'une clé exacte). Les entrées à plusieurs mots (« papier toilette »,
   « brosse a dents »…) désambiguïsent des mots trop génériques pour être
   des clés seules — volontairement absents du dictionnaire.
   Chargé en premier (avant state.js), comme les deux autres catalogues —
   c'est aussi pourquoi RAYON_ORDER_DEFAULT vit ici plutôt que dans
   js/shopping.js : defaults() (js/state.js) l'utilise dès son premier appel,
   synchrone, à l'exécution même de state.js (`let S = defaults();`), bien
   avant que js/shopping.js n'ait chargé. RAYON_LABELS (les libellés
   affichés), lui, n'est lu qu'au rendu et vit dans js/shopping.js.
   ========================================================================== */
const RAYON_ORDER_DEFAULT = ['fruits-legumes','frais','cremerie','viande-poisson',
  'surgele','epicerie-salee','epicerie-sucree','boisson','hygiene','entretien',
  'bebe','animaux','maison','autre'];

const RAYONS = {
  // — Fruits et légumes —
  'pomme':'fruits-legumes', 'pommes':'fruits-legumes', 'poire':'fruits-legumes',
  'banane':'fruits-legumes', 'bananes':'fruits-legumes', 'orange':'fruits-legumes',
  'oranges':'fruits-legumes', 'clementine':'fruits-legumes', 'clementines':'fruits-legumes',
  'citron':'fruits-legumes', 'citrons':'fruits-legumes', 'citron vert':'fruits-legumes',
  'pamplemousse':'fruits-legumes', 'kiwi':'fruits-legumes', 'kiwis':'fruits-legumes',
  'fraise':'fruits-legumes', 'fraises':'fruits-legumes', 'framboise':'fruits-legumes',
  'framboises':'fruits-legumes', 'myrtille':'fruits-legumes', 'myrtilles':'fruits-legumes',
  'raisin':'fruits-legumes', 'raisins':'fruits-legumes', 'peche':'fruits-legumes',
  'peches':'fruits-legumes', 'abricot':'fruits-legumes', 'abricots':'fruits-legumes',
  'prune':'fruits-legumes', 'prunes':'fruits-legumes', 'melon':'fruits-legumes',
  'pasteque':'fruits-legumes', 'mangue':'fruits-legumes', 'ananas':'fruits-legumes',
  'avocat':'fruits-legumes', 'avocats':'fruits-legumes', 'fruit':'fruits-legumes',
  'fruits':'fruits-legumes', 'legume':'fruits-legumes', 'legumes':'fruits-legumes',
  'tomate':'fruits-legumes', 'tomates':'fruits-legumes', 'tomates cerises':'fruits-legumes',
  'concombre':'fruits-legumes', 'courgette':'fruits-legumes', 'courgettes':'fruits-legumes',
  'aubergine':'fruits-legumes', 'aubergines':'fruits-legumes', 'poivron':'fruits-legumes',
  'poivrons':'fruits-legumes', 'salade':'fruits-legumes', 'laitue':'fruits-legumes',
  'mache':'fruits-legumes', 'epinard':'fruits-legumes', 'epinards':'fruits-legumes',
  'carotte':'fruits-legumes', 'carottes':'fruits-legumes', 'pomme de terre':'fruits-legumes',
  'pommes de terre':'fruits-legumes', 'patate':'fruits-legumes', 'patates':'fruits-legumes',
  'oignon':'fruits-legumes', 'oignons':'fruits-legumes', 'ail':'fruits-legumes',
  'echalote':'fruits-legumes', 'echalotes':'fruits-legumes', 'poireau':'fruits-legumes',
  'poireaux':'fruits-legumes', 'brocoli':'fruits-legumes', 'brocolis':'fruits-legumes',
  'chou-fleur':'fruits-legumes', 'chou':'fruits-legumes', 'choux':'fruits-legumes',
  'haricot vert':'fruits-legumes', 'haricots verts':'fruits-legumes', 'petit pois':'fruits-legumes',
  'petits pois':'fruits-legumes', 'champignon':'fruits-legumes', 'champignons':'fruits-legumes',
  'radis':'fruits-legumes', 'betterave':'fruits-legumes', 'celeri':'fruits-legumes',
  'fenouil':'fruits-legumes', 'artichaut':'fruits-legumes', 'persil':'fruits-legumes',
  'basilic':'fruits-legumes', 'coriandre':'fruits-legumes', 'menthe':'fruits-legumes',
  'gingembre':'fruits-legumes', 'herbes fraiches':'fruits-legumes',

  // — Frais (traiteur, œufs, plats préparés) —
  'oeuf':'frais', 'oeufs':'frais', 'jambon':'frais', 'jambon blanc':'frais',
  'pate':'frais', 'pates a tartiner':'epicerie-sucree', 'terrine':'frais',
  'houmous':'frais', 'taboule':'frais', 'salade composee':'frais', 'quiche':'frais',
  'tofu':'frais', 'tofu fume':'frais', 'seitan':'frais', 'plat prepare':'frais',
  'sushi':'frais', 'gaspacho':'frais',

  // — Crèmerie —
  'lait':'cremerie', 'lait demi-ecreme':'cremerie', 'lait ecreme':'cremerie',
  'lait entier':'cremerie', 'lait sans lactose':'cremerie', 'creme fraiche':'cremerie',
  'creme liquide':'cremerie', 'beurre':'cremerie', 'beurre doux':'cremerie',
  'beurre demi-sel':'cremerie', 'yaourt':'cremerie', 'yaourts':'cremerie',
  'yaourt nature':'cremerie', 'yaourt grec':'cremerie', 'fromage blanc':'cremerie',
  'petit suisse':'cremerie', 'petits suisses':'cremerie', 'faisselle':'cremerie',
  'fromage':'cremerie', 'fromages':'cremerie', 'fromage rape':'cremerie',
  'camembert':'cremerie', 'comte':'cremerie', 'emmental':'cremerie',
  'mozzarella':'cremerie', 'feta':'cremerie', 'parmesan':'cremerie', 'chevre':'cremerie',
  'margarine':'cremerie', 'dessert lacte':'cremerie', 'flan':'cremerie',
  'creme dessert':'cremerie', 'lait de coco':'cremerie', 'lait d amande':'cremerie',
  'lait de soja':'cremerie', 'lait vegetal':'cremerie', 'boisson soja':'cremerie',

  // — Viande et poisson —
  'poulet':'viande-poisson', 'blanc de poulet':'viande-poisson',
  'cuisse de poulet':'viande-poisson', 'escalope de poulet':'viande-poisson',
  'boeuf':'viande-poisson', 'steak hache':'viande-poisson', 'bavette':'viande-poisson',
  'entrecote':'viande-poisson', 'roti de boeuf':'viande-poisson', 'porc':'viande-poisson',
  'cotelette de porc':'viande-poisson', 'roti de porc':'viande-poisson',
  'saucisse':'viande-poisson', 'saucisses':'viande-poisson', 'saucisson':'viande-poisson',
  'lardons':'viande-poisson', 'bacon':'viande-poisson', 'agneau':'viande-poisson',
  'gigot':'viande-poisson', 'dinde':'viande-poisson', 'canard':'viande-poisson',
  'chorizo':'viande-poisson', 'merguez':'viande-poisson', 'poisson':'viande-poisson',
  'saumon':'viande-poisson', 'saumon fume':'viande-poisson', 'thon':'viande-poisson',
  'cabillaud':'viande-poisson', 'colin':'viande-poisson', 'crevette':'viande-poisson',
  'crevettes':'viande-poisson', 'moules':'viande-poisson', 'huitres':'viande-poisson',
  'calamar':'viande-poisson', 'truite':'viande-poisson', 'sardine':'viande-poisson',
  'maquereau':'viande-poisson', 'poisson pane':'viande-poisson',
  'filet de poisson':'viande-poisson', 'viande hachee':'viande-poisson',

  // — Surgelé —
  'frites':'surgele', 'frites surgelees':'surgele', 'legumes surgeles':'surgele',
  'petits pois surgeles':'surgele', 'epinards surgeles':'surgele', 'glace':'surgele',
  'glaces':'surgele', 'sorbet':'surgele', 'pizza surgelee':'surgele',
  'poisson pane surgele':'surgele', 'nuggets':'surgele', 'cordon bleu':'surgele',
  'glacon':'surgele', 'glacons':'surgele', 'quiche surgelee':'surgele',
  'plat surgele':'surgele', 'fruits surgeles':'surgele', 'feuillete':'surgele',
  'pate feuilletee surgelee':'surgele',

  // — Épicerie salée —
  'riz':'epicerie-salee', 'riz basmati':'epicerie-salee', 'pates alimentaires':'epicerie-salee',
  'spaghetti':'epicerie-salee', 'macaroni':'epicerie-salee', 'farine':'epicerie-salee',
  'semoule':'epicerie-salee', 'couscous':'epicerie-salee', 'lentilles':'epicerie-salee',
  'pois chiches':'epicerie-salee', 'haricots blancs':'epicerie-salee',
  'haricots rouges':'epicerie-salee', 'quinoa':'epicerie-salee', 'huile':'epicerie-salee',
  'huile d olive':'epicerie-salee', 'huile de tournesol':'epicerie-salee',
  'vinaigre':'epicerie-salee', 'sel':'epicerie-salee', 'poivre':'epicerie-salee',
  'epices':'epicerie-salee', 'bouillon':'epicerie-salee', 'bouillon cube':'epicerie-salee',
  'sauce tomate':'epicerie-salee', 'coulis de tomate':'epicerie-salee',
  'concentre de tomate':'epicerie-salee', 'moutarde':'epicerie-salee',
  'mayonnaise':'epicerie-salee', 'ketchup':'epicerie-salee', 'cornichons':'epicerie-salee',
  'olives':'epicerie-salee', 'conserve':'epicerie-salee', 'mais':'epicerie-salee',
  'thon en boite':'epicerie-salee', 'sardines en boite':'epicerie-salee',
  'soupe':'epicerie-salee', 'pain':'epicerie-salee', 'pain de mie':'epicerie-salee',
  'biscottes':'epicerie-salee', 'chapelure':'epicerie-salee', 'sauce soja':'epicerie-salee',
  'tortilla':'epicerie-salee', 'wraps':'epicerie-salee', 'pizza':'epicerie-salee',
  'pate a tarte':'epicerie-salee', 'pate brisee':'epicerie-salee',

  // — Épicerie sucrée —
  'sucre':'epicerie-sucree', 'sucre vanille':'epicerie-sucree', 'levure':'epicerie-sucree',
  'levure chimique':'epicerie-sucree', 'chocolat':'epicerie-sucree',
  'chocolat noir':'epicerie-sucree', 'chocolat au lait':'epicerie-sucree',
  'cacao':'epicerie-sucree', 'nutella':'epicerie-sucree', 'confiture':'epicerie-sucree',
  'miel':'epicerie-sucree', 'biscuit':'epicerie-sucree', 'biscuits':'epicerie-sucree',
  'gateau':'epicerie-sucree', 'gateaux':'epicerie-sucree', 'cereales':'epicerie-sucree',
  'muesli':'epicerie-sucree', 'cafe':'epicerie-sucree', 'cafe moulu':'epicerie-sucree',
  'cafe en grains':'epicerie-sucree', 'capsules de cafe':'epicerie-sucree',
  'the':'epicerie-sucree', 'the vert':'epicerie-sucree', 'tisane':'epicerie-sucree',
  'chicoree':'epicerie-sucree', 'compote':'epicerie-sucree', 'compotes':'epicerie-sucree',
  'madeleine':'epicerie-sucree', 'madeleines':'epicerie-sucree',
  'biscuit apero':'epicerie-sucree', 'chips':'epicerie-sucree', 'cacahuetes':'epicerie-sucree',
  'amandes':'epicerie-sucree', 'noix':'epicerie-sucree', 'fruits secs':'epicerie-sucree',
  'bonbons':'epicerie-sucree', 'chewing-gum':'epicerie-sucree', 'gaufre':'epicerie-sucree',
  'gaufres':'epicerie-sucree', 'pate a crepe':'epicerie-sucree', 'sirop':'epicerie-sucree',

  // — Boisson —
  'eau':'boisson', 'eau minerale':'boisson', 'eau de source':'boisson',
  'eau gazeuse':'boisson', 'eau petillante':'boisson', 'jus':'boisson',
  'jus de fruits':'boisson', 'jus d orange':'boisson', 'jus de pomme':'boisson',
  'jus de raisin':'boisson', 'nectar':'boisson', 'soda':'boisson', 'cola':'boisson',
  'limonade':'boisson', 'biere':'boisson', 'biere sans alcool':'boisson',
  'vin':'boisson', 'vin rouge':'boisson', 'vin blanc':'boisson', 'vin rose':'boisson',
  'champagne':'boisson', 'cidre':'boisson', 'whisky':'boisson', 'rhum':'boisson',
  'vodka':'boisson', 'aperitif':'boisson', 'boisson energisante':'boisson',
  'eau aromatisee':'boisson', 'kombucha':'boisson', 'sirop de menthe':'boisson',

  // — Hygiène —
  'dentifrice':'hygiene', 'brosse a dents':'hygiene', 'bain de bouche':'hygiene',
  'fil dentaire':'hygiene', 'savon':'hygiene', 'gel douche':'hygiene',
  'shampoing':'hygiene', 'shampooing':'hygiene', 'apres-shampoing':'hygiene',
  'deodorant':'hygiene', 'rasoir':'hygiene', 'mousse a raser':'hygiene',
  'creme a raser':'hygiene', 'papier toilette':'hygiene', 'mouchoirs':'hygiene',
  'mouchoirs en papier':'hygiene', 'coton':'hygiene', 'coton-tiges':'hygiene',
  'cotons demaquillants':'hygiene', 'demaquillant':'hygiene',
  'creme hydratante':'hygiene', 'protection hygienique':'hygiene',
  'serviettes hygieniques':'hygiene', 'tampons':'hygiene', 'lingettes':'hygiene',
  'dissolvant':'hygiene', 'vernis a ongles':'hygiene', 'parfum':'hygiene',

  // — Entretien (produits ménagers) —
  'lessive':'entretien', 'lessive liquide':'entretien', 'lessive capsules':'entretien',
  'adoucissant':'entretien', 'liquide vaisselle':'entretien',
  'tablettes lave-vaisselle':'entretien', 'eponge':'entretien', 'eponges':'entretien',
  'sac poubelle':'entretien', 'sacs poubelle':'entretien', 'papier absorbant':'entretien',
  'essuie-tout':'entretien', 'produit menager':'entretien', 'produit vitre':'entretien',
  'javel':'entretien', 'eau de javel':'entretien', 'nettoyant sol':'entretien',
  'nettoyant wc':'entretien', 'canard wc':'entretien', 'gant menager':'entretien',
  'gants menagers':'entretien', 'bicarbonate de soude':'entretien',
  'vinaigre menager':'entretien', 'anti-calcaire':'entretien',
  'spray desinfectant':'entretien',

  // — Bébé —
  'lait infantile':'bebe', 'lait bebe':'bebe', 'petit pot':'bebe', 'petits pots':'bebe',
  'couches':'bebe', 'couches bebe':'bebe', 'lingettes bebe':'bebe',
  'compote bebe':'bebe', 'biberon':'bebe', 'tetine':'bebe', 'lait 1er age':'bebe',
  'lait 2eme age':'bebe', 'cereales bebe':'bebe', 'farine infantile':'bebe',
  'creme change':'bebe',

  // — Animaux —
  'croquettes':'animaux', 'croquettes chien':'animaux', 'croquettes chat':'animaux',
  'pate pour chat':'animaux', 'pate pour chien':'animaux', 'litiere':'animaux',
  'litiere chat':'animaux', 'friandises chien':'animaux', 'friandises chat':'animaux',
  'os a macher':'animaux', 'jouet pour chien':'animaux', 'jouet pour chat':'animaux',
  'gamelle':'animaux', 'panier animal':'animaux',

  // — Maison (bazar, papeterie, électrique) —
  'ampoule':'maison', 'ampoules':'maison', 'ampoule led':'maison', 'pile':'maison',
  'piles':'maison', 'pile bouton':'maison', 'allumette':'maison', 'allumettes':'maison',
  'bougie':'maison', 'bougies':'maison', 'papier cadeau':'maison',
  'sac congelation':'maison', 'film alimentaire':'maison', 'papier aluminium':'maison',
  'papier cuisson':'maison', 'vaisselle jetable':'maison',
  'gobelet en carton':'maison', 'assiette en carton':'maison', 'bloc-notes':'maison',
  'stylo':'maison', 'enveloppe':'maison', 'enveloppes':'maison', 'colle':'maison',
  'ruban adhesif':'maison', 'pince a linge':'maison', 'panier a linge':'maison',
  'brosse wc':'maison', 'sac de courses':'maison', 'sac reutilisable':'maison'
};
