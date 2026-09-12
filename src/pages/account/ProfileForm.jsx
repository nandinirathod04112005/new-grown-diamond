import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ProfileForm.copy.js';
import styles from './AccountDashboard.module.css';

const EMPTY_DRAFT = Object.freeze({});

/*
 * The four fields a customer may change about themselves. Role and account
 * status are NOT here and never can be: the update goes through the
 * customer_update_own_profile database function, which only accepts these
 * four arguments, so there is nothing in the browser to talk into writing
 * anything else. Their labels are worded in the visitor's language at render
 * (ProfileForm.copy.js, and `auth.fullName` for the name).
 */
const FIELDS = [
  { name: 'full_name', auto: 'name', max: 160, required: true, min: 2 },
  { name: 'company_name', auto: 'organization', max: 160 },
  { name: 'phone', auto: 'tel', max: 40, type: 'tel' },
  { name: 'country', auto: 'country-name', max: 80 },
];

/**
 * Edit your own details. Moved here unchanged in behaviour from the account
 * page: same database function, same arguments, same validation, same
 * success and failure wording.
 */
export default function ProfileForm({ profile, onSaved }) {
  const { t } = useLocale();
  const c = useCopy(COPY);
  const labels = { full_name: t('auth.fullName'), ...c.fields };
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const value = (name) => draft[name] ?? profile?.[name] ?? '';
  const dirty = Object.keys(draft).some((k) => (draft[k] ?? '') !== (profile?.[k] ?? ''));

  async function onSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!isConfigured) return;

    setBusy(true);
    setNote(null);
    const { data, error } = await supabase.rpc('customer_update_own_profile', {
      new_full_name: value('full_name').trim(),
      new_company_name: value('company_name').trim() || null,
      new_phone: value('phone').trim() || null,
      new_country: value('country').trim() || null,
    });
    setBusy(false);

    if (error) {
      console.error('[NGD profile]', error);
      setNote({ tone: 'error', text: c.failed });
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated?.id) {
      setNote({ tone: 'error', text: c.noChange });
      return;
    }

    onSaved(updated);
    setDraft(EMPTY_DRAFT);
    setNote({ tone: 'good', text: c.saved });
  }

  return (
    <form className={styles.form} onSubmit={onSave} noValidate>
      {note && (
        <p className={styles.formNote} data-tone={note.tone} role="status">
          {note.text}
        </p>
      )}
      {FIELDS.map((f) => (
        <label key={f.name} className={styles.field}>
          <span>{labels[f.name]}{f.required && <b aria-hidden="true"> *</b>}</span>
          <input
            type={f.type ?? 'text'}
            value={value(f.name)}
            maxLength={f.max}
            minLength={f.min}
            required={f.required}
            autoComplete={f.auto}
            onChange={(event) => {
              const next = event.target.value;
              setDraft((existing) => ({ ...existing, [f.name]: next }));
            }}
          />
        </label>
      ))}
      <div className={styles.formActions}>
        <button className={styles.save} type="submit" disabled={busy || !dirty}>
          {busy ? c.saving : c.save}
        </button>
        {dirty && !busy && (
          <button type="button" className={styles.linkButton} onClick={() => { setDraft(EMPTY_DRAFT); setNote(null); }}>
            {c.discard}
          </button>
        )}
      </div>
    </form>
  );
}
