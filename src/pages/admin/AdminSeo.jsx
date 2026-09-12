import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SquareArrowOutUpRight } from 'lucide-react';

import DataTable from '@/components/admin/DataTable.jsx';
import { SetupRequired } from '@/components/admin/AdminBits.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { SITE_URL } from '@/config/seo.js';
import { useToasts, useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { SUPABASE_URL } from '@/lib/supabase/env.js';
import {
  adminDeleteSeo,
  adminDiscardSeoDraft,
  adminListSeoSettings,
  adminPublishSeo,
  adminSaveSeoDraft,
  adminUnpublishSeo,
  builtInSeo,
  cleanCanonical,
  cleanText,
  duplicateOf,
  isEnglishRoute,
  resolveOgImage,
  routesFor,
  SEO_LIMITS,
  seoFields,
  seoFormFor,
} from '@/lib/supabase/queries/seoSettings.js';
import styles from './AdminDiamonds.module.css';
import own from './AdminSeo.module.css';

const LANGS = [['en', 'English'], ['hi', 'Hindi'], ['gu', 'Gujarati']];
const SITE_HOST = new URL(SITE_URL).host;

/* "https://newgrowndiamond.com › hi › diamonds", as a results page writes it. */
function crumbs(url) {
  const u = new URL(url);
  return [`https://${u.host}`, ...u.pathname.split('/').filter(Boolean)].join(' › ');
}

const day =(iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function stateOf(row) {
  if (!row) return { key: 'a-builtin', label: 'Built-in', tone: 'off' };
  if (row.published && row.draft) return { key: 'c-live-draft', label: 'Live + draft', tone: 'on' };
  if (row.published) return { key: 'd-live', label: 'Live', tone: 'on' };
  if (row.draft) return { key: 'b-draft', label: 'Draft', tone: 'hidden' };
  return { key: 'a-off', label: 'Off', tone: 'off' };
}

/* A length against the guidance: a tone and a few words. */
function verdict(n, [min, max], kind) {
  if (n === 0) return { tone: 'off', text: 'Empty: the built-in text is used' };
  if (n < min - 20) return { tone: 'bad', text: kind === 'title' ? 'Short: room for more detail' : 'Short: Google may write its own' };
  if (n < min) return { tone: 'warn', text: 'A little short' };
  if (n <= max) return { tone: 'good', text: 'Good length' };
  if (n <= max + 15) return { tone: 'warn', text: 'May be cut off in results' };
  return { tone: 'bad', text: 'Likely to be cut off in results' };
}

function Len({ n, ideal, kind }) {
  const v = verdict(n, ideal, kind);
  return <span className={own.len} data-tone={v.tone} title={v.text}>{n}</span>;
}

/**
 * SEO Manager: a title, description and share image per public page, over
 * the built-in values in src/config/seo.js.
 *
 * Writes public.seo_settings, one row per route (RLS: active admins write,
 * anyone reads published rows). Every field falls back on its own, so a row
 * holding only a description keeps the built-in title. Save draft keeps edits
 * off the site; Publish puts them live; Unpublish takes them off and keeps
 * them as a draft; Revert deletes the row. Every one goes to the audit log.
 */
export default function AdminSeo() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [locale, setLocale] = useState('en');
  /* The selected page, as its English route; the language tab decides which
     address (/diamonds, /hi/diamonds, /gu/diamonds) is being edited. */
  const [base, setBase] = useState(null);
  const [pending, setPending] = useState(null);
  const [working, setWorking] = useState(false);
  const dirty = useRef(false);
  const editor = useRef(null);
  const reveal = useRef(false);
  const t = useToasts();

  const load = useCallback(async () => {
    try {
      const r = await adminListSeoSettings();
      if (r.unconfigured) { setStatus('unconfigured'); return; }
      if (r.missing) { setStatus('missing'); return; }
      setRows(r.rows);
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('[NGD Admin] seo settings failed:', err);
      setError(err.message || 'The SEO settings could not be loaded.');
      setStatus('error');
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const byRoute = useMemo(() => new Map(rows.map((r) => [r.route, r])), [rows]);
  const liveRows = useMemo(() => rows.filter((r) => r.published), [rows]);

  const tableRows = useMemo(() => routesFor(locale).map(({ base: b, route }) => {
    const row = byRoute.get(route) ?? null;
    const builtIn = builtInSeo(route);
    const live = row?.published ? row : null;
    const title = live?.title || builtIn.title;
    const description = live?.description || builtIn.description;
    return {
      id: route,
      route,
      base: b,
      row,
      state: stateOf(row),
      title,
      titleLen: title.length,
      descriptionLen: description.length,
      noindex: live?.noindex === true,
      updated_at: row?.updated_at ?? null,
    };
  }), [locale, byRoute]);

  const apply = useCallback((nextBase, nextLocale, scroll) => {
    dirty.current = false;
    reveal.current = scroll;
    setLocale(nextLocale);
    setBase(nextBase);
  }, []);

  /* Leaving an edited form asks first; the database is never touched by it. */
  const choose = useCallback((nextBase, nextLocale, scroll) => {
    if (nextBase === base && nextLocale === locale) return;
    if (dirty.current) { setPending({ kind: 'switch', base: nextBase, locale: nextLocale, scroll }); return; }
    apply(nextBase, nextLocale, scroll);
  }, [apply, base, locale]);

  /* On a narrow screen the editor sits under the list: bring it into view.
     Focus goes to its heading either way, so the next Tab is in the form. */
  useEffect(() => {
    if (!base || !reveal.current) return;
    reveal.current = false;
    const node = editor.current;
    if (!node) return;
    /* The same breakpoint as .layout in AdminSeo.module.css. */
    if (window.matchMedia?.('(max-width: 80rem)').matches) {
      node.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
    node.querySelector('h2')?.focus({ preventScroll: true });
  }, [base, locale]);

  const onDirty = useCallback((value) => { dirty.current = value; }, []);

  const onSaved = useCallback((saved, text) => {
    setRows((list) => {
      if (!saved) return list;
      const rest = list.filter((r) => r.id !== saved.id && r.route !== saved.route);
      return [...rest, saved].sort((a, b) => a.route.localeCompare(b.route));
    });
    t.ok(text);
  }, [t]);

  const columns = useMemo(() => [
    {
      key: 'route',
      label: 'Page',
      plain: (r) => r.route,
      render: (r) => (
        <button
          type="button"
          className={own.pick}
          data-on={r.base === base ? '' : undefined}
          aria-current={r.base === base ? 'true' : undefined}
          onClick={() => choose(r.base, locale, true)}
        >
          <b>{r.route}</b>
          <small>{r.title}</small>
        </button>
      ),
    },
    {
      key: 'state',
      label: 'State',
      sortValue: (r) => r.state.key,
      render: (r) => (
        <span className={own.pills}>
          <span className={styles.pill} data-tone={r.state.tone}>{r.state.label}</span>
          {r.noindex && <span className={styles.pill} data-tone="hidden">noindex</span>}
        </span>
      ),
    },
    { key: 'titleLen', label: 'Title', render: (r) => <Len n={r.titleLen} ideal={SEO_LIMITS.title.ideal} kind="title" /> },
    { key: 'descriptionLen', label: 'Description', render: (r) => <Len n={r.descriptionLen} ideal={SEO_LIMITS.description.ideal} kind="description" /> },
    { key: 'updated_at', label: 'Saved', render: (r) => day(r.updated_at), sortValue: (r) => r.updated_at ?? '' },
  ], [base, choose, locale]);

  if (status === 'missing') {
    return (
      <div className={styles.page}>
        <SetupRequired
          module={{
            label: 'SEO Manager',
            state: 'setup',
            missing: ['seo_settings'],
            note: 'The seo_settings table is not on this project. Its definition and policies are in supabase/migrations/0001_admin_content_and_media.sql.',
          }}
        />
      </div>
    );
  }

  const route = base ? routesFor(locale).find((r) => r.base === base)?.route : null;
  const row = route ? byRoute.get(route) ?? null : null;
  const live = rows.filter((r) => r.published).length;
  const drafts = rows.filter((r) => r.draft).length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>SEO</h1>
          <p className={styles.sub}>
            {status === 'ready'
              ? `${tableRows.length} public pages per language · ${live} live ${live === 1 ? 'override' : 'overrides'} · ${drafts} ${drafts === 1 ? 'draft' : 'drafts'}`
              : status === 'unconfigured' ? 'Not connected to the database.' : 'Loading…'}
          </p>
        </div>
        <div className={styles.tabs} role="group" aria-label="Language of the page addresses">
          {LANGS.map(([code, label]) => (
            <button
              key={code}
              type="button"
              className={styles.tab}
              data-on={locale === code ? '' : undefined}
              aria-pressed={locale === code}
              onClick={() => choose(base, code, false)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {status === 'unconfigured' ? (
        <p className={styles.note}>
          Supabase is not configured in this build, so there are no overrides to read or save. Every page uses its built-in title and description.
        </p>
      ) : (
        <p className={own.lead}>
          {locale === 'en'
            ? 'Overrides replace the built-in values field by field. Published titles, descriptions and share images reach the live site within minutes, and the pages search engines read directly at the next deploy.'
            : `Pages under /${locale} keep their built-in values unless an override is written for that exact address here. These apply on the live site only; the prerendered ${locale === 'hi' ? 'Hindi' : 'Gujarati'} pages keep the built-in values.`}
        </p>
      )}

      <div className={own.layout} hidden={status === 'unconfigured'}>
        <DataTable
          rows={tableRows}
          columns={columns}
          status={status === 'ready' ? 'ready' : status === 'error' ? 'error' : 'loading'}
          error={error}
          onRetry={() => { setStatus('loading'); load(); }}
          getId={(r) => r.id}
          searchKeys={['route', 'title']}
          searchPlaceholder="Search address or title…"
          pageSize={60}
          filters={locale}
          empty="No public pages found."
        />

        <aside ref={editor} className={own.editorCol} aria-label="Editor">
          {status === 'ready' && route ? (
            <RouteEditor
              key={`${route}|${row?.updated_at ?? 'none'}`}
              route={route}
              row={row}
              liveRows={liveRows}
              onDirty={onDirty}
              onSaved={onSaved}
              onAskDelete={(r) => setPending({ kind: 'delete', row: r })}
            />
          ) : (
            <div className={own.placeholder}>
              <h2 tabIndex={-1}>Choose a page</h2>
              <p>Pick a page from the list to see its built-in title and description, and to write an override.</p>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={pending?.kind === 'delete'}
        title={`Revert ${pending?.row?.route ?? ''} to its built-in values?`}
        confirmLabel="Revert"
        busy={working}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          const target = pending.row;
          setWorking(true);
          try {
            await adminDeleteSeo(target);
            dirty.current = false;
            setRows((list) => list.filter((r) => r.id !== target.id));
            t.ok(`${target.route} uses its built-in values again.`);
          } catch (err) {
            console.error('[NGD Admin] seo delete failed:', err);
            t.error(err.message || 'The override could not be removed.');
          } finally {
            setWorking(false);
            setPending(null);
          }
        }}
        body={(
          <ul>
            <li>The saved override for this address is deleted{pending?.row?.published ? ', and it is live now' : ''}, draft included.</li>
            <li>The page goes back to the title and description in the site&apos;s code.</li>
            <li>To take it off the site but keep the text, use Unpublish instead.</li>
          </ul>
        )}
      />

      <ConfirmDialog
        open={pending?.kind === 'switch'}
        tone="neutral"
        title="Leave without saving?"
        confirmLabel="Discard changes"
        onCancel={() => setPending(null)}
        onConfirm={() => { const p = pending; setPending(null); apply(p.base, p.locale, p.scroll); }}
        body={<p>The changes in the editor have not been saved as a draft or published. They will be lost.</p>}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * One route's override. Keyed by route and last save, so it starts fresh from
 * the saved row after every write and when another page is chosen.
 */
function RouteEditor({ route, row, liveRows, onDirty, onSaved, onAskDelete }) {
  const builtIn = useMemo(() => builtInSeo(route), [route]);
  const [baseline] = useState(() => seoFormFor(row));
  const [form, setForm] = useState(baseline);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [brokenImage, setBrokenImage] = useState('');

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useUnsavedGuard(dirty);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);

  const english = isEnglishRoute(route);
  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      /* Opting in starts from the page's own address, the one it has now. */
      if (key === 'useCanonical' && value && !f.canonical) next.canonical = builtIn.url;
      return next;
    });
  };

  const title = cleanText(form.title);
  const description = cleanText(form.description);
  const shownTitle = title || builtIn.title;
  const shownDescription = description || builtIn.description;
  const canonical = form.useCanonical ? cleanCanonical(form.canonical) : '';
  const imageUrl = resolveOgImage(form.og_image_path, SUPABASE_URL);
  const imageGiven = form.og_image_path.trim() !== '';

  const titleClash = english && title ? duplicateOf('title', title, route, liveRows) : null;
  const descriptionClash = english && description ? duplicateOf('description', description, route, liveRows) : null;
  const problems = [
    form.useCanonical && !canonical && `The canonical address must be a full https://${SITE_HOST}/… address, with no ? or #.`,
    imageGiven && !imageUrl && 'The share image must be a site file such as /og-cover.jpg, a path in the site-media bucket, or a full https:// address.',
    titleClash && `This title is already used by ${titleClash}. Every page needs its own — the site's SEO check refuses repeats.`,
    descriptionClash && `This description is already used by ${descriptionClash}. Every page needs its own.`,
  ].filter(Boolean);

  const fields = seoFields(form);
  const empty = !fields.title && !fields.description && !fields.og_image_path && !fields.canonical && !fields.noindex;
  const nothingNew = !dirty && row?.published && !row?.draft;

  const run = async (kind, fn, okText) => {
    setBusy(kind);
    setMessage(null);
    try {
      const saved = await fn();
      /* The parent's list changes and this editor remounts from the new row. */
      onSaved(saved, okText);
    } catch (err) {
      console.error('[NGD Admin] seo write failed:', err);
      setMessage(err.message || 'That could not be saved.');
      setBusy(null);
    }
  };

  const stateLine = !row
    ? 'No override. This page uses its built-in title and description.'
    : row.published && row.draft
      ? `Live, with an unpublished draft (shown below, last saved ${day(row.updated_at)}). The site still shows the live values.`
      : row.published
        ? `Live (last saved ${day(row.updated_at)}). Publish to change it, or save a draft to work on it privately.`
        : row.draft
          ? 'Draft only. Not on the site: the page uses its built-in values until you publish.'
          : 'Unpublished. The page uses its built-in values.';

  return (
    <section className={own.editor} aria-labelledby="seo-editor-title">
      <header className={own.editorHead}>
        <div>
          <p className={styles.eyebrow}>Editing</p>
          <h2 id="seo-editor-title" tabIndex={-1}>{route}</h2>
          <p className={own.stateLine}>{stateLine}</p>
        </div>
        <a className={styles.toolBtn} href={route} target="_blank" rel="noopener noreferrer">
          <SquareArrowOutUpRight size={13} aria-hidden="true" /> Open page
        </a>
      </header>

      {message && <p className={own.msgBad} role="alert">{message}</p>}

      <div className={own.builtIn}>
        <p className={own.boxTitle}>Built-in (from the site&apos;s code)</p>
        <dl>
          <dt>Title</dt>
          <dd>{builtIn.title}</dd>
          <dt>Description</dt>
          <dd>{builtIn.description}</dd>
        </dl>
        <button
          type="button"
          className={styles.toolBtn}
          disabled={Boolean(busy)}
          onClick={() => setForm((f) => ({ ...f, title: builtIn.title, description: builtIn.description }))}
        >
          Start from the built-in text
        </button>
      </div>

      <Field
        id="seo-title"
        label="Title"
        value={form.title}
        onChange={set('title')}
        placeholder={builtIn.title}
        max={SEO_LIMITS.title.max}
        ideal={SEO_LIMITS.title.ideal}
        kind="title"
        invalid={Boolean(titleClash)}
      />

      <Field
        id="seo-description"
        label="Description"
        value={form.description}
        onChange={set('description')}
        placeholder={builtIn.description}
        max={SEO_LIMITS.description.max}
        ideal={SEO_LIMITS.description.ideal}
        kind="description"
        multiline
        invalid={Boolean(descriptionClash)}
      />

      <figure className={own.preview}>
        <figcaption className={own.boxTitle}>Search result preview <span>approximate</span></figcaption>
        <div className={own.snippet}>
          <div className={own.snipSite}>
            <span className={own.snipIcon} aria-hidden="true">N</span>
            <span className={own.snipName}>
              <b>New Grown Diamond</b>
              <cite>{crumbs(canonical || builtIn.url)}</cite>
            </span>
          </div>
          <p className={own.snipTitle}>{shownTitle}</p>
          <p className={own.snipDesc}>{shownDescription}</p>
        </div>
        {form.noindex && <p className={own.snipOff}>With noindex on, this page is left out of search results altogether.</p>}
      </figure>

      <div className={own.field}>
        <label htmlFor="seo-image">Share image <em>optional</em></label>
        <input
          id="seo-image"
          value={form.og_image_path}
          onChange={set('og_image_path')}
          placeholder="/og-cover.jpg (the house card)"
          maxLength={SEO_LIMITS.path}
          spellCheck="false"
          aria-invalid={imageGiven && !imageUrl ? 'true' : undefined}
          aria-describedby="seo-image-hint"
        />
        <span id="seo-image-hint" className={own.hint}>
          Shown when the page is shared. A site file (/og-cover.jpg), a path in the Media Library&apos;s site-media bucket, or a full https:// address. 1200 × 630 JPEG works everywhere.
        </span>
        {imageUrl && (brokenImage === imageUrl
          ? <p className={own.hintBad}>That image could not be loaded. Check the path.</p>
          : <img className={own.ogImage} src={imageUrl} alt="" loading="lazy" decoding="async" onError={() => setBrokenImage(imageUrl)} />)}
      </div>

      <div className={own.options}>
        <label className={own.check}>
          <input type="checkbox" checked={form.noindex} onChange={set('noindex')} />
          Hide this page from search engines (noindex)
        </label>
        <label className={own.check}>
          <input type="checkbox" checked={form.useCanonical} onChange={set('useCanonical')} />
          Use a different canonical address
        </label>
        {form.useCanonical && (
          <div className={own.field}>
            <label htmlFor="seo-canonical">Canonical address</label>
            <input
              id="seo-canonical"
              type="url"
              value={form.canonical}
              onChange={set('canonical')}
              placeholder={builtIn.url}
              maxLength={SEO_LIMITS.path}
              spellCheck="false"
              aria-invalid={!canonical ? 'true' : undefined}
            />
          </div>
        )}
        <p className={own.hint}>
          Both are applied by the page itself when it loads, which Google reads. The copy of the page
          prepared for crawlers keeps its own address and stays indexable, as the site&apos;s SEO check
          requires. A wrong canonical tells search engines to drop this page, so use it only to point at a
          true duplicate on this site.
        </p>
      </div>

      {problems.length > 0 && (
        <ul className={own.problems} role="status">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {empty && (
        <p className={own.hint}>
          {row?.published
            ? 'Every field is empty. To take the override off the site, use Unpublish or Revert to built-in.'
            : 'Every field is empty, so there is nothing to publish: the page already uses its built-in values.'}
        </p>
      )}

      <div className={own.actions}>
        <button
          type="button"
          className={own.save}
          disabled={Boolean(busy) || problems.length > 0 || empty || nothingNew}
          onClick={() => run('publish', () => adminPublishSeo(route, form, row), `Published for ${route}. The live site picks it up within minutes; crawler copies at the next deploy.`)}
        >
          {busy === 'publish' ? 'Publishing…' : 'Publish'}
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          disabled={Boolean(busy) || !dirty}
          onClick={() => run('draft', () => adminSaveSeoDraft(route, form, row), `Draft saved for ${route}. Nothing changed on the site.`)}
        >
          {busy === 'draft' ? 'Saving…' : 'Save draft'}
        </button>
        {row?.published && (
          <button
            type="button"
            className={styles.toolBtn}
            disabled={Boolean(busy)}
            onClick={() => run('unpublish', () => adminUnpublishSeo(row), `${route} is back on its built-in values. The override is kept as a draft.`)}
          >
            {busy === 'unpublish' ? 'Working…' : 'Unpublish'}
          </button>
        )}
        {row?.published && row?.draft && (
          <button
            type="button"
            className={styles.toolBtn}
            disabled={Boolean(busy)}
            onClick={() => run('discard', () => adminDiscardSeoDraft(row), 'Draft discarded. The live override is unchanged.')}
          >
            {busy === 'discard' ? 'Working…' : 'Discard draft'}
          </button>
        )}
        {row && (
          <button type="button" className={styles.toolBtnDanger} disabled={Boolean(busy)} onClick={() => onAskDelete(row)}>
            Revert to built-in
          </button>
        )}
      </div>
    </section>
  );
}

/** A text field with its length, measured against the guidance as you type. */
function Field({ id, label, value, onChange, placeholder, max, ideal, kind, multiline = false, invalid = false }) {
  const n = cleanText(value).length;
  const v = verdict(n, ideal, kind);
  const Input = multiline ? 'textarea' : 'input';
  return (
    <div className={own.field}>
      <label htmlFor={id}>
        {label}
        <span className={own.count} data-tone={v.tone}>{n} / aim {ideal[0]}–{ideal[1]}</span>
      </label>
      <Input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={max}
        rows={multiline ? 4 : undefined}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={`${id}-hint`}
      />
      <span id={`${id}-hint`} className={own.hint} data-tone={v.tone}>
        {n === 0 ? `Empty, so the built-in ${label.toLowerCase()} is used.` : `${v.text}. Clear it to go back to the built-in ${label.toLowerCase()}.`}
      </span>
    </div>
  );
}
