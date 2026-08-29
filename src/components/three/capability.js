/**
 * Decides whether this device should run the WebGL hero at all.
 *
 * The 3D scene is a progressive enhancement layered over a static fallback
 * that is always rendered first. Anything uncertain resolves to "no": a missing
 * API, a low-power device, a data saver, or a stated preference for less
 * motion. Being wrong here costs battery and frame rate on exactly the devices
 * least able to absorb it.
 */
export function supports3D() {
  if (typeof window === 'undefined') return false;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;

  // Coarse pointer + narrow viewport => phone. The static hero is the design
  // there, not a degraded version of it.
  if (window.matchMedia?.('(max-width: 767px)').matches) return false;

  const connection = navigator.connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;

  if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4) return false;
  // < 4, not <= 4: plenty of capable laptops report exactly four cores and
  // render a single low-poly transmissive mesh without trouble.
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency < 4) {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext('webgl2')) return false;
  } catch {
    return false;
  }

  return true;
}
