export const PAGES = {
  '/about': {
    eyebrow: 'The house / Since the 1980s',
    title: 'Four decades in diamonds. A new way of growing them.',
    intro: 'New Grown Diamond is a Surat-based manufacturer, wholesaler and global supplier of polished laboratory-grown diamonds.',
    sections: [
      ['Our story', 'The business began with earth-mined diamonds and moved into polished laboratory-grown diamond manufacturing in 2012, combining an established cutting tradition with CVD and HPHT technology.'],
      ['Manufacturing', 'State-of-the-art production in Surat supports certified and non-certified CVD and HPHT diamonds for B2B clients, retailers and jewellery traders worldwide.'],
      ['Range', 'Our programme covers approximately 0.30 to 6.00 carats, colours D through J, and round, cushion, heart, marquise, pear, princess, radiant, square radiant, emerald and oval shapes.'],
      ['Mission', 'We invest in current manufacturing technology, consistent quality and clear diamond education so clients can confidently evaluate laboratory-grown stones.'],
    ],
  },
  '/education': {
    eyebrow: 'Education / Diamond origin',
    title: 'Same crystal. Different journey.',
    intro: 'Laboratory-grown diamonds are crystallized carbon with the physical, chemical and optical properties associated with mined diamonds. They are not cubic zirconia or moissanite.',
    sections: [
      ['CVD', 'Chemical Vapour Deposition grows diamond from a carbon-containing gas. A hydrogen-rich feed, typically with methane, is activated into reactive species that support layer-by-layer growth on a diamond substrate.'],
      ['HPHT', 'High Pressure High Temperature recreates the intense pressure-and-temperature conditions under which diamond crystal structures form.'],
      ['Certification', 'Independent grading reports communicate cut, colour, clarity and carat. New Grown Diamond offers diamonds certified by laboratories including IGI.'],
      ['Longevity', 'A laboratory-grown diamond does not cloud or change colour simply because it was grown above ground. Its care requirements are the same as those of a mined diamond.'],
    ],
  },
  /*
   * The comparison the old site put in its Education menu, written to be
   * defensible rather than promotional: what is genuinely identical, what
   * genuinely differs, and who can actually tell — a trade buyer is asked this
   * by their own customers and needs an answer that survives the follow-up.
   */
  '/cvd-vs-natural': {
    eyebrow: 'Education / Origin compared',
    title: 'One material. Two origins.',
    intro: 'A laboratory-grown diamond and a mined diamond are the same substance. What separates them is where the crystal formed, how long it took, and what a grading laboratory can read in its growth structure.',
    sections: [
      ['Composition', 'Both are crystallized carbon in the same cubic lattice. A laboratory-grown diamond is not a simulant — cubic zirconia and moissanite are different materials with different chemical and optical behaviour.'],
      ['Formation', 'A natural diamond crystallizes in the Earth’s mantle over geological time and is carried upward in volcanic rock. A CVD diamond grows in a reactor over weeks, as a hydrogen-rich plasma carrying a small carbon source deposits carbon layer by layer onto a diamond seed.'],
      ['Properties', 'Hardness, refractive index, dispersion and thermal conductivity are those of diamond in both cases. A thermal probe reads both as diamond, and neither a loupe nor the unaided eye separates them reliably.'],
      ['Telling them apart', 'Separation is a laboratory task. Graders read growth structure, fluorescence and phosphorescence, and trace defects: mined stones commonly show octahedral growth zoning, while CVD material shows layered growth running out from its seed.'],
      ['On the report', 'Both are graded on the same cut, colour, clarity and carat scales, and a report from a laboratory such as IGI or GIA states the origin explicitly. A laboratory-grown diamond is identified as one on its own certificate.'],
    ],
  },
  '/shapes': {
    eyebrow: 'Education / Shape guide',
    title: 'The outline changes everything.',
    intro: 'Shape describes a diamond’s visible form and proportions. Cut describes how successfully its facets return light.',
    sections: [
      ['Round Brilliant', 'The classic 360-degree symmetrical outline, selected for strong light return and compatibility with almost every setting.'],
      ['Princess & Cushion', 'Princess offers crisp square geometry; cushion softens its corners and uses larger facets for a vintage-inflected character.'],
      ['Emerald & Radiant', 'Emerald uses parallel step facets to foreground clarity. Radiant combines a rectangular outline with brilliant-style faceting.'],
      ['Oval, Pear & Marquise', 'Elongated silhouettes create visual length. Pear combines a round end with a point; marquise uses two points and a broad face-up area.'],
      ['Asscher, Heart & Trillion', 'Asscher is a square step cut with cropped corners. Heart demands precise symmetry. Trillion uses a three-sided mixed brilliant form.'],
    ],
  },
  /*
   * Price and size, written without a single price on it.
   *
   * The page a buyer actually wants is "what does this cost", and the honest
   * answer is that it depends on four grades, a shape and the day — lab-grown
   * per-carat rates move faster than a static page can follow. So this explains
   * the MECHANICS a quote is built from, and states measurable millimetre sizes
   * that do not move at all, then sends the reader to the desk for a number.
   * Publishing an invented figure would be the easy version and would be wrong
   * within a month.
   */
  '/price-and-size': {
    eyebrow: 'Education / Price and size',
    title: 'What a carat costs, and what it looks like.',
    intro: 'Carat is a weight, not a width. This is how weight, millimetre size and price relate to one another, and what actually moves a quote up or down.',
    sections: [
      ['Carat is weight', 'One carat is exactly 0.2 grams. It says nothing directly about how wide a stone looks face-up: two one-carat diamonds of different shapes, or of the same shape cut to different depths, can differ noticeably in diameter.'],
      ['Price is quoted per carat', 'The trade prices in dollars per carat, not per stone, and multiplies by weight at the end. That is why a quote changes when the weight changes even if nothing else has.'],
      ['The scale is not linear', 'Rate per carat rises as size rises, so a two-carat stone costs more than twice a one-carat of matching quality. Larger crystals take longer to grow, fail more often, and yield less finished weight from the rough.'],
      ['Rates step at round weights', 'Per-carat rates jump at 0.30, 0.50, 0.90, 1.00, 1.50 and 2.00 carats, because demand concentrates there. A stone just under a step often costs meaningfully less than one just over it while looking almost identical.'],
      ['The other three Cs move the rate', 'Colour, clarity and cut each shift the per-carat rate independently of weight. Cut is the one that also changes how large the stone looks: a well-proportioned stone returns more light and spreads wider than a deep one of the same weight.'],
      ['Shape changes the size you see', 'Elongated shapes — oval, marquise, pear, emerald — present more surface face-up than a round of the same weight, so they read larger on the hand. Round brilliants lose more weight in cutting than any other shape, which is reflected in their rate.'],
    ],
  },
  '/why-lab-grown': {
    eyebrow: 'Why New Grown Diamond',
    title: 'Quality you can inspect. Origin you can explain.',
    intro: 'Our manufacturing and service model is built around measurable quality, independent certification and direct access to supporting information.',
    sections: [
      ['Quality', 'In-house planning and multiple checks allow the team to monitor the stones entering inventory and maintain consistency across client programmes.'],
      ['Tradition', 'Diamond experience dating to the 1980s informs how each rough stone is planned, cut, polished and presented.'],
      ['Certification', 'IGI-certified options provide an independent record of the diamond’s graded characteristics.'],
      ['Value', 'A curated laboratory-grown inventory gives retailers and jewellery businesses access to size, colour and quality combinations at commercially useful values.'],
      ['Assistance', 'Clients can request certificates, videos, diamond inspection support and help identifying stones for a specific programme.'],
    ],
  },
};

/**
 * What sits under Education.
 *
 * Declared once because two places render it — the header dropdown and the
 * contents list on the Education page itself — and a nav that has drifted from
 * the page it describes is worse than either alone. The blurb is ignored by
 * the nav, which has no room for it.
 */
export const EDUCATION_TOPICS = [
  {
    href: '/price-and-size',
    label: 'Diamond price and size',
    blurb: 'How carat weight, millimetre size and the per-carat rate relate — and what moves a quote.',
  },
  {
    href: '/cvd-vs-natural',
    label: 'Comparison between CVD & natural diamond',
    blurb: 'The same crystal from two origins — what is identical, what differs, and who can actually tell.',
  },
  {
    href: '/why-lab-grown',
    label: 'Why choose a lab-grown diamond?',
    blurb: 'Quality you can inspect and an origin you can explain, set against what it costs.',
  },
  {
    href: '/shapes',
    label: 'Shapes',
    blurb: 'How an outline changes the face-up size, the light return and the setting.',
  },
  {
    href: '/faq',
    label: 'FAQ',
    blurb: 'Short answers on growth, certification, durability and verifying origin.',
  },
];

export const FAQS = [
  ['What does CVD mean?', 'CVD stands for Chemical Vapour Deposition, a process that grows diamond crystal from activated carbon-containing gas.'],
  ['Which gases are commonly used?', 'CVD growth commonly uses a mixture dominated by hydrogen with a smaller quantity of methane.'],
  ['What temperature is required?', 'Gem-quality CVD growth uses elevated substrate temperatures. GIA describes about 900–1200°C, while the precise set point depends on the reactor, recipe and target crystal.'],
  ['Is a lab-grown diamond a simulant?', 'No. Diamond is crystallized carbon. Cubic zirconia and moissanite are different materials with different chemical and optical behaviour.'],
  ['Will its appearance change?', 'Laboratory-grown diamonds have the same basic durability and care characteristics as mined diamonds and do not inherently cloud with age.'],
  ['Can the origin be verified?', 'A grading report identifies the diamond and records whether its origin is laboratory-grown. Certificates and videos are available for inventory inspection.'],
];

/**
 * The enquiry line.
 *
 * Separate from OFFICES on purpose: those are four PLACES, each with its own
 * address and its own local number, and the contact page renders them as a
 * directory. This is one line answered for two specific things — sourcing a
 * diamond, and having a piece made around one — so it belongs wherever either
 * of those is being asked for, not only on the contact page.
 *
 * `tel` is the dialable form and `phone` the readable one; they are kept as
 * separate fields rather than derived, because stripping spaces out of a
 * printed number is a guess about formatting and this way the href is stated.
 */
export const ENQUIRY_DESK = {
  phone: '+91 733 922 0840',
  tel: '+917339220840',
  label: 'Diamond and custom jewellery enquiries',
};

export const OFFICES = [
  { city: 'Surat', address: 'SY No. 310, 2nd Floor, Chinaiwala Complex, near Mehta Petrol Pump, Amroli Road, Katargam, Surat 395004', phone: '+91 99139 99794', tel: '+919913999794', email: 'newgrowndiamonds@gmail.com' },
  { city: 'Mumbai', address: 'GW-2100, 2nd Floor, Bharat Diamond Bourse, BKC, Mumbai 400051', phone: '+91 87992 36510', tel: '+918799236510', email: 'newgrowndiamonds@gmail.com' },
  { city: 'New York', address: '15 West 47th Street, Suite 1802, New York, NY 10036', phone: '+1 551 325 8210', tel: '+15513258210', email: 'ngd.usa1@gmail.com' },
  { city: 'Hong Kong', address: 'Room 901, 9/F, Workingport Commercial Building, 3 Hau Fook Street, Tsim Sha Tsui, Kowloon', phone: '+852 9140 0857', tel: '+85291400857' },
];
