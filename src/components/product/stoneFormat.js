/**
 * How a stone's numbers are printed, in one place.
 *
 * The card and the detail view both show carat, price and proportions, and a
 * buyer comparing the two should never see 0.3 in one and 0.30 in the other.
 * Everything returns null for "nothing to show", so each caller decides for
 * itself whether that means a dash, a placeholder, or leaving the row out.
 */

const blank = (v) => v === null || v === undefined || v === '' || v === '—';

/** A value as stored, or null. The em dash the card mapper uses counts as empty. */
export const text = (v) => (blank(v) ? null : String(v));

/** Carat weight, always two places: 0.30, never 0.3. */
export function carat(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
}

/** A proportion stored as a plain number: 57 -> "57.0%", 61.55 -> "61.55%". */
export function percent(v) {
  if (blank(v)) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${Number.isInteger(n) ? n.toFixed(1) : String(Math.round(n * 100) / 100)}%`;
}

/** A length-to-width ratio, two places. */
export function ratio(v) {
  if (blank(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

/**
 * Money in the stone's own currency.
 *
 * A bad currency code in the table would make Intl throw and take the whole
 * card down with it, so a code it does not recognise is printed as written
 * beside the number instead.
 */
export function money(amount, currency = 'USD') {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    /* Rupees are grouped the Indian way — ₹1,23,456, not ₹123,456 — because
       that is how every buyer paying in rupees reads a number. */
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en', {
      style: 'currency',
      currency,
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString('en', { maximumFractionDigits: 2 })}`;
  }
}

/**
 * Several amounts in possibly several currencies, as one line: "₹1,23,456 +
 * $2,400". Amounts are NEVER converted — that would need an exchange rate this
 * site does not have, and a made-up rate on a price is worse than two numbers.
 * Returns null when nothing has a price.
 */
export function moneyTotals(entries) {
  const sums = new Map();
  for (const { amount, currency = 'USD' } of entries) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) continue;
    sums.set(currency, (sums.get(currency) ?? 0) + n);
  }
  if (sums.size === 0) return null;
  return [...sums].map(([currency, total]) => money(total, currency)).join(' + ');
}

