import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { createBrilliantGeometry } from '@/lib/three/brilliantGeometry.js';
import { createStudioEnvironment } from '@/lib/three/studioEnv.js';

/** Eased ramp between two scroll positions. */
function seg(x, a, b) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/*
 * Stage boundaries in scene progress, mirroring the vh weights in Process.jsx:
 * 40 lead, eight stages of 110, 50 out, over 970 total.
 */
const L = 0.041;
const S = [0.041, 0.155, 0.268, 0.381, 0.495, 0.608, 0.722, 0.835, 0.948];

/**
 * The manufacturing film.
 *
 * Lit like a product shot, not like a room. The earlier version put the
 * subject inside a lit grey box, which is what a technical viewport looks
 * like — the box filled the frame, the ambient light flattened everything, and
 * the stone was a speck in the middle. Here the chamber is implied by a dark
 * ground and fog instead of drawn, the ambient is almost nothing, and the
 * subject fills the frame with a hard key and a rim.
 *
 * One stone carries every stage and is POLISHED rather than swapped: roughness
 * falls and transmission rises across the final stages, which is what actually
 * happens on a wheel.
 */
function Film({ progressRef }) {
  const stone = useRef(null);
  const seedRef = useRef(null);
  const plasmaRef = useRef(null);
  const glowRef = useRef(null);
  const dust = useRef(null);
  const mat = useRef(null);
  const key = useRef(null);
  const smooth = useRef(0);
  const { invalidate, camera, scene } = useThree();

  const geometry = useMemo(() => createBrilliantGeometry(), []);
  const envTexture = useMemo(() => createStudioEnvironment(), []);

  // Fog does the work the box used to: it gives depth and hides the edges of
  // the world without ever drawing a wall.
  /* Three's scene graph is an imperative mutable object by design. */
  /* oxlint-disable react/immutability */
  useEffect(() => {
    const previous = scene.fog;
    scene.fog = new THREE.FogExp2('#07070a', 0.3);
    return () => {
      scene.fog = previous;
    };
  }, [scene]);
  /* oxlint-enable react/immutability */

  const dustGeo = useMemo(() => new THREE.SphereGeometry(0.022, 8, 8), []);
  const seeds = useMemo(() => {
    const rand = (n) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 90 }, (_, i) => ({
      x: (rand(i * 3 + 1) - 0.5) * 3.2,
      y: (rand(i * 3 + 2) - 0.5) * 2.4,
      z: (rand(i * 3 + 3) - 0.5) * 3.2,
      s: 0.4 + rand(i * 7 + 5) * 1.2,
      r: rand(i * 11 + 9) * Math.PI * 2,
    }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const sparkRef = useRef(null);

  // Sparks thrown off the wheel during cutting. Deterministic directions so the
  // burst is identical every load.
  const sparkSeeds = useMemo(() => {
    const rand = (n) => {
      const x = Math.sin(n * 57.3 + 91.7) * 27183.13;
      return x - Math.floor(x);
    };
    return Array.from({ length: 60 }, (_, i) => ({
      a: rand(i * 2 + 1) * Math.PI * 2,
      r: 0.45 + rand(i * 2 + 2) * 1.5,
      y: (rand(i * 5 + 3) - 0.35) * 1.1,
      sp: 0.5 + rand(i * 7 + 4) * 1.4,
      s: 0.5 + rand(i * 9 + 6) * 1.1,
    }));
  }, []);

  // Radial falloff, painted once. This is the difference between light and a
  // coloured circle.
  const glowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d').createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    const ctx = c.getContext('2d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.05);
    const target = progressRef.current?.sp ?? 0;
    smooth.current = THREE.MathUtils.lerp(smooth.current, target, 1 - Math.exp(-5 * step));
    const p = smooth.current;
    const t = state.clock.elapsedTime;

    const growth = seg(p, S[2], S[4]);   // plate -> full crystal
    const polish = seg(p, S[6], S[8]);   // rough -> brilliant
    const plasmaOn = seg(p, S[1], S[1] + 0.04) * (1 - seg(p, S[3], S[4]));
    const hpht = seg(p, S[3], S[3] + 0.05) * (1 - seg(p, S[4], S[4] + 0.05));

    if (stone.current && mat.current) {
      stone.current.visible = p > L;
      // Framed, not cropped. The girdle radius is 1, so world width is 2*size.
      // At fov 42 the visible width is 3.07 at distance 4, so a 0.95 cap keeps
      // the stone at ~62% of frame — product framing. The previous 1.4 made it
      // 2.8 wide inside a 1.77 frame and the stone was cut into abstract
      // shards by the frustum.
      const size = 0.55 + growth * 0.40;
      stone.current.scale.set(size, 0.12 + growth * 0.88, size);
      stone.current.rotation.y = t * 0.16 + p * 2.6;
      stone.current.rotation.x = 0.12 + seg(p, S[5], S[8]) * 0.24;
      stone.current.position.y = -0.28 + growth * 0.3;

      mat.current.roughness = 0.92 - polish * 0.92;
      mat.current.transmission = polish * 0.98;
      mat.current.thickness = polish * 1.9;
      mat.current.envMapIntensity = 1.6 + polish * 4.5;
      mat.current.emissiveIntensity = hpht * 1.6;
    }

    if (seedRef.current) {
      const on = seg(p, L, L + 0.03) * (1 - seg(p, S[2] + 0.04, S[3]));
      seedRef.current.visible = on > 0.01;
      seedRef.current.scale.setScalar(on * 1.25);
      seedRef.current.rotation.y = t * 0.16 + p * 2.6;
    }

    if (dust.current) {
      const on = seg(p, S[1], S[1] + 0.04) * (1 - seg(p, S[4], S[4] + 0.05));
      dust.current.visible = on > 0.01;
      const pull = seg(p, S[2], S[4]);
      for (let i = 0; i < seeds.length; i += 1) {
        const d = seeds[i];
        dummy.position.set(
          d.x * (1 - pull * 0.78),
          d.y * (1 - pull * 0.78) + Math.sin(t * 0.6 + d.r) * 0.08,
          d.z * (1 - pull * 0.78),
        );
        dummy.scale.setScalar(d.s * on);
        dummy.updateMatrix();
        dust.current.setMatrixAt(i, dummy.matrix);
      }
      dust.current.instanceMatrix.needsUpdate = true;
    }

    if (plasmaRef.current && glowRef.current) {
      const pulse = 1 + Math.sin(t * 1.9) * 0.06;
      plasmaRef.current.visible = plasmaOn > 0.01 || hpht > 0.01;
      // Violet through the CVD stages, amber under the press — the two routes
      // do not look alike, and the colour is how you tell them apart.
      const col = plasmaOn > hpht ? '#8b5cf6' : '#ff9d3c';
      plasmaRef.current.material.color.set(col);
      glowRef.current.material.color.set(col);
      const amt = Math.max(plasmaOn, hpht);
      // Both spheres must stay well inside the camera distance (2.3-2.75).
      // At the previous sizes the halo enclosed the camera, so the whole frame
      // filled with additive violet instead of the plasma sitting in the scene.
      plasmaRef.current.scale.setScalar((1.1 + amt * 0.7) * pulse);
      plasmaRef.current.material.opacity = amt * 0.62;
      glowRef.current.visible = plasmaRef.current.visible;
      glowRef.current.scale.setScalar((2.4 + amt * 1.2) * pulse);
      glowRef.current.material.opacity = amt * 0.22;
    }

    // Sparks fly only while the stone is being cut.
    if (sparkRef.current) {
      const cutting = seg(p, S[6], S[6] + 0.05) * (1 - seg(p, S[7] + 0.03, S[8]));
      sparkRef.current.visible = cutting > 0.01;
      for (let i = 0; i < sparkSeeds.length; i += 1) {
        const d = sparkSeeds[i];
        // Each spark loops outward on its own phase, so the burst is continuous
        // rather than one synchronised pulse.
        const life = ((t * d.sp) % 1.6) / 1.6;
        const reach = d.r * life;
        dummy.position.set(
          Math.cos(d.a) * reach,
          d.y * 0.4 + life * 0.5 - 0.1,
          Math.sin(d.a) * reach,
        );
        dummy.scale.setScalar(d.s * cutting * (1 - life) * 0.9);
        dummy.updateMatrix();
        sparkRef.current.setMatrixAt(i, dummy.matrix);
      }
      sparkRef.current.instanceMatrix.needsUpdate = true;
    }

    if (key.current) {
      key.current.intensity = 2.6 + seg(p, S[5], S[8]) * 3.4;
    }

    // Close, and orbiting. The subject stays large the whole way through.
    const orbit = p * Math.PI * 1.15 - 0.5;
    // Never closer than 3.5, so the subject always sits inside the frustum.
    const radius = 4.15 - seg(p, S[2], S[6]) * 0.65 + seg(p, S[8], 1) * 0.5;
    camera.position.set(
      Math.sin(orbit) * radius,
      0.42 + Math.sin(p * Math.PI) * 0.34 + seg(p, S[6], 1) * 0.85,
      Math.cos(orbit) * radius,
    );
    camera.lookAt(0, 0.02, 0);

    invalidate();
  });

  return (
    <>
      <color attach="background" args={['#07070a']} />
      <primitive attach="environment" object={envTexture} />

      {/* Almost no fill. The drama is in the key and the rim. */}
      <ambientLight intensity={0.22} />
      <directionalLight ref={key} position={[2.6, 3.4, 2]} intensity={2.6} />
      {/* Rim from behind separates the subject from the dark. */}
      <directionalLight position={[-2.4, 1.2, -3]} intensity={2.2} color="#9ec5ff" />
      <spotLight position={[0, 4, 0]} angle={0.6} penumbra={1} intensity={2.6} color="#fff2dc" />

      {/* The floor is implied by a reflection catcher, not a room. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#0c0d11" roughness={0.42} metalness={0.65} />
      </mesh>

      <mesh ref={seedRef} position={[0, -0.66, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.045, 6]} />
        <meshStandardMaterial color="#e6ecf6" roughness={0.16} metalness={0.5} />
      </mesh>

      <instancedMesh ref={dust} args={[dustGeo, undefined, 90]}>
        <meshBasicMaterial color="#c9dcff" transparent opacity={0.85} />
      </instancedMesh>

      <instancedMesh ref={sparkRef} args={[dustGeo, undefined, 60]}>
        <meshBasicMaterial color="#ffcf8a" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>

      {/* Core and halo, both additive, so the plasma actually radiates. */}
      <sprite ref={plasmaRef}>
        <spriteMaterial map={glowTex} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite ref={glowRef}>
        <spriteMaterial map={glowTex} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>

      <mesh ref={stone} geometry={geometry} position={[0, -0.28, 0]}>
        <meshPhysicalMaterial
          ref={mat}
          color="#d7dde8"
          emissive="#ff8a2b"
          emissiveIntensity={0}
          roughness={0.92}
          metalness={0}
          ior={2.42}
          reflectivity={1}
          clearcoat={1}
          clearcoatRoughness={0.06}
          flatShading
        />
      </mesh>

      {/*
        Bloom is what turns bright specular returns into light rather than
        clipped white, and the vignette holds the frame in the dark so there is
        never a visible edge to the world.
      */}
      <EffectComposer disableNormalPass>
        <Bloom intensity={0.62} luminanceThreshold={0.88} luminanceSmoothing={0.22} mipmapBlur />
        <Vignette offset={0.32} darkness={0.78} />
      </EffectComposer>
    </>
  );
}

export default function ProcessScene({ progressRef }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.7]}
      camera={{ fov: 42, position: [0, 0.42, 4.15] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <Film progressRef={progressRef} />
    </Canvas>
  );
}
