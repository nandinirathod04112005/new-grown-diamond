import { supabase } from '../client.js';
import { recordAudit } from './adminInsights.js';
import {
  arrangeSections, DEFAULT_ORDER, HERO_KEY, HOMEPAGE_TABLE, rememberHomeLayout, SECTION_KEYS,
} from '../../homeLayout.js';

/**
 * The Homepage Manager's reads and writes on public.homepage_sections.
 *
 * Admin only. The storefront reads the same table through lib/homeLayout.js —
 * a plain fetch, no SDK — and never imports this file, so none of this ships
 * to a visitor. The policies (migration 0001), used exactly as they are:
 * active admins read, insert, update and delete every row; anyone may read
 * the rows whose visible = true. This screen is never the gate.
 */

export { HERO_KEY };

/* The words for each section, in the Control Centre. Keys: lib/homeLayout.js. */
const ABOUT = {
  hero: ['Hero', 'Headline, main picture and the two buttons. Holds the picture the page preloads.'],
  'trust-strip': ['Trust strip', 'Real diamonds · independent certification · precision · four locations'],
  shapes: ['Shapes carousel', '“Find your kind of brilliance” with the shape carousel'],
  story: ['Seed to stone', '“Remarkable by science” with the seed-to-stone illustration'],
  'lab-grown-story': ['Lab-grown story', '“The Lab-Grown Diamonds” and “Uniqueness of Lab-Grown Diamonds”'],
  reasons: ['Reasons', '“Why lab-grown diamonds”: certified, quality, value, conflict-free'],
  transparency: ['Transparency', '“Every stone, in the open.”'],
  jewellery: ['Custom jewellery', '“Some stories deserve their own setting.”'],
  credentials: ['Credentials', '“Awards & recognition”'],
  'client-feedback': ['Client feedback', '“In their words.” Approved feedback from the Feedback module'],
  faq: ['Questions', '“Good questions. Brilliant answers.” Four questions and answers'],
  locations: ['Offices', 'The four offices, as set in Settings'],
};

/** Every section the page can draw, with its label, in built-in order. */
export const HOME_SECTIONS = SECTION_KEYS.map((key) => ({
  key,
  label: ABOUT[key]?.[0] ?? key,
  summary: ABOUT[key]?.[1] ?? '',
  locked: key === HERO_KEY,
}));

const sectionFor = (key) => HOME_SECTIONS.find((s) => s.key === key);
const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const ADMIN_COLUMNS = 'id,section_key,label,position,visible,settings,updated_at';

function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

function explain(error) {
  if (error?.code === '42501' || /row-level security/i.test(error?.message ?? '')) {
    return new Error('The database refused this change. Only an active administrator can change the homepage.');
  }
  return error instanceof Error ? error : new Error(error?.message || 'The homepage layout could not be saved.');
}

/** Every saved row, hidden ones included (RLS returns those to active admins only). */
export async function adminListHomepageSections() {
  if (!supabase) return { rows: [], missing: false, unconfigured: true };
  const { data, error } = await supabase
    .from(HOMEPAGE_TABLE)
    .select(ADMIN_COLUMNS)
    .order('position', { ascending: true });
  if (error) {
    if (isMissingTable(error)) return { rows: [], missing: true, unconfigured: false };
    throw explain(error);
  }
  return { rows: data ?? [], missing: false, unconfigured: false };
}

/**
 * The editable list: the hero first and locked, then every other section in
 * its saved order (or its built-in place when it has never been saved), each
 * with its visibility.
 */
export function editableLayout(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = new Map(list.map((r) => [r.section_key, r]));
  return [HERO_KEY, ...arrangeSections(list)].map((key) => ({
    ...sectionFor(key),
    visible: key === HERO_KEY ? true : byKey.get(key)?.visible !== false,
  }));
}

/**
 * Save the whole layout: one upsert, keyed by section_key.
 *
 * Existing `settings` are carried over rather than overwritten, so anything a
 * later feature keeps there survives a reorder. The hero also records every
 * key the page knows about (lib/homeLayout.js explains why).
 */
export async function adminSaveHomepageLayout(list, previousRows = []) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const previous = new Map(previousRows.map((r) => [r.section_key, r]));
  const settingsOf = (key) => (isPlainObject(previous.get(key)?.settings) ? previous.get(key).settings : {});
  const movable = new Set(DEFAULT_ORDER);

  const ordered = [sectionFor(HERO_KEY), ...list.filter((s) => movable.has(s.key))];
  const payload = ordered.map((s, position) => ({
    section_key: s.key,
    label: s.label,
    position,
    visible: s.key === HERO_KEY ? true : s.visible !== false,
    settings: s.key === HERO_KEY ? { ...settingsOf(HERO_KEY), keys: SECTION_KEYS } : settingsOf(s.key),
  }));

  const { data, error } = await supabase
    .from(HOMEPAGE_TABLE)
    .upsert(payload, { onConflict: 'section_key' })
    .select(ADMIN_COLUMNS);
  if (error) throw explain(error);

  /* The log line: each section whose place or visibility moved, as
     "shown #3 → hidden #3". Section keys and positions only. */
  const describe = (visible, position) => `${visible ? 'shown' : 'hidden'} #${position}`;
  const changes = {};
  payload.forEach((row) => {
    if (row.section_key === HERO_KEY) return;
    const before = previous.get(row.section_key);
    const was = before
      ? describe(before.visible !== false, Number(before.position) || 0)
      : describe(true, DEFAULT_ORDER.indexOf(row.section_key) + 1);
    const now = describe(row.visible, row.position);
    if (was !== now) changes[row.section_key.replaceAll('-', '_')] = [was, now];
  });
  await recordAudit({
    action: 'content_update',
    entityType: 'homepage',
    entityId: 'layout',
    entityLabel: 'Homepage layout',
    changes,
  });

  const saved = data ?? payload;
  rememberHomeLayout(saved);
  return saved;
}
