import { useEffect, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { loadCustomerActivity } from '@/lib/supabase/queries/account.js';
import { useAuth } from '@/hooks/useAuth.js';
import AuthShell from './AuthShell.jsx';
import styles from './Auth.module.css';

const EMPTY_DRAFT = Object.freeze({});

export default function ProfilePage() {
  const { status, user, profile, isAdmin, signOut } = useAuth();
  const [savedProfile, setSavedProfile] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const current = savedProfile ?? profile;
  const activeCustomer = status === 'ready'
    && current?.role === 'customer'
    && current?.account_status === 'active';

  function value(name) {
    return draft[name] ?? current?.[name] ?? '';
  }

  function change(name, nextValue) {
    setDraft((existing) => ({ ...existing, [name]: nextValue }));
  }

  async function onSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!isConfigured || !user || !activeCustomer) return;

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
      setNote({ tone: 'error', text: 'Your profile could not be saved. Check your connection and try again.' });
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated?.id) {
      setNote({ tone: 'error', text: 'No profile change was returned. Your account may no longer be active.' });
      return;
    }

    setSavedProfile(updated);
    setDraft(EMPTY_DRAFT);
    setNote({ tone: 'good', text: 'Your profile was updated.' });
  }

  if (status === 'loading') {
    return (
      <AuthShell eyebrow="Account" title="Loading" intro="Checking your session.">
        <p className={styles.note} aria-live="polite">One moment…</p>
      </AuthShell>
    );
  }

  if (status === 'anon') {
    return (
      <AuthShell eyebrow="Account" title="You are not signed in" intro="Sign in to see your account, or create one if you are new.">
        <div className={styles.actions}>
          <a className={styles.submit} href="/login">Sign in</a>
          <a className={styles.ghost} href="/register">Create an account</a>
        </div>
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell eyebrow="Account" title="Something went wrong" intro="Your profile could not be loaded.">
        <p className={styles.note} data-tone="error" role="alert">
          The session is valid but the protected profile could not be read.
        </p>
        <button type="button" className={styles.ghost} onClick={signOut}>Sign out</button>
      </AuthShell>
    );
  }

  if (!activeCustomer) {
    return (
      <AuthShell
        eyebrow="Account access"
        title="Customer workspace unavailable"
        intro="This dashboard is available only to active customer accounts."
        aside={<>Need help with access? <a href="/contact">Contact the desk</a>.</>}
      >
        <p className={styles.note} data-tone="error" role="status">
          Account status: {current?.account_status ?? 'profile not found'}.
          No customer records have been loaded.
        </p>
        <div className={styles.actions}>
          {isAdmin ? <a className={styles.submit} href="/admin/diamonds">Inventory desk</a> : null}
          <button type="button" className={styles.ghost} onClick={signOut}>Sign out</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      wide
      eyebrow="Customer workspace"
      title={current?.full_name || 'Your account'}
      intro={user?.email}
      aside={<>Need something changed that is locked? <a href="/contact">Contact the desk</a>.</>}
    >
      <section className={styles.accountGrid} aria-labelledby="profile-heading">
        <div className={styles.profilePane}>
          <h2 id="profile-heading" className={styles.sectionTitle}>Profile</h2>
          <form className={styles.body} onSubmit={onSave} noValidate>
            {note && <p className={styles.note} data-tone={note.tone} role="status">{note.text}</p>}
            <label className={styles.field2}>
              <span className={styles.label}>Full name</span>
              <input className={styles.input} value={value('full_name')} minLength="2" maxLength="160" autoComplete="name" required onChange={(event) => change('full_name', event.target.value)} />
            </label>
            <label className={styles.field2}>
              <span className={styles.label}>Company</span>
              <input className={styles.input} value={value('company_name')} maxLength="160" autoComplete="organization" onChange={(event) => change('company_name', event.target.value)} />
            </label>
            <label className={styles.field2}>
              <span className={styles.label}>Phone</span>
              <input className={styles.input} value={value('phone')} maxLength="40" autoComplete="tel" onChange={(event) => change('phone', event.target.value)} />
            </label>
            <label className={styles.field2}>
              <span className={styles.label}>Country</span>
              <input className={styles.input} value={value('country')} maxLength="80" autoComplete="country-name" onChange={(event) => change('country', event.target.value)} />
            </label>
            <button className={styles.submit} type="submit" disabled={busy}>
              {busy ? <><span className={styles.spinner} aria-hidden="true" />Saving…</> : 'Save profile'}
            </button>
          </form>

          <dl className={styles.rows}>
            <div className={styles.row}><dt>Email</dt><dd>{user?.email ?? '—'}</dd></div>
            <div className={styles.row}><dt>Role</dt><dd><span className={styles.locked}><Lock />{current.role}</span></dd></div>
            <div className={styles.row}><dt>Status</dt><dd><span className={styles.locked}><Lock />{current.account_status}</span></dd></div>
          </dl>
        </div>

        <AccountActivity userId={user.id} />
      </section>

      <div className={styles.actions}>
        <a className={styles.ghost} href="/diamonds">Browse diamonds</a>
        <button type="button" className={styles.ghost} onClick={signOut}>Sign out</button>
      </div>
    </AuthShell>
  );
}

function AccountActivity({ userId }) {
  const [state, setState] = useState({ status: 'loading', sources: [] });

  useEffect(() => {
    let alive = true;
    loadCustomerActivity(userId).then((sources) => {
      if (alive) setState({ status: 'ready', sources });
    });
    return () => { alive = false; };
  }, [userId]);

  if (state.status === 'loading') {
    return <p className={styles.note} role="status">Loading your protected account activity…</p>;
  }

  return (
    <section className={styles.activity} aria-labelledby="activity-heading">
      <h2 id="activity-heading" className={styles.sectionTitle}>Activity</h2>
      <div className={styles.metrics}>
        {state.sources.map((source, index) => (
          <article key={source.key} className={styles.metric} style={{ '--i': index }}>
            <strong>{source.error ? '—' : source.count}</strong>
            <span>{source.label}</span>
          </article>
        ))}
      </div>
      <div className={styles.activityLists}>
        {state.sources.map((source) => (
          <section key={source.key} className={styles.activityGroup}>
            <header><h3>{source.label}</h3><span>{source.error ? 'Unavailable' : `${source.count} total`}</span></header>
            {source.error ? (
              <p>Could not load this panel. The other account data remains available.</p>
            ) : source.rows.length ? (
              <ul>
                {source.rows.map((row, index) => (
                  <li key={row.id ?? row.public_id ?? `${source.key}-${index}`}>
                    <span>{activityLabel(source.key, row)}</span>
                    <small>{row.status ?? (source.key === 'favourites' ? 'saved' : '')} · {formatDate(row.created_at)}</small>
                  </li>
                ))}
              </ul>
            ) : <p>No {source.label.toLowerCase()} yet.</p>}
          </section>
        ))}
      </div>
    </section>
  );
}

function activityLabel(key, row) {
  if (key === 'enquiries') return row.subject || row.public_id;
  if (key === 'favourites') return row.product_type === 'jewellery' ? 'Saved jewellery' : 'Saved diamond';
  return row.public_id || row.product_type || 'Request';
}

function formatDate(value) {
  if (!value) return 'date unavailable';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}
