import { supabase } from '../client.js';

/**
 * The audit trail: what the console writes about itself, and how it reads it
 * back.
 *
 * public.audit_log exists (migration 0002), with these policies:
 *
 *   select — an active admin, and nobody else.
 *   insert — an active admin, and ONLY for a row whose actor_id is their own
 *            auth.uid(). A row cannot be attributed to someone else.
 *   update — nobody. delete — nobody. Not an oversight: a log an
 *            administrator can edit is not a log. Retention is a scheduled
 *            job, which is a policy decision rather than a grant to a user.
 *
 * WHAT IS RECORDED, AND WHAT IS DELIBERATELY NOT. `changes` is a SUMMARY —
 * {column: [before, after]} for the columns that actually moved, and only for
 * columns on the allow-list below. Free text a customer wrote, internal notes
 * and anything else personal never lands in a table that is kept for a year.
 * The allow-list is the enforcement, not a convention: a column that is not on
 * it cannot be logged by any caller.
 *
 * WRITING NEVER BREAKS THE WORK IT DESCRIBES. Every function here swallows its
 * own failure and warns to the console. An audit insert that is refused —
 * because the table was rolled back, or the caller's role changed mid-session —
 * must not turn a saved stone into a failed save. The operation is the point;
 * the record of it is not worth losing the operation for.
 */

/** Columns whose before/after may be written to the log. */
const LOGGABLE = {
  diamond: new Set([
    'stock_number', 'shape', 'carat', 'color', 'clarity', 'cut', 'polish',
    'symmetry', 'fluorescence', 'laboratory', 'report_number',
    'certificate_number', 'certificate_url', 'measurements',
    'depth_percentage', 'table_percentage', 'ratio', 'growth_method',
    'location', 'availability', 'price_per_carat', 'total_price', 'currency',
    'price_visible', 'featured', 'active', 'archived_at', 'image_path',
  ]),
  jewellery: new Set(['active', 'featured', 'archived_at']),
  blog: new Set(['title', 'slug', 'published', 'published_at', 'cover_path']),
  media: new Set(['path', 'bucket']),
  /* The moderation decision only; the customer's own words are never logged. */
  feedback: new Set(['status']),
  submission: new Set(['status']),
};

/** The actions the table's own CHECK constraint allows. */
const ACTIONS = new Set([
  'create', 'update', 'publish', 'unpublish', 'archive', 'restore', 'delete',
  'status_change', 'media_upload', 'media_delete', 'content_update',
]);

/**
 * "This table is not there" arrives in more than one shape, and the console
 * must read a missing table as a calm state rather than a fault — the same
 * decision, for the same reason, as queries/blogs.js.
 */
function isMissingTable(error) {
  const code = error?.code;
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01') return true;
  return /could not find the table|relation .* does not exist/i.test(error?.message ?? '');
}

/**
 * The columns that changed, as {column: [before, after]}.
 *
 * Compared as strings so that 1.01 typed into a form and 1.010 returned by
 * Postgres do not read as a change, and so a null and an empty string — which
 * a form produces constantly — do not either.
 */
export function diffFor(entityType, previous, next) {
  const allowed = LOGGABLE[entityType];
  if (!allowed || !next) return {};
  const same = (a, b) => (a ?? '') === (b ?? '') || String(a ?? '') === String(b ?? '');
  const out = {};
  for (const [column, after] of Object.entries(next)) {
    if (!allowed.has(column)) continue;
    const before = previous ? previous[column] : undefined;
    if (previous && same(before, after)) continue;
    out[column] = [previous ? before ?? null : null, after ?? null];
  }
  return out;
}

/**
 * Write one entry. Returns true when it landed.
 *
 * The actor comes from the live session rather than from the caller: the
 * insert policy requires actor_id to equal auth.uid(), so passing it in would
 * only create a way to get the insert refused.
 */
export async function recordAudit({ action, entityType, entityId, entityLabel, changes }) {
  if (!supabase) return false;
  if (!ACTIONS.has(action)) {
    console.warn('[NGD Admin] refusing to log an action the table does not allow:', action);
    return false;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return false;

    const { error } = await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      entity_label: entityLabel ?? null,
      changes: changes && Object.keys(changes).length ? changes : {},
    });

    if (error) {
      if (!isMissingTable(error)) console.warn('[NGD Admin] audit entry not written:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[NGD Admin] audit entry not written:', err?.message || err);
    return false;
  }
}

export const AUDIT_COLUMNS = 'id,actor_id,actor_email,action,entity_type,entity_id,entity_label,changes,created_at';

/**
 * The log, newest first.
 *
 * `{ missing: true }` rather than a throw when the table is not there, so the
 * screen can say so instead of showing a failure. An RLS refusal is NOT that
 * case: it comes back as an empty list, which is what a non-admin should see
 * and what this console will never render, because the route is gated.
 */
export async function listAuditLog({ limit = 300 } = {}) {
  if (!supabase) return { entries: [], missing: false, unconfigured: true };

  const { data, error } = await supabase
    .from('audit_log')
    .select(AUDIT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTable(error)) return { entries: [], missing: true, unconfigured: false };
    throw error;
  }
  return { entries: data ?? [], missing: false, unconfigured: false };
}
