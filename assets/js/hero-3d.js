/* ============================================================
   NEW GROWN DIAMOND — CINEMATIC HOMEPAGE HERO (Three.js, ES module)
   ------------------------------------------------------------
   A ~10 second obsidian / midnight-sapphire opening sequence,
   rendered full-bleed behind the hero copy:

     0.0–1.0  near-black · blue atmosphere · crystal dust · a thin
              light beam crossing the dark
     1.0–2.5  the hero diamond enters from the far background,
              small, catching its first light
     2.5–4.0  it travels background → mid-right while a second
              stone crosses far behind it (real depth)
     4.0–5.6  the close pass: the diamond sweeps near the camera,
              the camera counter-orbits, facets flare (restrained)
     5.5–7.0  the ensemble arrives — small far diamond top-left,
              a mid stone lower-right, a distant silhouette, two
              soft crystal fragments at the foreground edges
     7.0–7.8  camera settles, hero diamond takes its final
              centre-right position, headline completes
     7.8–∞    seamless ambient loop: slow rotation, drifting
              secondaries, breathing beams, moving key light and
              environment reflections. No restart, no jump —
              everything ambient is a continuous function of time.

   The copy and CTAs are plain HTML above the canvas and are
   usable from the first moment. Scrolling never fights the
   visitor: any early scroll fast-forwards the timeline smoothly
   and the scene hands off to the story (dim, drift, parallax).

   Profiles: desktop = full scene · mobile = hero + 2 supporting
   stones, 1 beam, fewer particles, gentler camera. Reduced
   motion = the FINAL composition rendered once, no loop.

   Debug/test API: window.NGDHero3D = { setScroll, seek, state,
   debug } and the flags __NGD_HERO_MODE ('webgl'|'static'),
   __NGD_HERO_ANIMATED, __NGD_HERO_PROFILE, __NGD_HERO_PARALLAX,
   __NGD_HERO_INTRO ('pending'→'done').

   Fallback: the inline SVG inside the stage stays visible unless
   WebGL initialises (then .is-3d hides it). If this module fails
   to load or WebGL is unavailable, the SVG remains — no other
   page behaviour depends on this file.
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
    const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
    /** 0→1 across [a,b] with cinematic easing */
    const span = (t, a, b, ease) => (ease || easeInOut)(clamp01((t - a) / (b - a)));
    /** gaussian-ish bump centred on m, half-width w */
    const bump = (t, m, w) => Math.exp(-Math.pow((t - m) / w, 2));

    /** Piecewise Vector3 track: keys [[t,x,y,z],…], eased per segment. */
    function makeTrack(keys) {
      return function (t, out) {
        if (t <= keys[0][0]) return out.set(keys[0][1], keys[0][2], keys[0][3]);
        const last = keys[keys.length - 1];
        if (t >= last[0]) return out.set(last[1], last[2], last[3]);
        for (let i = 0; i < keys.length - 1; i++) {
          const a = keys[i], b = keys[i + 1];
          if (t >= a[0] && t <= b[0]) {
            const k = easeInOut((t - a[0]) / (b[0] - a[0]));
            return out.set(
              a[1] + (b[1] - a[1]) * k,
              a[2] + (b[2] - a[2]) * k,
              a[3] + (b[3] - a[3]) * k
            );
          }
        }
        return out;
      };
    }

    const SETTLE_T = 7.8;   // camera + hero at rest, __NGD_HERO_INTRO = 'done'

    /* ================= renderer / scene / camera ================= */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.06; // the sequence opens in near-darkness

    const scene = new THREE.Scene();
    /* depth haze — distant stones dissolve into midnight navy */
    scene.fog = new THREE.FogExp2(0x0a1020, 0.05);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.3, 6.4);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const envRotation = new THREE.Euler();
    const supportsEnvRotation = 'environmentRotation' in scene;

    /* ================= lighting (animated) ================= */
    /* champagne edge light — restrained, orbits very slowly */
    const warm = new THREE.PointLight(0xd9c08a, 7, 14);
    warm.position.set(2.6, 2.4, 2.4);
    scene.add(warm);

    /* ice-white / diamond-blue key — travels during the intro so the
       stone reads differently from second to second */
    const key = new THREE.DirectionalLight(0xcfe0ff, 1.1);
    key.position.set(-2.4, 3.2, 2.6);
    scene.add(key);

    /* faint cool fill so pavilions never go dead black */
    const fill = new THREE.PointLight(0x38508a, 3, 20);
    fill.position.set(-1.5, -1.8, 3.5);
    scene.add(fill);

    /* ================= gemstone material ================= */
    const profile = [
      new THREE.Vector2(0.012, -1.02), // culet
      new THREE.Vector2(0.70, -0.46),  // pavilion break
      new THREE.Vector2(1.00, -0.02),  // girdle bottom
      new THREE.Vector2(1.00, 0.12),   // girdle top
      new THREE.Vector2(0.82, 0.36),   // crown break
      new THREE.Vector2(0.56, 0.50),   // table edge
      new THREE.Vector2(0.012, 0.50)   // table centre
    ];
    const geometry = track(new THREE.LatheGeometry(profile, 16));

    const material = track(new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.88,
      ior: 2.42,
      thickness: 2.2,
      attenuationColor: new THREE.Color(0xf0debc),
      attenuationDistance: 1.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      iridescence: 0.28,
      iridescenceIOR: 1.9,
      specularIntensity: 1.2,
      envMapIntensity: 2.2,
      flatShading: true
    }));

    /* ================= hero diamond (travels the scene) ================= */
    const heroGroup = new THREE.Group();  // timeline position
    const tiltGroup = new THREE.Group();  // pointer parallax + scroll drift
    const spinGroup = new THREE.Group();  // continuous rotation
    tiltGroup.add(heroGroup);
    heroGroup.add(spinGroup);
    scene.add(tiltGroup);
    spinGroup.rotation.x = 0.10;

    const diamond = new THREE.Mesh(geometry, material);
    spinGroup.add(diamond);

    /* faded mirror reflection riding beneath the stone */
    const reflMaterial = track(material.clone());
    reflMaterial.transparent = true;
    reflMaterial.opacity = 0.08;
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

    /* hero path: far background → upper-right → close pass → centre-right.
       The final X/Y depend on the viewport (full-bleed canvas), so the
       last key is rewritten on resize. */
    const heroKeys = [
      [0.8,  1.4, 1.20, -11.0],
      [2.5,  2.4, 0.80,  -4.5],
      [4.0,  1.15, 0.35, -0.8],
      [4.9, -0.10, 0.08,  0.42],
      [5.6,  1.0, 0.30,   0.35],
      [SETTLE_T, 1.9, 0.42, -1.4]
    ];
    let heroTrack = makeTrack(heroKeys);

    /* ================= supporting stones ================= */
    function smallDiamondMaterial(tint, opts) {
      const m = track(material.clone());
      m.transparent = true;
      m.opacity = 0;
      if (tint) m.attenuationColor = new THREE.Color(tint);
      Object.assign(m, opts || {});
      return m;
    }

    const secondaries = [];
    function addSecondary(cfg) {
      const mesh = new THREE.Mesh(geometry, cfg.material);
      mesh.scale.setScalar(cfg.scale);
      mesh.position.copy(cfg.position);
      mesh.rotation.set(cfg.rx || 0.3, cfg.ry || 0, cfg.rz || 0.1);
      scene.add(mesh);
      secondaries.push(Object.assign({ mesh: mesh }, cfg));
      return mesh;
    }

    /* the early crosser — establishes depth while the hero approaches */
    const crosser = addSecondary({
      material: smallDiamondMaterial(0xdfe8ff),
      scale: 0.22,
      position: new THREE.Vector3(-5, 1.2, -6.5),
      spin: 0.34,
      float: 0.10,
      phase: 0.0,
      parallax: 0.35,
      appearAt: 2.3
    });

    /* lower-right mid stone — beneath and behind the hero's final seat */
    addSecondary({
      material: smallDiamondMaterial(0xf0debc),
      scale: isMobile ? 0.34 : 0.4,
      position: isMobile
        ? new THREE.Vector3(1.35, -1.5, -2.6)
        : new THREE.Vector3(3.4, -1.35, -3.0),
      spin: -0.14,
      float: 0.05,
      phase: 2.1,
      parallax: 0.6,
      appearAt: 5.8
    });

    if (!isMobile) {
      /* small far stone, high in the top-left corner, clear of the copy */
      addSecondary({
        material: smallDiamondMaterial(0xdfe8ff),
        scale: 0.3,
        position: new THREE.Vector3(-3.4, 1.9, -5.5),
        spin: 0.1,
        float: 0.07,
        phase: 4.2,
        parallax: 0.3,
        appearAt: 5.5
      });
      /* distant silhouette in the haze, between headline and hero stone */
      addSecondary({
        material: smallDiamondMaterial(0x2a3654, {
          transmission: 0.15, envMapIntensity: 0.5, iridescence: 0
        }),
        scale: 0.7,
        position: new THREE.Vector3(2.2, 1.0, -10),
        spin: 0.05,
        float: 0.03,
        phase: 1.3,
        parallax: 0.18,
        appearAt: 6.0
      });
    }

    /* ================= foreground crystal fragments ================= */
    const fragments = [];
    if (!isMobile) {
      const fragGeo = track(new THREE.IcosahedronGeometry(1, 0));
      const fragMat = track(material.clone());
      fragMat.transparent = true;
      fragMat.opacity = 0;
      fragMat.roughness = 0.32;         // soft = a cheap depth-blur read
      fragMat.transmission = 0.6;
      fragMat.envMapIntensity = 1.1;
      fragMat.depthWrite = false;
      [
        { p: new THREE.Vector3(-3.0, -0.95, 3.8), s: 0.5, spin: 0.06, phase: 0.7 },
        { p: new THREE.Vector3(3.15, 1.25, 3.5), s: 0.34, spin: -0.08, phase: 3.4 }
      ].forEach(function (cfg) {
        const mesh = new THREE.Mesh(fragGeo, fragMat);
        mesh.scale.setScalar(cfg.s);
        mesh.position.copy(cfg.p);
        scene.add(mesh);
        fragments.push(Object.assign({ mesh: mesh }, cfg));
      });
    }

    /* ================= sapphire light beams ================= */
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
      beams.push({ mesh: mesh, mat: mat, drift: i === 0 ? 0.22 : -0.16, base: i === 0 ? 0.16 : 0.1 });
    }

    /* ================= living backdrop ================= */
    function backdropTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(150, 96, 10, 128, 128, 190);
      g.addColorStop(0, '#16233f');
      g.addColorStop(0.45, '#0c1428');
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

    /* ================= crystal dust ================= */
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

    function makeCloud(count, size) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const radius = 1.6 + Math.random() * 2.4;
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius * 1.6;
        positions[i * 3 + 1] = -1.9 + Math.random() * 4.0;
        positions[i * 3 + 2] = Math.sin(angle) * radius * 0.8 - 1.5;
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = track(new THREE.PointsMaterial({
        size,
        map: sprite,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      }));
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      return points;
    }

    const cloudA = makeCloud(isMobile ? 24 : 64, 0.075);
    const cloudB = makeCloud(isMobile ? 16 : 44, 0.045);

    /* ================= camera path ================= */
    const camKeys = isMobile
      ? [
          [0.0, 0, 0.30, 6.3],
          [2.5, 0.12, 0.40, 5.7],
          [4.9, -0.25, 0.48, 5.45],
          [6.6, 0.12, 0.38, 5.05],
          [SETTLE_T, 0, 0.35, 4.9]
        ]
      : [
          [0.0, 0, 0.30, 6.4],
          [2.5, 0.25, 0.42, 5.6],
          [4.9, -0.55, 0.50, 5.35],
          [6.6, 0.30, 0.38, 5.05],
          [SETTLE_T, 0, 0.35, 4.9]
        ];
    const camTrack = makeTrack(camKeys);

    /* ================= responsive final composition ================= */
    function applyComposition() {
      const wide = camera.aspect > 1.05;
      /* wide: centre-right beside the copy · portrait: crown above it */
      heroKeys[heroKeys.length - 1] = wide
        ? [SETTLE_T, 1.9, 0.42, -1.4]
        : [SETTLE_T, 0, 1.62, -2.9];
      if (!wide) {
        heroKeys[3] = [4.9, -0.1, 0.30, 0.2]; // gentler pass on portrait
        heroKeys[4] = [5.6, 0.3, 0.70, -0.4];
      }
      heroTrack = makeTrack(heroKeys);
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

    /* ================= the timeline ================= */
    let seqT = 0;
    let scrollP = 0;
    let fastForward = false;
    let stillMode = false;      // catastrophic-renderer fallback: parked film
    let stillRenderQueued = false;
    window.__NGD_HERO_INTRO = 'pending';

    const scratch = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const heroWorld = new THREE.Vector3();

    function applyTimeline(t, ambientT) {
      /* --- exposure: darkness → brilliance, restrained flare on the pass --- */
      const rise = 0.05 + 0.13 * span(t, 0.0, 0.9) + 0.82 * span(t, 0.9, 2.3);
      const flare = 1 + 0.2 * bump(t, 4.9, 0.45);
      renderer.toneMappingExposure = 1.12 * rise * flare * (1 - scrollP * 0.5);

      /* --- hero diamond along its path --- */
      heroTrack(t, scratch);
      heroGroup.position.copy(scratch);
      heroGroup.position.y += Math.sin(ambientT * 0.6) * 0.035; // gentle float
      heroWorld.copy(heroGroup.position);

      /* rotation: lively while travelling, stately once settled. During
         the intro ambientT ≈ t, so the second term only takes over after
         the timeline freezes at SETTLE_T (or after a seek). */
      spinGroup.rotation.y =
        t * 0.42 + Math.max(0, ambientT - t) * 0.24 * (1 + scrollP * 1.8);

      /* --- camera --- */
      camTrack(t, scratch);
      camera.position.x = scratch.x;
      camera.position.y = scratch.y;
      camera.position.z = scratch.z - scrollP * 0.55; // scroll pushes us forward
      const focusW = 0.75 * span(t, 1.2, 4.2) * (1 - span(t, 5.6, SETTLE_T) * 0.8);
      lookTarget.set(0.4 * (1 - focusW), 0.32, 0).lerp(heroWorld, focusW);
      camera.lookAt(lookTarget);

      /* --- animated lighting --- */
      const sweep = span(t, 2.5, 5.5);
      const keyAngle = -1.1 + sweep * 2.1 + Math.sin(ambientT * 0.22) * 0.25;
      key.position.set(Math.sin(keyAngle) * 3.4, 2.6 + Math.sin(ambientT * 0.17) * 0.5, Math.cos(keyAngle) * 3.2);
      key.intensity = (0.9 + 0.5 * sweep + 0.9 * bump(t, 4.9, 0.5)) * (1 + Math.sin(ambientT * 0.31) * 0.12);
      warm.intensity = 5.5 + 2.5 * span(t, 1.0, 3.0) + Math.sin(ambientT * 0.27 + 1.3) * 0.8;
      if (supportsEnvRotation) {
        scene.environmentRotation.y = sweep * 1.25 + ambientT * 0.03;
      }

      /* --- supporting stones --- */
      for (let i = 0; i < secondaries.length; i++) {
        const s = secondaries[i];
        const vis = span(t, s.appearAt, s.appearAt + 1.1);
        s.material.opacity = vis * (s.mesh === crosser ? 0.85 : 0.95);
        s.mesh.visible = vis > 0.01;
        s.mesh.rotation.y = ambientT * s.spin + s.phase;
        s.mesh.position.y = s.position.y + Math.sin(ambientT * 0.4 + s.phase) * s.float
          + scrollP * s.parallax * 1.4;
      }
      /* the crosser travels laterally through the far background and
         exits frame-right rather than parking over the composition */
      const cross = span(t, 2.3, 6.5);
      crosser.position.x = -5 + cross * 12.2 + Math.sin(ambientT * 0.12) * 0.4;

      /* --- foreground fragments (soft, slow, edge-of-frame) --- */
      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i];
        f.mesh.material.opacity = 0.3 * span(t, 5.6, 7.0);
        f.mesh.rotation.x = ambientT * f.spin + f.phase;
        f.mesh.rotation.y = ambientT * f.spin * 1.7;
        f.mesh.position.y = f.p.y + Math.sin(ambientT * 0.18 + f.phase) * 0.22
          + scrollP * 1.2;
      }

      /* --- beams: a first crossing in the dark, then ambient breathing --- */
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        const first = bump(t, 0.9 + i * 0.5, 0.8) * 0.3;
        const ambient = b.base * span(t, 2.0, 4.0) * (0.7 + 0.3 * Math.sin(ambientT * 0.2 + i * 2.2));
        b.mat.opacity = (first + ambient) * (1 - scrollP);
      }

      /* --- dust: appears out of the dark, then keeps drifting --- */
      const dust = 0.25 + 0.75 * span(t, 0.2, 1.6);
      cloudA.material.opacity = (0.42 + Math.sin(ambientT * 1.1) * 0.2) * dust;
      cloudB.material.opacity = (0.38 + Math.sin(ambientT * 1.6 + 2.1) * 0.18) * dust;
      cloudA.rotation.y = ambientT * 0.02;
      cloudB.rotation.y = -ambientT * 0.028;
      const converge = 1.35 - 0.35 * span(t, 0.0, 6.0);
      cloudA.scale.setScalar(converge);
      cloudB.scale.setScalar(converge);

      /* --- scroll exit: dim, drift up, hand the diamond to the story --- */
      heroGroup.scale.setScalar(1 - scrollP * 0.16);
      tiltGroup.position.y = scrollP * 0.85;
      /* the mirror only reads once the stone reaches its resting place */
      reflection.material.opacity = 0.08 * span(t, 6.2, SETTLE_T) * (1 - scrollP * 0.5);
    }

    /* ================= public API ================= */
    window.NGDHero3D = {
      setScroll(p) {
        scrollP = Math.min(1, Math.max(0, p));
        /* never fight an early scroll: glide the intro to its end */
        if (scrollP > 0.03 && seqT < SETTLE_T) fastForward = true;
        /* in parked-still mode there is no loop — repaint per scroll,
           throttled to one frame */
        if (stillMode && !stillRenderQueued) {
          stillRenderQueued = true;
          requestAnimationFrame(function () {
            stillRenderQueued = false;
            renderFrame();
          });
        }
      },
      /** jump the cinematic timeline to `sec` (deterministic — tests, debug) */
      seek(sec) {
        seqT = Math.max(0, sec);
        ambientT = Math.max(ambientT, seqT); // ambient life continues from here
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
          secondaries: secondaries.length,
          fragments: fragments.length,
          beams: beams.length
        },
        secondaries: () => secondaries.map((s) => ({
          opacity: s.material.opacity,
          rotY: s.mesh.rotation.y,
          x: s.mesh.position.x
        }))
      },
      debug() {
        return {
          exposure: renderer.toneMappingExposure,
          hero: [heroGroup.position.x, heroGroup.position.y, heroGroup.position.z],
          camera: [camera.position.x, camera.position.y, camera.position.z],
          key: [key.position.x, key.position.y, key.position.z],
          spin: spinGroup.rotation.y
        };
      }
    };

    let ambientT = 0;
    function renderFrame() {
      applyTimeline(seqT, ambientT);
      renderer.render(scene, camera);
    }

    /* ================= reduced motion: final frame, no loop ================= */
    if (reducedMotion) {
      window.NGDHero3D.setScroll = function () {};
      window.NGDHero3D.seek = function () {};
      seqT = SETTLE_T + 1;
      ambientT = 3.2; // a pleasant resting phase for lights/float
      window.__NGD_HERO_INTRO = 'done';
      applyTimeline(seqT, ambientT);
      spinGroup.rotation.y = 0.65; // a pleasant facet angle for the still
      renderer.render(scene, camera);
      return;
    }

    /* ================= pointer parallax (fine pointers) =================
       Influence is eased in only after the camera settles, so the intro
       choreography is never disturbed. */
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
        targetTiltY = nx * 0.16;
        targetTiltX = ny * 0.09;
      });
      heroSection.addEventListener('pointerleave', function () {
        targetTiltX = 0;
        targetTiltY = 0;
      });
    }

    /* ================= animation loop ================= */
    let inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.02 }).observe(stage);
    }

    const clock = new THREE.Clock();
    window.__NGD_HERO_ANIMATED = true;

    /* graceful degradation on weak hardware: if frames stay slow,
       step the pixel ratio down once — permanently for the visit */
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
      /* the choreography follows WALL time — slow renderers drop
         frames rather than stretching the film (0.5s cap absorbs
         tab-hide resumes and giant hiccups) */
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

      /* catastrophic renderers (software GL, ancient GPUs): even the
         degraded scene blocks the page. Park the film on its settled
         final frame — the premium still — and free the main thread. */
      if (!stillMode) {
        heavyTime = dt > 0.25 ? heavyTime + dt : 0;
        if (heavyTime > 3.5) { enterStillMode(); return; }
      }

      /* while the visitor is scrolling the hero away, render at half
         rate — the exit stays smooth and the scroll keeps the budget */
      frameParity ^= 1;
      if (scrollP > 0.05 && scrollP < 0.98 && frameParity) return;

      if (seqT < SETTLE_T) {
        seqT += dt * (fastForward ? 6 : 1);
        if (seqT >= SETTLE_T) {
          seqT = SETTLE_T;
          ambientT = Math.max(ambientT, seqT); // fast-forwards land in live ambience
          window.__NGD_HERO_INTRO = 'done';
        }
      }

      applyTimeline(seqT, ambientT);

      /* beam drift (frame-rate independent) */
      for (let i = 0; i < beams.length; i++) {
        beams[i].mesh.position.x += beams[i].drift * dt * 0.4;
        if (beams[i].mesh.position.x > 6) beams[i].mesh.position.x = -6;
        if (beams[i].mesh.position.x < -6) beams[i].mesh.position.x = 6;
      }

      /* eased pointer influence after settle */
      const settleW = span(seqT, SETTLE_T - 0.8, SETTLE_T);
      tiltGroup.rotation.x += ((targetTiltX * settleW) - tiltGroup.rotation.x) * 0.05;
      tiltGroup.rotation.y += ((targetTiltY * settleW) - tiltGroup.rotation.y) * 0.05;

      renderer.render(scene, camera);
    });
  } catch (err) {
    /* Any setup failure → clean up and let the SVG fallback show */
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
