import { supabase } from '../client.js';
import { formatMoney, toCents } from './adminOrders.js';
import { FEEDBACK_PREFIX } from './feedback.js';
import { ARTICLE_PREFIX } from './submissions.js';

/**
 * The admin inbox: what arrived recently, read LIVE from the tables it
 * arrived in.
 *
 * WHY NOT FROM public.notifications. Nothing writes arrivals to that table,
 * and nothing a visitor does can: its insert policy is admin-only, so a
 * guest's enquiry cannot drop a row in it. Reading the source tables directly
 * is therefore the only complete picture — an enquiry is in the inbox because
 * it is in enquiries, not because something remembered to copy it.
 *
 * WHAT public.notifications IS USED FOR: read markers. Marking an item read
 * inserts one row —
 *
 *   kind 'read' · title 'Read · <table> <reference>' · entity_type <table> ·
 *   entity_id <row id> · read_at now()
 *
 * — which the existing admin insert policy allows; "mark as unread" deletes
 * it, which the admin delete policy allows. No other column is written, and
 * the title carries a reference, never a name or an email.
 *
 * READ STATE IS SHARED. The table has no per-person column, so a marker set
 * by one admin reads as read for every admin. That is stated on the screen.
 *
 * COMPLETENESS OF THE MARKER READ. Only markers created inside the window are
 * fetched. That is sufficient, not an approximation: a marker is always
 * created after the item it marks, and every item on screen arrived inside
 * the window, so every marker that could apply to one was created inside it.
 */

export const INBOX_DAYS = 30;

/** Fired on window after any read-state change, for a sidebar badge to re-count. */
export const NOTIFICATIONS_CHANGED = 'ngd:admin-notifications-changed';

const READ_KIND = 'read';
const SEP = ' · ';
const PER_SOURCE = 200;
const DELETION_SUBJECT = 'account deletion request';

/*
 * Enquiry statuses that mean the desk has dealt with it. These are the values
 * this console itself writes (queries/adminFeedback.js, adminSubmissions.js);
 * anything else — 'new', 'in_progress', a value added later — reads as open.
 */
const HANDLED = new Set(['responded', 'closed']);

/** Every kind of arrival, where it is worked on, and what one is called. */
export const TYPES = {
  deletion: { label: 'Deletion requests', noun: 'Account deletion request', href: '/admin/enquiries' },
  enquiry: { label: 'Enquiries', noun: 'Enquiry', href: '/admin/enquiries' },
  feedback: { label: 'Feedback', noun: 'Feedback', href: '/admin/feedback' },
  article: { label: 'Articles', noun: 'Article submission', href: '/admin/journal' },
  quote: { label: 'Quotes', noun: 'Quote request', href: '/admin/quotes' },
  hold: { label: 'Holds', noun: 'Hold request', href: '/admin/holds' },
  inspection: { label: 'Inspections', noun: 'Inspection request', href: '/admin/inspections' },
  signup: { label: 'Sign-ups', noun: 'New account', href: '/admin/customers' },
  order: { label: 'Orders', noun: 'Order', href: '/admin/orders' },
};

export const TYPE_ORDER = ['deletion', 'enquiry', 'feedback', 'article', 'quote', 'hold', 'inspection', 'signup', 'order'];

/* Narrow selects: only what a line in the inbox shows. No message bodies. */
const SOURCES = [
  { table: 'enquiries', label: 'Enquiries', columns: 'id,public_id,subject,full_name,company_name,email,status,created_at' },
  { table: 'quotes', label: 'Quotes', columns: 'id,public_id,status,user_id,diamond_id,created_at' },
  { table: 'holds', label: 'Holds', columns: 'id,public_id,status,user_id,diamond_id,expires_at,created_at' },
  { table: 'inspections', label: 'Inspections', columns: 'id,public_id,status,user_id,diamond_id,scheduled_at,created_at' },
  { table: 'profiles', label: 'Customer sign-ups', columns: 'id,full_name,company_name,email,role,created_at' },
  { table: 'orders', label: 'Orders', columns: 'id,public_id,status,user_id,currency,total_amount,created_at' },
];

/* ---------------- helpers ---------------- */

const uniq = (list) => [...new Set(list.filter(Boolean))];

function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

function explain(error, what) {
  if (isMissingTable(error)) return `the ${what} table is not on this project`;
  if (error?.code === '42501' || /row-level security|permission denied/i.test(error?.message ?? '')) {
    return `this account may not read ${what}`;
  }
  return error?.message || `${what} could not be read`;
}

const sinceIso = (days) => new Date(Date.now() - days * 86_400_000).toISOString();

const short = (iso) => (iso
  ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  : null);

function announce() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED));
}

/** Subscribe to read-state changes. Returns the unsubscribe function. */
export function onUnreadChange(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(NOTIFICATIONS_CHANGED, listener);
  return () => window.removeEventListener(NOTIFICATIONS_CHANGED, listener);
}

/** Which kind of message an enquiry is, from the subject its sender's form wrote. */
export function enquiryType(subject) {
  const s = String(subject ?? '').trim();
  if (s.startsWith(`${FEEDBACK_PREFIX}${SEP}`)) return 'feedback';
  if (s.startsWith(`${ARTICLE_PREFIX}${SEP}`)) return 'article';
  if (s.toLowerCase().startsWith(DELETION_SUBJECT)) return 'deletion';
  return 'enquiry';
}

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

/** One source inside the window. Never throws: a failure is returned as a state. */
async function pull(source, since, columns = source.columns) {
  const { data, error } = await supabase
    .from(source.table)
    .select(columns)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(PER_SOURCE + 1);
  if (error) {
    console.error(`[NGD Admin] inbox: ${source.table} unavailable:`, error);
    return { table: source.table, label: source.label, ok: false, rows: [], error: explain(error, source.table), missing: isMissingTable(error), capped: false };
  }
  const rows = data ?? [];
  return { table: source.table, label: source.label, ok: true, rows: rows.slice(0, PER_SOURCE), error: null, missing: false, capped: rows.length > PER_SOURCE };
}

/** Read markers created since `since`, as a Map of "table:id" → read_at. */
async function readMarkers(since) {
  const map = new Map();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id,entity_type,entity_id,read_at,created_at')
      .eq('kind', READ_KIND)
      .gte('created_at', since)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[NGD Admin] read markers unavailable:', error);
      return { ok: false, missing: isMissingTable(error), error: explain(error, 'notifications'), map: new Map() };
    }
    for (const m of data ?? []) {
      const key = `${m.entity_type}:${m.entity_id}`;
      if (!map.has(key)) map.set(key, m.read_at ?? m.created_at);
    }
    if (!data || data.length < PAGE) return { ok: true, missing: false, error: null, map };
  }
}

/* ---------------- building one inbox line ---------------- */

function who(person, fallback) {
  if (!person) return fallback;
  return [person.full_name, person.company_name, person.email].filter(Boolean).join(SEP) || fallback;
}

function stoneLabel(stone) {
  if (!stone) return null;
  const carat = Number(stone.carat);
  return [stone.stock_number, Number.isFinite(carat) && carat > 0 ? `${carat.toFixed(2)} ct ${stone.shape ?? ''}`.trim() : null]
    .filter(Boolean).join(SEP) || null;
}

function build(table, row, ctx) {
  const base = {
    table,
    id: String(row.id),
    key: `${table}:${row.id}`,
    ref: row.public_id ?? null,
    at: row.created_at,
    status: row.status ?? null,
    needsAction: false,
  };
  const account = (userId) => (userId
    ? who(ctx.people.get(userId), ctx.peopleError ? 'Account unreadable' : 'Account not found')
    : 'Guest');

  if (table === 'enquiries') {
    const type = enquiryType(row.subject);
    const sender = [row.full_name, row.company_name, row.email].filter(Boolean).join(SEP) || 'Unnamed sender';
    if (type === 'feedback') {
      const rating = String(row.subject).split(SEP)[1];
      return { ...base, type, href: TYPES.feedback.href, title: `Feedback${/^\d\/5$/.test(rating ?? '') ? ` ${rating}` : ''} from ${row.full_name || 'a client'}`, detail: row.email || null };
    }
    if (type === 'article') {
      const title = String(row.subject).slice(ARTICLE_PREFIX.length + SEP.length).trim();
      return { ...base, type, href: TYPES.article.href, title: `Article sent in: “${title || 'Untitled'}”`, detail: sender };
    }
    if (type === 'deletion') {
      return {
        ...base,
        type,
        href: TYPES.deletion.href,
        title: `Account deletion request from ${row.email || row.full_name || 'a customer'}`,
        detail: 'Delete the sign-in in Supabase, then close the enquiry',
        needsAction: !HANDLED.has(row.status),
      };
    }
    return { ...base, type, href: TYPES.enquiry.href, title: row.subject?.trim() || 'New enquiry', detail: sender };
  }

  if (table === 'quotes' || table === 'holds' || table === 'inspections') {
    const type = table === 'quotes' ? 'quote' : table === 'holds' ? 'hold' : 'inspection';
    const stone = stoneLabel(ctx.stones.get(row.diamond_id));
    const when = table === 'holds' && row.expires_at ? `expires ${short(row.expires_at)}`
      : table === 'inspections' && row.scheduled_at ? `scheduled ${short(row.scheduled_at)}` : null;
    return {
      ...base,
      type,
      href: TYPES[type].href,
      title: `${TYPES[type].noun}${stone ? `${SEP}${stone}` : ''}`,
      detail: [account(row.user_id), when].filter(Boolean).join(SEP),
    };
  }

  if (table === 'profiles') {
    const staff = row.role && row.role !== 'customer';
    return {
      ...base,
      type: 'signup',
      href: TYPES.signup.href,
      title: `${staff ? `New ${row.role} account` : 'New account'}: ${row.full_name || row.email || 'unnamed'}`,
      detail: [row.company_name, row.email].filter(Boolean).join(SEP) || null,
    };
  }

  /* orders — opened straight onto the order by its reference. */
  return {
    ...base,
    type: 'order',
    href: row.public_id ? `${TYPES.order.href}?open=${encodeURIComponent(row.public_id)}` : TYPES.order.href,
    title: `Order ${row.public_id ?? ''}${SEP}${formatMoney(toCents(row.total_amount), row.currency)}`.trim(),
    detail: account(row.user_id),
  };
}

/* ---------------- the inbox ---------------- */

/**
 * Everything that arrived in the last `days` days, newest first.
 *
 * Each source loads and fails on its own; `sources` says which answered, so
 * the screen can name a table it could not read rather than presenting a
 * shorter list as the whole truth. At most 200 per source — `capped` says when
 * that bound was reached.
 *
 * `openDeletions` is read WITHOUT the window: an account deletion request
 * that is still open needs doing however old it is, so it is never allowed to
 * age out of view.
 */
export async function loadInbox({ days = INBOX_DAYS } = {}) {
  if (!supabase) {
    return { ok: false, error: 'Not connected to the database.', items: [], sources: [], markers: { ok: false, error: 'not connected' }, openDeletions: { ok: false, rows: [] } };
  }
  const since = sinceIso(days);

  const [pulled, markers, deletions] = await Promise.all([
    Promise.all(SOURCES.map((s) => pull(s, since))),
    readMarkers(since),
    supabase
      .from('enquiries')
      .select('id,public_id,full_name,email,status,created_at')
      .ilike('subject', 'Account deletion request%')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  const got = Object.fromEntries(pulled.map((p) => [p.table, p]));

  /* Names for the rows that carry only a user_id. Sign-ups already in the
     window are reused rather than read twice. */
  const people = new Map((got.profiles?.rows ?? []).map((p) => [p.id, p]));
  const wanted = uniq(['quotes', 'holds', 'inspections', 'orders']
    .flatMap((t) => (got[t]?.rows ?? []).map((r) => r.user_id)))
    .filter((id) => !people.has(id));
  const [more, stones] = await Promise.all([
    lookup('profiles', wanted, 'id,full_name,company_name,email'),
    lookup('diamonds', uniq(['quotes', 'holds', 'inspections']
      .flatMap((t) => (got[t]?.rows ?? []).map((r) => r.diamond_id))), 'id,stock_number,shape,carat'),
  ]);
  more.map.forEach((v, k) => people.set(k, v));
  const ctx = { people, peopleError: more.error, stones: stones.map };

  const items = pulled
    .flatMap((p) => p.rows.map((row) => build(p.table, row, ctx)))
    .map((item) => ({
      ...item,
      read: markers.ok && markers.map.has(item.key),
      readAt: markers.map.get(item.key) ?? null,
    }))
    .sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));

  return {
    ok: pulled.some((p) => p.ok),
    error: pulled.every((p) => !p.ok) ? pulled.map((p) => `${p.label}: ${p.error}`).join('; ') : null,
    days,
    since,
    items,
    sources: pulled.map(({ table, label, ok, error, missing, capped }) => ({ table, label, ok, error, missing, capped })),
    markers: { ok: markers.ok, missing: markers.missing, error: markers.error },
    openDeletions: deletions.error
      ? { ok: false, rows: [], error: explain(deletions.error, 'enquiries') }
      : { ok: true, rows: (deletions.data ?? []).filter((r) => !HANDLED.has(r.status)), error: null },
  };
}

/**
 * Mark items read: one marker row each, for those not already marked.
 * Returns how many were written.
 */
export async function markRead(items) {
  if (!supabase) throw new Error('Not connected to the database.');
  const now = new Date().toISOString();
  const seen = new Set();
  const rows = [];
  for (const item of items) {
    if (item.read || seen.has(item.key)) continue;
    seen.add(item.key);
    rows.push({
      kind: READ_KIND,
      /* A reference only. Names and emails stay in their own tables. */
      title: `Read${SEP}${item.table} ${item.ref ?? item.id}`.slice(0, 200),
      entity_type: item.table,
      entity_id: item.id,
      read_at: now,
    });
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('notifications').insert(rows.slice(i, i + 500));
    if (error) {
      if (i > 0) announce(); // the batches before this one did land
      throw new Error(error.message || 'Could not mark as read.');
    }
  }
  if (rows.length) announce();
  return rows.length;
}

/** Take the read marker off one item. */
export async function markUnread(item) {
  if (!supabase) throw new Error('Not connected to the database.');
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('kind', READ_KIND)
    .eq('entity_type', item.table)
    .eq('entity_id', item.id);
  if (error) throw new Error(error.message || 'Could not mark as unread.');
  announce();
}

/**
 * How many arrivals in the last `days` days have no read marker — the number
 * for a sidebar badge. The same window and per-source bound as the inbox, so
 * the badge and the page agree.
 *
 * Returns null, never 0, when it cannot be known: no connection, no source
 * readable, or the markers unreadable. A badge that says 0 because the count
 * failed is a fabricated all-clear.
 */
export async function countUnread({ days = INBOX_DAYS } = {}) {
  if (!supabase) return null;
  try {
    const since = sinceIso(days);
    const [pulled, markers] = await Promise.all([
      Promise.all(SOURCES.map((s) => pull(s, since, 'id,created_at'))),
      readMarkers(since),
    ]);
    if (!markers.ok) return null;
    const readable = pulled.filter((p) => p.ok);
    if (!readable.length) return null;
    return readable
      .flatMap((p) => p.rows.map((r) => `${p.table}:${r.id}`))
      .filter((key) => !markers.map.has(key)).length;
  } catch (err) {
    console.warn('[NGD Admin] unread count unavailable:', err?.message || err);
    return null;
  }
}
