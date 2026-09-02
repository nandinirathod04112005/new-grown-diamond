import * as THREE from 'three';

/**
 * A studio environment, painted rather than downloaded.
 *
 * A refracting gem does not show you a material — it shows you whatever is
 * around it, bent. So the environment IS the look: with a dull surround the
 * best diamond geometry in the world renders as grey plastic. This paints an
 * equirectangular studio onto a canvas: a dark tent, a bright overhead
 * softbox, banded strip lights, scattered hard points and a warm bounce.
 *
 * Painting it has three advantages over an HDR file: nothing is fetched, so
 * there is no network cost and no failure mode; the highlight shapes are ours
 * to tune; and the result is identical on every device.
 */
export function createStudioEnvironment() {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  /*
   * Ground: DARK.
   *
   * This was a bright mid-grey wash, and that is what made the stone render as
   * flat plastic. A refracting gem shows you its surroundings, so a surround
   * that is evenly lit fills every facet with the same mid-tone and the fire
   * disappears.
   *
   * The balance matters in BOTH directions, and both failures are easy to hit.
   * Evenly bright renders grey plastic. Evenly dark renders a black hole with
   * two flashes in it — the stone stops reading as a bright object at all.
   * What works is a real light tent: a bright upper hemisphere so the stone
   * reads white, a dark lower one for contrast, and high-frequency structure
   * laid over the top to supply the fire.
   */
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#ffffff');
  base.addColorStop(0.14, '#e2e9f3');
  base.addColorStop(0.32, '#99a3b0');
  base.addColorStop(0.5, '#555c66');
  base.addColorStop(0.7, '#282c33');
  base.addColorStop(1, '#08090b');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  /** A soft-edged light panel; the blur is what stops facets flashing hard. */
  const panel = (x, y, rx, ry, colour, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, colour);
    g.addColorStop(0.55, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Key overhead softbox — the main source of return.
  panel(w * 0.5, h * 0.04, w * 0.44, h * 0.2, '#ffffff', 1);
  // Two side panels for edge definition, tighter and brighter than before.
  panel(w * 0.13, h * 0.24, w * 0.13, h * 0.2, '#e6f0ff', 0.9);
  panel(w * 0.85, h * 0.22, w * 0.12, h * 0.18, '#ffffff', 0.95);
  // Warm bounce below the girdle, which is where a real stone picks up fire.
  panel(w * 0.52, h * 0.66, w * 0.3, h * 0.16, '#ffcf90', 0.5);

  /*
   * Strip lights.
   *
   * The single biggest thing separating a convincing gem from a dull one is
   * HIGH FREQUENCY contrast in the surround. A photographer's light tent is
   * banded — bright strips with black between them — and as the stone turns
   * each facet sweeps across those bands and flashes. Smooth gradients alone
   * can never produce that, however bright they are.
   */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i += 1) {
    const x = (i + 0.5) * (w / 9);
    const g = ctx.createLinearGradient(x - w * 0.022, 0, x + w * 0.022, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, i % 2 ? 'rgba(255,255,255,0.5)' : 'rgba(214,230,255,0.72)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 0.022, h * 0.06, w * 0.044, h * 0.36);
  }
  ctx.restore();

  /*
   * Point sources. These become the individual sparkles: each is small enough
   * that a facet either catches it completely or not at all, which is why the
   * stone twinkles as it turns rather than glowing evenly.
   */
  const POINTS = [
    [0.08, 0.12], [0.22, 0.3], [0.31, 0.09], [0.44, 0.2], [0.57, 0.11],
    [0.63, 0.31], [0.71, 0.15], [0.79, 0.35], [0.9, 0.14], [0.16, 0.44],
    [0.38, 0.42], [0.86, 0.46], [0.5, 0.36], [0.26, 0.19],
  ];
  for (const [px, py] of POINTS) {
    panel(w * px, h * py, w * 0.014, h * 0.026, '#ffffff', 1);
  }

  const texture = new THREE.CanvasTexture(c);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
