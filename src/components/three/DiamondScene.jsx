import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

import { createBrilliantGeometry } from './brilliantGeometry.js';

/**
 * A dark backdrop with a warm centre, generated in-canvas.
 *
 * Transmission refracts whatever sits behind the mesh. With an empty scene
 * there is nothing to refract and the stone renders flat however the material
 * is tuned. This plane gives the refraction something to bend, and stays
 * invisible against the page because its edges fall to near-black.
 */
function Backdrop() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // Fades to TRANSPARENT, not to black: the canvas sits over the page's own
    // warm black, and an opaque dark plane would print a hard rectangular
    // seam where the canvas column begins.
    grad.addColorStop(0, 'rgba(214, 184, 132, 0.95)');
    grad.addColorStop(0.16, 'rgba(120, 96, 58, 0.55)');
    grad.addColorStop(0.34, 'rgba(40, 32, 22, 0.22)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, 0, -2.2]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The stone itself. Slow rotation, plus a light lean toward the pointer. */
function Stone({ pointer, onReady }) {
  const mesh = useRef(null);
  const geometry = useMemo(() => createBrilliantGeometry({ segments: 16 }), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Tell the parent once a frame has genuinely been drawn, so the static
  // stone only fades out after there is something to replace it.
  const announced = useRef(false);

  useFrame((state, delta) => {
    const node = mesh.current;
    if (!node) return;
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
    node.rotation.y += delta * 0.18;
    // Damped tilt — never snaps to the cursor.
    node.rotation.z += (pointer.current.x * 0.16 - node.rotation.z) * 0.05;
    node.rotation.x += (-0.28 + pointer.current.y * 0.09 - node.rotation.x) * 0.05;
  });

  return (
    <mesh ref={mesh} geometry={geometry} scale={1.15}>
      <meshPhysicalMaterial
        flatShading
        transmission={1}
        thickness={0.9}
        roughness={0}
        metalness={0}
        /* Diamond's actual refractive index — the reason it looks like this. */
        ior={2.417}
        /* Dispersion is what throws the coloured fire off the facets. */
        dispersion={4.2}
        reflectivity={1}
        /* No clearcoat. A polished diamond has no lacquer layer over it, and
           a clearcoat lays a uniform sheen across every facet at once —
           precisely the flat, plaster-like veil we are trying to avoid. */
        clearcoat={0}
        envMapIntensity={3}
        attenuationDistance={6}
        attenuationColor={new THREE.Color('#fffdfa')}
        color={new THREE.Color('#ffffff')}
      />
    </mesh>
  );
}

/**
 * Pauses rendering whenever the canvas is off-screen or the tab is hidden.
 * A hero rendering at 60fps while the visitor reads the footer is pure drain.
 */
function RenderGate({ active }) {
  const { invalidate, setFrameloop } = useThree();
  useEffect(() => {
    setFrameloop(active ? 'always' : 'never');
    if (active) invalidate();
  }, [active, invalidate, setFrameloop]);
  return null;
}

export default function DiamondScene({ onReady }) {
  const pointer = useRef({ x: 0, y: 0 });
  const wrap = useRef(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const node = wrap.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting && !document.hidden),
      { threshold: 0.05 }
    );
    observer.observe(node);

    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    const onPointerMove = (event) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.5, 7.4], fov: 30 }}
        // Capping DPR is the single biggest GPU saving on retina displays.
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <RenderGate active={active} />

        {/*
          Almost no direct light. A transmissive gem gets its look from what it
          reflects and refracts, not from being lit: diffuse light of any
          strength turns a white physical material into a flat plaster blob,
          which is exactly what a bright ambient + directional rig produces.
        */}
        <ambientLight intensity={0.04} />

        {/*
          The environment IS the lighting. Bright narrow streaks separated by
          darkness are what make individual facets flash as the stone turns —
          a smooth, even environment gives an evenly grey stone.

          Built in-engine from Lightformers: a drei `preset` would fetch a
          multi-megabyte HDR from a CDN for a reflection nobody inspects.
        */}
        <Environment resolution={256} background={false}>
          {/* Mostly darkness, crossed by a few narrow bright bars. The
              contrast between them is the effect: adjacent facets return
              wildly different values, which is what the eye reads as fire.
              A softly lit environment returns an evenly grey stone. */}
          <color attach="background" args={['#000000']} />
          <Lightformer intensity={22} position={[0, 4, 2]} scale={[8, 0.22, 1]} color="#ffffff" />
          <Lightformer intensity={16} position={[-3.5, 1, 3]} scale={[0.22, 5, 1]} color="#fff4e0" />
          <Lightformer intensity={12} position={[3.5, -1.5, 2]} scale={[0.22, 4, 1]} color="#ffe6bd" />
          <Lightformer intensity={10} position={[1.5, 2.5, -4]} scale={[4, 0.18, 1]} color="#c4a672" />
          <Lightformer intensity={8} position={[-2, -3, -2]} scale={[3, 0.18, 1]} color="#9fb4ff" />
        </Environment>

        <Backdrop />
        <Stone pointer={pointer} onReady={onReady} />
      </Canvas>
    </div>
  );
}
