import { FACETS } from './facets.js';

/**
 * A cut stone, drawn.
 *
 * Used wherever a shape has no photograph of a real stone behind it. The
 * silhouette in ShapeGlyph answers "which shape is this"; this answers "does
 * this look like a diamond", which is a different question and the one a
 * collection strip is actually asking.
 *
 * Everything here is static markup over precomputed geometry — see facets.js
 * for how the facet pattern is built. Nothing measures, nothing animates per
 * frame, and nine of these on one screen cost the same as nine images.
 *
 * `id` must be unique per instance: SVG gradient and filter references are
 * document-global, so two stones sharing an id would quietly share one
 * gradient and one of them would render wrong.
 */
export default function ShapeFacets({ shape, className, id, flat = false }) {
  const def = FACETS[shape] ?? FACETS.Round;
  const key = `sf-${id ?? shape}`;

  /*
   * `flat` renders the silhouette alone — one path instead of thirty-seven.
   *
   * For the blurred tray reflection under each stone, facet detail is spent
   * work: it is thrown away by the blur before anyone sees it. Drawing the
   * full pattern there doubled every card's path count and put a blur filter
   * over all of it, which cost 72 dropped frames out of 86 across the
   * traverse. The reflection of a bright object is a bright shape.
   */
  if (flat) {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
        <path d={def.o} fill="rgba(214, 232, 255, 0.5)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The stone's own body light — brightest under the table, falling off
            toward the girdle, so the facets sit in a lit object rather than on
            a flat card. */}
        <radialGradient id={`${key}-core`} cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#cfe6ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#5f7b9c" stopOpacity="0" />
        </radialGradient>

        {/* A single specular sweep across the crown. One highlight reads as one
            light source; several read as a mistake. */}
        <linearGradient id={`${key}-spec`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

      </defs>

      {/*
        No clip path.
        
        There was one here, and it was pure cost: the facets are ray-cast onto
        the outline so they cannot reach past it, and both gradient overlays
        are painted onto that same outline path. Clipping confined nothing and
        made the browser composite an extra mask over nine stones on every
        frame of the traverse.
      */}
      {def.f.map((f, i) => (
        <path key={i} d={f.d} fill={f.f} />
      ))}
      <path d={def.o} fill={`url(#${key}-core)`} />
      <path d={def.o} fill={`url(#${key}-spec)`} />

      {/* The girdle. Drawn last and unclipped so the outline stays crisp — a
          clipped stroke loses its outer half and the stone looks soft. */}
      <path
        d={def.o}
        fill="none"
        stroke="rgba(226, 240, 255, 0.72)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
