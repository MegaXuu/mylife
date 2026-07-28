/* ==========================================================================
   data/plantes.js — catalogue de plantes d'intérieur courantes (Lot V1-7).
   Clé = identifiant d'espèce (ascii, sans accent). Valeur :
   { name, latin, water:{warm,cold}, feed:{warm,cold}, repot:{months} }
   — intervalles en jours pour l'arrosage/engrais, en mois pour le rempotage.
   `feed.cold` à 0 signifie « pas d'engrais en saison froide » : l'app ne
   propose alors pas du tout ce soin cette saison-là (CLAUDE.md, Lot V1-7).
   Choisir une espèce dans la fiche plante (js/plants.js) pré-remplit ces
   intervalles ; ils restent modifiables ensuite, par plante.
   ========================================================================== */
const PLANTES = {
  monstera:              {name:'Monstera',              latin:'Monstera deliciosa',        water:{warm:7,  cold:14}, feed:{warm:30, cold:0}, repot:{months:24}},
  ficus_lyrata:          {name:'Ficus lyrata',           latin:'Ficus lyrata',              water:{warm:7,  cold:14}, feed:{warm:30, cold:0}, repot:{months:24}},
  ficus_elastica:        {name:'Ficus elastica',         latin:'Ficus elastica',            water:{warm:7,  cold:14}, feed:{warm:30, cold:0}, repot:{months:24}},
  ficus_benjamina:       {name:'Ficus benjamina',        latin:'Ficus benjamina',           water:{warm:7,  cold:12}, feed:{warm:30, cold:0}, repot:{months:24}},
  pothos:                {name:'Pothos',                 latin:'Epipremnum aureum',         water:{warm:7,  cold:12}, feed:{warm:30, cold:0}, repot:{months:18}},
  philodendron:          {name:'Philodendron',           latin:'Philodendron hederaceum',   water:{warm:6,  cold:12}, feed:{warm:30, cold:0}, repot:{months:18}},
  sansevieria:           {name:'Sansevieria',            latin:'Dracaena trifasciata',      water:{warm:14, cold:30}, feed:{warm:60, cold:0}, repot:{months:24}},
  zamioculcas:           {name:'Zamioculcas',            latin:'Zamioculcas zamiifolia',    water:{warm:14, cold:28}, feed:{warm:60, cold:0}, repot:{months:24}},
  spathiphyllum:         {name:'Spathiphyllum',          latin:'Spathiphyllum wallisii',    water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:18}},
  calathea:              {name:'Calathea',               latin:'Calathea sp.',              water:{warm:5,  cold:8},  feed:{warm:30, cold:0}, repot:{months:18}},
  aloe_vera:             {name:'Aloé vera',              latin:'Aloe vera',                 water:{warm:14, cold:21}, feed:{warm:30, cold:0}, repot:{months:24}},
  cactus:                {name:'Cactus',                 latin:'Cactaceae',                 water:{warm:14, cold:30}, feed:{warm:30, cold:0}, repot:{months:24}},
  succulente:            {name:'Succulente',             latin:'Succulenta sp.',            water:{warm:10, cold:21}, feed:{warm:30, cold:0}, repot:{months:24}},
  orchidee_phalaenopsis: {name:'Orchidée phalaenopsis',  latin:'Phalaenopsis sp.',          water:{warm:7,  cold:10}, feed:{warm:14, cold:0}, repot:{months:12}},
  yucca:                 {name:'Yucca',                  latin:'Yucca elephantipes',        water:{warm:10, cold:21}, feed:{warm:30, cold:0}, repot:{months:24}},
  dracaena:              {name:'Dracaena',               latin:'Dracaena fragrans',         water:{warm:7,  cold:12}, feed:{warm:30, cold:0}, repot:{months:24}},
  chlorophytum:          {name:'Chlorophytum',           latin:'Chlorophytum comosum',      water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:18}},
  aglaonema:             {name:'Aglaonema',              latin:'Aglaonema commutatum',      water:{warm:7,  cold:12}, feed:{warm:30, cold:0}, repot:{months:18}},
  alocasia:              {name:'Alocasia',               latin:'Alocasia amazonica',        water:{warm:5,  cold:9},  feed:{warm:30, cold:0}, repot:{months:12}},
  fougere_boston:        {name:'Fougère de Boston',      latin:'Nephrolepis exaltata',      water:{warm:4,  cold:7},  feed:{warm:30, cold:0}, repot:{months:12}},
  pilea:                 {name:'Pilea',                  latin:'Pilea peperomioides',       water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:12}},
  hoya:                  {name:'Hoya',                   latin:'Hoya carnosa',              water:{warm:10, cold:18}, feed:{warm:30, cold:0}, repot:{months:24}},
  anthurium:             {name:'Anthurium',              latin:'Anthurium andraeanum',      water:{warm:6,  cold:9},  feed:{warm:30, cold:0}, repot:{months:18}},
  palmier_areca:         {name:'Palmier areca',          latin:'Dypsis lutescens',          water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:24}},
  palmier_kentia:        {name:'Palmier kentia',         latin:'Howea forsteriana',         water:{warm:7,  cold:12}, feed:{warm:30, cold:0}, repot:{months:24}},
  olivier:               {name:'Olivier',                latin:'Olea europaea',             water:{warm:10, cold:18}, feed:{warm:30, cold:0}, repot:{months:24}},
  basilic:               {name:'Basilic',                latin:'Ocimum basilicum',          water:{warm:2,  cold:4},  feed:{warm:14, cold:0}, repot:{months:6}},
  menthe:                {name:'Menthe',                 latin:'Mentha sp.',                water:{warm:3,  cold:5},  feed:{warm:14, cold:0}, repot:{months:6}},
  croton:                {name:'Croton',                 latin:'Codiaeum variegatum',       water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:18}},
  pachira:               {name:'Pachira',                latin:'Pachira aquatica',          water:{warm:7,  cold:14}, feed:{warm:30, cold:0}, repot:{months:24}},
  schefflera:            {name:'Schefflera',             latin:'Schefflera arboricola',     water:{warm:7,  cold:12}, feed:{warm:30, cold:0}, repot:{months:18}},
  tradescantia:          {name:'Tradescantia',           latin:'Tradescantia zebrina',      water:{warm:5,  cold:9},  feed:{warm:30, cold:0}, repot:{months:12}},
  syngonium:             {name:'Syngonium',              latin:'Syngonium podophyllum',     water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:18}},
  maranta:               {name:'Maranta',                latin:'Maranta leuconeura',        water:{warm:5,  cold:8},  feed:{warm:30, cold:0}, repot:{months:18}},
  kalanchoe:             {name:'Kalanchoé',              latin:'Kalanchoe blossfeldiana',   water:{warm:10, cold:18}, feed:{warm:30, cold:0}, repot:{months:18}},
  cyclamen:              {name:'Cyclamen',               latin:'Cyclamen persicum',         water:{warm:5,  cold:7},  feed:{warm:21, cold:0}, repot:{months:12}},
  begonia:               {name:'Bégonia',                latin:'Begonia sp.',               water:{warm:5,  cold:9},  feed:{warm:21, cold:0}, repot:{months:12}},
  lierre:                {name:'Lierre',                 latin:'Hedera helix',              water:{warm:6,  cold:10}, feed:{warm:30, cold:0}, repot:{months:18}},
  fittonia:              {name:'Fittonia',               latin:'Fittonia albivenis',        water:{warm:4,  cold:6},  feed:{warm:30, cold:0}, repot:{months:12}},
  peperomia:             {name:'Peperomia',              latin:'Peperomia obtusifolia',     water:{warm:8,  cold:14}, feed:{warm:30, cold:0}, repot:{months:18}}
};
