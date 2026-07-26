/* ==========================================================================
   data/oiseaux.js — CATALOGUE DES OISEAUX. Données pures, aucun rendu.
   Le tracé SVG vit ici et nulle part ailleurs : pour redessiner un oiseau,
   il suffit de remplacer son tableau, sans toucher à js/ui.js.

   CONTRAT DE DESSIN — à respecter pour tout nouvel oiseau :
   • Repère `viewBox="0 0 120 160"`, aplats pleins, aucun dégradé.
   • Les pattes se posent sur **y = 130**. Les 30 px sous cette ligne (y 130→160)
     débordent sous le perchoir : c'est ce qui donne l'illusion des pattes
     accrochées au bord de la carte. Ne rien dessiner d'important en dessous.
   • Le corps tient dans x ≈ 4→95, tête vers le haut à gauche.
   • Couleurs en dur : un oiseau n'obéit pas à la palette de l'app (c'est une
     image, pas une couleur d'interface). C'est la seule exception admise à la
     discipline chromatique — et elle ne s'applique qu'à ce fichier.

   FORMES — chaque oiseau est une liste, dessinée dans l'ordre (la dernière
   par-dessus). Deux formes possibles :
     { d:'M…Z', f:'#RRGGBB' }                     chemin rempli
     { d:'M…',  s:'#RRGGBB', w:3 }                 chemin tracé (pattes)
     { cx:51, cy:26, r:4, f:'#RRGGBB' }            cercle (œil, joue)
   Champ optionnel `o` : opacité (0→1).

   Espèces : le nombre est libre, le tirage au boot en prend autant qu'il y a
   d'écrans (js/ui.js → pickBirds).
   ========================================================================== */

const OISEAUX = {

  perruche: [
    { d:'M64 104 L76 148 L64 151 L54 112 Z', f:'#3E6FB0' },
    { d:'M52 120 L52 130 M62 120 L62 130', s:'#8A7A62', w:3 },
    { d:'M56 16 C74 16 85 32 85 54 C85 80 76 104 62 116 C51 123 40 117 38 103 C35 82 37 48 43 32 C47 21 50 16 56 16 Z', f:'#7CA84F' },
    { d:'M56 16 C71 16 81 26 83 40 C72 47 50 47 40 39 C43 27 48 16 56 16 Z', f:'#E8D34F' },
    { d:'M62 18 C68 17 74 20 78 26 C72 27 66 25 62 22 Z', f:'#2A251E', o:.85 },
    { d:'M64 26 C71 25 77 29 80 35 C73 36 66 33 63 29 Z', f:'#2A251E', o:.85 },
    { cx:43, cy:38, r:3, f:'#3E6FB0' },
    { d:'M62 46 C76 44 82 57 78 76 C74 93 61 101 55 93 C49 82 52 54 62 46 Z', f:'#C7CE58' },
    { d:'M64 52 C70 51 75 54 77 60 C71 61 65 58 62 55 Z', f:'#2A251E', o:.8 },
    { d:'M64 62 C70 61 75 64 77 70 C71 71 65 68 62 65 Z', f:'#2A251E', o:.8 },
    { d:'M40 22 C33 23 31 31 37 35 C39 36 41 36 42 35 C38.5 31 39 25.5 43 23.5 Z', f:'#C9A56B' },
    { cx:51, cy:26, r:4, f:'#FFFFFF' }, { cx:50.4, cy:26, r:2, f:'#2A251E' }
  ],

  toucan: [
    { d:'M70 106 L82 142 L70 146 L60 112 Z', f:'#1E1B18' },
    { d:'M58 120 L58 130 M68 120 L68 130', s:'#8A7A62', w:3 },
    { d:'M62 26 C81 26 92 44 92 68 C92 94 84 110 70 118 C58 124 46 118 44 104 C42 84 44 46 50 34 C54 27 57 26 62 26 Z', f:'#1E1B18' },
    { d:'M51 33 C59 29 69 31 73 40 C77 52 75 66 67 72 C57 76 47 70 47 56 C47 46 48 37 51 33 Z', f:'#F6F1E6' },
    { d:'M50 26 C30 21 10 27 8 38 C7 43 12 47 20 47 C34 47 45 41 51 35 Z', f:'#F5A623' },
    { d:'M9 40 C13 46 25 49 37 45 C43 43 48 39 50 36 L51 41 C44 48 28 52 17 49 C12 48 9 44 9 40 Z', f:'#E1492F' },
    { d:'M9 33 C5 35 4 41 9 43 C13 44.5 16 42 15.5 38.5 C14 35 12 32.5 9 33 Z', f:'#2A251E' },
    { cx:64, cy:35, r:7, f:'#F5A623' },
    { cx:64, cy:35, r:4, f:'#FFFFFF' }, { cx:63.4, cy:35, r:2.2, f:'#2C4B9B' }
  ],

  rosalbin: [
    { d:'M66 104 L80 146 L68 149 L56 112 Z', f:'#9AA0AA' },
    { d:'M52 120 L52 130 M62 120 L62 130', s:'#8A7A62', w:3 },
    { d:'M46 20 C44 8 54 2 62 6 C56 7 52 11 52 16 Z', f:'#F4CDD3' },
    { d:'M52 18 C52 5 64 1 70 7 C64 7 58 11 58 17 Z', f:'#F4CDD3' },
    { d:'M58 18 C60 7 72 6 75 13 C69 12 63 15 62 20 Z', f:'#F4CDD3' },
    { d:'M56 16 C74 16 85 32 85 54 C85 80 76 104 62 116 C51 123 40 117 38 103 C35 82 37 48 43 32 C47 21 50 16 56 16 Z', f:'#E77E8E' },
    { d:'M62 44 C77 42 84 56 80 77 C76 95 62 103 55 94 C49 83 51 52 62 44 Z', f:'#B9BEC6' },
    { d:'M41 19 C30 20 26 31 35 37 C37 38.5 39.5 38.5 41 37 C36.5 32 37 24 42 21.5 Z', f:'#D8CFC3' },
    { d:'M35 36 C37 41 43 42 46 38.5 L41 33.5 Z', f:'#C4B8A8' },
    { cx:51, cy:26, r:4, f:'#FFFFFF' }, { cx:50.4, cy:26, r:2, f:'#2A251E' }
  ],

  loriquet: [
    { d:'M64 104 L76 150 L64 153 L54 112 Z', f:'#F2B01E' },
    { d:'M52 120 L52 130 M62 120 L62 130', s:'#8A7A62', w:3 },
    { d:'M56 16 C74 16 85 32 85 54 C85 80 76 104 62 116 C51 123 40 117 38 103 C35 82 37 48 43 32 C47 21 50 16 56 16 Z', f:'#58963F' },
    { d:'M42 44 C50 52 62 56 68 68 C72 80 70 100 62 112 C52 120 42 114 39 102 C36 82 38 54 42 44 Z', f:'#2C4B9B' },
    { d:'M42 40 C52 48 70 48 80 42 C82 52 80 60 74 66 C62 70 48 66 42 56 Z', f:'#D8402C' },
    { d:'M44 58 C48 64 54 68 58 74 C52 76 46 72 43 66 Z', f:'#F2B01E' },
    { d:'M56 16 C71 16 81 26 83 40 C72 47 50 47 40 39 C43 27 48 16 56 16 Z', f:'#2C4B9B' },
    { d:'M62 46 C76 44 82 57 78 76 C74 93 61 101 55 93 C49 82 52 54 62 46 Z', f:'#58963F' },
    { d:'M40 22 C33 23 31 31 37 35 C39 36 41 36 42 35 C38.5 31 39 25.5 43 23.5 Z', f:'#D8402C' },
    { cx:51, cy:26, r:4, f:'#FFFFFF' }, { cx:50.4, cy:26, r:2, f:'#2A251E' }
  ],

  gris: [
    { d:'M64 104 L76 144 L64 147 L54 112 Z', f:'#C2372B' },
    { d:'M52 120 L52 130 M62 120 L62 130', s:'#8A7A62', w:3 },
    { d:'M56 16 C74 16 85 32 85 54 C85 80 76 104 62 116 C51 123 40 117 38 103 C35 82 37 48 43 32 C47 21 50 16 56 16 Z', f:'#A7A9AC' },
    { d:'M62 44 C77 42 84 56 80 77 C76 95 62 103 55 94 C49 83 51 52 62 44 Z', f:'#8E9094' },
    { cx:45, cy:29, r:9.5, f:'#DDDEE0' },
    { d:'M41 19 C30 20 26 31 35 37 C37 38.5 39.5 38.5 41 37 C36.5 32 37 24 42 21.5 Z', f:'#2A251E' },
    { d:'M35 36 C37 41 43 42 46 38.5 L41 33.5 Z', f:'#2A251E' },
    { cx:51, cy:26, r:4, f:'#FFFFFF' }, { cx:50.4, cy:26, r:2, f:'#2A251E' }
  ],

  bourke: [
    { d:'M64 104 L76 146 L64 149 L54 112 Z', f:'#E77E8E' },
    { d:'M52 120 L52 130 M62 120 L62 130', s:'#8A7A62', w:3 },
    { d:'M56 16 C74 16 85 32 85 54 C85 80 76 104 62 116 C51 123 40 117 38 103 C35 82 37 48 43 32 C47 21 50 16 56 16 Z', f:'#F2A9B8' },
    { d:'M62 44 C77 42 84 56 80 77 C76 95 62 103 55 94 C49 83 51 52 62 44 Z', f:'#E77E8E' },
    { d:'M41 19 C30 20 26 31 35 37 C37 38.5 39.5 38.5 41 37 C36.5 32 37 24 42 21.5 Z', f:'#D8CFC3' },
    { d:'M35 36 C37 41 43 42 46 38.5 L41 33.5 Z', f:'#C4B8A8' },
    { cx:51, cy:26, r:4, f:'#FFFFFF' }, { cx:50.4, cy:26, r:2, f:'#2A251E' }
  ]

};
