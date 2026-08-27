/* ============================================================
   NEW GROWN DIAMOND — FROM ONE ATOM (homepage scroll story)
   ------------------------------------------------------------
   A pinned scroll narrative in three acts, adapted from the
   supplied concept:

     MATTER   one carbon atom → diamond-cubic lattice → seed
     OBJECT   rough crystal builds upward → cut brilliant
     PROOF    the grading report fills itself in

   Everything derives from one number — the runway's scroll
   progress p — so nothing latches and scrolling back reverses
   the whole sequence exactly, certificate included.

   Engineering notes:
   · WebGL boots LAZILY (IntersectionObserver, 700px ahead) via
     a dynamic import('three'), so the rest of the homepage pays
     nothing until the section approaches, and a blocked module
     degrades to the DOM story over a gradient — never an error.
   · Uses the vendored GSAP + ScrollTrigger already on the page;
     native scrolling only (Auto Journey glides straight through,
     scrubbing the story en route).
   · Reduced motion: the finished composition, statically.
   Test API: window.NGDAtomStory = { seek(p), state, boot, debug }.
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('atom-story');
  if (!section) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pin = section.querySelector('.ngd-atom-pin');
  var canvas = section.querySelector('.ngd-atom-gl');
  var openEl = section.querySelector('[data-atom-open]');
  var closeEl = section.querySelector('[data-atom-close]');
  var cueEl = section.querySelector('.ngd-atom-cue');
  var nameEl = section.querySelector('[data-atom-name]');
  var scaleEl = section.querySelector('[data-atom-scale]');
  var trackEl = section.querySelector('[data-atom-track]');
  var markEls = Array.prototype.slice.call(section.querySelector('[data-atom-marks]').children);
  var certEl = section.querySelector('[data-atom-cert]');
  var certNo = section.querySelector('[data-atom-certno]');
  var certSeal = section.querySelector('[data-atom-seal]');
  var flds = Array.prototype.slice.call(section.querySelectorAll('.ngd-atom-fld'));

  var STAGES = [
    { at: 0.00, name: 'Carbon', scale: '0.15 nm' },
    { at: 0.12, name: 'Lattice', scale: '1.2 nm' },
    { at: 0.34, name: 'Seed plate', scale: '0.80 mm' },
    { at: 0.55, name: 'Rough crystal', scale: '7.0 mm' },
    { at: 0.72, name: 'Round Brilliant', scale: '6.5 mm' },
    { at: 0.88, name: 'Certified', scale: '1.02 ct' }
  ];

  var map = function (a, b, c, d, v) { return c + (d - c) * ((v - a) / (b - a)); };
  var clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };

  /* ---------------- WebGL (lazy, optional) ---------------- */
  var gl = null;      /* { renderer, scene, cam, gem, U, lattice, latMat } */
  var glWanted = false;
  var inView = true;
  var lastP = 0;

  function initGL() {
    if (gl || glWanted || reduced) return;
    glWanted = true;
    import('three').then(function (THREE) {
      try {
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        var scene = new THREE.Scene();
        var cam = new THREE.PerspectiveCamera(30, 1, 0.02, 200);
        cam.position.set(0, 0, 0.35);

        function size() {
          var w = pin.clientWidth || window.innerWidth;
          var h = pin.clientHeight || window.innerHeight;
          renderer.setSize(w, h, false);
          cam.aspect = w / h;
          cam.updateProjectionMatrix();
        }
        size();
        window.addEventListener('resize', size);

        /* the brilliant: six rings of vertices, fanned into facets */
        function brilliant(seg) {
          var rings = [
            { r: 0.44, y: 0.32, off: 0 }, { r: 0.78, y: 0.22, off: 0.5 },
            { r: 1, y: 0.02, off: 0 }, { r: 1, y: -0.05, off: 0 },
            { r: 0.6, y: -0.5, off: 0.5 }, { r: 0.18, y: -0.88, off: 0 }
          ];
          var st = (Math.PI * 2) / seg;
          var pt = function (R, i) {
            var a = (i + R.off) * st;
            return new THREE.Vector3(Math.cos(a) * R.r, R.y, Math.sin(a) * R.r);
          };
          var v = [];
          var push = function (a, b, c) { v.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); };
          var top = new THREE.Vector3(0, 0.32, 0);
          var i, r;
          for (i = 0; i < seg; i++) push(top, pt(rings[0], i), pt(rings[0], i + 1));
          for (r = 0; r < rings.length - 1; r++) {
            for (i = 0; i < seg; i++) {
              var a = pt(rings[r], i), b = pt(rings[r], i + 1);
              var c = pt(rings[r + 1], i), d = pt(rings[r + 1], i + 1);
              push(a, c, d); push(a, d, b);
            }
          }
          var cu = new THREE.Vector3(0, -0.98, 0);
          for (i = 0; i < seg; i++) push(pt(rings[5], i + 1), pt(rings[5], i), cu);
          var g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
          g.computeVertexNormals();
          return g;
        }

        var U = {
          uLight: { value: new THREE.Vector2(0, 0) },
          uFade: { value: 0 },
          uGrow: { value: 0 },
          uPolish: { value: 0 }
        };

        var gem = new THREE.Mesh(brilliant(16), new THREE.ShaderMaterial({
          uniforms: U, transparent: true, side: THREE.DoubleSide,
          vertexShader: [
            'uniform float uGrow;',
            'varying vec3 vN; varying vec3 vV; varying float vBuilt;',
            'void main(){',
            '  vec3 p = position;',
            /* every vertex lifts out of the seed plate when uGrow
               passes its own height threshold — the crystal builds
               upward in layers rather than inflating */
            '  float band = (p.y + 1.0) * 0.5;',
            '  float t = smoothstep(band*0.85, band*0.85 + 0.32, uGrow);',
            '  vBuilt = t;',
            '  p = mix(vec3(p.x*0.90, -0.07 + p.y*0.03, p.z*0.90), p, t);',
            '  vec4 w = modelMatrix*vec4(p,1.0);',
            '  vN = normalize(mat3(modelMatrix)*normal);',
            '  vV = normalize(cameraPosition - w.xyz);',
            '  gl_Position = projectionMatrix*viewMatrix*w;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'precision highp float;',
            'uniform vec2 uLight; uniform float uFade,uGrow,uPolish;',
            'varying vec3 vN; varying vec3 vV; varying float vBuilt;',
            'vec3 env(vec3 d){',
            '  float t=d.y*0.5+0.5;',
            '  vec3 room=mix(vec3(0.020,0.026,0.040),vec3(0.32,0.42,0.56),pow(t,1.5));',
            '  vec3 key=normalize(vec3(0.30+uLight.x*0.5,0.85,0.45+uLight.y*0.4));',
            '  vec3 fill=normalize(vec3(-0.70,0.20,-0.55));',
            '  return room+vec3(1.00,0.97,0.90)*pow(max(0.0,dot(d,key)),32.0)*6.0',
            '            +vec3(0.45,0.62,0.90)*pow(max(0.0,dot(d,fill)),10.0)*0.9;}',
            'void main(){',
            '  vec3 N=normalize(vN),V=normalize(vV);',
            '  if(!gl_FrontFacing)N=-N;',
            /* dispersion widens as the stone is polished */
            '  float s = 0.006 + uPolish*0.020;',
            '  float b = 1.0/2.418;',
            '  vec3 refr=vec3(env(refract(-V,N,b-s)).r,env(refract(-V,N,b)).g,env(refract(-V,N,b+s)).b);',
            '  vec3 refl=env(reflect(-V,N));',
            '  float f=pow(1.0-max(dot(N,V),0.0),3.2);',
            '  vec3 col=mix(refr,refl,clamp(f*0.9+0.10,0.0,1.0));',
            '  col+=vec3(1.0,0.98,0.94)*pow(max(0.0,dot(N,normalize(vec3(0.2,0.95,0.35)))),110.0)*2.8*uPolish;',
            '  col = mix(col*0.26 + vec3(0.085,0.10,0.12), col, uPolish);',
            /* a cool glow rides the growth front while material arrives */
            '  float front = smoothstep(0.18,0.0,abs(vBuilt-0.5)) * (1.0 - smoothstep(0.88,1.0,uGrow));',
            '  col += vec3(0.55,0.80,1.0) * front * 1.6;',
            '  gl_FragColor=vec4(col, vBuilt*uFade);',
            '}'
          ].join('\n')
        }));
        gem.scale.setScalar(0.02);
        scene.add(gem);

        /* diamond-cubic lattice: two interpenetrating cubic grids
           offset by a quarter cell — the offset that makes carbon
           a diamond rather than graphite */
        var pts = [];
        var x, y, z;
        for (x = -3; x <= 3; x++) for (y = -3; y <= 3; y++) for (z = -3; z <= 3; z++) {
          pts.push(x * 0.5, y * 0.5, z * 0.5);
          pts.push(x * 0.5 + 0.125, y * 0.5 + 0.125, z * 0.5 + 0.125);
        }
        var latGeo = new THREE.BufferGeometry();
        latGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        /* soft round sprite so the atoms glow instead of reading
           as square gl points */
        var dot = document.createElement('canvas');
        dot.width = dot.height = 64;
        var dctx = dot.getContext('2d');
        var grad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.35, 'rgba(255,255,255,0.7)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        dctx.fillStyle = grad;
        dctx.fillRect(0, 0, 64, 64);
        var latMat = new THREE.PointsMaterial({
          color: 0x9fd8ff, size: 0.05, transparent: true,
          map: new THREE.CanvasTexture(dot), alphaTest: 0.01,
          opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
        });
        var lattice = new THREE.Points(latGeo, latMat);
        scene.add(lattice);

        if (window.gsap) window.gsap.to(U.uFade, { value: 1, duration: 1.0, delay: 0.3 });
        else U.uFade.value = 1;

        section.addEventListener('pointermove', function (e) {
          var r = pin.getBoundingClientRect();
          U.uLight.value.set(((e.clientX - r.left) / r.width) * 2 - 1,
            -(((e.clientY - r.top) / r.height) * 2 - 1));
        });

        gl = { renderer: renderer, scene: scene, cam: cam, gem: gem, U: U, lattice: lattice, latMat: latMat };
        applyGL(lastP);
        if (window.gsap) {
          window.gsap.ticker.add(function () {
            if (inView && !document.hidden) renderer.render(scene, cam);
          });
        }
      } catch (err) {
        section.classList.add('ngd-atom-nogl');
      }
    }).catch(function () {
      section.classList.add('ngd-atom-nogl');
    });
  }

  /* ---------------- the narrative, from one number ---------------- */
  var setStyle = function (el, o) {
    if (o.opacity !== undefined) el.style.opacity = o.opacity;
    if (o.transform !== undefined) el.style.transform = o.transform;
  };

  function applyGL(p) {
    if (!gl) return;
    var z = p < 0.35 ? map(0, 0.35, 0.35, 2.60, p)
      : p < 0.72 ? map(0.35, 0.72, 2.60, 5.40, p)
        : 5.40;
    gl.cam.position.z += (z - gl.cam.position.z) * 0.14;
    gl.cam.position.x += ((p > 0.72 ? -0.75 : 0) - gl.cam.position.x) * 0.06;
    gl.cam.lookAt(gl.cam.position.x * 0.55, 0, 0);

    gl.latMat.opacity = p < 0.06 ? map(0, 0.06, 0, 0.95, p)
      : p < 0.40 ? 0.95
        : clamp01(map(0.40, 0.58, 0.95, 0, p));
    gl.lattice.rotation.y = p * 3.4;
    gl.lattice.rotation.x = p * 1.1;

    gl.U.uGrow.value = clamp01(map(0.30, 0.66, 0, 1, p));
    gl.U.uPolish.value = clamp01(map(0.66, 0.80, 0, 1, p));
    var s = Math.max(0.02, Math.min(1.05, map(0.28, 0.62, 0.02, 1.05, p)));
    gl.gem.scale.setScalar(s);
    gl.gem.rotation.y = p * Math.PI * 2.2;
    gl.gem.rotation.x = -0.08;
  }

  function frame(p) {
    lastP = p;

    /* stage readout */
    var si = 0, i;
    for (i = 0; i < STAGES.length; i++) if (p >= STAGES[i].at) si = i;
    markEls.forEach(function (m, j) { m.classList.toggle('on', j === si); });
    if (nameEl.textContent !== STAGES[si].name) {
      nameEl.textContent = STAGES[si].name;
      scaleEl.textContent = STAGES[si].scale;
      if (window.gsap && !reduced) {
        window.gsap.fromTo(nameEl, { autoAlpha: 0.2, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
      }
    }
    trackEl.style.width = (p * 100) + '%';

    applyGL(p);

    /* opening headline recedes */
    var openOut = clamp01(map(0.02, 0.16, 0, 1, p));
    setStyle(openEl, {
      opacity: String(1 - openOut),
      transform: 'translateY(' + (-openOut * 40) + 'px) scale(' + (1 + openOut * 0.12) + ')'
    });
    cueEl.style.opacity = String(1 - clamp01(map(0.02, 0.12, 0, 1, p)));

    /* certificate slides in and fills */
    var certIn = clamp01(map(0.70, 0.78, 0, 1, p));
    setStyle(certEl, { opacity: String(certIn), transform: 'translateY(-50%) translateX(' + ((1 - certIn) * 36) + 'px)' });

    var noT = clamp01(map(0.70, 0.80, 0, 1, p));
    certNo.textContent = noT < 0.02 ? 'IGI ———————'
      : 'IGI ' + String(Math.round(2441827 * noT)).padStart(7, '0');

    flds.forEach(function (f, j) {
      var start = 0.78 + j * 0.018;
      var on = p >= start;
      var v = f.querySelector('b');
      if (on && !f.classList.contains('done')) {
        f.classList.add('done');
        v.textContent = v.getAttribute('data-f');
      } else if (!on && f.classList.contains('done')) {
        f.classList.remove('done');
        v.textContent = '—';
      }
    });
    certSeal.style.opacity = String(clamp01(map(0.955, 0.985, 0, 1, p)));

    /* closing headline — its CTAs only accept the pointer once visible */
    var closeIn = clamp01(map(0.78, 0.86, 0, 1, p));
    setStyle(closeEl, { opacity: String(closeIn), transform: 'translateY(' + ((1 - closeIn) * 26) + 'px)' });
    closeEl.style.pointerEvents = closeIn > 0.55 ? 'auto' : 'none';
  }

  /* ---------------- wiring ---------------- */
  if (reduced || !window.gsap || !window.ScrollTrigger) {
    section.classList.add('ngd-atom-static');
    frame(1);
  } else {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.create({
      trigger: section.querySelector('.ngd-atom-runway'),
      start: 'top top', end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: function (self) { frame(self.progress); }
    });
    frame(0);

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) initGL();
      }, { rootMargin: '700px 0px' });
      io.observe(section);
    } else {
      initGL();
    }
  }

  window.NGDAtomStory = {
    /* seek = the SETTLED state at p: the camera lerp, which real
       scrolling converges across many scrub ticks, is run to rest */
    seek: function (p) {
      p = clamp01(p);
      frame(p);
      for (var k = 0; k < 48; k++) applyGL(p);
      return this.debug();
    },
    boot: function () { initGL(); },
    state: {
      progress: function () { return lastP; },
      booted: function () { return !!gl; },
      staticMode: function () { return section.classList.contains('ngd-atom-static'); }
    },
    debug: function () {
      return {
        p: lastP,
        stage: nameEl.textContent,
        scale: scaleEl.textContent,
        certNo: certNo.textContent,
        filled: flds.filter(function (f) { return f.classList.contains('done'); }).length,
        sealOpacity: parseFloat(certSeal.style.opacity || '0'),
        certOpacity: parseFloat(certEl.style.opacity || '0'),
        openOpacity: parseFloat(openEl.style.opacity || '1'),
        closeOpacity: parseFloat(closeEl.style.opacity || '0'),
        booted: !!gl,
        grow: gl ? gl.U.uGrow.value : null,
        polish: gl ? gl.U.uPolish.value : null,
        gemScale: gl ? gl.gem.scale.x : null,
        latticeOpacity: gl ? gl.latMat.opacity : null,
        camZ: gl ? gl.cam.position.z : null
      };
    }
  };
})();
