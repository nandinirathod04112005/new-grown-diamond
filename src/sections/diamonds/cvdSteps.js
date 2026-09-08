/**
 * The twelve stages of CVD production, transcribed from New Grown Diamond's
 * own process plates.
 *
 * The text lives HERE rather than only inside the artwork. Each plate carries
 * its heading and bullets rendered into the picture, which is right for a
 * slide and wrong for a web page: baked-in type cannot be selected, searched,
 * translated, read aloud, or resized, and at phone width it is far too small to
 * read at all. So the words are real HTML and the photograph is cropped to the
 * half that is actually a photograph — see `object-position` in the stylesheet.
 */
export const CVD_STEPS = [
  {
    n: 1,
    title: 'Prepare the substrate',
    body: 'A small diamond seed is cleaned and polished to provide a perfect surface for diamond growth.',
    points: ['High-purity diamond seed', 'Cleaned and polished surface', 'Ready for growth'],
    alt: 'A polished square diamond seed plate held in tweezers on a steel surface.',
  },
  {
    n: 2,
    title: 'Load into reactor',
    body: 'The cleaned seeds are placed on a molybdenum holder and loaded into a high-precision CVD reactor.',
    points: ['Seeds set on a molybdenum holder', 'Arranged for uniform growth', 'Loaded into a sealed chamber'],
    alt: 'Diamond seeds arranged on a circular molybdenum holder inside an open reactor chamber.',
  },
  {
    n: 3,
    title: 'Create vacuum',
    body: 'The reactor is sealed and evacuated to a high vacuum, removing air, moisture and contaminants. A clean, low-pressure environment is what makes high-quality growth possible.',
    points: ['Air and moisture removed', 'High vacuum, very low pressure', 'Clean environment for pure growth'],
    alt: 'A sealed CVD reactor beside a turbomolecular pump, its vacuum gauge reading 1.0 × 10⁻⁶ mbar.',
  },
  {
    n: 4,
    title: 'Introduce gases',
    body: 'High-purity methane and hydrogen are introduced into the sealed reactor in precise amounts under controlled conditions.',
    points: ['Ultra-high-purity CH₄ and H₂', 'Precise flow control', 'Controlled and safe process'],
    alt: 'Methane and hydrogen cylinders with regulators feeding gas lines into a CVD reactor.',
  },
  {
    n: 5,
    title: 'Plasma activation',
    body: 'Microwave energy creates a plasma, breaking methane molecules apart and releasing reactive carbon atoms that settle onto the seeds.',
    points: ['Microwave energy generates the plasma', 'Methane is broken into carbon atoms', 'Reactive carbon deposits on the seeds'],
    alt: 'A violet plasma glowing inside a CVD reactor above a holder of diamond seeds.',
  },
  {
    n: 6,
    title: 'Diamond growth',
    body: 'Under high temperature and controlled plasma, carbon deposits on the seeds layer by layer, growing into diamond crystals.',
    points: ['700–1,200°C', 'Low pressure, in the mbar range', 'Continuous growth to the thickness required'],
    alt: 'Diamond plates on a heated reactor stage, each carrying a visibly grown crystal layer.',
  },
  {
    n: 7,
    title: 'Cool and unload',
    body: 'After the growth cycle the reactor is cooled in a controlled manner, the chamber is opened, and the as-grown plates are unloaded for inspection.',
    points: ['Controlled cooling', 'Safe chamber opening', 'As-grown plates removed for inspection'],
    alt: 'Gloved hands lifting a holder of as-grown diamond plates from an opened reactor.',
  },
  {
    n: 8,
    title: 'Inspect as-grown plates',
    body: 'The plates are inspected for quality, growth uniformity and defects using optical and advanced scanning systems.',
    points: ['Visual inspection', 'Raman and photoluminescence mapping', 'Uniformity and thickness checked'],
    alt: 'A technician examining an as-grown diamond plate under a measuring microscope beside an inspection readout.',
  },
  {
    n: 9,
    title: 'Post-growth cleaning',
    body: 'Surface residues — graphite, amorphous carbon and other byproducts — are removed by chemical and ultrasonic cleaning.',
    points: ['Graphite and residues removed', 'Chemical and ultrasonic cleaning', 'Purity maintained for the next stage'],
    alt: 'A diamond plate lifted from an ultrasonic cleaning bath beside deionised water and cleaning solution.',
  },
  {
    n: 10,
    title: 'Laser graphite removal',
    body: 'A precision laser removes the graphite layer and separates the grown diamond from its substrate, ready for seed separation.',
    points: ['High-precision laser', 'Graphite and excess material removed', 'Clean separation without damaging the diamond'],
    alt: 'A laser cutting head removing the graphite layer from a grown diamond plate.',
  },
  {
    n: 11,
    title: 'Cutting and polishing',
    body: 'The rough is planned, cut and polished to bring out brilliance, symmetry and finish.',
    points: ['Precision planning and marking', 'Laser or saw cutting', 'Final quality check'],
    alt: 'A diamond being polished on a rotating scaife, its facets catching the light.',
  },
  {
    n: 12,
    title: 'Independent grading and certification',
    body: 'Each diamond is graded independently by laboratories such as IGI. Inventory is supported with certificates, videos and inspection data.',
    points: ['Graded by IGI and other trusted laboratories', 'Cut, colour, clarity and carat', 'Certificate, video and inspection data'],
    alt: 'A diamond under a grading microscope beside an IGI laboratory-grown grading report.',
  },
];
