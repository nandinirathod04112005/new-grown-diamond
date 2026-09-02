import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './StarRays.module.css';

/**
 * A starfield, and the light a stone throws through it.
 *
 * Built from the client's reference: a diamond hanging in space, a fan of
 * bright rays streaming from its culet, and sparkle flares breaking on its
 * facets. Three effects, all radial, all from one origin — which is why they
 * belong in one shader rather than three stacked elements. They share the same
 * centre, so they move together as one light rather than as three overlays
 * that happen to be near each other.
 *
 *   stars    sparse points, each twinkling on its own clock
 *   rays     a fan of beams whose density varies by ANGLE, drifting slowly
 *   flares   four-point star bursts, pulsing sharply and rarely
 *
 * `origin` is where the light comes from, in 0..1 of the frame. Handing it the
 * position of the actual stone is what makes the rays look thrown BY the
 * diamond rather than projected onto it from off-stage.
 */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision mediump float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uOrigin;   // 0..1, where the light comes from
uniform vec2  uPointer;  // -1..1, damped
uniform float uScroll;   // 0..1
out vec4 outColour;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

/*
 * Stars. A grid is diced up and only the brightest cells light, so they are
 * sparse and never form a visible lattice. Each carries its own phase so the
 * field shimmers rather than blinking in time — synchronised twinkling is the
 * giveaway that a sky is fake.
 */
float stars(vec2 uv, float t) {
  float total = 0.0;
  for (int layer = 0; layer < 2; layer++) {
    float scale = layer == 0 ? 150.0 : 90.0;
    /*
     * The field DRIFTS DOWNWARD, slowly, and each layer at its own rate — so
     * the particles read as suspended dust settling through the frame rather
     * than as a fixed sky. The parallax between the two layers is what gives
     * the black depth.
     */
    vec2 g = uv * scale + vec2(0.0, t * (layer == 0 ? 0.9 : 0.45));
    vec2 cell = floor(g);
    float h = hash(cell + float(layer) * 31.7);
    if (h < 0.982) continue;
    vec2 jitter = vec2(hash(cell + 1.3), hash(cell + 7.1)) - 0.5;
    float d = length(fract(g) - 0.5 - jitter * 0.6);
    float point = 1.0 - smoothstep(0.0, 0.30, d);
    float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * 1.4 + h * 120.0), 2.0);
    total += point * tw * (layer == 0 ? 1.0 : 0.6);
  }
  return total;
}

/*
 * The rays. Density is a function of ANGLE from the origin, so the beams are
 * genuinely radial rather than a texture stretched into a fan — and because
 * the noise is sampled with time on its second axis, the fan breathes instead
 * of rotating, which is what light through a moving facet actually does.
 */
float rays(vec2 uv, vec2 o, float t) {
  vec2 d = uv - o;
  float r = length(d);
  float a = atan(d.y, d.x);

  float n = fbm(vec2(a * 2.6, t * 0.09));
  float beam = pow(max(0.0, n * 1.35 - 0.18), 2.4);

  // Falls away with distance, and never starts right at the origin or the
  // stone would sit in a white blob.
  float fall = smoothstep(1.05, 0.06, r) * smoothstep(0.0, 0.12, r);
  return beam * fall;
}

/*
 * An orbital ring: a thin ellipse, tilted, with a bright point travelling it.
 *
 * The reference's rings are the one element that could not be faked with more
 * particles — they are continuous curves with a light running along them, and
 * a curve is what tells the eye there is a THREE-dimensional path here rather
 * than dust on a flat pane. Drawn as a distance to the ellipse so the line
 * stays one pixel wide wherever it is on screen, however sharply it is tilted.
 */
float ring(vec2 uv, vec2 c, vec2 r, float rot, float w) {
  vec2 p = uv - c;
  float s = sin(rot), co = cos(rot);
  p = vec2(p.x * co - p.y * s, p.x * s + p.y * co);
  float d = abs(length(p / r) - 1.0);
  return smoothstep(w, 0.0, d);
}

/* The light travelling that ring, and the glow it drags behind it. */
float orbiter(vec2 uv, vec2 c, vec2 r, float rot, float t, float speed, float seed) {
  float a = t * speed + seed;
  vec2 q = vec2(cos(a) * r.x, sin(a) * r.y);
  float s = sin(-rot), co = cos(-rot);
  q = vec2(q.x * co - q.y * s, q.x * s + q.y * co);
  vec2 d = uv - c - q;
  float core = exp(-dot(d, d) * 2600.0);
  float halo = exp(-dot(d, d) * 180.0) * 0.35;
  return core + halo;
}

/* A four-point star burst: two crossed slivers plus a core. */
float flare(vec2 uv, vec2 p, float size, float t, float seed) {
  vec2 d = (uv - p) / size;
  float ax = abs(d.x), ay = abs(d.y);
  float arms =
      pow(max(0.0, 1.0 - ax * 11.0), 2.0) * pow(max(0.0, 1.0 - ay * 1.1), 3.0)
    + pow(max(0.0, 1.0 - ay * 11.0), 2.0) * pow(max(0.0, 1.0 - ax * 1.1), 3.0);
  float core = exp(-dot(d, d) * 22.0);
  // Sharp and rare: a flare that pulses evenly reads as a blinking light.
  float pulse = pow(0.5 + 0.5 * sin(t * 1.3 + seed * 41.0), 6.0);
  return (arms * 0.55 + core) * pulse;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 auv = vec2(uv.x * aspect, uv.y);

  vec2 origin = vec2(uOrigin.x * aspect, uOrigin.y) + uPointer * 0.03;

  float sky = stars(auv, uTime);
  float beam = rays(auv, origin, uTime);

  // A handful of flares near the origin, each on its own clock and its own
  // spot, so they never fire together.
  float sparkle = 0.0;
  sparkle += flare(auv, origin + vec2(-0.10, 0.055) * aspect, 0.085, uTime, 1.0);
  sparkle += flare(auv, origin + vec2(0.11, 0.030) * aspect, 0.070, uTime, 2.7);
  sparkle += flare(auv, origin + vec2(0.02, 0.085) * aspect, 0.060, uTime, 4.3);
  sparkle += flare(auv, origin + vec2(-0.05, -0.02) * aspect, 0.052, uTime, 6.1);

  /*
   * Three rings on different tilts and different clocks, so they never line up
   * into a pattern. They orbit the same centre as the light, which is what
   * makes them read as paths AROUND the stone rather than decoration near it.
   */
  float rings = 0.0;
  float orbs = 0.0;
  /*
   * Sized to ORBIT THE STONE, not the screen.
   *
   * The first pass used radii around 0.4 of the frame and the rings sprawled
   * edge to edge, cutting straight through the headline — which turned a
   * detail that should sit behind the subject into the loudest thing on the
   * page. In the reference they are barely wider than the object they circle.
   */
  rings += ring(auv, origin, vec2(0.17, 0.055) * aspect, 0.20, 0.0016);
  rings += ring(auv, origin, vec2(0.125, 0.082) * aspect, -0.58, 0.0015) * 0.8;
  rings += ring(auv, origin, vec2(0.205, 0.036) * aspect, 0.76, 0.0013) * 0.65;
  orbs += orbiter(auv, origin, vec2(0.17, 0.055) * aspect, 0.20, uTime, 0.42, 0.0);
  orbs += orbiter(auv, origin, vec2(0.125, 0.082) * aspect, -0.58, uTime, -0.31, 2.1);
  orbs += orbiter(auv, origin, vec2(0.205, 0.036) * aspect, 0.76, uTime, 0.24, 4.4);

  /*
   * GOLD, not white.
   *
   * The dust and the rings are warm; only the hottest cores of the beams and
   * the flares go white. Lighting everything the same gold flattens it into a
   * sepia wash — real gold reads as gold precisely because its highlights
   * blow out to white while the body stays warm.
   */
  vec3 gold = vec3(1.00, 0.78, 0.36);
  vec3 warmWhite = vec3(1.0, 0.95, 0.86);

  vec3 col = vec3(0.0);
  col += gold * sky * 1.05;
  col += mix(gold, warmWhite, beam) * beam * mix(0.55, 1.0, 1.0 - uScroll) * 0.7;
  col += warmWhite * sparkle * 0.85;
  col += gold * rings * 0.42;
  col += mix(gold, vec3(1.0), 0.5) * orbs * 0.9;

  outColour = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[NGD starrays]', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function StarRays({ className, origin = [0.5, 0.46] }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return undefined;

    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[NGD starrays]', gl.getProgramInfoLog(prog));
      return undefined;
    }
    gl.useProgram(prog);

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
    gl.uniform2f(gl.getUniformLocation(prog, 'uOrigin'), origin[0], origin[1]);

    /*
     * Stars are the one thing here that CANNOT be rendered at half resolution:
     * a star is a single bright pixel, and halving the buffer either loses it
     * or doubles it into a square. The rest of the shader is cheap enough that
     * full resolution still holds 60fps.
     */
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
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

    let raf = 0, running = false, t0 = 0;
    const frame = (now) => {
      if (!t0) t0 = now;
      px += (tx - px) * 0.04;
      py += (ty - py) * 0.04;
      resize();
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uPointer, px, -py);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

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
      // Never loseContext() here: it is permanent for the canvas, and
      // StrictMode's second mount would get the dead one back and fail to
      // compile with an empty error log.
    };
  }, [origin]);

  return <canvas ref={ref} className={`${styles.root} ${className ?? ''}`} aria-hidden="true" />;
}
