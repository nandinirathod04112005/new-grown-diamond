/**
 * The size charts, transcribed from New Grown Diamond's own published tables.
 *
 * THREE FIGURES WERE CORRECTED IN TRANSCRIPTION, each flagged at its row. All
 * three are unambiguous typing slips rather than judgements: every one breaks a
 * sequence that rises monotonically either side of it, and a chart whose job is
 * to let a buyer convert a weight cannot carry a value that is obviously wrong.
 * They are marked so the source can be corrected too.
 */

/* The shape set the size charts cover, in the order the guide presents it. */
export const SHAPE_GRID = [
  'Round', 'Princess', 'Cushion', 'Rec Cushion', 'Oval', 'Pear', 'Emerald', 'Asscher', 'Radiant',
  'Rec Radiant', 'Heart', 'Marquise', 'Baguette', 'Tap Baguette', 'Carre', 'Trapezoid', 'Half Moon', 'Bullet',
  'Tapered Bullet', 'Shield', 'Trilliant', 'Calf', 'Hexagon',
];

/** Round brilliant, 0.21 – 5.20 ct. Weight range against face-up diameter. */
export const ROUND_MM = [
  ['0.21 – 0.22', '3.80 – 3.90'],
  ['0.23 – 0.24', '3.90 – 4.00'],
  ['0.25 – 0.26', '4.00 – 4.10'],
  ['0.26 – 0.27', '4.10 – 4.20'],
  /* Source reads "4.20 – 0.43 mm". A 0.43mm stone does not exist and the rows
     either side run 4.10–4.20 and 4.40–4.50, so the second figure is 4.30. */
  ['0.27 – 0.28', '4.20 – 4.30'],
  ['0.30 – 0.36', '4.40 – 4.50'],
  ['0.40 – 0.45', '4.60 – 4.70'],
  ['0.46 – 0.48', '4.90 – 5.00'],
  ['0.50 – 0.57', '5.10 – 5.30'],
  ['0.60 – 0.67', '5.40 – 5.60'],
  ['0.70 – 0.77', '5.70 – 5.90'],
  ['0.80 – 0.85', '6.00 – 6.10'],
  ['0.90 – 0.95', '6.20 – 6.30'],
  ['1.00 – 1.10', '6.40 – 6.60'],
  ['1.22 – 1.26', '6.70 – 6.80'],
  ['1.28 – 1.30', '6.90 – 7.10'],
  ['1.50 – 1.55', '7.20 – 7.40'],
  ['1.67 – 1.80', '7.50 – 7.90'],
  ['2.00 – 2.10', '8.10 – 8.30'],
  ['2.40 – 2.60', '8.50 – 8.80'],
  ['2.70 – 2.80', '8.90 – 9.10'],
  ['3.00 – 3.10', '9.20 – 9.40'],
  ['3.30 – 3.40', '9.50 – 9.60'],
  /* Source reads "6.70 – 7.80 mm", which would make a 3.5ct stone smaller than
     a 0.9ct one. It sits between 9.50–9.60 and 9.90–10.00, so it is 9.70–9.80. */
  ['3.50 – 3.70', '9.70 – 9.80'],
  ['3.80 – 3.90', '9.90 – 10.00'],
  ['4.00 – 4.10', '10.10 – 10.20'],
  ['4.50 – 4.60', '10.60 – 10.70'],
  ['4.70 – 4.80', '10.80 – 10.90'],
  ['4.90 – 4.99', '10.90 – 11.00'],
  ['5.00 – 5.20', '11.10 – 11.20'],
];

/**
 * Melee, 0.005 – 0.20 ct.
 *
 * Carries the two columns a buyer of small goods actually orders against:
 * stones per carat, and the sieve range the parcel is screened to.
 */
export const MELEE = [
  ['0.005', '0.90 – 1.10', '1/200', '+000/-0'],
  ['0.006', '1.10 – 1.15', '1/175', '+0/-1'],
  ['0.007', '1.15 – 1.20', '1/150', '+1/-1.5'],
  ['0.008', '1.20 – 1.25', '1/120', '+1.5/-2'],
  ['0.009', '1.25 – 1.30', '1/100', '+2/-2.5'],
  /* Source reads "130-1.35 mm" — a missing decimal point. */
  ['0.010', '1.30 – 1.35', '1/100', '+2.5/-3'],
  ['0.011', '1.35 – 1.40', '1/100', '+3/-3.5'],
  ['0.012', '1.40 – 1.45', '1/80', '+3.5/-4'],
  ['0.013', '1.45 – 1.50', '1/80', '+4/-4.5'],
  ['0.014', '1.50 – 1.55', '1/70', '+4.5/-5'],
  ['0.016', '1.55 – 1.60', '1/60', '+5/-5.5'],
  ['0.018', '1.60 – 1.70', '1/50', '+5.5/-6'],
  ['0.021', '1.70 – 1.80', '1/50', '+6/-6.5'],
  ['0.025', '1.80 – 1.90', '1/40', '+6.5/-7'],
  ['0.029', '1.90 – 2.00', '1/30', '+7/-7.5'],
  ['0.035', '2.00 – 2.10', '1/30', '+7.5/-8'],
  ['0.039', '2.10 – 2.20', '1/25', '+8/-8.5'],
  ['0.044', '2.20 – 2.30', '1/25', '+8.5/-9'],
  ['0.052', '2.30 – 2.40', '1/20', '+9/-9.5'],
  ['0.058', '2.40 – 2.50', '1/20', '+9.5/-10'],
  ['0.069', '2.50 – 2.60', '1/15', '+10/-10.5'],
  ['0.074', '2.60 – 2.70', '1/15', '+10.5/-11'],
  ['0.078', '2.70 – 2.80', '1/12', '+11/-11.5'],
  ['0.086', '2.80 – 2.90', '1/12', '+11.5/-12'],
  ['0.095', '2.90 – 3.00', '1/10', '+12/-12.5'],
  ['0.108', '3.00 – 3.10', '1/10', '+12.5/-13'],
  ['0.116', '3.10 – 3.20', '1/8', '+13/-13.5'],
  ['0.130', '3.20 – 3.30', '1/8', '+13.5/-14'],
  ['0.155', '3.40 – 3.50', '1/6', '+14.5/-15'],
  ['0.165', '3.50 – 3.60', '1/6', '+15/-15.5'],
  ['0.190', '3.60 – 3.70', '1/5', '+15.5/-15.75'],
  ['0.200', '3.70 – 3.80', '1/5', '+15.75/-16.5'],
];

/** Round brilliant proportions, by cut grade. */
export const PROPORTIONS = [
  ['Table %', '53 – 58%', '52 – 53% or 58 – 60%', '51% or 61 – 64%'],
  ['Depth %', '59 – 62.3%', '58 – 58.9% or 62.4 – 63.5%', '57.5 – 57.9% or 63.6 – 64.1%'],
  ['Crown angle', '34 – 34.9°', '32.1 – 33.9° or 35 – 35.9°', '30.1 – 32° or 36 – 37.9°'],
  ['Pavilion depth %', '42.8 – 43.2%', '42 – 42.7% or 43.3 – 43.9%', '41 – 41.9% or 44 – 45.5%'],
  ['Girdle', 'Thin to slightly thick', 'Very thin to slightly thick', 'Very thin to thick'],
  ['Culet', 'None', 'Very small', 'Small'],
];

export const RATIO = [
  ['Length to width', '0.99 – 1.01', '0.98 – 1.01'],
];
