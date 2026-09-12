import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PowerOff, RotateCcw, Save, Undo2, Upload } from 'lucide-react';

import { ErrorState } from '@/components/admin/AdminBits.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { AnnouncementView } from '@/components/chrome/AnnouncementBar.jsx';
import barStyles from '@/components/chrome/AnnouncementBar.module.css';
import { useToasts, useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import { INTRO_FIELDS, INTRO_ROUTES, LANGS, LIMITS, applyIntroOverride, isHttpsUrl } from '@/lib/siteContentStore.js';
import {
  LANG_LABELS,
  ROUTE_LABELS,
  blankAnnouncement,
  blankIntro,
  builtInIntro,
  discardAnnouncementDraft,
  discardIntroDraft,
  loadWebsiteContent,
  publishAnnouncement,
  publishIntro,
  revertAnnouncement,
  revertIntro,
  saveAnnouncementDraft,
  saveIntroDraft,
  turnOffAnnouncement,
  unpublishIntro,
  validateAnnouncement,
  validateIntro,
} from '@/lib/supabase/queries/siteContentAdmin.js';
import base from './AdminDiamonds.module.css';
import jf from './AdminJournal.module.css';
import own from './AdminContent.module.css';

/* ---------------- small helpers ---------------- */

const copy = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const noop = () => {};

/* The bar's own words in the preview. The storefront shows them per language. */
const BAR_LABELS = { region: 'Announcement', dismiss: 'Dismiss announcement', newTab: '(opens in a new tab)' };

const FIELD_LABELS = { eyebrow: 'Eyebrow', title: 'Title', intro: 'Introduction' };

/** ISO timestamp ↔ the value a datetime-local input holds, in local time. */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const when = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function focusFirstInvalid() {
  requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
}

/** A segmented control: one of several, as pressed buttons. */
function Segmented({ label, options, value, onChange, marks = {} }) {
  return (
    <div className={base.tabs} role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          className={base.tab}
          data-on={value === key ? '' : undefined}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {text}
          {marks[key] ? (
            <span className={own.mark} data-tone={marks[key]}>
              <span className="u-visually-hidden">{marks[key] === 'bad' ? ' (has errors)' : ' (edited)'}</span>
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** A storefront-coloured frame for previews, in the theme chosen. */
function Frame({ look, width = 'wide', children }) {
  return (
    <div className={own.frame} data-look={look} data-width={width} inert>
      <div className={own.fakeHeader} aria-hidden="true">
        <span>New Grown Diamond</span>
        <i /><i /><i />
      </div>
      {children}
    </div>
  );
}

/* ---------------- the announcement bar ---------------- */

function announcementForm(model) {
  const source = model.pending ?? model.live ?? blankAnnouncement();
  return {
    enabled: source.enabled !== false,
    message: { ...source.message },
    linkLabel: { ...source.linkLabel },
    href: source.href,
    endsAt: toLocalInput(source.endsAt),
  };
}

const announcementValues = (form) => ({ ...form, endsAt: fromLocalInput(form.endsAt) });

function announcementStatus(model) {
  if (!model.row) return { pill: 'Built-in', tone: 'off', text: 'Nothing saved. The website has no announcement bar.' };
  const live = model.live;
  const ends = live?.endsAt ? Date.parse(live.endsAt) : null;
  let status;
  if (model.published && live) {
    status = ends && ends <= Date.now()
      ? { pill: 'Expired', tone: 'hidden', text: `Published, but its end date (${when(live.endsAt)}) has passed, so it is not showing.` }
      : { pill: 'Live', tone: 'on', text: ends ? `Showing on every page until ${when(live.endsAt)}.` : 'Showing on every page.' };
  } else if (live) {
    status = { pill: 'Off', tone: 'hidden', text: 'Saved but switched off, so it is not showing.' };
  } else {
    status = { pill: 'Draft', tone: 'hidden', text: 'Only a draft exists. Nothing is showing.' };
  }
  if (model.pending && live) status.text += ` An unpublished draft was saved ${when(model.row.updated_at)}.`;
  return status;
}

/**
 * Whether each language's message fits on one line of a 390 px phone.
 * Measured on hidden copies of the real bar, and again once web fonts land
 * (Devanagari and Gujarati faces load only when used).
 */
function usePhoneFit(deps) {
  const ref = useRef(null);
  const [fits, setFits] = useState({});
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      const root = ref.current;
      if (!root || !alive) return;
      const next = {};
      root.querySelectorAll('[data-measure]').forEach((frame) => {
        const message = frame.querySelector(`.${CSS.escape(barStyles.message)}`);
        next[frame.dataset.measure] = message ? message.scrollWidth <= message.clientWidth + 1 : true;
      });
      setFits((previous) => (same(previous, next) ? previous : next));
    };
    measure();
    document.fonts?.ready?.then(measure);
    return () => { alive = false; };
  }, [deps]);
  return [ref, fits];
}

function AnnouncementEditor({ model, onModel, toast }) {
  const baseline = useMemo(() => announcementForm(model), [model]);
  const [form, setForm] = useState(baseline);
  const [lang, setLang] = useState('en');
  const [tried, setTried] = useState('');
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [look, setLook] = useState('light');
  const [width, setWidth] = useState('phone');

  const dirty = !same(form, baseline);
  useUnsavedGuard(dirty);

  const values = useMemo(() => announcementValues(form), [form]);
  const errors = useMemo(
    () => (tried ? validateAnnouncement(values, { publishing: tried === 'publish' }) : {}),
    [values, tried],
  );
  const status = announcementStatus(model);
  const canPublish = dirty || Boolean(model.pending) || (!model.published && Boolean(model.live) && form.enabled);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setPerLang = (key, value) => setForm((f) => ({ ...f, [key]: { ...f[key], [lang]: value } }));

  const messageFor = (l) => form.message[l].trim() || form.message.en.trim();
  const linkFor = (l) => (form.href.trim()
    ? { href: form.href.trim(), external: isHttpsUrl(form.href.trim()), label: form.linkLabel[l].trim() || form.linkLabel.en.trim() || 'Link text' }
    : null);
  const [measureRef, fits] = usePhoneFit(JSON.stringify(form));

  const langMarks = Object.fromEntries(LANGS.map((l) => [
    l,
    errors[`message.${l}`] || errors[`linkLabel.${l}`] ? 'bad' : (form.message[l] !== baseline.message[l] || form.linkLabel[l] !== baseline.linkLabel[l]) ? 'edit' : '',
  ]));

  /* `keepEdits`: switching off leaves an edit in progress where it is. */
  const run = async (kind, work, okText, keepEdits = false) => {
    setBusy(kind);
    try {
      const next = await work();
      onModel(next);
      if (!(keepEdits && dirty)) {
        setForm(announcementForm(next));
        setTried('');
      }
      toast.ok(okText);
    } catch (err) {
      console.error('[NGD Admin] announcement change failed:', err);
      toast.error(err.message || 'The change could not be saved.');
    } finally {
      setBusy('');
      setConfirm(false);
    }
  };

  const refuse = (found) => {
    const firstLang = LANGS.find((l) => found[`message.${l}`] || found[`linkLabel.${l}`]);
    if (firstLang && !found[`message.${lang}`] && !found[`linkLabel.${lang}`]) setLang(firstLang);
    toast.error('Some fields need attention first.');
    focusFirstInvalid();
  };

  const onDraft = () => {
    setTried('draft');
    const found = validateAnnouncement(values);
    if (Object.keys(found).length) { refuse(found); return; }
    run('draft', () => saveAnnouncementDraft(values, model), 'Draft saved. Nothing on the website has changed.');
  };

  const onPublish = () => {
    setTried('publish');
    const found = validateAnnouncement(values, { publishing: true });
    if (Object.keys(found).length) { refuse(found); return; }
    run('publish', () => publishAnnouncement(values, model), values.enabled
      ? 'Published. Visitors see the bar from the next page they open.'
      : 'Saved with the bar switched off. It is not showing.');
  };

  const isBusy = Boolean(busy);
  const count = (value, max) => `${value.length}/${max}`;

  return (
    <div className={own.layout}>
      <div className={own.column}>
        <section className={jf.box} aria-labelledby="announce-edit">
          <div className={own.boxHead}>
            <h2 id="announce-edit">Announcement bar</h2>
            <span className={base.pill} data-tone={status.tone}>{status.pill}</span>
          </div>
          <p className={own.status}>{status.text}</p>

          <label className={jf.check}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
            Show on the website when published
          </label>

          <Segmented
            label="Language"
            options={LANGS.map((l) => [l, LANG_LABELS[l]])}
            value={lang}
            onChange={setLang}
            marks={langMarks}
          />

          <label className={jf.field}>
            <span>Message · {LANG_LABELS[lang]} <em>{count(form.message[lang], LIMITS.message)}</em></span>
            <input
              value={form.message[lang]}
              onChange={(e) => setPerLang('message', e.target.value)}
              maxLength={LIMITS.message}
              lang={lang}
              placeholder={lang === 'en' ? 'For example: The Mumbai office is closed on 2 October.' : 'Leave empty to show the English message'}
              aria-invalid={errors[`message.${lang}`] ? 'true' : undefined}
            />
            {errors[`message.${lang}`]
              ? <span className={jf.fieldError}>{errors[`message.${lang}`]}</span>
              : <span className={jf.hint}>One short line. Around 45 characters fit on a phone with a link beside them; the preview says when it does not.</span>}
          </label>

          <label className={jf.field}>
            <span>Link text · {LANG_LABELS[lang]} <em>optional</em></span>
            <input
              value={form.linkLabel[lang]}
              onChange={(e) => setPerLang('linkLabel', e.target.value)}
              maxLength={LIMITS.linkLabel}
              lang={lang}
              placeholder={lang === 'en' ? 'For example: See the stock' : 'Leave empty to use the English link text'}
              aria-invalid={errors[`linkLabel.${lang}`] ? 'true' : undefined}
            />
            {errors[`linkLabel.${lang}`] ? <span className={jf.fieldError}>{errors[`linkLabel.${lang}`]}</span> : null}
          </label>

          <label className={jf.field}>
            <span>Link goes to <em>optional · all languages</em></span>
            <input
              value={form.href}
              onChange={(e) => set('href', e.target.value)}
              maxLength={LIMITS.href}
              placeholder="/diamonds or https://…"
              spellCheck="false"
              aria-invalid={errors.href ? 'true' : undefined}
            />
            {errors.href
              ? <span className={jf.fieldError}>{errors.href}</span>
              : <span className={jf.hint}>A path on this site (it keeps the visitor&apos;s language) or a full https:// address (opens in a new tab).</span>}
          </label>

          <label className={jf.field}>
            <span>Hide automatically after <em>optional</em></span>
            <span className={own.inline}>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                aria-invalid={errors.endsAt ? 'true' : undefined}
              />
              {form.endsAt && (
                <button type="button" className={jf.ghostBtn} onClick={() => set('endsAt', '')}>Clear</button>
              )}
            </span>
            {errors.endsAt
              ? <span className={jf.fieldError}>{errors.endsAt}</span>
              : <span className={jf.hint}>Your local time. The bar disappears by itself at this moment.</span>}
          </label>

          <div className={jf.actions}>
            <button type="button" className={jf.save} onClick={onPublish} disabled={isBusy || !canPublish}>
              <Upload size={13} aria-hidden="true" /> {busy === 'publish' ? 'Publishing…' : 'Publish'}
            </button>
            <button type="button" className={jf.ghostBtn} onClick={onDraft} disabled={isBusy || !dirty}>
              <Save size={13} aria-hidden="true" /> {busy === 'draft' ? 'Saving…' : 'Save draft'}
            </button>
            {dirty && (
              <button type="button" className={jf.ghostBtn} onClick={() => { setForm(baseline); setTried(''); }} disabled={isBusy}>
                <Undo2 size={13} aria-hidden="true" /> Undo edits
              </button>
            )}
          </div>

          {(model.published || model.pending || model.row) && (
            <div className={own.secondary}>
              {model.published && (
                <button type="button" className={jf.ghostBtn} disabled={isBusy} onClick={() => run('off', () => turnOffAnnouncement(model), 'Switched off. The bar is no longer showing.', true)}>
                  <PowerOff size={13} aria-hidden="true" /> Turn off now
                </button>
              )}
              {model.pending && (
                <button type="button" className={jf.ghostBtn} disabled={isBusy} onClick={() => run('discard', () => discardAnnouncementDraft(model), 'Draft discarded.')}>
                  Discard draft
                </button>
              )}
              {model.row && (
                <button type="button" className={jf.ghostBtn} disabled={isBusy} onClick={() => setConfirm(true)}>
                  <RotateCcw size={13} aria-hidden="true" /> Revert to built-in
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className={own.column}>
        <section className={jf.box} aria-labelledby="announce-preview">
          <div className={own.boxHead}>
            <h2 id="announce-preview">Preview · {LANG_LABELS[lang]}</h2>
          </div>
          <div className={own.controls}>
            <Segmented label="Theme" options={[['light', 'Light'], ['dark', 'Dark']]} value={look} onChange={setLook} />
            <Segmented label="Width" options={[['phone', 'Phone'], ['wide', 'Wide']]} value={width} onChange={setWidth} />
          </div>
          <Frame look={look} width={width}>
            {messageFor(lang)
              ? (
                <AnnouncementView
                  preview
                  message={messageFor(lang)}
                  link={linkFor(lang)}
                  labels={BAR_LABELS}
                  onDismiss={noop}
                />
              )
              : <p className={own.frameEmpty}>Write the English message to see the bar.</p>}
            <div className={own.fakePage} aria-hidden="true"><b /><i /><i /></div>
          </Frame>
          <ul className={own.fits} aria-live="polite">
            {LANGS.map((l) => (
              <li key={l} data-tone={!form.message[l].trim() ? 'quiet' : fits[l] === false ? 'bad' : 'ok'}>
                {LANG_LABELS[l]}:{' '}
                {!form.message[l].trim()
                  ? (l === 'en' ? 'no message yet' : 'shows the English message')
                  : fits[l] === false ? 'cut off on a 390 px phone — shorten it' : 'fits on a phone'}
              </li>
            ))}
          </ul>
          <p className={jf.hint}>
            On the site the bar hangs just under the header, over the space every page leaves there, so nothing on the page
            moves when it appears. A visitor can close it; it stays closed for that message and comes back for a new one.
          </p>

          <div className={own.measure} ref={measureRef} aria-hidden="true" inert>
            {LANGS.map((l) => (
              <div key={l} data-measure={l} className={own.measureFrame}>
                <AnnouncementView preview message={messageFor(l) || ' '} link={linkFor(l)} labels={BAR_LABELS} onDismiss={noop} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Remove the announcement bar?"
        body={<p>The saved announcement and any draft are deleted. The website goes back to having no bar, as it is built.</p>}
        confirmLabel="Remove"
        busy={isBusy}
        onConfirm={() => run('revert', () => revertAnnouncement(model), 'Removed. The website has no announcement bar.')}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

/* ---------------- page introductions ---------------- */

const introForm = (model) => copy(model.pending ?? model.live ?? blankIntro());

function introStatus(model) {
  if (!model.row) return { pill: 'Built-in', tone: 'off', text: 'No override. The page shows its built-in words in every language.' };
  if (model.published) {
    return model.pending
      ? { pill: 'Live · draft', tone: 'on', text: `The override is live. An unpublished draft was saved ${when(model.row.updated_at)}.` }
      : { pill: 'Live', tone: 'on', text: `The override is live (published ${when(model.row.updated_at)}).` };
  }
  return model.live
    ? { pill: 'Hidden', tone: 'hidden', text: 'An override is saved but unpublished, so the page shows its built-in words.' }
    : { pill: 'Draft', tone: 'hidden', text: 'Only a draft exists. The page shows its built-in words.' };
}

function IntroEditor({ models, onModel, toast }) {
  const [route, setRoute] = useState(INTRO_ROUTES[0]);
  const [forms, setForms] = useState(() => Object.fromEntries(INTRO_ROUTES.map((r) => [r, introForm(models[r])])));
  const [lang, setLang] = useState('en');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [look, setLook] = useState('light');

  const baselines = useMemo(() => Object.fromEntries(INTRO_ROUTES.map((r) => [r, introForm(models[r])])), [models]);
  const dirtyRoutes = INTRO_ROUTES.filter((r) => !same(forms[r], baselines[r]));
  useUnsavedGuard(dirtyRoutes.length > 0);

  const model = models[route];
  const form = forms[route];
  const dirty = dirtyRoutes.includes(route);
  const builtIn = useMemo(() => builtInIntro(route), [route]);
  const errors = useMemo(() => (tried ? validateIntro(form) : {}), [form, tried]);
  const status = introStatus(model);
  const canPublish = dirty || Boolean(model.pending) || (!model.published && Boolean(model.live));

  const setField = (field, value) => setForms((all) => ({
    ...all,
    [route]: { ...all[route], [lang]: { ...all[route][lang], [field]: value } },
  }));

  const fillBuiltIn = () => setForms((all) => ({
    ...all,
    [route]: {
      ...all[route],
      [lang]: Object.fromEntries(INTRO_FIELDS.map((f) => [f, all[route][lang][f] || builtIn[lang][f]])),
    },
  }));

  /* `keepEdits`: unpublishing leaves an edit in progress where it is. */
  const run = async (kind, work, okText, keepEdits = false) => {
    const target = route;
    setBusy(kind);
    try {
      const next = await work();
      onModel(target, next);
      if (!(keepEdits && dirty)) {
        setForms((all) => ({ ...all, [target]: introForm(next) }));
        setTried(false);
      }
      toast.ok(okText);
    } catch (err) {
      console.error('[NGD Admin] page intro change failed:', err);
      toast.error(err.message || 'The change could not be saved.');
    } finally {
      setBusy('');
      setConfirm(false);
    }
  };

  const refuse = (found) => {
    const firstLang = LANGS.find((l) => INTRO_FIELDS.some((f) => found[`${l}.${f}`]));
    if (firstLang && !INTRO_FIELDS.some((f) => found[`${lang}.${f}`])) setLang(firstLang);
    toast.error('Some fields need attention first.');
    focusFirstInvalid();
  };

  const attempt = (kind, work, okText) => {
    setTried(true);
    const found = validateIntro(form);
    if (Object.keys(found).length) { refuse(found); return; }
    run(kind, work, okText);
  };

  const langMarks = Object.fromEntries(LANGS.map((l) => [
    l,
    INTRO_FIELDS.some((f) => errors[`${l}.${f}`]) ? 'bad' : !same(form[l], baselines[route][l]) ? 'edit' : '',
  ]));

  /* What a visitor would see in this language with the form as it stands. */
  const trimmed = Object.fromEntries(INTRO_FIELDS.map((f) => [f, form[lang][f].replace(/\s+/g, ' ').trim()]));
  const shown = applyIntroOverride(builtIn[lang], { [lang]: trimmed }, lang);
  const staleTranslation = lang !== 'en'
    ? INTRO_FIELDS.filter((f) => form.en[f].trim() && !form[lang][f].trim())
    : [];

  const isBusy = Boolean(busy);

  return (
    <div className={own.introWrap}>
      <div className={own.routes} role="group" aria-label="Editorial page">
        {INTRO_ROUTES.map((r) => {
          const s = introStatus(models[r]);
          return (
            <button
              key={r}
              type="button"
              className={own.route}
              data-on={r === route ? '' : undefined}
              aria-pressed={r === route}
              onClick={() => { setRoute(r); setTried(false); }}
            >
              <span className={own.routeName}>
                {ROUTE_LABELS[r]}
                {dirtyRoutes.includes(r) ? (
                  <span className={own.mark} data-tone="edit"><span className="u-visually-hidden"> (unsaved edits)</span></span>
                ) : null}
              </span>
              <span className={own.routePath}>{r}</span>
              <span className={base.pill} data-tone={s.tone}>{s.pill}</span>
            </button>
          );
        })}
      </div>

      <div className={own.layout}>
        <div className={own.column}>
          <section className={jf.box} aria-labelledby="intro-edit">
            <div className={own.boxHead}>
              <h2 id="intro-edit">{ROUTE_LABELS[route]} · {route}</h2>
              <span className={base.pill} data-tone={status.tone}>{status.pill}</span>
            </div>
            <p className={own.status}>{status.text}</p>

            <Segmented
              label="Language"
              options={LANGS.map((l) => [l, LANG_LABELS[l]])}
              value={lang}
              onChange={setLang}
              marks={langMarks}
            />

            <p className={jf.hint}>
              Empty fields keep the page&apos;s built-in {LANG_LABELS[lang]} text, shown greyed in each box. Plain text only.
            </p>
            {staleTranslation.length > 0 && (
              <p className={base.note}>
                The English {staleTranslation.map((f) => FIELD_LABELS[f].toLowerCase()).join(' and ')} is overridden, but the
                {' '}{LANG_LABELS[lang]} one is empty — {LANG_LABELS[lang]} visitors still see the built-in translation of the old wording.
              </p>
            )}

            {INTRO_FIELDS.map((f) => {
              const key = `${lang}.${f}`;
              const value = form[lang][f];
              const Control = f === 'intro' ? 'textarea' : 'input';
              return (
                <label key={key} className={jf.field}>
                  <span>{FIELD_LABELS[f]} · {LANG_LABELS[lang]} <em>{value ? `${value.length}/${LIMITS[f]}` : 'built-in'}</em></span>
                  <Control
                    value={value}
                    onChange={(e) => setField(f, e.target.value)}
                    maxLength={LIMITS[f]}
                    placeholder={builtIn[lang][f]}
                    lang={lang}
                    rows={f === 'intro' ? 5 : undefined}
                    aria-invalid={errors[key] ? 'true' : undefined}
                  />
                  {errors[key] ? <span className={jf.fieldError}>{errors[key]}</span> : null}
                </label>
              );
            })}

            <div className={own.secondary}>
              <button type="button" className={jf.ghostBtn} onClick={fillBuiltIn} disabled={INTRO_FIELDS.every((f) => form[lang][f])}>
                Start from the built-in {LANG_LABELS[lang]} text
              </button>
            </div>

            <div className={jf.actions}>
              <button
                type="button"
                className={jf.save}
                disabled={isBusy || !canPublish}
                onClick={() => attempt('publish', () => publishIntro(route, form, model), 'Published. Visitors see it the next time they open the page.')}
              >
                <Upload size={13} aria-hidden="true" /> {busy === 'publish' ? 'Publishing…' : 'Publish'}
              </button>
              <button
                type="button"
                className={jf.ghostBtn}
                disabled={isBusy || !dirty}
                onClick={() => attempt('draft', () => saveIntroDraft(route, form, model), 'Draft saved. Nothing on the website has changed.')}
              >
                <Save size={13} aria-hidden="true" /> {busy === 'draft' ? 'Saving…' : 'Save draft'}
              </button>
              {dirty && (
                <button
                  type="button"
                  className={jf.ghostBtn}
                  disabled={isBusy}
                  onClick={() => { setForms((all) => ({ ...all, [route]: copy(baselines[route]) })); setTried(false); }}
                >
                  <Undo2 size={13} aria-hidden="true" /> Undo edits
                </button>
              )}
            </div>

            {model.row && (
              <div className={own.secondary}>
                {model.published && (
                  <button type="button" className={jf.ghostBtn} disabled={isBusy} onClick={() => run('unpublish', () => unpublishIntro(route, model), 'Unpublished. The page shows its built-in words; the override is kept.', true)}>
                    <PowerOff size={13} aria-hidden="true" /> Unpublish
                  </button>
                )}
                {model.pending && (
                  <button type="button" className={jf.ghostBtn} disabled={isBusy} onClick={() => run('discard', () => discardIntroDraft(route, model), 'Draft discarded.')}>
                    Discard draft
                  </button>
                )}
                <button type="button" className={jf.ghostBtn} disabled={isBusy} onClick={() => setConfirm(true)}>
                  <RotateCcw size={13} aria-hidden="true" /> Revert to built-in
                </button>
              </div>
            )}
          </section>
        </div>

        <div className={own.column}>
          <section className={jf.box} aria-labelledby="intro-preview">
            <div className={own.boxHead}>
              <h2 id="intro-preview">Preview · {LANG_LABELS[lang]}</h2>
            </div>
            <div className={own.controls}>
              <Segmented label="Theme" options={[['light', 'Light'], ['dark', 'Dark']]} value={look} onChange={setLook} />
            </div>
            <Frame look={look}>
              <div className={own.hero} lang={lang}>
                <p className={own.heroEyebrow}>{shown.eyebrow}</p>
                <p className={own.heroTitle}>{shown.title}</p>
                <p className={own.heroIntro}>{shown.intro}</p>
              </div>
            </Frame>
            <ul className={own.fits}>
              {INTRO_FIELDS.map((f) => (
                <li key={f} data-tone={trimmed[f] ? 'ok' : 'quiet'}>
                  {FIELD_LABELS[f]}: {trimmed[f] ? 'your text' : 'built-in text'}
                </li>
              ))}
            </ul>
            <p className={jf.hint}>
              The page&apos;s search-engine title and description are separate and do not change. A visitor already on the page
              sees the new words the next time they open it, so the heading never changes under them.
            </p>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title={`Revert ${ROUTE_LABELS[route]} to its built-in words?`}
        body={<p>The override and any draft for {route} are deleted, in all three languages. The page shows the words it is built with.</p>}
        confirmLabel="Revert"
        busy={isBusy}
        onConfirm={() => run('revert', () => revertIntro(route, model), 'Reverted. The page shows its built-in words.')}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

/* ---------------- the screen ---------------- */

const TABS = [['announcement', 'Announcement bar'], ['intros', 'Page introductions']];

/**
 * Website Content.
 *
 * Two editors on public.site_content (page = content): the announcement bar
 * and the introductions of the six editorial pages, each in English, Hindi
 * and Gujarati, with a draft, a preview, publish, and "revert to built-in",
 * which deletes the row so the page falls back to the words in the code.
 *
 * Both editors stay mounted while hidden, so switching tabs never throws away
 * an edit; leaving the page with one unsaved is warned about.
 */
export default function AdminContent() {
  const [tab, setTab] = useState('announcement');
  const [stage, setStage] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const t = useToasts();

  const load = useCallback(async () => {
    try {
      const result = await loadWebsiteContent();
      if (result.unconfigured) {
        setError('This deployment is not connected to its database, so nothing can be saved.');
        setStage('error');
        return;
      }
      setData(result);
      setError(null);
      setStage('ready');
    } catch (err) {
      console.error('[NGD Admin] website content load failed:', err);
      setError(err.message || 'The website content could not be read.');
      setStage('error');
    }
  }, []);

  // `load` starts a request; state changes only when it answers.
  // oxlint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const onAnnouncement = useCallback((model) => setData((d) => ({ ...d, announcement: model })), []);
  const onIntro = useCallback((route, model) => setData((d) => ({ ...d, intros: { ...d.intros, [route]: model } })), []);

  return (
    <div className={base.page}>
      <header className={base.head}>
        <div>
          <p className={base.eyebrow}>Control Centre · Website Content</p>
          <h1>Website content</h1>
          <p className={base.sub}>The announcement bar and the six editorial pages&apos; introductions, in English, Hindi and Gujarati.</p>
        </div>
        <div className={base.tabs} role="tablist" aria-label="Editors">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              id={`content-tab-${key}`}
              type="button"
              role="tab"
              className={base.tab}
              data-on={tab === key ? '' : undefined}
              aria-selected={tab === key}
              aria-controls={`content-panel-${key}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {stage === 'loading' && <p className={base.sub}>Loading the website content…</p>}
      {stage === 'error' && <ErrorState message={error} onRetry={() => { setStage('loading'); load(); }} />}

      {stage === 'ready' && data && (
        <>
          <div id="content-panel-announcement" role="tabpanel" aria-labelledby="content-tab-announcement" hidden={tab !== 'announcement'}>
            <AnnouncementEditor model={data.announcement} onModel={onAnnouncement} toast={t} />
          </div>
          <div id="content-panel-intros" role="tabpanel" aria-labelledby="content-tab-intros" hidden={tab !== 'intros'}>
            <IntroEditor models={data.intros} onModel={onIntro} toast={t} />
          </div>
        </>
      )}

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
