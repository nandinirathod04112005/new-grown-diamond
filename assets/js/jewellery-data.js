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
