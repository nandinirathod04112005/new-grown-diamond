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
