import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react';

import { ErrorState } from '@/components/admin/AdminBits.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts, useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import { DEFAULT_SETTINGS, LIMITS, SOCIAL_NETWORKS } from '@/lib/siteContentStore.js';
import {
  loadSettings,
  publishSettings,
  revertSettings,
  tidySettings,
  validateSettings,
} from '@/lib/supabase/queries/siteSettings.js';
import base from './AdminDiamonds.module.css';
import jf from './AdminJournal.module.css';
import own from './AdminSettings.module.css';

/* The homepage names the offices by position (Home.jsx), not by city. */
const SLOT_COUNTRY = ['India', 'India', 'USA', 'Hong Kong'];

const TEL_NOTE = 'International form: + then country code and number, no spaces.';

const copy = (value) => JSON.parse(JSON.stringify(value));
const at = (source, path) => path.reduce((node, key) => (node == null ? undefined : node[key]), source);

const when = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** One labelled control with its error, warning or hint beneath. */
function Field({ label, optional, error, warning, hint, children }) {
  return (
    <label className={jf.field}>
      <span>{label}{optional ? <em>optional</em> : null}</span>
      {children}
      {error
        ? <span className={jf.fieldError}>{error}</span>
        : warning
          ? <span className={own.warning}>{warning}</span>
          : hint ? <span className={jf.hint}>{hint}</span> : null}
    </label>
  );
}

/**
 * Settings: the business details the website prints.
 *
 * Stored as one published site_content row (page = settings, section =
 * business) — there is no settings table, and this screen does not need one.
 * The storefront reads the row after its first paint and keeps a copy per
 * visitor (lib/siteContentStore.js). Saving publishes; "Revert to built-in"
 * deletes the row and the site goes back to the details in the code.
 */
export default function AdminSettings() {
  const [stage, setStage] = useState('loading');
  const [loadError, setLoadError] = useState(null);
  const [row, setRow] = useState(null);
  /* What the website shows now: the baseline for "unsaved" and for the audit. */
  const [saved, setSaved] = useState(DEFAULT_SETTINGS);
  const [form, setForm] = useState(() => copy(DEFAULT_SETTINGS));
  const [tried, setTried] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const t = useToasts();

  const load = useCallback(async () => {
    try {
      const result = await loadSettings();
      if (result.unconfigured) {
        setLoadError('This deployment is not connected to its database, so nothing can be saved.');
        setStage('error');
        return;
      }
      setRow(result.row);
      setSaved(result.settings);
      /* A saved set that is switched off is shown for editing, not the defaults. */
      setForm(copy(result.unpublished ?? result.settings));
      setLoadError(null);
      setStage('ready');
    } catch (err) {
      console.error('[NGD Admin] settings load failed:', err);
      setLoadError(err.message || 'The settings could not be read.');
      setStage('error');
    }
  }, []);

  // `load` starts a request; state changes only when it answers.
  // oxlint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const values = useMemo(() => tidySettings(form), [form]);
  const check = useMemo(() => validateSettings(values), [values]);
  const errorCount = Object.keys(check.errors).length;
  const dirty = JSON.stringify(values) !== JSON.stringify(tidySettings(saved)) || Boolean(row && !row.published);
  useUnsavedGuard(dirty && stage !== 'loading');

  const setAt = (path, value) => setForm((current) => {
    const next = copy(current);
    let node = next;
    for (let i = 0; i < path.length - 1; i += 1) node = node[path[i]];
    node[path[path.length - 1]] = value;
    return next;
  });

  /**
   * A field bound to `path` in the form. Errors show once a save has been
   * tried; a warning always; otherwise the built-in value, when this differs.
   */
  const field = (path, label, render, { optional = false, note } = {}) => {
    const key = path.join('.');
    const value = at(form, path) ?? '';
    const fallback = at(DEFAULT_SETTINGS, path);
    const differs = typeof fallback === 'string' && String(value).trim() !== fallback;
    return (
      <Field
        label={label}
        optional={optional}
        error={tried ? check.errors[key] : undefined}
        warning={check.warnings[key]}
        hint={differs ? `Built-in: ${fallback || 'none'}` : note}
      >
        {render({
          value,
          onChange: (e) => setAt(path, e.target.value),
          'aria-invalid': tried && check.errors[key] ? 'true' : undefined,
        })}
      </Field>
    );
  };

  const telInput = (props) => <input {...props} inputMode="tel" autoComplete="off" maxLength={16} spellCheck="false" />;
  const phoneInput = (props) => <input {...props} inputMode="tel" autoComplete="off" maxLength={LIMITS.phone} />;
  const emailInput = (props) => <input {...props} type="email" autoComplete="off" maxLength={LIMITS.email} spellCheck="false" />;

  const onSave = async (event) => {
    event.preventDefault();
    setTried(true);
    if (errorCount) {
      t.error(`${errorCount} ${errorCount === 1 ? 'field needs' : 'fields need'} attention before this can be published.`);
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setStage('saving');
    try {
      const next = await publishSettings(values, row, saved);
      setRow(next);
      setSaved(values);
      setForm(copy(values));
      setTried(false);
      t.ok('Published. Visitors see these details from the next page they open.');
    } catch (err) {
      console.error('[NGD Admin] settings save failed:', err);
      t.error(err.message || 'The details could not be saved.');
    } finally {
      setStage('ready');
    }
  };

  const onRevert = async () => {
    setStage('saving');
    try {
      await revertSettings(row, saved);
      setRow(null);
      setSaved(DEFAULT_SETTINGS);
      setForm(copy(DEFAULT_SETTINGS));
      setTried(false);
      t.ok('Reverted. The website shows the built-in details again.');
    } catch (err) {
      console.error('[NGD Admin] settings revert failed:', err);
      t.error(err.message || 'The details could not be reverted.');
    } finally {
      setConfirmRevert(false);
      setStage('ready');
    }
  };

  const setLines = (office, lines) => setAt(['offices', office, 'lines'], lines);
  const busy = stage === 'saving';

  const status = !row
    ? 'Nothing saved yet — the website shows the built-in details from the code.'
    : row.published
      ? `Published ${when(row.updated_at)}. The website shows these details.`
      : 'A saved set exists but is switched off, so the website shows the built-in details. Publish to use it.';

  return (
    <div className={base.page}>
      <header className={base.head}>
        <div>
          <p className={base.eyebrow}>Control Centre · Settings</p>
          <h1>Business details</h1>
          <p className={base.sub}>The enquiry desk, WhatsApp number, offices and social profiles, as the website prints them.</p>
        </div>
        <span className={base.pill} data-tone={row?.published ? 'on' : 'off'}>{row?.published ? 'Saved values live' : 'Built-in'}</span>
      </header>

      {stage === 'loading' && <p className={base.sub}>Loading the saved details…</p>}
      {stage === 'error' && <ErrorState message={loadError} onRetry={() => { setStage('loading'); load(); }} />}

      {(stage === 'ready' || stage === 'saving') && (
        <form className={own.form} onSubmit={onSave} noValidate>
          <p className={own.status}>{status}</p>

          <section className={jf.box} aria-labelledby="settings-desk">
            <h2 id="settings-desk">Enquiry desk</h2>
            <div className={own.grid}>
              {field(['desk', 'phone'], 'Number as printed', phoneInput)}
              {field(['desk', 'tel'], 'Number as dialled', (p) => telInput({ ...p, placeholder: '+919913999794' }), { note: TEL_NOTE })}
              {field(['desk', 'email'], 'Desk email', emailInput)}
              {field(['whatsapp'], 'WhatsApp number', (p) => (
                <span className={own.inline}>
                  {telInput({ ...p, placeholder: '+919913999794' })}
                  <button
                    type="button"
                    className={jf.ghostBtn}
                    onClick={() => setAt(['whatsapp'], form.desk.tel)}
                    disabled={form.whatsapp === form.desk.tel}
                  >
                    Same as desk
                  </button>
                </span>
              ), { note: 'Every WhatsApp link on the site opens a chat with this number.' })}
            </div>
          </section>

          <section className={jf.box} aria-labelledby="settings-offices">
            <h2 id="settings-offices">Offices</h2>
            <p className={jf.hint}>
              Always four. The homepage labels them by position — the first two India, the third USA, the fourth Hong
              Kong — so keep each office in its slot. City names and addresses are shown exactly as typed, in every language.
            </p>
            <div className={own.offices}>
              {form.offices.map((office, i) => (
                <fieldset key={`office-${i}`} className={own.office}>
                  <legend>{String(i + 1).padStart(2, '0')} · {SLOT_COUNTRY[i]} on the homepage</legend>
                  {field(['offices', i, 'city'], 'City', (p) => <input {...p} maxLength={LIMITS.city} />)}
                  {field(['offices', i, 'address'], 'Address', (p) => <textarea {...p} rows={3} maxLength={LIMITS.address} />)}
                  <div className={own.pair}>
                    {field(['offices', i, 'phone'], 'Number as printed', phoneInput)}
                    {field(['offices', i, 'tel'], 'Number as dialled', telInput)}
                  </div>
                  {field(['offices', i, 'email'], 'Email', emailInput, { optional: true })}

                  <div className={own.lines}>
                    <p className={own.linesHead}>Further numbers <em>shown on the contact page</em></p>
                    {office.lines.map((line, j) => (
                      <div key={`line-${j}`} className={own.line}>
                        {field(['offices', i, 'lines', j, 'phone'], 'Printed', phoneInput)}
                        {field(['offices', i, 'lines', j, 'tel'], 'Dialled', telInput)}
                        <button
                          type="button"
                          className={own.remove}
                          onClick={() => setLines(i, office.lines.filter((_, k) => k !== j))}
                          aria-label={`Remove further number ${j + 1} for ${office.city || `office ${i + 1}`}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    {office.lines.length < LIMITS.lines && (
                      <button type="button" className={jf.ghostBtn} onClick={() => setLines(i, [...office.lines, { phone: '', tel: '' }])}>
                        <Plus size={13} aria-hidden="true" /> Add a number
                      </button>
                    )}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className={jf.box} aria-labelledby="settings-social">
            <h2 id="settings-social">Social profiles</h2>
            <p className={jf.hint}>Full https:// addresses. Leave one empty to hide its icon in the footer.</p>
            <div className={own.grid}>
              {SOCIAL_NETWORKS.map((network) => (
                <div key={network.key}>
                  {field(['social', network.key], network.name, (p) => (
                    <input {...p} type="url" inputMode="url" placeholder="https://" maxLength={LIMITS.url} spellCheck="false" />
                  ), { optional: true })}
                </div>
              ))}
            </div>
          </section>

          <section className={jf.box} aria-labelledby="settings-where">
            <h2 id="settings-where">Where these appear</h2>
            <ul className={own.where}>
              <li><b>Every page</b> — the footer: desk number, desk email, the office cities and the social icons.</li>
              <li><b>Contact</b> — the enquiry line, the four offices with their further numbers, and the email link.</li>
              <li><b>Home</b> — the four offices.</li>
              <li><b>WhatsApp</b> — stone enquiries, the contact form&apos;s follow-up and password help.</li>
              <li className={own.notYet}>
                Still built in, not yet reading these: the cart, stock list and jewellery pages, the account page, the phone
                menu&apos;s email line, the legal pages, an FAQ answer on the homepage, and the business details given to search engines.
              </li>
            </ul>
          </section>

          <div className={own.bar}>
            <p className={own.barNote} aria-live="polite">
              {tried && errorCount
                ? `${errorCount} ${errorCount === 1 ? 'field needs' : 'fields need'} attention.`
                : dirty ? 'Unsaved changes.' : 'No unsaved changes.'}
            </p>
            <div className={jf.actions}>
              <button type="submit" className={jf.save} disabled={busy || !dirty}>
                {busy ? 'Publishing…' : 'Save & publish'}
              </button>
              <button
                type="button"
                className={jf.ghostBtn}
                disabled={busy || !dirty}
                onClick={() => { setForm(copy(saved)); setTried(false); }}
              >
                <Undo2 size={13} aria-hidden="true" /> Discard changes
              </button>
              {row && (
                <button type="button" className={jf.ghostBtn} disabled={busy} onClick={() => setConfirmRevert(true)}>
                  <RotateCcw size={13} aria-hidden="true" /> Revert to built-in
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmRevert}
        title="Revert to the built-in details?"
        body={<p>The saved details are deleted and the website goes back to the numbers, addresses and links in the code. This cannot be undone here — they would have to be typed again.</p>}
        confirmText="revert"
        confirmLabel="Revert"
        busy={busy}
        onConfirm={onRevert}
        onCancel={() => setConfirmRevert(false)}
      />
      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
