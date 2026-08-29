/** Presentation helpers. Pure, so they are trivially checkable. */

export function formatCarat(carat) {
  const n = Number(carat);
  return Number.isFinite(n) ? `${n.toFixed(2)} ct` : '—';
}

export function formatPrice(amount, currency = 'INR') {
  if (amount === null || amount === undefined || amount === '') return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** The one-line spec summary shown under a stone's name. */
export function diamondSpecLine(stone) {
  return [stone.color, stone.clarity, stone.cut, stone.laboratory]
    .filter(Boolean)
    .join(' · ');
}
