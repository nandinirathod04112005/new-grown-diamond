/**
 * Reading a supplier's CSV.
 *
 * KEPT OUT OF THE COMPONENT ON PURPOSE. A parser is the part of an import most
 * likely to be wrong and the easiest thing to check — and inside a React
 * component it can only be exercised by driving the whole admin screen, which
 * sits behind two separate locks. Here it can be run against the real file in
 * a second, which is how the quoted-measurement and BOM cases below were
 * found.
 */

/**
 * RFC 4180, which is what Excel actually writes: fields may be quoted, a quote
 * inside a quoted field is doubled, and a quoted field may contain commas and
 * newlines. A split on commas handles none of that, and a measurement column
 * like "13.83-13.97x8.61" is exactly where it would go wrong.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');   /* Excel writes a byte-order mark */

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

const NUMERIC = new Set(['carat', 'depth_percentage', 'table_percentage', 'ratio',
  'price_per_carat', 'total_price',
  'crown_angle', 'crown_height', 'pavilion_angle', 'pavilion_height']);
const BOOLEAN = new Set(['active', 'featured', 'price_visible']);

/** A cell, as the column it belongs to needs it. Blank means "not given" —
 *  null rather than an empty string, so the column keeps its own default. */
export function coerceCell(column, raw) {
  const value = (raw ?? '').trim();
  if (value === '') return null;
  if (NUMERIC.has(column)) {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (BOOLEAN.has(column)) return /^(true|yes|y|1)$/i.test(value);
  return value;
}
