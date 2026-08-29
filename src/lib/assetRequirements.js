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
