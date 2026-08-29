import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { createBrilliantGeometry } from './brilliantGeometry.js';
import { qualityTier } from './capability.js';

/**
 * A dark backdrop with a warm core, generated in-canvas.
 *
 * Transmission refracts whatever sits behind the mesh. With an empty scene
 * there is nothing to bend, and the stone renders flat however the material is
 * tuned. This gives the refraction something to work on, and fades to fully
 * transparent so the canvas leaves no seam over the page behind it.
 */
function Backdrop() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(232, 214, 178, 0.9)');
    g.addColorStop(0.14, 'rgba(120, 98, 62, 0.5)');
    g.addColorStop(0.32, 'rgba(34, 28, 20, 0.2)');
    g.addColorStop(0.58, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, 0, -2.4]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Stone({ pointer, onReady, tier }) {
  const mesh = useRef(null);
  const announced = useRef(false);
  const geometry = useMemo(() => createBrilliantGeometry(), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const node = mesh.current;
    if (!node) return;
    if (!announced.current) { announced.current = true; onReady?.(); }

    node.rotation.y += delta * 0.14;
    // Damped lean toward the pointer — the stone never snaps to the cursor.
    node.rotation.z += (pointer.current.x * 0.15 - node.rotation.z) * 0.045;
    node.rotation.x += (-0.3 + pointer.current.y * 0.1 - node.rotation.x) * 0.045;
  });

  return (
    <mesh ref={mesh} geometry={geometry} scale={1.15}>
      <meshPhysicalMaterial
        flatShading
        transmission={1}
        thickness={0.9}
        roughness={0}
        metalness={0}
        /* Diamond's real refractive index. This single number is most of why
           the material reads as diamond rather than as glass (1.5). */
        ior={2.417}
        /* Dispersion splits the refracted light into colour — the fire.
           Costly, so it is dropped on the low tier. */
        dispersion={tier === 'high' ? 5 : 0}
        reflectivity={1}
        /* No clearcoat: a polished diamond has no lacquer over it, and a
           clearcoat lays one uniform sheen across every facet at once. */
        clearcoat={0}
        envMapIntensity={3}
        attenuationDistance={6}
        attenuationColor={new THREE.Color('#fffdfa')}
        color={new THREE.Color('#ffffff')}
      />
    </mesh>
  );
}

/** Pauses rendering when the canvas is off-screen or the tab is hidden. */
function RenderGate({ active }) {
  const { invalidate, setFrameloop } = useThree();
  useEffect(() => {
    setFrameloop(active ? 'always' : 'never');
    if (active) invalidate();
  }, [active, invalidate, setFrameloop]);
  return null;
}

/** Disposes GPU resources on unmount rather than waiting for a GC that never comes. */
function Reclaim() {
  const { gl, scene } = useThree();
  useEffect(() => () => {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        Object.values(m).forEach((v) => v?.isTexture && v.dispose());
        m.dispose();
      });
    });
    gl.dispose();
  }, [gl, scene]);
  return null;
}

export default function DiamondScene({ onReady }) {
  const pointer = useRef({ x: 0, y: 0 });
  const wrap = useRef(null);
  const [active, setActive] = useState(true);
  const tier = useMemo(() => qualityTier(), []);

  useEffect(() => {
    const node = wrap.current;
    if (!node) return undefined;

    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting && !document.hidden),
      { threshold: 0.04 }
    );
    io.observe(node);

    const onVis = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);

    const onMove = (e) => {
      pointer.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.5, 7.4], fov: 30 }}
        dpr={[1, tier === 'high' ? 1.75 : 1.25]}
        gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
      >
        <RenderGate active={active} />
        <Reclaim />

        {/* Almost no direct light. A transmissive gem takes its appearance
            from what it reflects and refracts; diffuse light of any strength
            turns it into flat plaster. */}
        <ambientLight intensity={0.04} />

        {/* The environment IS the lighting: bright narrow bars separated by
            darkness, so adjacent facets return very different values. An
            evenly lit environment produces an evenly grey stone. Built from
            Lightformers in-engine — a drei `preset` would fetch a
            multi-megabyte HDR for a reflection nobody inspects. */}
        <Environment resolution={tier === 'high' ? 256 : 128} background={false}>
          <color attach="background" args={['#000000']} />
          <Lightformer intensity={22} position={[0, 4, 2]} scale={[8, 0.22, 1]} color="#ffffff" />
          <Lightformer intensity={16} position={[-3.5, 1, 3]} scale={[0.22, 5, 1]} color="#fff4e0" />
          <Lightformer intensity={12} position={[3.5, -1.5, 2]} scale={[0.22, 4, 1]} color="#ffe6bd" />
          <Lightformer intensity={10} position={[1.5, 2.5, -4]} scale={[4, 0.18, 1]} color="#c9a86a" />
          <Lightformer intensity={8} position={[-2, -3, -2]} scale={[3, 0.18, 1]} color="#9fb4ff" />
        </Environment>

        <Backdrop />
        <Stone pointer={pointer} onReady={onReady} tier={tier} />

        {/* Bloom only, only on the high tier, and deliberately restrained:
            a high threshold means only genuine facet flashes glow, so the
            stone gains fire without the whole hero going soft. */}
        {tier === 'high' && (
          <EffectComposer enableNormalPass={false}>
            <Bloom intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.3} mipmapBlur />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
