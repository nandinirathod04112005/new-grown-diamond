/**
 * Decides whether this device runs WebGL at all, and at what quality.
 *
 * The 3D is a progressive enhancement over a real photograph that always
 * renders first. Anything uncertain resolves downward: a missing API, a
 * low-power device, a data saver, or a stated preference for less motion.
 * Being wrong here costs battery and frame rate on exactly the devices least
 * able to absorb it.
 */

function conn() {
  return navigator.connection ?? null;
}

/** 'off' | 'low' | 'high' */
export function qualityTier() {
  if (typeof window === 'undefined') return 'off';

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off';

  const c = conn();
  if (c?.saveData) return 'off';
  if (c?.effectiveType && /(^|-)2g$/.test(c.effectiveType)) return 'off';

  try {
    if (!document.createElement('canvas').getContext('webgl2')) return 'off';
  } catch {
    return 'off';
  }

  const mem = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (typeof mem === 'number' && mem < 4) return 'off';
  if (typeof cores === 'number' && cores < 4) return 'off';

  // Phones and tablets get the photograph, not a canvas: it is the better image
  // there and costs a fraction of the battery.
  //
  // 899px, matching MQ.desktop exactly. At 767 the two gates disagreed: this
  // said "3D is fine" from 768px up, while the director only ever activates the
  // canvas inside MQ.desktop (>=900px). Every visitor between 768 and 899px
  // downloaded three.js (234 kB gzip) and got a live WebGL context attached to
  // a canvas that never drew a single frame.
  if (window.matchMedia?.('(max-width: 899px)').matches) return 'off';

  // Mid-tier machines render, but without dispersion, bloom or antialiasing.
  if ((typeof mem === 'number' && mem < 8) || (typeof cores === 'number' && cores < 8)) {
    return 'low';
  }

  return 'high';
}

export function supports3D() {
  return qualityTier() !== 'off';
}
