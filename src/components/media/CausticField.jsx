import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './CausticField.module.css';

/**
 * Caustics — the light a diamond throws.
 *
 * A drifting gradient is what every template ships with, and it says nothing
 * about the product. The one optical behaviour that belongs to this business
 * and to nothing else is a gem bending light: point a lamp at a brilliant and
 * it casts moving ribbons of light on the surface behind it. That is what this
 * draws, and it is the only background this particular site could have.
 *
 * WHY RAW WEBGL AND NOT THREE. three.js is already a dependency, but it is
 * lazy-loaded and only for visitors whose device accepts the interactive
 * stone. Reaching for it here would pull ~250kB into the first paint of every
 * page for one fullscreen quad — this is about a hundred lines and one draw
 * call instead.
 *
 * The four dimensions, since that is the brief: the caustics move through
 * SPACE at two depths that drift apart, they evolve over TIME, they warp
 * toward the POINTER, and they open up as the page is SCROLLED. Nothing is a
 * loop you can catch repeating, because the two layers run at different rates
 * and never come back into phase.
 *
 * It renders at half resolution and is scaled up in CSS. Caustics are soft by
 * nature, so the loss is invisible and the fragment shader does a quarter of
 * the work.
 */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision mediump float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // -1..1, damped
uniform float uScroll;    // 0..1 down the page
uniform vec3  uTint;
out vec4 outColour;

// Cheap value noise. Hash is the usual sin-fract trick: not statistically
// great, entirely good enough for something this soft and this dim.
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

/*
 * The caustic itself. Domain-warping the field and then folding it with
 * 1 - |sin| is what produces the thin bright filaments where light converges;
 * a plain fbm gives clouds, and clouds are not what a gem casts.
 */
float caustic(vec2 uv, float t, float scale) {
  vec2 q = uv * scale;
  q += vec2(fbm(q + t * 0.08), fbm(q.yx - t * 0.06)) * 1.6;
  float f = fbm(q + t * 0.05);
  float ridge = 1.0 - abs(sin(f * 6.2831));
  /*
   * The exponent is the width of the filament, and it was the real bug.
   *
   * At 6.0 the ridges were a pixel or two wide — and this buffer renders at
   * HALF resolution, so they averaged away to nothing before they ever
   * reached the screen. Two passes were spent raising brightness, which could
   * never fix a shape too thin to survive sampling. At 2.6 they are ribbons
   * with body, which is what a caustic actually looks like anyway: light
   * pooling, not scratched lines.
   */
  return pow(ridge, 2.6);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  // Correct for aspect so the filaments are not stretched on a wide monitor.
  vec2 auv = vec2(uv.x * (uRes.x / uRes.y), uv.y);

  // Two sheets at different depths, drifting apart. The parallax between them
  // is what stops it reading as a flat animated texture.
  vec2 near = auv + uPointer * 0.045 + vec2(0.0, uScroll * -0.22);
  vec2 far  = auv + uPointer * 0.018 + vec2(0.0, uScroll * -0.09);

  float a = caustic(near, uTime, 3.2);
  float b = caustic(far, uTime * 0.62 + 40.0, 5.1);

  // Widened as well as brightened: thin filaments alone read as noise at this
  // scale, so a broader soft component is mixed under them to give the light
  // somewhere to pool.
  float light = a * 0.85 + b * 0.5;

  /*
   * Edge to edge now, because this IS the full-bleed image rather than a wash
   * behind one. It only falls away at the very bottom, where the type sits and
   * needs a quiet ground to be read against.
   */
  float fall = mix(0.55, 1.0, smoothstep(-0.1, 0.55, uv.y));
  light *= fall;

  /*
   * The subject, not the wallpaper.
   *
   * Two earlier passes ran this at 0.42 and 1.05 and both were invisible in a
   * still frame — a shader burning GPU for nothing. It is the full-bleed image
   * now, so it is lit like one.
   *
   * The warm second tone matters more than the brightness: a single teal
   * everywhere reads as a screensaver, whereas light that shifts from cool in
   * the thin filaments to warm where it pools reads as light in a room.
   */
  vec3 cool = uTint;
  vec3 warm = vec3(1.0, 0.93, 0.80);
  // Raised again after looking at a still: at 3.1 the filaments were present
  // but not yet READABLE as light. This is the image now, so it carries.
  // Back down now that the filaments have body — wide ribbons at 5.4 would
  // wash the whole frame out.
  vec3 col = mix(cool, warm, smoothstep(0.3, 0.95, light)) * light * 1.5;
  outColour = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[NGD caustics]', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function CausticField({ className, tint = [0.16, 0.86, 0.84] }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    // Reduced motion gets the CSS field underneath and nothing else: this is
    // continuous unrequested movement, which is precisely what that setting
    // asks a site not to do.
    if (prefersReducedMotion()) return undefined;

    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power',
    });
    // No WebGL2 is a normal outcome, not an error. The painted CSS ground
    // beneath is a finished background on its own.
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[NGD caustics]', gl.getProgramInfoLog(prog));
      return undefined;
    }
    gl.useProgram(prog);

    // One fullscreen triangle, not two triangles: no seam down the diagonal
    // and three vertices instead of six.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uPointer = gl.getUniformLocation(prog, 'uPointer');
    const uScroll = gl.getUniformLocation(prog, 'uScroll');
    gl.uniform3f(gl.getUniformLocation(prog, 'uTint'), tint[0], tint[1], tint[2]);

    // Half resolution, capped. Caustics are soft; nobody can see the
    // difference and the shader does a quarter of the work.
    const SCALE = 0.5;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    /*
     * The uniform is uploaded EVERY frame, and the early-return only guards
     * the expensive part.
     *
     * This was `if (already the right size) return;` and it silently produced
     * a black canvas: React StrictMode runs the effect twice, the second run
     * links a NEW program with its own uniform locations, and the canvas is
     * already the right size from the first run — so uRes was never uploaded
     * to the live program. It stayed at its default (0, 0), every fragment
     * divided by zero, and the whole field went black with no GL error to
     * show for it. Resizing a canvas is expensive; setting two floats is not.
     */
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    let px = 0, py = 0, tx = 0, ty = 0, scroll = 0;
    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    };

    let raf = 0;
    let running = false;
    let t0 = 0;

    const frame = (now) => {
      if (!t0) t0 = now;
      // Damped, like every other pointer response on the site — an undamped
      // one makes a background feel twitchy in the corner of the eye.
      px += (tx - px) * 0.045;
      py += (ty - py) * 0.045;
      resize();
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uPointer, px, -py);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    // Never runs while off screen or in a hidden tab. A fullscreen shader
    // nobody is looking at is pure battery.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    onScroll();

    return () => {
      io.disconnect();
      stop();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      /*
       * Deliberately NOT calling WEBGL_lose_context.loseContext() here.
       *
       * It looked like good hygiene and it silently broke the whole component:
       * losing a context is PERMANENT for that canvas, and StrictMode mounts
       * effects twice in development. The second mount asked the same canvas
       * for a context, got the dead one back, and every shader then failed to
       * compile with an empty info log — an error with no message, on a
       * feature that had been working a moment earlier.
       *
       * The GPU resources above are released individually, and the context
       * itself goes when the canvas is collected.
       */
    };
  }, [tint]);

  return <canvas ref={ref} className={`${styles.root} ${className ?? ''}`} aria-hidden="true" />;
}
