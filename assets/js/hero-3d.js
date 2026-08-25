/* ============================================================
   NEW GROWN DIAMOND — HOMEPAGE 3D HERO (Three.js, ES module)
   ------------------------------------------------------------
   Renders a faceted lab-grown diamond into [data-ngd-hero3d]:
     - lathe-cut brilliant silhouette with flat-shaded facets
     - studio reflections via Three's built-in RoomEnvironment
     - slow rotation + soft twin sparkle particle clouds
     - faded mirror reflection beneath the stone
     - pointer parallax on fine-pointer desktop only
     - reduced profile on mobile (fewer particles, lower DPR)
     - prefers-reduced-motion → single static frame, no loop
     - pauses when the tab is hidden or the hero is off-screen

   Fallback: the inline SVG inside the stage stays visible unless
   WebGL initialises (then .is-3d hides it). If this module fails
   to load (CDN blocked) or WebGL is unavailable, the SVG remains
   — no other page behaviour depends on this file.

   Debug/test flags: window.__NGD_HERO_MODE ('webgl'|'static'),
   __NGD_HERO_ANIMATED, __NGD_HERO_PROFILE, __NGD_HERO_PARALLAX.
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
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    console.warn('[NGD Hero] WebGL init failed — keeping static fallback.', err);
    return;
  }

  try {
    /* ---------- renderer / scene / camera ---------- */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(0, 0.35, 4.9);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    /* A faint warm accent so facets catch a champagne glint */
    const warm = new THREE.PointLight(0xd9c08a, 8, 12);
    warm.position.set(2.6, 2.4, 2.4);
    scene.add(warm);

    /* Blue-white key from the opposite side — the cool cinematic
       counterpart to the champagne rim, so facets read icy-bright
       on one flank and warm on the other as the stone turns. */
    const key = new THREE.DirectionalLight(0xcfe0ff, 1.15);
    key.position.set(-2.4, 3.2, 2.6);
    scene.add(key);

    /* ---------- the diamond (lathe-cut brilliant) ---------- */
    const profile = [
      new THREE.Vector2(0.012, -1.02), // culet
      new THREE.Vector2(0.70, -0.46),  // pavilion break
      new THREE.Vector2(1.00, -0.02),  // girdle bottom
      new THREE.Vector2(1.00, 0.12),   // girdle top
      new THREE.Vector2(0.82, 0.36),   // crown break
      new THREE.Vector2(0.56, 0.50),   // table edge
      new THREE.Vector2(0.012, 0.50)   // table centre
    ];
    const geometry = new THREE.LatheGeometry(profile, 16);

    const material = new THREE.MeshPhysicalMaterial({
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
    });

    const spinGroup = new THREE.Group();   // continuous slow rotation
    const tiltGroup = new THREE.Group();   // pointer parallax
    tiltGroup.add(spinGroup);
    scene.add(tiltGroup);

    const diamond = new THREE.Mesh(geometry, material);
    diamond.position.y = 0.42;
    spinGroup.add(diamond);
    spinGroup.rotation.x = 0.10;

    /* Faded mirror reflection below the stone */
    const reflMaterial = material.clone();
    reflMaterial.transparent = true;
    reflMaterial.opacity = 0.08;
    reflMaterial.transmission = 0.0;
    reflMaterial.color = new THREE.Color(0x8a8378);
    reflMaterial.roughness = 0.35;
    reflMaterial.envMapIntensity = 0.35;
    reflMaterial.iridescence = 0.0;
    reflMaterial.depthWrite = false;
    const reflection = new THREE.Mesh(geometry, reflMaterial);
    reflection.scale.y = -1;
    reflection.position.y = 0.42 - 2.16;
    spinGroup.add(reflection);

    /* ---------- soft sparkle particles (two twinkling clouds) ---------- */
    function makeSprite() {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,252,244,1)');
      g.addColorStop(0.35, 'rgba(233,214,167,0.55)');
      g.addColorStop(1, 'rgba(233,214,167,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    const sprite = makeSprite();

    function makeCloud(count, size) {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const radius = 1.5 + Math.random() * 1.25;
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = -1.7 + Math.random() * 3.6;
        positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size,
        map: sprite,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      return points;
    }

    const cloudA = makeCloud(isMobile ? 26 : 68, 0.075);
    const cloudB = makeCloud(isMobile ? 18 : 46, 0.045);

    /* ---------- sizing ---------- */
    function resize() {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        resize();
        if (reducedMotion) renderer.render(scene, camera);
      }).observe(stage);
    } else {
      window.addEventListener('resize', resize);
    }

    stage.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.classList.add('is-3d');
    window.__NGD_HERO_MODE = 'webgl';

    /* ---------- cinematic hooks (home-cinematic.js drives these) ----------
       setScroll(p): hero scroll progress 0→1 — the SAME diamond turns
       further, drifts upward and dims as the story begins, instead of
       simply vanishing behind the fold. */
    let scrollP = 0;
    window.NGDHero3D = {
      setScroll(p) { scrollP = Math.min(1, Math.max(0, p)); }
    };

    /* ---------- reduced motion: one still frame, no loop ---------- */
    if (reducedMotion) {
      window.NGDHero3D.setScroll = function () {}; // static frame stays put
      spinGroup.rotation.y = 0.65; // pleasant facet angle
      renderer.render(scene, camera);
      return;
    }

    /* ---------- opening sequence: from darkness to brilliance ----------
       ~2s once per visit: the scene fades up from near-black while the
       sparkle clouds converge and the stone grows to size. Purely
       visual — the copy and CTAs are HTML and stay usable throughout. */
    const INTRO_SECONDS = 2.0;
    let introT = 0;
    window.__NGD_HERO_INTRO = 'pending';
    const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, t), 3);

    /* ---------- pointer parallax (desktop, fine pointer only) ---------- */
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
        targetTiltY = nx * 0.22;
        targetTiltX = ny * 0.12;
      });
      heroSection.addEventListener('pointerleave', function () {
        targetTiltX = 0;
        targetTiltY = 0;
      });
    }

    /* ---------- animation loop (paused when hidden/off-screen) ---------- */
    let inView = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.02 }).observe(stage);
    }

    const clock = new THREE.Clock();
    window.__NGD_HERO_ANIMATED = true;

    renderer.setAnimationLoop(function () {
      if (document.hidden || !inView) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      /* opening sequence: darkness → converging sparkle → full presence */
      let intro = 1;
      if (introT < INTRO_SECONDS) {
        introT += dt;
        intro = easeOut(introT / INTRO_SECONDS);
        if (introT >= INTRO_SECONDS) window.__NGD_HERO_INTRO = 'done';
      }
      const converge = 1.65 - 0.65 * intro;   // clouds drift toward the stone
      cloudA.scale.setScalar(converge);
      cloudB.scale.setScalar(converge);
      spinGroup.scale.setScalar((0.7 + 0.3 * intro) * (1 - scrollP * 0.16));

      /* scroll handoff: extra turn, upward drift, dim toward the story */
      renderer.toneMappingExposure = 1.12 * (0.16 + 0.84 * intro) * (1 - scrollP * 0.5);
      tiltGroup.position.y = scrollP * 0.85;

      spinGroup.rotation.y += dt * 0.22 * (1 + scrollP * 1.8);  // slow rotation
      diamond.position.y = 0.42 + Math.sin(t * 0.6) * 0.035;    // gentle float
      reflection.position.y = (0.42 - 2.16) - Math.sin(t * 0.6) * 0.035;

      tiltGroup.rotation.x += (targetTiltX - tiltGroup.rotation.x) * 0.06;
      tiltGroup.rotation.y += (targetTiltY - tiltGroup.rotation.y) * 0.06;

      cloudA.rotation.y = t * 0.02;
      cloudB.rotation.y = -t * 0.028;
      cloudA.material.opacity = (0.45 + Math.sin(t * 1.1) * 0.22) * (0.3 + 0.7 * intro);
      cloudB.material.opacity = (0.40 + Math.sin(t * 1.6 + 2.1) * 0.2) * (0.3 + 0.7 * intro);

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
      renderer.dispose();
    } catch (_e) { /* ignore cleanup errors */ }
    stage.classList.remove('is-3d');
    window.__NGD_HERO_MODE = 'static';
    window.__NGD_HERO_ANIMATED = false;
  }
})();
