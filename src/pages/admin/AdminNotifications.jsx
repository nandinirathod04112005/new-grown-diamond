import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, CheckCheck, Eye, FileText, Inbox, Lock, MessageSquareQuote, Newspaper,
  RefreshCw, ShoppingCart, TriangleAlert, Undo2, UserPlus, UserX,
} from 'lucide-react';

import { ErrorState, Skeleton } from '@/components/admin/AdminBits.jsx';
import { Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import {
  INBOX_DAYS,
  TYPES,
  TYPE_ORDER,
  loadInbox,
  markRead,
  markUnread,
} from '@/lib/supabase/queries/adminNotifications.js';
import styles from './AdminNotifications.module.css';

const ICON = {
  deletion: UserX,
  enquiry: Inbox,
  feedback: MessageSquareQuote,
  article: Newspaper,
  quote: FileText,
  hold: Lock,
  inspection: Eye,
  signup: UserPlus,
  order: ShoppingCart,
};

const RANGES = [7, 30, 90];
const PAGE = 50;

const ago = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const exact = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Notifications: one inbox of everything that arrived recently.
 *
 * Nothing here is stored as an alert. Each line is a row that exists in its
 * own table right now — an enquiry, a quote, a sign-up, an order — so the
 * inbox cannot drift from the queues, and a table that could not be read is
 * named rather than silently leaving its rows out.
 *
 * Read and unread are markers in public.notifications (see the query module):
 * shared by every admin, because the table has no per-person column.
 *
 * Account deletion requests are the one kind that is not merely news: each is
 * a customer asking for their data to be removed, and it stays flagged — and
 * pinned above the list, whatever its age — until the enquiry is closed.
 */
export default function AdminNotifications() {
  const [days, setDays] = useState(INBOX_DAYS);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [show, setShow] = useState('unread'); // unread | all
  const [type, setType] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState(null); // an item key, or 'all'
  const t = useToasts();

  const load = useCallback(async (range) => {
    try {
      const data = await loadInbox({ days: range });
      setState({ status: data.ok ? 'ready' : 'error', data, error: data.ok ? null : data.error || 'Nothing could be read.' });
    } catch (err) {
      console.error('[NGD Admin] inbox failed:', err);
      setState({ status: 'error', data: null, error: err.message || 'The inbox could not be loaded.' });
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(days); }, [days, load]);

  const data = state.data;
  const items = useMemo(() => data?.items ?? [], [data]);
  const markersOk = Boolean(data?.markers.ok);
  /* With no read markers there is no "unread" to filter on — show everything. */
  const view = markersOk ? show : 'all';

  /* Counts per type, for the chips — within the current read filter. */
  const counts = useMemo(() => {
    const m = new Map();
    items.forEach((i) => {
      if (view === 'unread' && i.read) return;
      m.set(i.type, (m.get(i.type) ?? 0) + 1);
    });
    return m;
  }, [items, view]);

  /* The kinds present in this period — plus the one selected, even when the
     period has none of it, so the filter can always be seen and cleared. */
  const presentTypes = useMemo(
    () => TYPE_ORDER.filter((k) => k === type || items.some((i) => i.type === k)),
    [items, type],
  );
  const unreadTotal = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const filtered = useMemo(
    () => items.filter((i) => (view === 'all' || !i.read) && (type === 'all' || i.type === type)),
    [items, view, type],
  );
  const unreadHere = useMemo(() => filtered.filter((i) => !i.read), [filtered]);

  /* Grouped by day, over the page actually shown. */
  const groups = useMemo(() => {
    const out = [];
    filtered.slice(0, limit).forEach((item) => {
      const label = item.at ? dayLabel(item.at) : 'Undated';
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    });
    return out;
  }, [filtered, limit]);

  /* Local state follows a successful write, rather than a full reload that
     would re-read six tables to change one dot. */
  const setRead = (keys, read) => setState((s) => (s.data ? {
    ...s,
    data: {
      ...s.data,
      items: s.data.items.map((i) => (keys.has(i.key) ? { ...i, read, readAt: read ? new Date().toISOString() : null } : i)),
    },
  } : s));

  const markSome = async (list, key) => {
    if (!list.length) return;
    setBusy(key);
    try {
      const n = await markRead(list);
      setRead(new Set(list.map((i) => i.key)), true);
      if (list.length > 1) t.ok(`Marked ${n} as read.`);
    } catch (err) {
      console.error('[NGD Admin] mark read failed:', err);
      t.error(err.message || 'Could not mark as read.');
    } finally {
      setBusy(null);
    }
  };

  const unmark = async (item) => {
    setBusy(item.key);
    try {
      await markUnread(item);
      setRead(new Set([item.key]), false);
    } catch (err) {
      console.error('[NGD Admin] mark unread failed:', err);
      t.error(err.message || 'Could not mark as unread.');
    } finally {
      setBusy(null);
    }
  };

  /* Opening an item counts as reading it. Fired without waiting: the page is
     navigating away, and a marker that fails to land only leaves it unread. */
  const opened = (item) => {
    if (item.read || !markersOk) return;
    markRead([item]).catch((err) => console.warn('[NGD Admin] open-and-mark failed:', err?.message || err));
  };

  const changeRange = (r) => {
    if (r === days) return;
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
    setLimit(PAGE);
    setDays(r);
  };

  const refresh = () => {
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
    load(days);
  };

  const failed = (data?.sources ?? []).filter((s) => !s.ok);
  const capped = (data?.sources ?? []).filter((s) => s.capped);
  const deletions = data?.openDeletions;
  const loading = state.status === 'loading';
  const refreshing = state.status === 'refreshing';

  const markAllLabel = type === 'all' ? 'Mark all as read' : `Mark all ${TYPES[type].label.toLowerCase()} as read`;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Notifications</h1>
          <p className={styles.sub}>
            {data?.ok
              ? `${markersOk ? `${unreadTotal} unread · ` : ''}${items.length} in the last ${data.days} days`
              : loading ? 'Loading…' : 'The inbox could not be loaded'}
          </p>
        </div>
        <div className={styles.controls}>
          <div className={styles.seg} role="group" aria-label="How far back">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={styles.segBtn}
                data-on={r === days ? '' : undefined}
                aria-pressed={r === days}
                onClick={() => changeRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
          <button type="button" className={styles.toolBtn} onClick={refresh} disabled={loading || refreshing}>
            <RefreshCw size={13} aria-hidden="true" data-spin={refreshing ? '' : undefined} /> Refresh
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => markSome(unreadHere, 'all')}
            disabled={!markersOk || !unreadHere.length || busy === 'all'}
          >
            <CheckCheck size={14} aria-hidden="true" /> {busy === 'all' ? 'Marking…' : markAllLabel}
          </button>
        </div>
      </header>

      {/* ---- open deletion requests: pinned, whatever their age ---- */}
      {deletions?.ok && deletions.rows.length > 0 && (
        <section className={styles.alarm} aria-labelledby="deletions-title">
          <h2 id="deletions-title">
            <TriangleAlert size={15} aria-hidden="true" />
            {deletions.rows.length === 1
              ? '1 account deletion request needs action'
              : `${deletions.rows.length} account deletion requests need action`}
          </h2>
          <ul>
            {deletions.rows.slice(0, 8).map((r) => (
              <li key={r.id}>
                <b>{r.email || r.full_name || 'Unknown account'}</b>
                <span>{r.public_id} · {exact(r.created_at)} · {r.status ?? 'no status'}</span>
              </li>
            ))}
          </ul>
          {deletions.rows.length > 8 && <p>And {deletions.rows.length - 8} more in Enquiries.</p>}
          <p>
            Nothing on this site deletes an account. Remove the sign-in in the
            Supabase dashboard (Authentication → Users), then close the enquiry
            so it stops showing here.
          </p>
          <a className={styles.alarmLink} href="/admin/enquiries">Open Enquiries</a>
        </section>
      )}
      {deletions && !deletions.ok && (
        <p className={styles.note}>
          Open account deletion requests could not be checked: {deletions.error}. Look in Enquiries.
        </p>
      )}

      <p className={styles.hint}>
        Read live from enquiries, quotes, holds, inspections, customer accounts
        and orders. Read and unread is shared by every admin — the
        notifications table has no per-person column.
      </p>

      {failed.length > 0 && data?.ok && (
        <p className={styles.note}>
          Not included, because {failed.length === 1 ? 'it' : 'they'} could not be read:{' '}
          {failed.map((s) => `${s.label} (${s.error})`).join('; ')}.
        </p>
      )}
      {data && !data.markers.ok && (
        <p className={styles.note}>
          Read state is unavailable ({data.markers.error}), so everything shows as
          new and nothing can be marked.
        </p>
      )}
      {capped.length > 0 && (
        <p className={styles.hint}>
          Only the latest 200 from {capped.map((s) => s.label.toLowerCase()).join(', ')} are
          listed for this period; the rest are in their own pages.
        </p>
      )}

      {loading && <Skeleton rows={8} />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={refresh} />}

      {data?.ok && (
        <>
          <div className={styles.filters}>
            <div className={styles.seg} role="group" aria-label="Read state">
              {[['unread', 'Unread'], ['all', 'All']].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={styles.segBtn}
                  data-on={view === k ? '' : undefined}
                  aria-pressed={view === k}
                  disabled={k === 'unread' && !markersOk}
                  onClick={() => { setShow(k); setLimit(PAGE); }}
                >
                  {label}
                </button>
              ))}
            </div>
            {(presentTypes.length > 1 || type !== 'all') && (
              <div className={styles.chips} role="group" aria-label="Type">
                <button
                  type="button"
                  className={styles.chip}
                  data-on={type === 'all' ? '' : undefined}
                  aria-pressed={type === 'all'}
                  onClick={() => { setType('all'); setLimit(PAGE); }}
                >
                  Everything <span>{view === 'unread' ? unreadTotal : items.length}</span>
                </button>
                {presentTypes.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={styles.chip}
                    data-on={type === k ? '' : undefined}
                    data-danger={k === 'deletion' ? '' : undefined}
                    aria-pressed={type === k}
                    onClick={() => { setType(k); setLimit(PAGE); }}
                  >
                    {TYPES[k].label} <span>{counts.get(k) ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 && (
            <div className={styles.empty}>
              {view === 'unread' ? (
                <>
                  <p>
                    All caught up — nothing unread
                    {type === 'all' ? '' : ` in ${TYPES[type].label.toLowerCase()}`} in the last {data.days} days.
                  </p>
                  {items.length > 0 && (
                    <button type="button" className={styles.toolBtn} onClick={() => setShow('all')}>Show everything</button>
                  )}
                </>
              ) : (
                <>
                  <p>Nothing arrived{type === 'all' ? '' : ` in ${TYPES[type].label.toLowerCase()}`} in the last {data.days} days.</p>
                  {type !== 'all' && items.length > 0 && (
                    <button type="button" className={styles.toolBtn} onClick={() => setType('all')}>Show every kind</button>
                  )}
                </>
              )}
            </div>
          )}

          {groups.length > 0 && (
            <div className={styles.list} aria-busy={refreshing || undefined}>
              {groups.map((g) => (
                <section key={g.label} className={styles.group} aria-label={g.label}>
                  <h2 className={styles.day}>{g.label}</h2>
                  <ul className={styles.items}>
                    {g.items.map((item) => {
                      const Icon = ICON[item.type] ?? Inbox;
                      return (
                        <li
                          key={item.key}
                          className={styles.item}
                          data-unread={!item.read ? '' : undefined}
                          data-action={item.needsAction ? '' : undefined}
                        >
                          <span className={styles.icon} aria-hidden="true"><Icon size={15} /></span>
                          <div className={styles.body}>
                            <p className={styles.title}>
                              {!item.read && markersOk && <span className={styles.dot} />}
                              <a href={item.href} onClick={() => opened(item)}>
                                {!item.read && markersOk && <span className={styles.srOnly}>Unread: </span>}
                                {item.title}
                              </a>
                            </p>
                            <p className={styles.meta}>
                              <span className={styles.kind}>{TYPES[item.type].noun}</span>
                              {item.detail && <span className={styles.detail}>{item.detail}</span>}
                              {item.ref && <span className={styles.ref}>{item.ref}</span>}
                              {item.status && <span className={styles.badge}>{item.status}</span>}
                              {item.needsAction && <span className={styles.flag}>Action needed</span>}
                            </p>
                          </div>
                          <div className={styles.side}>
                            <time dateTime={item.at} title={exact(item.at)}>{ago(item.at)}</time>
                            {markersOk && (item.read ? (
                              <button
                                type="button"
                                className={styles.act}
                                disabled={busy === item.key}
                                onClick={() => unmark(item)}
                                aria-label={`Mark “${item.title}” as unread`}
                                title="Mark as unread"
                              >
                                <Undo2 size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={styles.act}
                                disabled={busy === item.key}
                                onClick={() => markSome([item], item.key)}
                                aria-label={`Mark “${item.title}” as read`}
                                title="Mark as read"
                              >
                                <Check size={14} />
                              </button>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {filtered.length > limit && (
            <button type="button" className={styles.more} onClick={() => setLimit((n) => n + PAGE)}>
              Show {Math.min(PAGE, filtered.length - limit)} more of {filtered.length - limit}
            </button>
          )}
        </>
      )}

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
