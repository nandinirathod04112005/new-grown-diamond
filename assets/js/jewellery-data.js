/* ============================================================
   NEW GROWN DIAMOND — DEMO JEWELLERY DATA
   ------------------------------------------------------------
   Static demo pieces for the jewellery listing. In the upcoming
   Supabase phase this file is replaced by a select from the
   `jewellery` table returning objects of the same shape:

     { id, name, category, description, weightCt, availability }

   weightCt is the total certified diamond weight and may be
   null for all-metal pieces.
   ============================================================ */
window.NGD_DEMO_JEWELLERY = [
  { id: 'JW-1001', name: 'Aurora Solitaire Ring',           category: 'Rings',     description: 'A round brilliant held in six whisper-thin claws.',    weightCt: 1.02, availability: 'In Stock' },
  { id: 'JW-1002', name: 'Éclat Halo Ring',                 category: 'Rings',     description: 'A cushion centre wrapped in a halo of pavé light.',    weightCt: 1.45, availability: 'Made to Order' },
  { id: 'JW-1003', name: 'Meridian Eternity Band',          category: 'Rings',     description: 'Stones the whole way round, edge to edge.',            weightCt: 2.10, availability: 'In Stock' },
  { id: 'JW-1004', name: 'Lumière Studs',                   category: 'Earrings',  description: 'Mirror-matched round brilliants for every day.',       weightCt: 1.00, availability: 'In Stock' },
  { id: 'JW-1005', name: 'Cascade Drop Earrings',           category: 'Earrings',  description: 'Pear-cut drops that move with the light.',             weightCt: 1.60, availability: 'Made to Order' },
  { id: 'JW-1006', name: 'Petite Halo Studs',               category: 'Earrings',  description: 'Small studs with outsized sparkle.',                   weightCt: 0.50, availability: 'In Stock' },
  { id: 'JW-1007', name: 'Solstice Pendant',                category: 'Pendants',  description: 'A single oval on the finest cable chain.',             weightCt: 0.75, availability: 'In Stock' },
  { id: 'JW-1008', name: 'Nova Halo Pendant',               category: 'Pendants',  description: 'A round centre ringed in brilliance.',                 weightCt: 0.90, availability: 'In Stock' },
  { id: 'JW-1009', name: 'Voyage Bezel Pendant',            category: 'Pendants',  description: 'A sleek bezel that travels everywhere.',               weightCt: 0.55, availability: 'Made to Order' },
  { id: 'JW-1010', name: 'Rivière Necklace',                category: 'Necklaces', description: 'A graduated line of certified rounds.',                weightCt: 5.20, availability: 'Made to Order' },
  { id: 'JW-1011', name: 'Constellation Station Necklace',  category: 'Necklaces', description: 'Stones scattered like a night sky.',                   weightCt: 1.80, availability: 'In Stock' },
  { id: 'JW-1012', name: 'Duet Layered Necklace',           category: 'Necklaces', description: 'Two strands, one quiet statement.',                    weightCt: 1.25, availability: 'In Stock' },
  { id: 'JW-1013', name: 'Ligne Tennis Bracelet',           category: 'Bracelets', description: 'The classic line, stone after stone.',                 weightCt: 3.40, availability: 'In Stock' },
  { id: 'JW-1014', name: 'Orbit Chain Bracelet',            category: 'Bracelets', description: 'A single floating station on polished links.',         weightCt: 0.35, availability: 'In Stock' },
  { id: 'JW-1015', name: 'Nocturne Tennis Bracelet',        category: 'Bracelets', description: 'Deeper stones cut for evening light.',                 weightCt: 4.05, availability: 'Made to Order' },
  { id: 'JW-1016', name: 'Halo Hinged Bangle',              category: 'Bangles',   description: 'A pavé crest on a sculpted oval.',                     weightCt: 1.15, availability: 'In Stock' },
  { id: 'JW-1017', name: 'Aura Plain Bangle',               category: 'Bangles',   description: 'Polished gold with nothing to prove.',                 weightCt: null, availability: 'In Stock' },
  { id: 'JW-1018', name: 'Gemini Stacking Bangles',         category: 'Bangles',   description: 'A mirrored pair made to stack.',                       weightCt: 0.60, availability: 'Made to Order' }
];

/* ------------------------------------------------------------
   Extended product details (deterministic per piece) for the
   jewellery details page. The future Supabase `jewellery` table
   stores these as real columns — same field names.
   ------------------------------------------------------------ */
(function () {
  'use strict';

  var METALS = [
    { metal: 'Gold', karat: '18K', colour: 'White' },
    { metal: 'Gold', karat: '18K', colour: 'Yellow' },
    { metal: 'Gold', karat: '14K', colour: 'Rose' },
    { metal: 'Platinum', karat: '950', colour: 'Platinum' }
  ];
  var QUALITY = ['D–E / VVS', 'E–F / VVS–VS', 'F–G / VS'];

  /* per piece: [subcategory, diamond shape, size, diamond pieces] */
  var DETAILS = {
    'JW-1001': ['Solitaire', 'Round', 'Ring size 48–62 (resizable)', 1],
    'JW-1002': ['Halo', 'Cushion', 'Ring size 48–62 (resizable)', 25],
    'JW-1003': ['Eternity Band', 'Round', 'Ring size 48–62 (made to size)', 32],
    'JW-1004': ['Studs', 'Round', 'One size', 2],
    'JW-1005': ['Drops', 'Pear', 'One size', 14],
    'JW-1006': ['Halo Studs', 'Round', 'One size', 26],
    'JW-1007': ['Solitaire Pendant', 'Oval', 'Chain 45 cm', 1],
    'JW-1008': ['Halo Pendant', 'Round', 'Chain 45 cm', 19],
    'JW-1009': ['Bezel Pendant', 'Round', 'Chain 42 + 3 cm', 1],
    'JW-1010': ['Rivière', 'Round', '42 cm', 56],
    'JW-1011': ['Station', 'Round', '45 cm', 9],
    'JW-1012': ['Layered', 'Round', '40 + 45 cm', 12],
    'JW-1013': ['Tennis', 'Round', '16.5 cm', 42],
    'JW-1014': ['Chain', 'Round', '17 cm (adjustable)', 1],
    'JW-1015': ['Tennis', 'Round', '17 cm', 38],
    'JW-1016': ['Hinged Bangle', 'Round', '57 × 47 mm oval', 21],
    'JW-1017': ['Plain Bangle', null, '57 × 47 mm oval', 0],
    'JW-1018': ['Stacking Pair', 'Round', '55 mm round', 16]
  };

  var GROSS_BASE = { Rings: 3.4, Earrings: 2.6, Pendants: 2.2, Necklaces: 9.5, Bracelets: 6.8, Bangles: 14.2 };

  var STORY = {
    Rings: 'is shaped and finished entirely in our atelier, its band polished to a mirror before the setting is raised by hand.',
    Earrings: 'is matched stone-for-stone under the loupe so both ears catch exactly the same light.',
    Pendants: 'hangs from a hand-finished bail on our finest cable chain, sitting precisely where light gathers.',
    Necklaces: 'is assembled link by link, every stone seated and checked before the clasp is fitted.',
    Bracelets: 'is articulated so it moves like fabric, each setting angled to keep the line of light unbroken.',
    Bangles: 'is formed from a single bar of metal, sculpted, hinged and polished until the surface reads like water.'
  };

  window.NGD_DEMO_JEWELLERY.forEach(function (p, i) {
    var d = DETAILS[p.id] || ['Signature', 'Round', 'One size', 1];
    var m = METALS[i % 4];
    var metalName = m.metal === 'Platinum'
      ? 'Platinum 950'
      : m.karat + ' ' + m.colour + ' Gold';

    p.sku = p.id;
    p.subcategory = d[0];
    p.metal = m.metal;
    p.metalKarat = m.karat;
    p.metalColour = m.colour;
    p.diamondShape = d[1];
    p.diamondPieces = d[3];
    p.diamondQuality = p.weightCt === null ? null : QUALITY[i % 3];
    p.certificateNo = p.weightCt === null ? null : 'NGDJ-' + (582300 + i * 37);
    p.grossWeight = +(GROSS_BASE[p.category] + (p.weightCt || 0) * 0.55 + (i % 5) * 0.3).toFixed(2);
    p.size = d[2];
    p.fullDesc =
      'The ' + p.name + ' ' + STORY[p.category] + ' Cast in ' + metalName +
      (p.weightCt !== null
        ? ', it carries ' + p.weightCt.toFixed(2) + ' carats of our own certified lab-grown diamonds' +
          (p.diamondPieces > 1 ? ' across ' + p.diamondPieces + ' stones' : ' in a single stone') + '.'
        : ', it needs no stones to hold the eye.') +
      ' Every piece leaves the atelier with its papers, presentation case and a lifetime of care.';
  });
})();
