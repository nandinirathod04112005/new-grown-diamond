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
    //
    // Recent Chrome no longer always exposes WEBGL_debug_renderer_info, and
    // reads the real renderer through gl.RENDERER instead. Falling back to an
    // empty string there let SwiftShader through as a GPU — measured: a
    // headless phone profile compiled the refraction shader for over four
    // seconds of blocked main thread on /diamonds.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    // The probe's context is released rather than left for the collector:
    // browsers cap live WebGL contexts, and the real scene needs one.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
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
 * Live on /diamonds: CvdProcess reads it to decide whether the WebGL stone
 * (ProcessGem) is mounted at all — 'off' means the SVG reactor alone. StoneFilm
 * also calls it, behind its `USE_WEBGL` flag.
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

  // A PHONE does not get the scene at all. It is an opening flourish, the
  // section already has an SVG version of it, and on a phone it costs a
  // ~270 kB (gzip) WebGL library plus a refraction shader compile — seconds of
  // a mid-range phone's main thread — for a moment of decoration. Tablets and
  // anything wider keep it.
  if (coarse && Math.min(window.innerWidth, window.innerHeight) < 700) return 'off';

  if (coarse || cores <= 4 || mem <= 4) return 'low';

  return 'high';
}
