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
  Marquise: 'M50 5c16 14 26 30 26 45S66 81 50 95C34 81 24 65 24 50S34 19 50 5Z',
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
