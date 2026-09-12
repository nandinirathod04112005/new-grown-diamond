import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Lock, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';

import { ErrorState, SetupRequired, Skeleton } from '@/components/admin/AdminBits.jsx';
import { Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts, useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import {
  adminListHomepageSections,
  adminSaveHomepageLayout,
  editableLayout,
} from '@/lib/supabase/queries/homepageSections.js';
import styles from './AdminDiamonds.module.css';
import own from './AdminHomepage.module.css';

/* Order and visibility as one comparable string. */
const signature = (list) => list.map((s) => `${s.key}:${s.visible ? 1 : 0}`).join('|');
const BUILT_IN = editableLayout([]);

/**
 * Homepage Manager: the order of the homepage's sections, and which are shown.
 *
 * Writes public.homepage_sections, one row per section, keyed by section_key —
 * RLS lets an active admin write and anyone read the visible rows; this screen
 * is never the gate. The hero is locked first and shown: it carries the
 * picture the site preloads before anything else, so moving it would slow
 * every first visit.
 *
 * Nothing changes on the site until Save. Every save goes to the audit log as
 * a list of the sections whose place or visibility moved.
 */
export default function AdminHomepage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [list, setList] = useState(BUILT_IN);
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [focusAfterMove, setFocusAfterMove] = useState(null);
  const controls = useRef(new Map());
  const t = useToasts();

  const load = useCallback(async () => {
    try {
      const r = await adminListHomepageSections();
      if (r.unconfigured) { setStatus('unconfigured'); return; }
      if (r.missing) { setStatus('missing'); return; }
      setRows(r.rows);
      setList(editableLayout(r.rows));
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('[NGD Admin] homepage layout failed:', err);
      setError(err.message || 'The homepage layout could not be loaded.');
      setStatus('error');
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const baseline = useMemo(() => editableLayout(rows), [rows]);
  const dirty = status === 'ready' && signature(list) !== signature(baseline);
  const isBuiltIn = signature(list) === signature(BUILT_IN);
  useUnsavedGuard(dirty);

  /*
   * Focus follows the section that moved.
   *
   * React reorders keyed rows by moving DOM nodes, and a focused button whose
   * row is moved loses focus — a keyboard user pressing "down" twice would
   * find the second press going nowhere. When the arrow just pressed is now
   * disabled (the row reached an end), focus goes to the other arrow.
   */
  useLayoutEffect(() => {
    if (!focusAfterMove) return;
    const { key, dir } = focusAfterMove;
    const want = controls.current.get(`${key}:${dir}`);
    const other = controls.current.get(`${key}:${dir === 'up' ? 'down' : 'up'}`);
    (want && !want.disabled ? want : other)?.focus();
  }, [focusAfterMove]);

  const bindControl = (id) => (el) => {
    if (el) controls.current.set(id, el);
    else controls.current.delete(id);
  };

  const move = (index, delta) => {
    const target = index + delta;
    /* Index 0 is the hero, which never moves and is never passed. */
    if (index < 1 || target < 1 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    setFocusAfterMove({ key: next[target].key, dir: delta < 0 ? 'up' : 'down' });
    setAnnounce(`${next[target].label} moved to position ${target + 1} of ${next.length}.`);
  };

  const toggle = (index) => {
    const section = list[index];
    if (!section || section.locked) return;
    setList(list.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s)));
    setAnnounce(`${section.label} ${section.visible ? 'hidden' : 'shown'}. Not saved yet.`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await adminSaveHomepageLayout(list, rows);
      setRows(saved);
      setList(editableLayout(saved));
      t.ok('Saved. The homepage now shows this order.');
    } catch (err) {
      console.error('[NGD Admin] homepage save failed:', err);
      t.error(err.message || 'The layout could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const retry = () => { setStatus('loading'); load(); };

  if (status === 'missing') {
    return (
      <div className={styles.page}>
        <SetupRequired
          module={{
            label: 'Homepage Manager',
            state: 'setup',
            missing: ['homepage_sections'],
            note: 'The homepage_sections table is not on this project. Its definition and policies are in supabase/migrations/0001_admin_content_and_media.sql.',
          }}
        />
      </div>
    );
  }

  const shown = list.filter((s) => s.visible).length;
  const place = new Map(baseline.map((s, i) => [s.key, { index: i, visible: s.visible }]));
  const changedCount = list.filter((s, i) => place.get(s.key)?.index !== i || place.get(s.key)?.visible !== s.visible).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Homepage</h1>
          <p className={styles.sub}>
            {status === 'ready'
              ? `${shown} of ${list.length} sections shown · ${rows.length ? 'saved layout' : 'built-in order, nothing saved yet'}`
              : status === 'unconfigured' ? 'Not connected to the database.' : 'Loading the layout…'}
          </p>
        </div>
        <div className={own.headActions}>
          <a className={styles.toolBtn} href="/" target="_blank" rel="noopener noreferrer">
            <SquareArrowOutUpRight size={13} aria-hidden="true" /> View homepage
          </a>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={status !== 'ready' || saving || isBuiltIn}
            onClick={() => { setList(BUILT_IN); setAnnounce('Built-in order restored, every section shown. Not saved yet.'); }}
          >
            <RotateCcw size={13} aria-hidden="true" /> Built-in order
          </button>
        </div>
      </header>

      {status === 'unconfigured' && (
        <p className={styles.note}>
          Supabase is not configured in this build, so there is no layout to read or save. The homepage is showing its built-in order.
        </p>
      )}

      <div className={own.layout} hidden={status === 'unconfigured'}>
        <section className={own.main} aria-labelledby="home-sections-title">
          <h2 id="home-sections-title" className={own.title}>Sections, top to bottom</h2>

          {status === 'loading' && <Skeleton rows={8} />}
          {status === 'error' && <ErrorState message={error} onRetry={retry} />}

          {status === 'ready' && (
            <ol className={own.list}>
              {list.map((s, i) => {
                const was = place.get(s.key);
                const changed = was?.index !== i || was?.visible !== s.visible;
                return (
                  <li
                    key={s.key}
                    className={own.item}
                    data-hidden={s.visible ? undefined : ''}
                    data-locked={s.locked ? '' : undefined}
                    data-changed={changed ? '' : undefined}
                  >
                    <span className={own.pos} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div className={own.text}>
                      <p className={own.name}>
                        {s.label}
                        {s.locked && <Lock size={12} aria-hidden="true" />}
                        {changed && <span className={own.tag}>Unsaved</span>}
                      </p>
                      <p className={own.summary}>{s.summary}</p>
                    </div>
                    {s.locked ? (
                      <p className={own.lockNote}>Always first, always shown</p>
                    ) : (
                      <div className={own.controls}>
                        <label className={own.switch}>
                          <input
                            type="checkbox"
                            role="switch"
                            checked={s.visible}
                            disabled={saving}
                            onChange={() => toggle(i)}
                            aria-label={`Show ${s.label} on the homepage`}
                          />
                          <span aria-hidden="true">{s.visible ? 'Shown' : 'Hidden'}</span>
                        </label>
                        <button
                          type="button"
                          ref={bindControl(`${s.key}:up`)}
                          className={own.move}
                          disabled={saving || i <= 1}
                          onClick={() => move(i, -1)}
                          aria-label={`Move ${s.label} up`}
                          title="Move up"
                        >
                          <ArrowUp size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          ref={bindControl(`${s.key}:down`)}
                          className={own.move}
                          disabled={saving || i >= list.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label={`Move ${s.label} down`}
                          title="Move down"
                        >
                          <ArrowDown size={15} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {dirty && (
            <div className={own.saveBar} role="region" aria-label="Unsaved changes">
              <p>
                {changedCount} {changedCount === 1 ? 'section' : 'sections'} changed. Nothing is live until you save.
              </p>
              <div className={own.saveActions}>
                <button type="button" className={styles.toolBtn} disabled={saving} onClick={() => { setList(baseline); setAnnounce('Changes discarded.'); }}>
                  Discard
                </button>
                <button type="button" className={own.save} disabled={saving} onClick={save}>
                  {saving ? 'Saving…' : 'Save layout'}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className={own.aside} aria-labelledby="home-how-title">
          <h2 id="home-how-title" className={own.title}>How it reaches the site</h2>
          <ul className={own.notes}>
            <li>One layout for the English, Hindi and Gujarati homepages.</li>
            <li>The hero stays first and shown. It holds the page&apos;s main picture, which loads before anything else.</li>
            <li>Hidden sections are not drawn and their code is not downloaded.</li>
            <li>
              The page reads the layout after it has loaded, so it never slows the first
              picture. A visitor already reading the page is not rearranged under them:
              they see the new order on their next visit. Your own browser shows it at once.
            </li>
            <li>A section added to the site later appears in its built-in place until you move it.</li>
          </ul>
        </aside>
      </div>

      <p className="u-visually-hidden" aria-live="polite">{announce}</p>
      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
