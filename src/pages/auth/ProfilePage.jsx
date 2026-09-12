import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth.js';
import AccountDashboard from '@/pages/account/AccountDashboard.jsx';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import AuthShell from './AuthShell.jsx';
import COPY from './ProfilePage.copy.js';
import styles from './Auth.module.css';

/**
 * /account.
 *
 * Every state that is not "an active customer is signed in" keeps the auth
 * shell it always had: loading, signed out, a profile that could not be read,
 * a staff account, and an inactive customer. Only an active customer gets the
 * dashboard, which lives in src/pages/account/ and owns the profile form.
 *
 * `savedProfile` is lifted here, not kept in the form, because the name the
 * customer just saved has to reach the welcome line and the header initial as
 * well as the form — and useAuth's copy of the profile only refreshes on the
 * next sign-in.
 */
export default function ProfilePage() {
  const { status, user, profile, isAdmin, signOut } = useAuth();
  const { t } = useLocale();
  const c = useCopy(COPY);
  const [savedProfile, setSavedProfile] = useState(null);
  const current = savedProfile ?? profile;
  const activeCustomer = status === 'ready'
    && current?.role === 'customer'
    && current?.account_status === 'active';

  if (status === 'loading') {
    return (
      <AuthShell eyebrow={t('nav.account')} title={c.loading.title} intro={c.loading.intro}>
        <p className={styles.note} aria-live="polite">{c.loading.note}</p>
      </AuthShell>
    );
  }

  if (status === 'anon') {
    return (
      <AuthShell eyebrow={t('nav.account')} title={c.anon.title} intro={c.anon.intro}>
        <div className={styles.actions}>
          <a className={styles.submit} href="/login">{t('nav.signIn')}</a>
          <a className={styles.ghost} href="/register">{t('nav.register')}</a>
        </div>
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell eyebrow={t('nav.account')} title={c.error.title} intro={c.error.intro}>
        <p className={styles.note} data-tone="error" role="alert">
          {c.error.note}
        </p>
        <button type="button" className={styles.ghost} onClick={signOut}>{t('nav.signOut')}</button>
      </AuthShell>
    );
  }

  /*
   * An administrator can land here — from a bookmark, the account link, or a
   * sign-in whose profile read failed and fell back to /account — and that is
   * not a failure. It is the same branch, worded for who is actually standing
   * there.
   */
  if (!activeCustomer && isAdmin) {
    return (
      <AuthShell
        eyebrow={c.staff.eyebrow}
        title={c.staff.title}
        intro={user?.email}
        aside={<>{c.staff.orders} <a href="/contact">{c.contact}</a>{c.stop}</>}
      >
        <p className={styles.note} data-tone="good" role="status">
          {c.staff.note}
        </p>
        <div className={styles.actions}>
          <a className={styles.submit} href="/admin">{c.staff.openDesk}</a>
          <button type="button" className={styles.ghost} onClick={signOut}>{t('nav.signOut')}</button>
        </div>
      </AuthShell>
    );
  }

  if (!activeCustomer) {
    return (
      <AuthShell
        eyebrow={c.inactive.eyebrow}
        title={c.inactive.title}
        intro={c.inactive.intro}
        aside={<>{c.inactive.help} <a href="/contact">{c.contact}</a>{c.stop}</>}
      >
        <p className={styles.note} data-tone="error" role="status">
          {interpolate(c.inactive.status, { status: current?.account_status ?? c.inactive.notFound })}
        </p>
        <div className={styles.actions}>
          {isAdmin ? <a className={styles.submit} href="/admin/diamonds">{t('nav.admin')}</a> : null}
          <button type="button" className={styles.ghost} onClick={signOut}>{t('nav.signOut')}</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AccountDashboard
      user={user}
      profile={current}
      onProfileSaved={setSavedProfile}
      signOut={signOut}
    />
  );
}
