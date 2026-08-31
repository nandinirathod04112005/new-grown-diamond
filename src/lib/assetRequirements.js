/**
 * Asset provenance and outstanding requirements.
 *
 * Every diamond shown on this site must be a photograph of a real, company-
 * owned stone. Procedural geometry, illustration and generated imagery are
 * never acceptable as the depiction of a finished diamond.
 *
 * This file is the single record of what we have and what is still needed, so
 * the shortfall is visible in code rather than living in someone's inbox.
 */

/** What is genuinely in the repository today. */
export const REAL_ASSETS = {
  heroStone: {
    file: 'src/assets/diamonds/ngd-brilliant-macro.webp',
    provenance: 'NGD production site (assets/images/hero/hero-diamond.webp on main)',
    subject: 'Loose round brilliant, three-quarter view',
    width: 754,
    height: 541,
    format: 'WebP, RGBA, transparent background',
    genuine: true,
  },
};

/**
 * PROVISIONAL. The hero photograph is real but under-sized: at 754px it is
 * below the 2400px the hero calls for, so it is displayed at a size that keeps
 * it acceptably sharp rather than blown up to fill the frame.
 *
 * Until a full-resolution capture exists, the hero is deliberately composed
 * around a smaller plate instead of a full-bleed stone.
 */
export const HERO_ASSET_SHORTFALL = {
  have: '754 × 541 WebP',
  need: '≥ 2400px on the long edge',
  subject: 'Loose round brilliant, macro, three-quarter view',
  background: 'Transparent (alpha) or clean black — no gradient, no prop, no reflection card',
  formats: 'AVIF + WebP for the site; original TIFF/RAW preserved unmodified',
  optional: 'Genuine 24–60 frame 360° sequence, same lighting, constant exposure',
  mustPreserve: 'Facets, transparency, inclusions, colour, reflections, proportions, and the certificate number if the stone is a listed one',
  neverAcceptable: 'Rendered, AI-generated, illustrated or stock diamonds; upscaled versions of this file',
};

/**
 * REAL FOOTAGE STILL REQUIRED.
 *
 * Every one of these renders today as a <MediaSlot> placeholder: the real NGD
 * photograph, dimmed, under a plainly labelled notice stating what is needed.
 * Nothing is invented to fill the gap — no stock clip, no generated gemstone,
 * no illustrated stand-in — because a placeholder that admits what it is costs
 * nothing, and a convincing fake costs the company's word.
 *
 * Supplying one is a one-line change: pass `src` to the slot.
 *
 * Common requirements unless stated otherwise:
 *   · 10–20s silent loop, cutting cleanly back to its first frame
 *   · ≥1920×1080, H.264 MP4 plus WebM, no burned-in text or logo
 *   · Shot on NGD premises, of NGD equipment and NGD stones
 *   · A poster frame at the same resolution
 */
export const FOOTAGE_REQUIRED = [
  {
    slot: 'CVD reactor plasma',
    where: 'Genesis — chapter 02, Plasma',
    subject: 'Through the reactor viewport: the plasma ball over the seed plate',
    shot: 'Static locked-off, no camera move, no relight',
  },
  {
    slot: 'Rough diamond scanning',
    where: 'Precision — chapter 04, Rough Diamond',
    subject: 'A rough crystal on the scanner bed, inclusion map on the operator screen',
    shot: 'Static or a very slow push; the screen must be legible',
  },
  {
    slot: 'Laser cutting and polishing',
    where: 'Precision — chapter 05, Precision Cut',
    subject: 'Laser sawing, then the polishing wheel — real sparks and slurry',
    shot: 'Macro, shallow depth of field, no added glow',
  },
  {
    slot: 'Polished loose diamond — macro / 360',
    where: 'Precision — chapter 06, Certified Brilliance',
    subject: 'A graded NGD stone in tweezers on black',
    shot: 'Macro. Ideally a genuine 24–60 frame 360° sequence, constant exposure, ≥2400px per frame',
    note: 'This is the one slot where a still sequence is preferred to video: it is the finished stone, and it must be shown as photographed.',
  },
  {
    slot: 'Jewellery editorial',
    where: 'Atelier',
    subject: 'NGD settings worn or on a hand model — ring, pendant, studs',
    shot: 'Editorial, natural light, no CGI stones and no retouching that alters a stone',
  },
];

/** Never acceptable in any of the slots above. */
export const FOOTAGE_NEVER = [
  'Stock footage of anyone else\'s factory, stones or jewellery',
  'CGI or AI-generated diamonds, in stills or motion',
  'Footage of a competitor\'s goods',
  'Any grade, effect or composite that changes how a stone actually looks',
];
