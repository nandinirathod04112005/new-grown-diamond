import * as THREE from 'three';

/**
 * A round brilliant, built to the proportions a cutter actually works to.
 *
 * Every dimension below is expressed as a fraction of the girdle diameter and
 * matches the "excellent" range on a GIA cut grade: 57% table, 34.5° crown
 * angle, 40.75° pavilion angle, 43.1% pavilion depth. The facet structure is
 * the real 57: one table, 8 stars, 8 bezels (kites), 16 upper girdles,
 * 8 pavilion mains and 16 lower girdles.
 *
 * That structure is the whole point. What makes a diamond read as a diamond is
 * not transparency — it is many small facets at slightly different angles,
 * each returning light separately. A smooth cone cannot do it at any material
 * setting; this can, because every facet gets its own normal from flat shading.
 *
 * ~130 triangles. The cost of this hero is the material, never the mesh.
 */
export function createBrilliantGeometry() {
  const R = 1;                    // girdle radius
  const TABLE = 0.57 * R;         // table spread
  const CROWN_H = 0.162 * R;      // crown height
  const GIRDLE_H = 0.03 * R;      // girdle thickness
  const PAV_D = 0.431 * R;        // pavilion depth
  const STAR = 0.55;              // star facets reach 55% out to the girdle
  const LOWER = 0.77;             // lower girdles reach 77% down to the culet

  const top = GIRDLE_H / 2;
  const bottom = -GIRDLE_H / 2;

  const at = (radius, angleDeg, y) => {
    const a = (angleDeg * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius);
  };

  // Crown
  const tableC = new THREE.Vector3(0, top + CROWN_H, 0);
  const T = [];   // table octagon vertices, on the main axes
  const U = [];   // star / bezel junctions, between the main axes
  for (let k = 0; k < 8; k += 1) {
    T.push(at(TABLE, k * 45, top + CROWN_H));
    const ur = TABLE + (R - TABLE) * STAR;
    U.push(at(ur, k * 45 + 22.5, top + CROWN_H * (1 - STAR)));
  }

  // Girdle: a 16-gon. G sits under each bezel, W between them.
  const G = [];
  const W = [];
  for (let k = 0; k < 8; k += 1) {
    G.push(at(R, k * 45, top));
    W.push(at(R, k * 45 + 22.5, top));
  }
  const Gb = G.map((v) => new THREE.Vector3(v.x, bottom, v.z));
  const Wb = W.map((v) => new THREE.Vector3(v.x, bottom, v.z));

  // Pavilion
  const culet = new THREE.Vector3(0, bottom - PAV_D, 0);
  const L = [];   // lower-girdle junctions, under each W
  for (let k = 0; k < 8; k += 1) {
    L.push(at(R * (1 - LOWER), k * 45 + 22.5, bottom - PAV_D * LOWER));
  }

  const positions = [];
  const tri = (a, b, c) =>
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const quad = (a, b, c, d) => {
    tri(a, b, c);
    tri(a, c, d);
  };

  const prev = (k) => (k + 7) % 8;
  const next = (k) => (k + 1) % 8;

  for (let k = 0; k < 8; k += 1) {
    // Table (8 wedges around the centre)
    tri(tableC, T[k], T[next(k)]);

    // Star facet: table edge outward to the bezel junction
    tri(T[k], T[next(k)], U[k]);

    // Bezel / kite: table vertex, both junctions, girdle
    quad(T[k], U[prev(k)], G[k], U[k]);

    // Upper girdle facets: junction down to the girdle, either side
    tri(U[k], G[k], W[k]);
    tri(U[k], W[k], G[next(k)]);

    // Girdle band
    quad(G[k], Gb[k], Wb[k], W[k]);
    quad(W[k], Wb[k], Gb[next(k)], G[next(k)]);

    // Pavilion main: girdle down to the culet, bounded by the lower girdles
    quad(Gb[k], L[prev(k)], culet, L[k]);

    // Lower girdle facets
    tri(Gb[k], Wb[k], L[k]);
    tri(Wb[k], Gb[next(k)], L[k]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.center();
  return geometry;
}

/** Deterministic value noise. Seeded so the rough crystal is the same shape
 *  on every load — a designed object, not a different lump each visit. */
function noise3(x, y, z, seed = 1) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 43.123) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The SAME brilliant, as it comes out of the reactor.
 *
 * Identical vertex count and ordering to the cut geometry, so the two are a
 * straight per-vertex lerp: the rough does not dissolve into the polished
 * stone, it is *cut down* to it. That one-to-one correspondence is the whole
 * reason the transition reads as cutting rather than as a cross-fade.
 *
 * Vertices are pushed outward along their own direction by a seeded noise
 * field, then flattened in bands, which is roughly what an as-grown CVD plate
 * looks like: blocky, stepped, opaque.
 */
export function createRoughPositions(cutGeometry) {
  const src = cutGeometry.getAttribute('position');
  const out = new Float32Array(src.count * 3);
  const v = new THREE.Vector3();

  for (let i = 0; i < src.count; i += 1) {
    v.fromBufferAttribute(src, i);
    const dir = v.clone().normalize();

    // Bands of growth, plus a coarse lump so no two sides match.
    //
    // Y stays mostly the vertex's own height. Quantising it outright collapses
    // many vertices onto the same plane, which turns neighbouring triangles
    // inside out and reads as a spiky mess rather than a blocky crystal — the
    // banding has to be a nudge, not a replacement.
    const band = Math.round(v.y * 3.2) / 3.2;
    const y = v.y * 0.72 + band * 0.28;
    const lump = noise3(Math.round(dir.x * 3), Math.round(dir.y * 3), Math.round(dir.z * 3), 7);

    const swell = 1.08 + lump * 0.2;
    out[i * 3] = v.x * swell + dir.x * 0.04;
    out[i * 3 + 1] = y * swell + dir.y * 0.03;
    out[i * 3 + 2] = v.z * swell + dir.z * 0.04;
  }
  return out;
}
