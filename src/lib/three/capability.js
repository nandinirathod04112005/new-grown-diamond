/**
 * Whether this device should be given the WebGL stone at all.
 *
 * The hero must never depend on it: the photograph underneath is the LCP
 * element and a finished frame on its own, so a refusal here costs the visitor
 * nothing but a still picture. That is the only reason it is safe to put a
 * canvas in the first thing anyone sees.
 *
 * Reduced motion deliberately does NOT disqualify a device. That setting asks
 * for no UNSOLICITED motion, not for no interaction — Stone360 reads it and
 * holds the stone still until the visitor takes hold of it themselves.
 */
export function supportsInteractiveGem() {
  if (typeof window === 'undefined') return false;

  // A cheap, honest signal for "this machine will struggle": very few cores.
  // Reading deviceMemory where it exists catches low-end Android directly.
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = navigator.deviceMemory ?? 4;
  if (cores <= 2 || mem <= 2) return false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    // Software rasterisers report themselves; they render this scene at single
    // digit frame rates, which looks far worse than the photograph alone.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * How hard this device may be pushed: 'off' | 'low' | 'high'.
 *
 * Consumed by Canvas3D and Stone, which read only `tier === 'high'` to decide
 * antialiasing and device pixel ratio. 'low' therefore means "render, but at
 * one device pixel and without MSAA" — which is the difference between a
 * laptop integrated GPU coping and not.
 *
 * NOTE: this replaces an earlier implementation of the same export that was
 * lost. It is currently dead at runtime — StoneFilm gates every call behind
 * `USE_WEBGL`, which is false — but it must stay correct for the day that flag
 * is flipped back on.
 */
export function qualityTier() {
  if (!supportsInteractiveGem()) return 'off';

  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = navigator.deviceMemory ?? 4;

  // A phone can run the scene, but not at 1.75x DPR with MSAA on top of a
  // bloom pass — that combination is what turns a 60fps scene into a 20fps
  // one, and it is invisible at phone pixel densities anyway.
  const coarse =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse || cores <= 4 || mem <= 4) return 'low';

  return 'high';
}
