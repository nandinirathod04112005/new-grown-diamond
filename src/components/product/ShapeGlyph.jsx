/**
 * Outline glyph for each diamond shape, drawn as a single path per shape.
 * Used wherever a stone has no photograph yet, and in the shape navigation.
 */
const SHAPES = {
  Round: 'M50 6a44 44 0 1 1 0 88 44 44 0 0 1 0-88Z',
  Oval: 'M50 5c17 0 30 20 30 45S67 95 50 95 20 75 20 50 33 5 50 5Z',
  Emerald: 'M32 8h36l14 14v56L68 92H32L18 78V22L32 8Z',
  Pear: 'M50 5c14 16 27 27 27 46a27 27 0 0 1-54 0C23 32 36 21 50 5Z',
  Princess: 'M14 14h72v72H14z',
  Cushion: 'M30 10h40c11 0 20 9 20 20v40c0 11-9 20-20 20H30c-11 0-20-9-20-20V30c0-11 9-20 20-20Z',
  Radiant: 'M30 10h40l20 20v40L70 90H30L10 70V30L30 10Z',
  /* Asscher is a square step cut: the same cut corners as the radiant but
     deeper, on a true square. Without its own path it fell through to Round,
     which labels an octagon as a brilliant — the one thing a shape picker
     must never do. */
  Asscher: 'M36 10h28l26 26v28L64 90H36L10 64V36L36 10Z',
  Marquise: 'M50 5c16 14 26 30 26 45S66 81 50 95C34 81 24 65 24 50S34 19 50 5Z',
  Heart: 'M50 92C28 76 12 62 12 42a22 22 0 0 1 38-15 22 22 0 0 1 38 15c0 20-16 34-38 50Z',

  /*
   * The step cuts, calibrated shapes and fancies that appear on the size
   * charts. They are geometry rather than brilliants, and drawing them as
   * plain outlines is not a shortcut — a baguette IS a rectangle and a carré
   * IS a square, and the whole job of a glyph in a size table is to let
   * someone find the row by shape without reading every label.
   */
  'Rec Cushion': 'M22 18h56c9 0 16 7 16 16v32c0 9-7 16-16 16H22c-9 0-16-7-16-16V34c0-9 7-16 16-16Z',
  'Rec Radiant': 'M24 18h52l18 16v32L76 82H24L6 66V34L24 18Z',
  Baguette: 'M26 12h48v76H26z',
  'Tap Baguette': 'M34 12h32l10 76H24z',
  Carre: 'M22 22h56v56H22z',
  Trapezoid: 'M16 28h68l-12 44H28z',
  'Half Moon': 'M10 68h80a40 40 0 0 0-80 0Z',
  Bullet: 'M26 12h48v44L50 88 26 56z',
  'Tapered Bullet': 'M32 12h36l6 44L50 88 26 56z',
  Shield: 'M20 14h60v36c0 21-15 31-30 38-15-7-30-17-30-38z',
  Trilliant: 'M50 12 88 78H12z',
  Calf: 'M24 16h52l-6 42L50 88 30 58z',
  Hexagon: 'M50 8 88 30v40L50 92 12 70V30z',
};

export default function ShapeGlyph({ shape, className }) {
  const path = SHAPES[shape] ?? SHAPES.Round;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.45"
        transform="translate(50 50) scale(0.62) translate(-50 -50)"
      />
    </svg>
  );
}
