import { supabase } from '../client.js';
import { recordAudit } from './adminInsights.js';
import { adminUpdateDiamond } from './diamonds.js';

/**
 * Orders & Sales, for active admins, on the tables migration 0005 created.
 *
 * WHAT THE TABLES CARRY, as 0005 defines them (nothing here assumes more):
 *
 *   orders       id uuid · public_id text (ORD-XXXXXXXX, filled by a column
 *                default) · user_id uuid → auth.users · status text, CHECK in
 *                the six values below · currency text, CHECK ^[A-Z]{3}$,
 *                default INR · total_amount numeric(14,2) ≥ 0 · customer_note
 *                text · created_at · updated_at
 *   order_items  id bigint identity · order_id → orders ON DELETE CASCADE ·
 *                diamond_id → diamonds ON DELETE SET NULL · jewellery_id ·
 *                description text NOT NULL · carat numeric(8,2) ·
 *                unit_price numeric(14,2) ≥ 0 · quantity int > 0
 *
 * POLICIES. orders_admin_all and order_items_admin_all give an active admin
 * every verb; customers may only select their own rows. Nothing else is
 * needed and nothing else is asked for.
 *
 * WHAT NO TRIGGER DOES. 0005 has no trigger, so neither updated_at nor
 * total_amount maintains itself. This module writes both: updated_at on every
 * change, and total_amount as the sum of the lines at creation.
 *
 * MONEY IS HANDLED IN CENTS. numeric(14,2) arrives as a JSON number, and
 * adding those as floats drifts by fractions of a paisa across a month of
 * orders. Every sum here is an integer sum; division happens only at display.
 * Currencies are never converted and never added together.
 */

/** The orders table's own CHECK constraint, in its own order. Not a guess. */
export const ORDER_STATUSES = ['confirmed', 'invoiced', 'paid', 'shipped', 'delivered', 'cancelled'];

export const STATUS_LABEL = {
  confirmed: 'Confirmed',
  invoiced: 'Invoiced',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** The column default, so a new order starts where an SQL insert would. */
export const DEFAULT_CURRENCY = 'INR';
export const CURRENCY_PATTERN = /^[A-Z]{3}$/;
export const COMMON_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'HKD', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY'];

/** numeric(14,2): twelve digits before the point. */
export const MAX_CENTS = 99_999_999_999_999;

const ORDER_COLUMNS = 'id,public_id,user_id,status,currency,total_amount,customer_note,created_at,updated_at';
const ITEM_COLUMNS = 'id,order_id,diamond_id,jewellery_id,description,carat,unit_price,quantity';
const PROFILE_COLUMNS = 'id,full_name,company_name,email,phone,country,role,account_status';
const DIAMOND_COLUMNS = 'id,public_id,stock_number,shape,carat,color,clarity,availability,total_price,currency,archived_at';
const JEWELLERY_COLUMNS = 'id,public_id,sku,product_name,category';

/* ---------------- helpers ---------------- */

const uniq = (list) => [...new Set(list.filter(Boolean))];

/** The same test as queries/adminInsights.js: a missing table is a state, not a fault. */
function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

function explain(error, what) {
  if (isMissingTable(error)) return `The ${what} table is not on this project.`;
  if (error?.code === '42501' || /row-level security|permission denied/i.test(error?.message ?? '')) {
    return `This account is not allowed to read ${what}.`;
  }
  return error?.message || `${what} could not be read.`;
}

/** A sentence for a refused write, with the database's own words kept. */
function explainWrite(error) {
  const msg = error?.message ?? '';
  if (error?.code === '23503' && /user_id/.test(msg)) {
    return 'That customer has no sign-in account behind the profile, so an order cannot be attached to it.';
  }
  if (error?.code === '23514') return `The database refused a value: ${msg}`;
  if (error?.code === '42501' || /row-level security/i.test(msg)) return 'This account is not allowed to write orders.';
  return msg || 'The database refused the change.';
}

/*
 * Read a whole table in pages — PostgREST stops at max-rows (1,000 by
 * default) without saying so, and a sales total that silently omits the
 * thousand-and-first order is worse than no total. Ordered on stable keys so
 * the pages cannot shift while someone inserts underneath the read.
 */
async function readAll(table, columns, orderBy) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns);
    for (const key of orderBy) q = q.order(key, { ascending: true });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** Rows by id, in URL-safe chunks. An empty map plus the reason when refused. */
async function lookup(table, ids, columns) {
  const map = new Map();
  if (!ids.length) return { map, error: null };
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from(table).select(columns).in('id', ids.slice(i, i + 100));
    if (error) {
      console.error(`[NGD Admin] ${table} lookup failed:`, error);
      return { map, error: explain(error, table) };
    }
    (data ?? []).forEach((r) => map.set(r.id, r));
  }
  return { map, error: null };
}

/** A search term made safe for a PostgREST or() filter: its separators removed. */
function cleanTerm(term, max = 60) {
  return String(term ?? '').replace(/[,()"'\\*%:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* ---------------- money ---------------- */

export const toCents = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/**
 * "12,500" or "12500.5" as typed → 1250050 cents; null when it is not an
 * amount the column can hold. Commas and spaces are allowed as separators;
 * more than two decimals is refused rather than rounded behind the typist's
 * back.
 */
export function parseAmount(text) {
  const s = String(text ?? '').replace(/[\s,]/g, '');
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** A carat weight for numeric(8,2), or null for blank, or NaN when invalid. */
export function parseCarat(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(s)) return Number.NaN;
  return Math.round(Number(s) * 100) / 100;
}

/**
 * An amount in its own currency, with the ISO code rather than a symbol —
 * "$" is four different currencies on a B2B desk, "USD" is one. Indian
 * grouping for rupees, the reader's own for everything else.
 */
export function formatMoney(cents, currency, { exact = false } = {}) {
  const c = Number(cents) || 0;
  const value = c / 100;
  const min = exact || c % 100 !== 0 ? 2 : 0;
  const locale = currency === 'INR' ? 'en-IN' : undefined;
  try {
    return value.toLocaleString(locale, {
      style: 'currency',
      currency: currency || DEFAULT_CURRENCY,
      currencyDisplay: 'code',
      minimumFractionDigits: min,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${currency ?? ''} ${value.toLocaleString(locale, { minimumFractionDigits: min, maximumFractionDigits: 2 })}`.trim();
  }
}

/** "HJH-777 · 0.23 ct Round · D FL" — the form 0005's own example uses. */
export function diamondLine(d) {
  if (!d) return '';
  const carat = Number(d.carat);
  return [
    d.stock_number || d.public_id,
    Number.isFinite(carat) && carat > 0 ? `${carat.toFixed(2)} ct ${d.shape ?? ''}`.trim() : d.shape,
    [d.color, d.clarity].filter(Boolean).join(' '),
  ].filter(Boolean).join(' · ');
}

/* ---------------- reading ---------------- */

/**
 * Every order, newest first, with its lines, its customer and its stones.
 *
 * Related rows are fetched by id rather than embedded, for the reason
 * adminQueues.js gives: an in() read cannot break on a constraint-naming
 * guess, and each one fails on its own — an unreadable profiles table leaves
 * the orders on screen with the customer column saying why.
 *
 * `items` is null (not []) when order_items could not be read, so the screen
 * shows a dash rather than claiming an order has no lines.
 */
export async function loadOrders() {
  if (!supabase) {
    return { ok: false, missing: false, error: 'Not connected to the database.', rows: [], related: {} };
  }

  let orders;
  try {
    orders = await readAll('orders', ORDER_COLUMNS, ['created_at', 'id']);
  } catch (error) {
    console.error('[NGD Admin] orders unavailable:', error);
    return { ok: false, missing: isMissingTable(error), error: explain(error, 'orders'), rows: [], related: {} };
  }
  orders.reverse(); // newest first; paged ascending for stability

  let items = null;
  let itemsError = null;
  try {
    items = await readAll('order_items', ITEM_COLUMNS, ['id']);
  } catch (error) {
    console.error('[NGD Admin] order items unavailable:', error);
    itemsError = explain(error, 'order items');
  }

  const lines = items ?? [];
  const [people, stones, pieces] = await Promise.all([
    lookup('profiles', uniq(orders.map((o) => o.user_id)), PROFILE_COLUMNS),
    lookup('diamonds', uniq(lines.map((l) => l.diamond_id)), DIAMOND_COLUMNS),
    lookup('jewellery', uniq(lines.map((l) => l.jewellery_id)), JEWELLERY_COLUMNS),
  ]);

  const byOrder = new Map();
  for (const line of lines) {
    const full = {
      ...line,
      unit_cents: toCents(line.unit_price),
      diamond: stones.map.get(line.diamond_id) ?? null,
      piece: pieces.map.get(line.jewellery_id) ?? null,
    };
    if (!byOrder.has(line.order_id)) byOrder.set(line.order_id, []);
    byOrder.get(line.order_id).push(full);
  }

  const rows = orders.map((o) => {
    const customer = people.map.get(o.user_id) ?? null;
    const own = items ? byOrder.get(o.id) ?? [] : null;
    return {
      ...o,
      customer,
      items: own,
      item_count: own ? own.length : null,
      pieces: own ? own.reduce((s, l) => s + (Number(l.quantity) || 0), 0) : null,
      total_cents: toCents(o.total_amount),
      /* Flat copies for the table's in-memory search, which reads plain keys. */
      customer_name: customer?.full_name ?? '',
      customer_email: customer?.email ?? '',
      customer_company: customer?.company_name ?? '',
      stock_numbers: own ? own.map((l) => l.diamond?.stock_number).filter(Boolean).join(' ') : '',
      descriptions: own ? own.map((l) => l.description).join(' ') : '',
    };
  });

  return {
    ok: true,
    missing: false,
    error: null,
    rows,
    related: { items: itemsError, profiles: people.error, diamonds: stones.error, jewellery: pieces.error },
  };
}

/**
 * The summary strip, computed from the rows already loaded.
 *
 * Cancelled orders count towards nothing. "This month" is the calendar month
 * in the reader's own time zone. Revenue and the average are per currency —
 * rupees and dollars are listed side by side, never summed.
 */
export function summarise(rows, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const inMonth = (r) => r.created_at && new Date(r.created_at) >= monthStart;
  const live = rows.filter((r) => r.status !== 'cancelled');
  const month = live.filter(inMonth);

  const byCurrency = (list) => {
    const m = new Map();
    for (const r of list) {
      const cur = r.currency || '—';
      const g = m.get(cur) ?? { cents: 0, count: 0 };
      g.cents += r.total_cents;
      g.count += 1;
      m.set(cur, g);
    }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
  };

  const all = byCurrency(live);
  return {
    monthLabel: monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    monthCount: month.length,
    monthCancelled: rows.filter((r) => r.status === 'cancelled' && inMonth(r)).length,
    monthRevenue: byCurrency(month),
    allRevenue: all,
    average: all.map(([cur, g]) => [cur, Math.round(g.cents / g.count), g.count]),
    liveCount: live.length,
    cancelledCount: rows.length - live.length,
  };
}

/* ---------------- writing ---------------- */

const label = (order) => order.public_id ?? String(order.id);

/**
 * An update that touched no row is not a success. RLS answers a refused
 * update with an empty result rather than an error, so the row count is
 * checked and a zero is reported as the refusal it is.
 */
async function updateOrder(order, values) {
  if (!supabase) throw new Error('Not connected to the database.');
  const { data, error } = await supabase
    .from('orders')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', order.id)
    .select('id');
  if (error) throw new Error(explainWrite(error));
  if (!data?.length) throw new Error('Nothing was changed — the order is gone, or this account may not edit it.');
}

/** Move an order to another of the table's six statuses. */
export async function setOrderStatus(order, status) {
  if (!ORDER_STATUSES.includes(status)) throw new Error(`“${status}” is not a status the orders table accepts.`);
  await updateOrder(order, { status });
  await recordAudit({
    action: 'status_change',
    entityType: 'order',
    entityId: label(order),
    entityLabel: `${label(order)} · ${formatMoney(order.total_cents ?? toCents(order.total_amount), order.currency)}`,
    changes: { status: [order.status ?? null, status] },
  });
}

/**
 * The customer-visible note. The audit entry records THAT it changed, never
 * what it says — free text does not go into a log that is kept for a year.
 */
export async function setOrderNote(order, text) {
  const next = String(text ?? '').trim() || null;
  await updateOrder(order, { customer_note: next });
  await recordAudit({
    action: 'update',
    entityType: 'order',
    entityId: label(order),
    entityLabel: label(order),
    changes: { customer_note: [order.customer_note ? 'written' : null, next ? 'written' : null] },
  });
}

/**
 * Create an order and its lines.
 *
 * `items`: [{ diamond_id?, description, carat (number|null), unit_cents,
 * quantity }]. The total is computed here from those lines — never taken from
 * the caller — and written as total_amount, which the table requires.
 *
 * TWO INSERTS, NOT ONE TRANSACTION. PostgREST cannot wrap them together from
 * the browser, so if the lines are refused the order just created is deleted
 * again (admins have delete through orders_admin_all; its lines, if any got
 * in, cascade). No half order is left behind — and if even that delete is
 * refused, the error names the reference so it can be removed by hand.
 */
export async function createOrder({ customer, status = 'confirmed', currency = DEFAULT_CURRENCY, note = '', items = [] }) {
  if (!supabase) throw new Error('Not connected to the database.');
  if (!customer?.id) throw new Error('Choose the customer the order is for.');
  if (!ORDER_STATUSES.includes(status) || status === 'cancelled') throw new Error('Choose a starting status.');
  if (!CURRENCY_PATTERN.test(currency)) throw new Error('The currency must be a three-letter code such as INR or USD.');
  if (!items.length) throw new Error('Add at least one line.');

  const lines = items.map((item) => {
    const qty = Number(item.quantity);
    const unit = Number(item.unit_cents);
    if (!String(item.description ?? '').trim()) throw new Error('Every line needs a description.');
    if (!Number.isInteger(unit) || unit < 0 || unit > MAX_CENTS) throw new Error('Every line needs a valid unit price.');
    if (!Number.isInteger(qty) || qty < 1) throw new Error('Every quantity must be a whole number of at least 1.');
    return {
      diamond_id: item.diamond_id ?? null,
      jewellery_id: item.jewellery_id ?? null,
      description: String(item.description).trim(),
      carat: item.carat == null || Number.isNaN(item.carat) ? null : item.carat,
      unit_cents: unit,
      quantity: qty,
    };
  });

  const totalCents = lines.reduce((s, l) => s + l.unit_cents * l.quantity, 0);
  if (totalCents > MAX_CENTS) throw new Error('The total is larger than the orders table can hold.');

  const payload = {
    user_id: customer.id,
    status,
    currency,
    total_amount: totalCents / 100,
    customer_note: String(note ?? '').trim() || null,
  };

  /* public_id is drawn by a column default; on the one-in-billions collision
     the insert is simply tried again and the default draws a new one. */
  let order = null;
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    const { data, error } = await supabase.from('orders').insert(payload).select('id,public_id,created_at').single();
    if (!error) order = data;
    else if (error.code !== '23505') throw new Error(explainWrite(error));
  }
  if (!order) throw new Error('A unique order reference could not be allocated. Try again.');

  const { error: linesError } = await supabase.from('order_items').insert(lines.map((l) => ({
    order_id: order.id,
    diamond_id: l.diamond_id,
    jewellery_id: l.jewellery_id,
    description: l.description,
    carat: l.carat,
    unit_price: l.unit_cents / 100,
    quantity: l.quantity,
  })));

  if (linesError) {
    console.error('[NGD Admin] order lines refused:', linesError);
    const { error: undoError } = await supabase.from('orders').delete().eq('id', order.id);
    if (undoError) {
      console.error('[NGD Admin] could not remove the empty order:', undoError);
      throw new Error(
        `The lines could not be saved (${explainWrite(linesError)}), and order ${order.public_id} `
        + `could not be removed automatically (${undoError.message}). Delete ${order.public_id} `
        + 'in the Supabase Table Editor before trying again.',
      );
    }
    throw new Error(`The lines could not be saved, so the order was not kept. ${explainWrite(linesError)}`);
  }

  await recordAudit({
    action: 'create',
    entityType: 'order',
    entityId: order.public_id,
    entityLabel: `${order.public_id} · ${formatMoney(totalCents, currency)}`,
    /* A summary of the sale, never the customer or the note. */
    changes: {
      status: [null, status],
      currency: [null, currency],
      total_amount: [null, totalCents / 100],
      lines: [null, lines.length],
      diamonds: [null, lines.filter((l) => l.diamond_id).length],
    },
  });

  return { ...order, status, currency, total_cents: totalCents };
}

/* ---------------- lookups for the form ---------------- */

/** Accounts whose name, email or company contains the term. At most twenty. */
export async function searchCustomers(term) {
  if (!supabase) throw new Error('Not connected to the database.');
  const q = cleanTerm(term);
  if (q.length < 2) return [];
  const p = `%${q}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .or(`full_name.ilike.${p},email.ilike.${p},company_name.ilike.${p}`)
    .order('full_name', { ascending: true, nullsFirst: false })
    .limit(20);
  if (error) throw new Error(explain(error, 'customer accounts'));
  return data ?? [];
}

/** Stones whose stock number (or DIA- reference) contains the term. */
export async function searchDiamonds(term) {
  if (!supabase) throw new Error('Not connected to the database.');
  const q = cleanTerm(term, 40);
  if (q.length < 2) return [];
  const p = `%${q}%`;
  const { data, error } = await supabase
    .from('diamonds')
    .select(DIAMOND_COLUMNS)
    .or(`stock_number.ilike.${p},public_id.ilike.${p}`)
    .order('stock_number', { ascending: true })
    .limit(12);
  if (error) throw new Error(explain(error, 'diamonds'));
  return data ?? [];
}

/**
 * Orders — other than cancelled ones — that already include this stone.
 * A warning for the form, not a block: the desk may be recording a correction.
 * `{ ok: false }` when it could not be checked, so the form says so.
 */
export async function findOrdersForDiamond(diamondId) {
  if (!supabase || !diamondId) return { ok: false, orders: [] };
  const { data: lines, error } = await supabase.from('order_items').select('order_id').eq('diamond_id', diamondId).limit(20);
  if (error) return { ok: false, orders: [] };
  const ids = uniq((lines ?? []).map((l) => l.order_id));
  if (!ids.length) return { ok: true, orders: [] };
  const { data: orders, error: e2 } = await supabase.from('orders').select('id,public_id,status').in('id', ids);
  if (e2) return { ok: false, orders: [] };
  return { ok: true, orders: (orders ?? []).filter((o) => o.status !== 'cancelled') };
}

/**
 * Mark a stone Sold — through adminUpdateDiamond, the same write the Diamonds
 * editor makes, so it passes the same policy and lands in the audit log the
 * same way (as an update of availability, before → after). Offered by the
 * screens, never done as a side effect of saving an order.
 */
export async function markDiamondSold(diamond) {
  if (!diamond?.id) throw new Error('That stone is no longer in the inventory.');
  await adminUpdateDiamond(diamond.id, { availability: 'Sold' }, {
    previous: { availability: diamond.availability ?? null },
    publicId: diamond.public_id,
    label: diamond.stock_number,
  });
}
