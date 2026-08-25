/* ============================================================
   NEW GROWN DIAMOND — HERO: DIAMOND ECLIPSE → SUPERNOVA
   (Three.js, ES module — the dedicated cinematic hero engine)
   ------------------------------------------------------------
   One dominant, colourless brilliant. The animation comes from
   camera choreography and LIGHT, never from spinning the stone:

     S1 0–1.5  ECLIPSE — near-black; the sapphire eclipse halo
               forms behind the stone's place; haze, faint beams,
               a barely-there silhouette on the dark glass floor
     S2 1.5–3  FIRST LIGHT — a narrow studio key sweeps in and
               touches an edge; environment intensity rises, so
               facets catch one by one (physical reveal — the
               stone is never faded in)
     S3 3–5    FACET BIRTH — the camera orbits and dollies; as
               the angle changes, facets trade bright for dark,
               spectral fire appears at glancing angles
     S4 5–6.5  SUPERNOVA — the camera closes in, the key finds
               the ideal angle: white brilliance, a restrained
               refraction bloom, the halo flares, the floor
               caustics expand
     S5 6.5–8  GRAVITY SHIFT — the stone glides to its right-
               side seat while the halo drifts after it on its
               own path; the camera settles; the left copy owns
               the frame
     S6 8–10+  FINAL COMPOSITION, then a seamless ambient loop:
               micro-rotation, travelling studio reflections,
               halo breathing, drifting caustics, haze, and an
               occasional natural facet flash. No restart.

   Signature effects: the ECLIPSE HALO (a blurred, atmospheric
   ring of sapphire light behind the stone — never a neon
   circle) and DIAMOND CAUSTICS (soft refracted light webs on
   the dark glass floor, loosely following stone and light).

   Scroll exit: the stone eases deeper, the halo expands, the
   caustics stretch vertically, the camera pushes forward — the
   hero hands off into the story. Never a plain fade, never a
   scroll lock (early scrolls fast-forward the film).

   Profiles: mobile keeps the full concept with smaller camera
   moves and a crown-top final seat. Reduced motion renders the
   final composition once, no loop. Catastrophic renderers park
   on the settled still. Fallback: the inline SVG stays unless
   WebGL initialises.

   Debug/test API: window.NGDHero3D = { setScroll, seek, state,
   debug } + flags __NGD_HERO_MODE ('webgl'|'static'),
   __NGD_HERO_ANIMATED, __NGD_HERO_PROFILE, __NGD_HERO_PARALLAX,
   __NGD_HERO_INTRO ('pending'→'done').
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
  'use strict';

  const stage = document.querySelector('[data-ngd-hero3d]');
  if (!stage) return;

  window.__NGD_HERO_MODE = 'static';
  window.__NGD_HERO_ANIMATED = false;
  window.__NGD_HERO_PARALLAX = false;

  const isMobile =
    window.matchMedia('(max-width: 991.98px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__NGD_HERO_PROFILE = isMobile ? 'mobile' : 'desktop';

  function webglAvailable() {
    try {
      const probe = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (probe.getContext('webgl2') || probe.getContext('webgl'))
      );
    } catch (_e) {
      return false;
    }
  }

  if (!webglAvailable()) {
    console.warn('[NGD Hero] WebGL unavailable — keeping static fallback.');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    console.warn('[NGD Hero] WebGL init failed — keeping static fallback.', err);
    return;
  }

  const disposables = [];
  function track(resource) { disposables.push(resource); return resource; }

  try {
    /* ================= timeline helpers ================= */
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const span = (t, a, b, ease) => (ease || easeInOut)(clamp01((t - a) / (b - a)));
    const bump = (t, m, w) => Math.exp(-Math.pow((t - m) / w, 2));

    const SETTLE_T = 8;   // final composition reached; __NGD_HERO_INTRO = 'done'

    /* ================= renderer / scene / camera ================= */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.05; // the eclipse opens in darkness

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1020, 0.045);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.35, 6.2);

    /* Jewellery-studio environment: bright neutral room + tall light
       strips. The rotating strips are what make facets catch light one
       by one during the reveal. */
    function makeStudioEnv() {
      const room = new RoomEnvironment();
      function strip(w, h, x, y, z, ry, color) {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color: color })
        );
        mesh.position.set(x, y, z);
        mesh.rotation.y = ry;
        room.add(mesh);
        return mesh;
      }
      strip(3.0, 10, -6, 2, 0, Math.PI / 2, 0xffffff);
      strip(2.0, 10, 6, 1, -1, -Math.PI / 2, 0xdfe8ff);
      strip(0.8, 8, 2.5, 2, 6, Math.PI, 0xf0debc);
      return room;
    }

    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      const studio = makeStudioEnv();
      scene.environment = pmrem.fromScene(studio, 0.04).texture;
      studio.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    } catch (envErr) {
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    pmrem.dispose();
    const supportsEnvRotation = 'environmentRotation' in scene;

    /* ================= lighting (the actors) ================= */
    /* the narrow travelling studio key — S2's "first light" */
    const key = new THREE.DirectionalLight(0xf2f6ff, 0);
    key.position.set(-4, 1.2, 2);
    scene.add(key);

    /* restrained champagne edge warmth */
    const warm = new THREE.PointLight(0xd9c08a, 0, 14);
    warm.position.set(2.6, 2.4, 2.4);
    scene.add(warm);

    /* faint cool fill so pavilions never go dead black once lit */
    const fill = new THREE.PointLight(0x38508a, 0, 20);
    fill.position.set(-1.5, -1.8, 3.5);
    scene.add(fill);

    /* ================= the diamond (colourless) ================= */
    const profile = [
      new THREE.Vector2(0.012, -1.02),
      new THREE.Vector2(0.70, -0.46),
      new THREE.Vector2(1.00, -0.02),
      new THREE.Vector2(1.00, 0.12),
      new THREE.Vector2(0.82, 0.36),
      new THREE.Vector2(0.56, 0.50),
      new THREE.Vector2(0.012, 0.50)
    ];
    const geometry = track(new THREE.LatheGeometry(profile, 16));

    const material = track(new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.88,
      ior: 2.42,
      thickness: 2.2,
      attenuationColor: new THREE.Color(0xf8f7f4), // colourless — blue comes from the light
      attenuationDistance: 2.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      iridescence: 0.28,
      iridescenceIOR: 1.9,
      specularIntensity: 1.2,
      envMapIntensity: 0.12,  // darkness — the reveal raises it
      flatShading: true
    }));
    if ('dispersion' in material) material.dispersion = 3.5;

    const heroGroup = new THREE.Group();  // seat position (gravity shift)
    const tiltGroup = new THREE.Group();  // pointer + scroll drift
    const spinGroup = new THREE.Group();  // micro-rotation only
    tiltGroup.add(heroGroup);
    heroGroup.add(spinGroup);
    scene.add(tiltGroup);
    spinGroup.rotation.x = 0.10;

    const diamond = new THREE.Mesh(geometry, material);
    spinGroup.add(diamond);

    /* dark-glass floor reflection */
    const reflMaterial = track(material.clone());
    reflMaterial.transparent = true;
    reflMaterial.opacity = 0.0;
    reflMaterial.transmission = 0.0;
    reflMaterial.color = new THREE.Color(0x707a8c);
    reflMaterial.roughness = 0.35;
    reflMaterial.envMapIntensity = 0.35;
    reflMaterial.iridescence = 0.0;
    reflMaterial.depthWrite = false;
    const reflection = new THREE.Mesh(geometry, reflMaterial);
    reflection.scale.y = -1;
    reflection.position.y = -2.16;
    spinGroup.add(reflection);

    /* ================= signature: ECLIPSE HALO ================= */
    function haloTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 126);
      g.addColorStop(0.0, 'rgba(120,160,240,0)');
      g.addColorStop(0.55, 'rgba(150,185,250,0.05)');
      g.addColorStop(0.74, 'rgba(190,214,255,0.55)');
      g.addColorStop(0.86, 'rgba(130,165,240,0.22)');
      g.addColorStop(1.0, 'rgba(90,120,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }
    const haloMat = track(new THREE.MeshBasicMaterial({
      map: haloTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    }));
    const halo = new THREE.Mesh(track(new THREE.PlaneGeometry(7.4, 7.4)), haloMat);
    halo.position.set(0.35, 0.5, -5.5);
    scene.add(halo);

    /* supernova refraction bloom — one soft radial flash, facet-born */
    function bloomTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.35, 'rgba(225,238,255,0.35)');
      g.addColorStop(1, 'rgba(190,214,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }
    const bloomMat = track(new THREE.MeshBasicMaterial({
      map: bloomTexture(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    }));
    const bloom = new THREE.Mesh(track(new THREE.PlaneGeometry(3.2, 3.2)), bloomMat);
    bloom.position.set(0.35, 0.35, 0.6);
    scene.add(bloom);

    /* ================= signature: DIAMOND CAUSTICS ================= */
    /* soft refracted light webs on the dark glass floor — white /
       ice-blue with the faintest spectral fringe, drifting with the
       light, never rainbow blobs */
    function causticTexture(seedShift) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.translate(128, 128);
      for (let i = 0; i < 26; i++) {
        const a0 = (i / 26) * Math.PI * 2 + seedShift;
        const r0 = 30 + ((i * 37) % 70);
        const r1 = r0 + 26 + ((i * 53) % 40);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
        ctx.quadraticCurveTo(
          Math.cos(a0 + 0.5) * (r0 + 22), Math.sin(a0 + 0.5) * (r0 + 22),
          Math.cos(a0 + 0.9) * r1, Math.sin(a0 + 0.9) * r1
        );
        ctx.strokeStyle = i % 5 === 0
          ? 'rgba(200,235,255,0.5)'
          : 'rgba(235,245,255,0.42)';
        ctx.lineWidth = 1.6 + (i % 3);
        ctx.stroke();
        /* whisper of spectral edge on a few strands */
        if (i % 7 === 0) {
          ctx.strokeStyle = 'rgba(255,225,235,0.12)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }

    const caustics = [];
    [0, 2.1].forEach(function (seed, i) {
      const mat = track(new THREE.MeshBasicMaterial({
        map: causticTexture(seed),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      }));
      const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(6, 6)), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0.35, -2.05, -1.2 - i);
      scene.add(mesh);
      caustics.push({ mesh: mesh, mat: mat, dir: i === 0 ? 1 : -1 });
    });

    /* ================= atmosphere (background layers) ================= */
    function beamTexture() {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 16;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 128, 0);
      g.addColorStop(0, 'rgba(120,160,255,0)');
      g.addColorStop(0.45, 'rgba(190,215,255,0.85)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(120,160,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 16);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }

    const beams = [];
    const beamGeo = track(new THREE.PlaneGeometry(14, 0.5));
    const beamCount = isMobile ? 1 : 2;
    for (let i = 0; i < beamCount; i++) {
      const mat = track(new THREE.MeshBasicMaterial({
        map: beamTexture(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      }));
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.position.set(i === 0 ? -1.5 : 2.2, i === 0 ? 0.9 : -0.7, i === 0 ? -6 : -4);
      mesh.rotation.z = i === 0 ? -0.55 : 0.42;
      scene.add(mesh);
      beams.push({ mesh: mesh, mat: mat, drift: i === 0 ? 0.22 : -0.16, base: i === 0 ? 0.14 : 0.09 });
    }
    if (!isMobile) {
      const shaftMat = track(new THREE.MeshBasicMaterial({
        map: beamTexture(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      }));
      const shaft = new THREE.Mesh(track(new THREE.PlaneGeometry(16, 3.4)), shaftMat);
      shaft.position.set(2.8, 1.6, -8.5);
      shaft.rotation.z = -0.9;
      scene.add(shaft);
      beams.push({ mesh: shaft, mat: shaftMat, drift: 0.06, base: 0.05 });
    }

    function backdropTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(164, 104, 10, 128, 128, 190);
      g.addColorStop(0, '#1d3765');
      g.addColorStop(0.45, '#0e1c3c');
      g.addColorStop(1, '#05070f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }
    const backdrop = new THREE.Mesh(
      track(new THREE.PlaneGeometry(46, 26)),
      track(new THREE.MeshBasicMaterial({ map: backdropTexture(), fog: false, depthWrite: false }))
    );
    backdrop.position.set(0, 0, -14);
    scene.add(backdrop);

    function floorTexture() {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 64, 6, 128, 64, 120);
      g.addColorStop(0, 'rgba(70,110,190,0.9)');
      g.addColorStop(0.5, 'rgba(30,54,110,0.45)');
      g.addColorStop(1, 'rgba(10,18,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }
    const floorGlow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(30, 14)),
      track(new THREE.MeshBasicMaterial({
        map: floorTexture(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      }))
    );
    floorGlow.rotation.x = -Math.PI / 2;
    floorGlow.position.set(isMobile ? 0 : 1.6, -2.05, -2.5);
    scene.add(floorGlow);

    /* distant light dust */
    function makeSprite() {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(248,252,255,1)');
      g.addColorStop(0.35, 'rgba(190,214,255,0.55)');
      g.addColorStop(1, 'rgba(190,214,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return track(tex);
    }
    const sprite = makeSprite();

    function makeCloud(count, size, low) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = -5 + Math.random() * 11;
        positions[i * 3 + 1] = low ? -2.0 + Math.random() * 0.9 : -1.9 + Math.random() * 4.2;
        positions[i * 3 + 2] = -6 + Math.random() * 7.5;
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = track(new THREE.PointsMaterial({
        size,
        map: sprite,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      }));
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      return points;
    }
    const dustFar = makeCloud(isMobile ? 18 : 44, 0.05, false);
    const bokeh = makeCloud(isMobile ? 6 : 12, 0.5, true);

    /* ================= camera + seat choreography ================= */
    /* camera path: [t, azimuth, height, distance, lookWeight]
       (position = stone-centre + polar(azimuth, distance)) */
    function makeTrack(keys) {
      return function (t, out) {
        if (t <= keys[0][0]) { out.set.apply(out, keys[0].slice(1)); return out; }
        const last = keys[keys.length - 1];
        if (t >= last[0]) { out.set.apply(out, last.slice(1)); return out; }
        for (let i = 0; i < keys.length - 1; i++) {
          const a = keys[i], b = keys[i + 1];
          if (t >= a[0] && t <= b[0]) {
            const k = easeInOut((t - a[0]) / (b[0] - a[0]));
            out.set(
              a[1] + (b[1] - a[1]) * k,
              a[2] + (b[2] - a[2]) * k,
              a[3] + (b[3] - a[3]) * k
            );
            return out;
          }
        }
        return out;
      };
    }

    /* the stone waits at centre-stage, then takes its seat */
    const STAGE = new THREE.Vector3(0.35, 0.32, 0);
    let SEAT = new THREE.Vector3(1.9, 0.42, -1.4);

    const camKeys = isMobile
      ? [
          [0.0, 0.10, 0.42, 6.2],
          [3.0, -0.14, 0.5, 5.4],
          [5.0, 0.12, 0.38, 4.4],
          [5.9, 0.05, 0.34, 3.4],
          [SETTLE_T, 0, 0.35, 4.9]
        ]
      : [
          [0.0, 0.14, 0.45, 6.4],
          [3.0, -0.22, 0.55, 5.2],
          [5.0, 0.24, 0.35, 4.2],
          [5.9, 0.10, 0.30, 3.3],
          [SETTLE_T, 0, 0.35, 4.9]
        ];
    const camTrack = makeTrack(camKeys);

    function applyComposition() {
      const wide = camera.aspect > 1.05;
      SEAT = wide
        ? new THREE.Vector3(1.9, 0.42, -1.4)
        : new THREE.Vector3(0, 1.62, -2.9);
    }

    function resize() {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      applyComposition();
    }
    resize();
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        resize();
        if (reducedMotion || !window.__NGD_HERO_ANIMATED) renderFrame();
      }).observe(stage);
    } else {
      window.addEventListener('resize', resize);
    }

    stage.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.classList.add('is-3d');
    window.__NGD_HERO_MODE = 'webgl';

    /* ================= the film ================= */
    let seqT = 0;
    let scrollP = 0;
    let fastForward = false;
    let stillMode = false;
    let stillRenderQueued = false;
    window.__NGD_HERO_INTRO = 'pending';

    const camPolar = new THREE.Vector3();
    const stonePos = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    function applyTimeline(t, ambientT) {
      /* ---- light choreography: the reveal IS the lighting ---- */
      const firstLight = span(t, 1.5, 3.0);
      const birth = span(t, 3.0, 5.0);
      const nova = bump(t, 5.75, 0.5);
      const envLevel =
        0.12 + 0.7 * firstLight + 0.9 * birth + 1.0 * nova;
      material.envMapIntensity = Math.min(2.8, envLevel);

      /* the narrow studio key sweeps in from frame-left, finds the
         ideal angle at the supernova, then rests high-right */
      const keySweep = span(t, 1.5, 5.9);
      const keyAngle = -1.7 + keySweep * 2.5 + Math.sin(ambientT * 0.2) * 0.18;
      key.position.set(Math.sin(keyAngle) * 3.6, 1.1 + keySweep * 1.9, Math.cos(keyAngle) * 3.2);
      /* occasional natural facet flash in the ambient loop */
      const flash = Math.pow(Math.max(0, Math.sin(ambientT * 0.9)), 24) * 0.5;
      key.intensity = (firstLight * 1.15 + nova * 1.4 + flash) * (1 - scrollP * 0.3);
      warm.intensity = 5.5 * span(t, 2.4, 4.5) + Math.sin(ambientT * 0.27 + 1.3) * 0.7;
      fill.intensity = 3 * span(t, 2.0, 4.0);
      if (supportsEnvRotation) {
        scene.environmentRotation.y =
          span(t, 1.5, SETTLE_T) * 1.6 + ambientT * 0.03;
      }

      /* exposure: eclipse darkness → brilliance, flaring at the nova */
      const rise = 0.05 + 0.1 * span(t, 0.2, 1.5) + 0.85 * span(t, 1.5, 4.6);
      renderer.toneMappingExposure = 1.12 * rise * (1 + 0.26 * nova) * (1 - scrollP * 0.5);

      /* ---- the stone: centre-stage, then the gravity shift ---- */
      const shift = span(t, 6.5, SETTLE_T);
      stonePos.copy(STAGE).lerp(SEAT, shift);
      stonePos.y += Math.sin(ambientT * 0.5) * 0.03;
      heroGroup.position.copy(stonePos);
      /* micro-rotation only — the film is light + camera, not spin */
      spinGroup.rotation.y = 0.65 + t * 0.06 + Math.max(0, ambientT - t) * 0.05;

      /* ---- camera choreography (polar orbit around the stage) ---- */
      camTrack(t, camPolar); // x=azimuth y=height z=distance
      const az = camPolar.x;
      const dist = camPolar.z - scrollP * 0.55;
      camera.position.set(Math.sin(az) * dist, camPolar.y, Math.cos(az) * dist);
      /* the lens tracks the stone through the film, then eases to the
         neutral framing that seats it screen-right beside the copy */
      const lookW = 0.85 - 0.7 * shift;
      lookTarget.set(0.45, 0.32, 0).lerp(stonePos, lookW);
      camera.lookAt(lookTarget);

      /* ---- the eclipse halo ---- */
      const haloForm = span(t, 0.15, 1.4);
      const breathe = 1 + Math.sin(ambientT * 0.24) * 0.05;
      /* it follows the stone on its own, slower path — depth */
      const haloLag = span(t, 6.9, SETTLE_T + 0.4);
      const haloEndX = SEAT.x > 0.5 ? SEAT.x - 0.75 : 0;
      halo.position.x = 0.35 + (haloEndX - 0.35) * haloLag;
      halo.position.y = 0.5 + Math.sin(ambientT * 0.17) * 0.12;
      const haloScale = (1 + 0.28 * nova) * breathe * (1 + scrollP * 0.8);
      halo.scale.setScalar(haloScale);
      haloMat.opacity = (0.42 * haloForm + 0.24 * nova) * (1 - scrollP * 0.35);

      /* ---- supernova bloom (facet-born, brief) ---- */
      bloom.position.set(stonePos.x, stonePos.y, stonePos.z + 0.6);
      bloomMat.opacity = nova * 0.32;
      bloom.scale.setScalar(1 + nova * 0.6);

      /* ---- caustics on the dark glass ---- */
      const causticLife = 0.28 * span(t, 2.6, 4.6) + 0.5 * nova;
      for (let i = 0; i < caustics.length; i++) {
        const c = caustics[i];
        c.mat.opacity = causticLife * (i === 0 ? 1 : 0.6) * (1 - scrollP * 0.3);
        c.mesh.rotation.z = ambientT * 0.03 * c.dir + keyAngle * 0.1;
        const stretch = 1 + nova * 0.5 + scrollP * 0.9;
        c.mesh.scale.set(1 + nova * 0.4, stretch, 1);
        c.mesh.position.x = stonePos.x * 0.8 + Math.sin(ambientT * 0.11 + i) * 0.3;
      }

      /* ---- atmosphere ---- */
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        const first = bump(t, 0.7 + i * 0.5, 0.7) * 0.22;
        const ambient = b.base * span(t, 1.8, 3.6) *
          (0.7 + 0.3 * Math.sin(ambientT * 0.2 + i * 2.2));
        b.mat.opacity = (first + ambient) * (1 - scrollP);
      }
      const seatGlow = span(t, 6.6, SETTLE_T) * (1 - scrollP);
      floorGlow.material.opacity = (0.12 * span(t, 0.2, 1.4) + 0.24 * seatGlow) *
        (0.85 + 0.15 * Math.sin(ambientT * 0.24));
      bokeh.material.opacity = 0.16 * seatGlow * (0.75 + 0.25 * Math.sin(ambientT * 0.5 + 1));
      bokeh.rotation.y = ambientT * 0.01;
      dustFar.material.opacity = (0.1 + 0.24 * span(t, 0.4, 2.0)) *
        (0.7 + 0.3 * Math.sin(ambientT * 0.7));
      dustFar.rotation.y = ambientT * 0.015;

      /* ---- dark-glass reflection + scroll exit ---- */
      reflection.material.opacity =
        (0.05 * span(t, 0.3, 1.2) + 0.09 * shift) * (1 - scrollP * 0.5);
      heroGroup.scale.setScalar(1 - scrollP * 0.16);
      tiltGroup.position.y = scrollP * 0.85;
      /* scroll: the stone also eases deeper, the camera pushes on */
      heroGroup.position.z -= scrollP * 0.9;
    }

    /* ================= public API ================= */
    window.NGDHero3D = {
      setScroll(p) {
        scrollP = Math.min(1, Math.max(0, p));
        if (scrollP > 0.03 && seqT < SETTLE_T) fastForward = true;
        if (stillMode && !stillRenderQueued) {
          stillRenderQueued = true;
          requestAnimationFrame(function () {
            stillRenderQueued = false;
            renderFrame();
          });
        }
      },
      seek(sec) {
        seqT = Math.max(0, sec);
        ambientT = Math.max(ambientT, seqT);
        if (seqT >= SETTLE_T) window.__NGD_HERO_INTRO = 'done';
        renderFrame();
      },
      state: {
        profile: window.__NGD_HERO_PROFILE,
        t: () => seqT,
        settled: () => seqT >= SETTLE_T,
        stillMode: () => stillMode,
        objects: {
          hero: 1,
          halo: 1,
          caustics: caustics.length,
          beams: beams.length
        }
      },
      debug() {
        return {
          exposure: renderer.toneMappingExposure,
          envIntensity: material.envMapIntensity,
          keyIntensity: key.intensity,
          hero: [heroGroup.position.x, heroGroup.position.y, heroGroup.position.z],
          camera: [camera.position.x, camera.position.y, camera.position.z],
          halo: { x: halo.position.x, opacity: haloMat.opacity, scale: halo.scale.x },
          caustic: caustics[0].mat.opacity,
          spin: spinGroup.rotation.y
        };
      }
    };

    let ambientT = 0;
    function renderFrame() {
      applyTimeline(seqT, ambientT);
      renderer.render(scene, camera);
    }

    /* ================= reduced motion: the final frame ================= */
    if (reducedMotion) {
      window.NGDHero3D.setScroll = function () {};
      window.NGDHero3D.seek = function () {};
      seqT = SETTLE_T + 1;
      ambientT = 3.2;
      window.__NGD_HERO_INTRO = 'done';
      applyTimeline(seqT, ambientT);
      renderer.render(scene, camera);
      return;
    }

    /* ================= pointer (after settle only) ================= */
    let targetTiltX = 0;
    let targetTiltY = 0;
    const heroSection = stage.closest('.ngd-hero') || stage;
    const parallaxOn = !isMobile && window.matchMedia('(pointer: fine)').matches;
    if (parallaxOn) {
      window.__NGD_HERO_PARALLAX = true;
      heroSection.addEventListener('pointermove', function (event) {
        const rect = heroSection.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        targetTiltY = nx * 0.14;
        targetTiltX = ny * 0.08;
        /* the halo answers the pointer with its own tiny drift */
        halo.position.x += (nx * 0.18 - (halo.position.x - (seqT >= SETTLE_T ? SEAT.x - 0.75 : 0.35))) * 0.02;
      });
      heroSection.addEventListener('pointerleave', function () {
        targetTiltX = 0;
        targetTiltY = 0;
      });
    }

    /* ================= loop ================= */
    let inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.02 }).observe(stage);
    }

    const clock = new THREE.Clock();
    window.__NGD_HERO_ANIMATED = true;

    let slowTime = 0;
    let degraded = false;
    let frameParity = 0;
    let heavyTime = 0;

    function enterStillMode() {
      stillMode = true;
      renderer.setAnimationLoop(null);
      seqT = Math.max(seqT, SETTLE_T);
      ambientT = Math.max(ambientT, seqT);
      window.__NGD_HERO_INTRO = 'done';
      renderFrame();
    }

    renderer.setAnimationLoop(function () {
      if (document.hidden || !inView) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.5);
      ambientT += dt;

      if (!degraded) {
        slowTime = dt > 0.045 ? slowTime + dt : 0;
        if (slowTime > 1.5) {
          degraded = true;
          renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1) * 0.8);
          resize();
        }
      }
      if (!stillMode) {
        heavyTime = dt > 0.22 ? heavyTime + dt : 0;
        if (heavyTime > 2.2) { enterStillMode(); return; }
      }

      if (seqT < SETTLE_T) {
        seqT += dt * (fastForward ? 10 : 1);
        if (seqT >= SETTLE_T) {
          seqT = SETTLE_T;
          ambientT = Math.max(ambientT, seqT);
          window.__NGD_HERO_INTRO = 'done';
        }
      }

      frameParity = (frameParity + 1) & 3;
      if (scrollP > 0.05 && scrollP < 0.98 &&
          (degraded ? frameParity !== 0 : (frameParity & 1) !== 0)) return;

      applyTimeline(seqT, ambientT);

      for (let i = 0; i < beams.length; i++) {
        beams[i].mesh.position.x += beams[i].drift * dt * 0.4;
        if (beams[i].mesh.position.x > 6) beams[i].mesh.position.x = -6;
        if (beams[i].mesh.position.x < -6) beams[i].mesh.position.x = 6;
      }

      const settleW = span(seqT, SETTLE_T - 0.8, SETTLE_T);
      tiltGroup.rotation.x += ((targetTiltX * settleW) - tiltGroup.rotation.x) * 0.05;
      tiltGroup.rotation.y += ((targetTiltY * settleW) - tiltGroup.rotation.y) * 0.05;

      renderer.render(scene, camera);
    });
  } catch (err) {
    console.warn('[NGD Hero] 3D setup failed — using static fallback.', err);
    try {
      renderer.setAnimationLoop(null);
      if (renderer.domElement.parentNode === stage) {
        stage.removeChild(renderer.domElement);
      }
      disposables.forEach(function (resource) {
        try { if (resource.dispose) resource.dispose(); } catch (_e) { /* ignore */ }
      });
      renderer.dispose();
    } catch (_e) { /* ignore cleanup errors */ }
    stage.classList.remove('is-3d');
    window.__NGD_HERO_MODE = 'static';
    window.__NGD_HERO_ANIMATED = false;
  }
})();
