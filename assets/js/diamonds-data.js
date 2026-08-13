/* ============================================================
   NEW GROWN DIAMOND — DEMO DIAMOND INVENTORY DATA
   ------------------------------------------------------------
   Static demo stones for the inventory page. In the upcoming
   Supabase phase this file is replaced by a select from the
   `diamonds` table returning objects of the same shape:

     { id, shape, carat, colour, clarity, cut, lab, growth,
       availability }

   The first six stones mirror the homepage Featured Diamonds
   (their legacy demo-01…demo-06 links resolve to these ids).
   ============================================================ */
window.NGD_DEMO_DIAMONDS = [
  { id: 'NGD-1001', shape: 'Round',    carat: 1.52, colour: 'D', clarity: 'VVS1', cut: 'Ideal',     lab: 'IGI', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1002', shape: 'Oval',     carat: 2.01, colour: 'E', clarity: 'VS1',  cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1003', shape: 'Princess', carat: 1.20, colour: 'F', clarity: 'VVS2', cut: 'Excellent', lab: 'IGI', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1004', shape: 'Emerald',  carat: 1.75, colour: 'D', clarity: 'VS1',  cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'On Request' },
  { id: 'NGD-1005', shape: 'Cushion',  carat: 2.15, colour: 'F', clarity: 'VS2',  cut: 'Very Good', lab: 'GIA', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1006', shape: 'Radiant',  carat: 1.68, colour: 'E', clarity: 'VVS2', cut: 'Excellent', lab: 'IGI', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1007', shape: 'Round',    carat: 0.72, colour: 'D', clarity: 'IF',   cut: 'Ideal',     lab: 'IGI', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1008', shape: 'Pear',     carat: 1.05, colour: 'G', clarity: 'VS1',  cut: 'Very Good', lab: 'GIA', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1009', shape: 'Marquise', carat: 0.98, colour: 'E', clarity: 'VVS2', cut: 'Excellent', lab: 'IGI', growth: 'CVD',  availability: 'On Request' },
  { id: 'NGD-1010', shape: 'Round',    carat: 2.55, colour: 'F', clarity: 'VS2',  cut: 'Ideal',     lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1011', shape: 'Oval',     carat: 1.31, colour: 'D', clarity: 'VVS1', cut: 'Excellent', lab: 'IGI', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1012', shape: 'Emerald',  carat: 2.88, colour: 'G', clarity: 'VS1',  cut: 'Very Good', lab: 'GIA', growth: 'HPHT', availability: 'On Request' },
  { id: 'NGD-1013', shape: 'Cushion',  carat: 1.44, colour: 'E', clarity: 'SI1',  cut: 'Very Good', lab: 'IGI', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1014', shape: 'Princess', carat: 0.90, colour: 'D', clarity: 'VVS1', cut: 'Excellent', lab: 'IGI', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1015', shape: 'Radiant',  carat: 2.02, colour: 'H', clarity: 'VS2',  cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1016', shape: 'Pear',     carat: 1.76, colour: 'F', clarity: 'VVS2', cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1017', shape: 'Round',    carat: 3.20, colour: 'D', clarity: 'IF',   cut: 'Ideal',     lab: 'GIA', growth: 'CVD',  availability: 'On Request' },
  { id: 'NGD-1018', shape: 'Marquise', carat: 1.22, colour: 'G', clarity: 'VS1',  cut: 'Very Good', lab: 'IGI', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1019', shape: 'Oval',     carat: 0.85, colour: 'E', clarity: 'VVS1', cut: 'Excellent', lab: 'IGI', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1020', shape: 'Emerald',  carat: 1.18, colour: 'F', clarity: 'VS2',  cut: 'Excellent', lab: 'IGI', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1021', shape: 'Round',    carat: 1.01, colour: 'H', clarity: 'SI1',  cut: 'Very Good', lab: 'IGI', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1022', shape: 'Cushion',  carat: 2.60, colour: 'D', clarity: 'VVS2', cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'On Request' },
  { id: 'NGD-1023', shape: 'Princess', carat: 1.55, colour: 'E', clarity: 'VS1',  cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1024', shape: 'Pear',     carat: 2.30, colour: 'D', clarity: 'VVS1', cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1025', shape: 'Radiant',  carat: 0.77, colour: 'F', clarity: 'VS1',  cut: 'Very Good', lab: 'IGI', growth: 'HPHT', availability: 'In Stock' },
  { id: 'NGD-1026', shape: 'Marquise', carat: 1.85, colour: 'E', clarity: 'VVS2', cut: 'Excellent', lab: 'GIA', growth: 'CVD',  availability: 'In Stock' },
  { id: 'NGD-1027', shape: 'Oval',     carat: 2.72, colour: 'G', clarity: 'VS2',  cut: 'Very Good', lab: 'GIA', growth: 'HPHT', availability: 'On Request' },
  { id: 'NGD-1028', shape: 'Round',    carat: 0.52, colour: 'E', clarity: 'IF',   cut: 'Ideal',     lab: 'IGI', growth: 'CVD',  availability: 'In Stock' }
];

/* ------------------------------------------------------------
   Derived laboratory details (deterministic per stone) for the
   details page. The future Supabase `diamonds` table stores
   these as real columns — same field names.
   ------------------------------------------------------------ */
(function () {
  'use strict';
  var POLISH = ['Excellent', 'Excellent', 'Very Good'];
  var SYMMETRY = ['Excellent', 'Very Good', 'Excellent'];
  var FLUOR = ['None', 'None', 'Faint', 'None'];
  var RATIO = { Round: 1.00, Oval: 1.35, Princess: 1.03, Emerald: 1.42, Cushion: 1.08, Radiant: 1.22, Pear: 1.55, Marquise: 1.92 };
  var DEPTH = { Round: 62.4, Oval: 61.8, Princess: 71.5, Emerald: 66.0, Cushion: 66.8, Radiant: 68.2, Pear: 61.5, Marquise: 60.8 };
  var TABLE = { Round: 57, Oval: 58, Princess: 73, Emerald: 63, Cushion: 61, Radiant: 65, Pear: 58, Marquise: 57 };

  window.NGD_DEMO_DIAMONDS.forEach(function (d, i) {
    d.polish = POLISH[i % 3];
    d.symmetry = SYMMETRY[i % 3];
    d.fluorescence = FLUOR[i % 4];
    d.ratio = +(RATIO[d.shape] + (i % 5) * 0.01).toFixed(2);
    d.depthPct = +(DEPTH[d.shape] + (i % 7) * 0.1).toFixed(1);
    d.tablePct = +(TABLE[d.shape] + (i % 4) * 0.5).toFixed(1);
    var width = (6.45 * Math.cbrt(d.carat)) / Math.sqrt(d.ratio);
    var length = width * d.ratio;
    var depthMm = width * (d.depthPct / 100);
    d.measurements = length.toFixed(2) + ' × ' + width.toFixed(2) + ' × ' + depthMm.toFixed(2) + ' mm';
    d.report = (d.lab === 'IGI' ? 'LG' : '') + String(582400000 + i * 104729 + (d.lab === 'GIA' ? 37 : 0));
  });
})();

/* Homepage "Featured" cards link with their original demo ids —
   map them onto the matching inventory stones. */
window.NGD_LEGACY_IDS = {
  'demo-01': 'NGD-1001',
  'demo-02': 'NGD-1002',
  'demo-03': 'NGD-1003',
  'demo-04': 'NGD-1004',
  'demo-05': 'NGD-1005',
  'demo-06': 'NGD-1006'
};
