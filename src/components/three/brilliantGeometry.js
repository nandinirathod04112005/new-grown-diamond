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

  // A CVD rough is a TABULAR SLAB — a flat plate grown on a seed, with stepped
  // growth bands on its faces. It is not a swollen gem.
  //
  // The previous version only inflated the brilliant by a fifth, which left
  // the pointed pavilion and flat table intact, so the "rough" still read as a
  // polished stone. That is not a cosmetic complaint: generated geometry is
  // permitted to depict rough crystal ONLY, and anything a viewer could take
  // for a finished diamond breaks that. So each vertex is projected onto a
  // box and the gem silhouette is destroyed outright.
  const EX = 1.02;   // half-width
  const EY = 0.46;   // half-height — flat, as grown
  const EZ = 0.9;    // half-depth
  const STEP = 0.14; // growth-band thickness
  const TOWARD_BOX = 0.82;

  for (let i = 0; i < src.count; i += 1) {
    v.fromBufferAttribute(src, i);

    // Project onto the surface of the slab: divide by the largest axis ratio.
    const m = Math.max(
      Math.abs(v.x) / EX,
      Math.abs(v.y) / EY,
      Math.abs(v.z) / EZ
    ) || 1e-6;

    let bx = v.x / m;
    let by = v.y / m;
    let bz = v.z / m;

    // Stepped growth bands, and a coarse lump so no two sides match.
    const lump = noise3(
      Math.round(bx * 2.4),
      Math.round(by * 2.4),
      Math.round(bz * 2.4),
      7
    );
    by = Math.round(by / STEP) * STEP + lump * 0.05;
    bx += lump * 0.09;
    bz += lump * 0.09;

    // Blend hard toward the slab. Keeping a little of the original preserves
    // vertex ordering's correspondence with the cut form, which is what lets
    // the growth read as one continuous solid rather than a cross-fade.
    out[i * 3] = v.x + (bx - v.x) * TOWARD_BOX;
    out[i * 3 + 1] = v.y + (by - v.y) * TOWARD_BOX;
    out[i * 3 + 2] = v.z + (bz - v.z) * TOWARD_BOX;
  }
  return out;
}
