import { useEffect, useMemo, useRef, useState } from 'react';

import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { useCart } from '@/cart/useCart.js';
import ThemeToggle from '@/components/chrome/ThemeToggle.jsx';
import { carat as fmtCarat, money, moneyTotals } from '@/components/product/stoneFormat.js';
import { loadCustomerActivity, loadOrders, resolveStones } from '@/lib/supabase/queries/account.js';
import { resizedImage } from '@/lib/storageImages.js';
import { ENQUIRY_DESK } from '@/pages/siteContent.js';
import { useWishlist } from '@/wishlist/useWishlist.js';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import ProfileForm from './ProfileForm.jsx';
import DeleteAccount from './DeleteAccount.jsx';
import COPY from './AccountDashboard.copy.js';
import styles from './AccountDashboard.module.css';

/**
 * The customer dashboard.
 *
 * WHAT IS REAL HERE. Every number on this page is read, never assumed:
 *   - selection and saved stones come from this device (they are kept in the
 *     browser, the same way the cart page keeps them);
 *   - enquiries, quotes, holds, inspections and favourites come from the
 *     database, scoped by row-level security to this customer;
 *   - purchases come from an `orders` table — and that table does not exist
 *     on the project yet. So "diamonds bought" and "total spent" read "—" with
 *     "not recorded online", never 0. A zero would tell a customer who bought
 *     from the desk last month that they had bought nothing. The moment the
 *     table exists (supabase/migrations/0005_customer_orders.sql, proposed and
 *     not applied), the same panels fill with real orders.
 *
 * Money is never converted between currencies. There is no exchange rate on
 * this site, and a total built on an invented rate is worse than two totals.
 */

const TABS = ['enquiries', 'quotes', 'holds', 'inspections', 'favourites'];

const WHATSAPP = `https://wa.me/${ENQUIRY_DESK.tel.replace(/\D/g, '')}`;
const EMAIL = 'newgrowndiamonds@gmail.com';

/* Month names are words, so a date is written in the visitor's language; the
   digits stay Western in all three. */
const DATE_LOCALE = { en: 'en-GB', hi: 'hi-IN', gu: 'gu-IN' };

function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }, lang = 'en-GB') {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(lang, opts);
}

/* A status word, toned only when its meaning is not in doubt. */
function tone(status = '') {
  const s = String(status).toLowerCase();
  if (['accepted', 'confirmed', 'paid', 'delivered', 'completed', 'approved', 'active', 'scheduled'].includes(s)) return 'good';
  if (['expired', 'declined', 'cancelled', 'canceled', 'rejected', 'withdrawn', 'lapsed'].includes(s)) return 'quiet';
  return 'neutral';
}

export default function AccountDashboard({ user, profile, onProfileSaved, signOut }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const { t, locale } = useLocale();
  const c = useCopy(COPY);
  const date = (value, opts) => formatDate(value, opts, DATE_LOCALE[locale] ?? DATE_LOCALE.en);
  const [activity, setActivity] = useState({ status: 'loading', sources: [] });
  const [orders, setOrders] = useState({ status: 'loading', orders: [] });
  const [stones, setStones] = useState(() => new Map());
  const [tab, setTab] = useState('enquiries');
  const tabRefs = useRef({});
  /* Read once when the page opens: whether a hold has lapsed should not
     flicker between renders. */
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    Promise.all([loadCustomerActivity(user.id), loadOrders(user.id)]).then(async ([sources, ord]) => {
      if (!alive) return;
      setActivity({ status: 'ready', sources });
      setOrders(ord);
      /* Name the stones behind each request, in one read. */
      const ids = [
        ...sources.flatMap((s) => s.rows.map((r) => r.diamond_id)),
        ...ord.orders.flatMap((o) => (o.order_items ?? []).map((i) => i.diamond_id)),
      ];
      const map = await resolveStones(ids);
      if (alive) setStones(map);
    });
    return () => {
      alive = false;
    };
  }, [user.id]);

  const source = (key) => activity.sources.find((s) => s.key === key);
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || c.welcome.there;
  const initial = (profile?.full_name || user?.email || 'N').charAt(0).toUpperCase();

  /* How much of the profile is filled in: four fields, so four steps. */
  const filled = ['full_name', 'company_name', 'phone', 'country'].filter((k) => String(profile?.[k] ?? '').trim()).length;
  const completeness = Math.round((filled / 4) * 100);

  const selectionValue = moneyTotals(cart.items.map((i) => ({ amount: i.price, currency: i.currency })));

  const purchase = useMemo(() => {
    if (orders.status !== 'ready') return null;
    const live = orders.orders.filter((o) => !['cancelled', 'canceled'].includes(String(o.status).toLowerCase()));
    const bought = live.reduce(
      (n, o) => n + (o.order_items ?? []).reduce((m, i) => m + (Number(i.quantity) || 1), 0),
      0,
    );
    const spent = moneyTotals(live.map((o) => ({ amount: o.total_amount, currency: o.currency || 'INR' })));
    /* Orders default to rupees, so an account with none reads ₹0. */
    return { bought, spent: spent ?? '₹0', orders: live.length };
  }, [orders]);

  const stoneLabel = (id, fallbackText) => {
    const s = stones.get(id);
    if (!s) return fallbackText;
    return `${s.stock_number} · ${fmtCarat(s.carat) ?? '—'} ct ${s.shape}`;
  };

  /* Arrow keys move between tabs, as the tab pattern expects. */
  function onTabKey(event) {
    const i = TABS.indexOf(tab);
    let next = null;
    if (event.key === 'ArrowRight') next = TABS[(i + 1) % TABS.length];
    if (event.key === 'ArrowLeft') next = TABS[(i - 1 + TABS.length) % TABS.length];
    if (event.key === 'Home') next = TABS[0];
    if (event.key === 'End') next = TABS[TABS.length - 1];
    if (!next) return;
    event.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  const loading = activity.status === 'loading';
  const count = (key) => {
    if (loading) return null;
    const s = source(key);
    return s?.error ? '—' : s?.count ?? 0;
  };

  /* "1 order" / "3 orders" — the plural is the copy's, per language. */
  const orderCount = (n) => interpolate(n === 1 ? c.orderOne : c.orderMany, { n });

  const STATS = [
    { key: 'selection', label: c.stats.selection, value: cart.count, sub: cart.count ? selectionValue ?? c.stats.pricesOnRequest : c.stats.nothingYet, href: '/cart' },
    { key: 'saved', label: c.stats.saved, value: wishlist?.count ?? 0, sub: c.stats.onDevice, href: '/wishlist' },
    { key: 'enquiries', label: c.stats.enquiries, value: count('enquiries'), sub: c.stats.toDesk },
    { key: 'quotes', label: c.stats.quotes, value: count('quotes'), sub: c.stats.priced },
    {
      key: 'bought',
      label: c.stats.bought,
      value: orders.status === 'loading' ? null : purchase ? purchase.bought : '—',
      sub: purchase ? orderCount(purchase.orders) : c.stats.notRecorded,
    },
    {
      key: 'spent',
      label: c.stats.spent,
      value: orders.status === 'loading' ? null : purchase ? purchase.spent : '—',
      sub: purchase ? c.stats.confirmed : c.stats.notRecorded,
      wide: true,
    },
  ];

  const current = source(tab);

  return (
    <div className={styles.page}>
      {/* ---------------- the bar ---------------- */}
      <header className={styles.bar}>
        <a className={styles.brand} href="/">New Grown Diamond</a>
        <nav className={styles.barNav} aria-label={t('nav.account')}>
          <a href="/diamonds">{t('nav.diamonds')}</a>
          <a href="/cart">{c.nav.selection} <b>{cart.count}</b></a>
          <a href="/wishlist">{c.nav.wishlist} <b>{wishlist?.count ?? 0}</b></a>
          <a href="/feedback">{c.nav.feedback}</a>
        </nav>
        <div className={styles.barEnd}>
          <ThemeToggle />
          <button type="button" className={styles.signOut} onClick={signOut}>{t('nav.signOut')}</button>
        </div>
      </header>

      <main className={styles.wrap}>
        {/* ---------------- welcome ---------------- */}
        <section className={styles.welcome} aria-labelledby="welcome-title">
          <span className={styles.avatar} aria-hidden="true">{initial}</span>
          <div className={styles.welcomeText}>
            <p className={styles.eyebrow}>{c.eyebrow}</p>
            <h1 id="welcome-title">
              {c.welcome.lead}<em>{firstName}{c.welcome.stop}</em>
            </h1>
            <p className={styles.meta}>
              {user?.email}
              {user?.created_at && <> · {interpolate(c.memberSince, { date: date(user.created_at, { month: 'long', year: 'numeric' }) })}</>}
            </p>
          </div>
          <div className={styles.complete}>
            <div className={styles.completeHead}>
              <span>{c.profile}</span>
              <b>{completeness}%</b>
            </div>
            <div
              className={styles.meter}
              role="progressbar"
              aria-label={c.completeness}
              aria-valuenow={completeness}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ '--p': `${completeness}%` }} />
            </div>
            <p>{completeness === 100 ? c.complete : c.incomplete}</p>
          </div>
        </section>

        {/* ---------------- the numbers ---------------- */}
        <section className={styles.stats} aria-label={c.glance}>
          {STATS.map((s, i) => {
            const body = (
              <>
                <span className={styles.statLabel}>{s.label}</span>
                <strong className={styles.statValue} data-long={String(s.value ?? '').length > 6 ? '' : undefined}>
                  {s.value === null ? <span className={styles.pending} aria-label={c.loading} /> : s.value}
                </strong>
                <span className={styles.statSub}>{s.sub}</span>
              </>
            );
            return s.href ? (
              <a key={s.key} href={s.href} className={styles.stat} style={{ '--i': i }} data-wide={s.wide ? '' : undefined}>
                {body}
                <i className={styles.statArrow} aria-hidden="true" />
              </a>
            ) : (
              <div key={s.key} className={styles.stat} style={{ '--i': i }} data-wide={s.wide ? '' : undefined}>
                {body}
              </div>
            );
          })}
        </section>

        <div className={styles.main}>
          <div className={styles.primary}>
            {/* ---------------- purchases ---------------- */}
            <section className={styles.panel} aria-labelledby="orders-title">
              <header className={styles.panelHead}>
                <h2 id="orders-title">{c.purchases.title}</h2>
                {purchase && <span>{orderCount(purchase.orders)}</span>}
              </header>

              {orders.status === 'loading' && <p className={styles.muted}>{c.purchases.loading}</p>}

              {orders.status === 'unavailable' && (
                <div className={styles.honest}>
                  <p>
                    {c.purchases.unavailable}
                  </p>
                  {/* The mail subject is read by the desk, so it stays English. */}
                  <p>
                    {c.purchases.invoicesLead}<a href={WHATSAPP} target="_blank" rel="noopener noreferrer">{c.purchases.whatsapp}</a>{c.purchases.or}<a href={`mailto:${EMAIL}?subject=${encodeURIComponent('My order history')}`}>{c.purchases.email}</a>{c.purchases.stop}
                  </p>
                </div>
              )}

              {orders.status === 'error' && (
                <p className={styles.muted}>{c.purchases.error}</p>
              )}

              {orders.status === 'ready' && orders.orders.length === 0 && (
                <div className={styles.empty}>
                  <p>{c.purchases.empty}</p>
                  <a href="/diamonds">{t('auth.browseInventory')}</a>
                </div>
              )}

              {orders.status === 'ready' && orders.orders.length > 0 && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col">{c.purchases.cols.order}</th>
                        <th scope="col">{c.purchases.cols.date}</th>
                        <th scope="col">{c.purchases.cols.diamonds}</th>
                        <th scope="col">{c.purchases.cols.status}</th>
                        <th scope="col" className={styles.num}>{c.purchases.cols.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.orders.map((o) => (
                        <tr key={o.public_id}>
                          <td className={styles.mono}>{o.public_id}</td>
                          <td>{date(o.created_at)}</td>
                          <td>
                            {(o.order_items ?? []).map((it, k) => (
                              <span key={k} className={styles.itemLine}>
                                {stoneLabel(it.diamond_id, it.description)}
                              </span>
                            ))}
                          </td>
                          <td><span className={styles.pill} data-tone={tone(o.status)}>{o.status}</span></td>
                          <td className={styles.num}>{money(o.total_amount, o.currency || 'INR') ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ---------------- requests ---------------- */}
            <section className={styles.panel} aria-labelledby="requests-title">
              <header className={styles.panelHead}>
                <h2 id="requests-title">{c.requests.title}</h2>
                <a href="/contact">{c.requests.newEnquiry}</a>
              </header>

              <div className={styles.tabs} role="tablist" aria-label={c.requests.types} onKeyDown={onTabKey}>
                {TABS.map((key) => {
                  const s = source(key);
                  /* The data layer names each list in English (queries/account.js).
                     English keeps exactly that — and the bare key while it loads —
                     and the other languages take the name from this page's copy. */
                  const label = locale === 'en' ? s?.label ?? key : c.tabs[key];
                  return (
                    <button
                      key={key}
                      ref={(el) => { tabRefs.current[key] = el; }}
                      type="button"
                      role="tab"
                      id={`tab-${key}`}
                      aria-selected={tab === key}
                      aria-controls={`panel-${key}`}
                      tabIndex={tab === key ? 0 : -1}
                      className={styles.tab}
                      onClick={() => setTab(key)}
                    >
                      {label}
                      <b>{loading ? '·' : s?.error ? '—' : s?.count ?? 0}</b>
                    </button>
                  );
                })}
              </div>

              <div className={styles.tabPanel} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
                {loading && <p className={styles.muted}>{t('common.loading')}</p>}
                {!loading && current?.error && (
                  <p className={styles.muted}>{c.requests.listError}</p>
                )}
                {!loading && current && !current.error && current.rows.length === 0 && (
                  <div className={styles.empty}>
                    <p>{c.requests.empty[tab]}</p>
                    {tab === 'enquiries' && <a href="/contact">{c.requests.sendEnquiry}</a>}
                    {tab !== 'enquiries' && <a href="/diamonds">{c.requests.findStone}</a>}
                  </div>
                )}
                {!loading && current && !current.error && current.rows.length > 0 && (
                  <ul className={styles.rows}>
                    {current.rows.map((row, k) => {
                      const expires = row.expires_at ? new Date(row.expires_at) : null;
                      const lapsed = expires && expires.getTime() < now;
                      return (
                        <li key={row.id ?? row.public_id ?? k} className={styles.row} style={{ '--i': k }}>
                          <div className={styles.rowMain}>
                            <p className={styles.rowTitle}>
                              {tab === 'enquiries'
                                ? row.subject || row.public_id
                                : stoneLabel(row.diamond_id, row.public_id || (row.product_type === 'jewellery' ? c.requests.jewelleryPiece : t('terms.diamond')))}
                            </p>
                            <p className={styles.rowMeta}>
                              {row.public_id && tab !== 'favourites' && <span className={styles.mono}>{row.public_id}</span>}
                              <span>{date(row.created_at)}</span>
                              {tab === 'holds' && expires && (
                                <span>{lapsed ? c.requests.lapsed : interpolate(c.requests.reservedUntil, { date: date(row.expires_at) })}</span>
                              )}
                            </p>
                          </div>
                          {tab === 'quotes' && (
                            <p className={styles.rowPrice}>{money(row.quoted_price, row.currency || 'INR') ?? c.requests.awaitingPrice}</p>
                          )}
                          {row.status && <span className={styles.pill} data-tone={tone(row.status)}>{row.status}</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.secondary}>
            {/* ---------------- profile ---------------- */}
            <section className={styles.panel} aria-labelledby="profile-title">
              <header className={styles.panelHead}>
                <h2 id="profile-title">{c.profileTitle}</h2>
              </header>
              <ProfileForm profile={profile} onSaved={onProfileSaved} />
              {/* The role and status are the database's own words and stay as
                  it holds them. */}
              <dl className={styles.facts}>
                <div><dt>{t('auth.email')}</dt><dd>{user?.email ?? '—'}</dd></div>
                <div><dt>{t('nav.account')}</dt><dd><Lock /> {profile?.role ?? 'customer'}</dd></div>
                <div><dt>{c.status}</dt><dd><Lock /> {profile?.account_status ?? '—'}</dd></div>
              </dl>
              <div className={styles.security}>
                <a href="/forgot-password">{c.changePassword}</a>
                <span>{c.secureLink}</span>
              </div>
            </section>

            {/* ---------------- selection ---------------- */}
            <MiniList
              title={c.selection.title}
              items={cart.items}
              empty={c.selection.empty}
              href="/cart"
              cta={c.selection.cta}
              footer={cart.count > 0 ? selectionValue ?? c.stats.pricesOnRequest : null}
            />

            {/* ---------------- saved ---------------- */}
            <MiniList
              title={c.saved.title}
              items={wishlist?.items ?? []}
              empty={c.saved.empty}
              href="/wishlist"
              cta={c.saved.cta}
            />

            {/* ---------------- help ---------------- */}
            <section className={styles.help}>
              <p className={styles.eyebrow}>{c.help.eyebrow}</p>
              <p>{c.help.question}</p>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp {ENQUIRY_DESK.phone}</a>
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </section>

            {/* ---------------- delete account ---------------- */}
            <DeleteAccount user={user} profile={profile} signOut={signOut} />
          </aside>
        </div>
      </main>
    </div>
  );
}

function MiniList({ title, items, empty, href, cta, footer = null }) {
  const c = useCopy(COPY).mini;
  const shown = items.slice(0, 3);
  return (
    <section className={styles.panel}>
      <header className={styles.panelHead}>
        <h2>{title}</h2>
        <span>{items.length}</span>
      </header>
      {shown.length === 0 ? (
        <div className={styles.empty}>
          <p>{empty}</p>
          <a href="/diamonds">{c.browse}</a>
        </div>
      ) : (
        <>
          <ul className={styles.mini}>
            {shown.map((item) => (
              <li key={item.publicId}>
                <img src={resizedImage(item.imageUrl, 320) || fallback} alt="" loading="lazy" decoding="async" />
                <div>
                  <p>{item.stockNumber}</p>
                  <b>{fmtCarat(item.carat) ?? '—'} ct {item.shape}</b>
                </div>
                <span>{money(item.price, item.currency) ?? c.onRequest}</span>
              </li>
            ))}
          </ul>
          {items.length > shown.length && <p className={styles.more}>{interpolate(c.more, { n: items.length - shown.length })}</p>}
          {footer && <p className={styles.miniTotal}><span>{c.listedValue}</span><b>{footer}</b></p>}
          <a className={styles.miniCta} href={href}>{cta}</a>
        </>
      )}
    </section>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}
