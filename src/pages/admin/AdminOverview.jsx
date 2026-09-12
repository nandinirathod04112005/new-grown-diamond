import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleX, Plus, RefreshCw } from 'lucide-react';

import { overviewStats, recentInventory } from '@/lib/supabase/queries/adminStats.js';
import { pageViewSeries } from '@/lib/supabase/queries/adminAnalytics.js';
import { EmptyState, ErrorState, Panel, Skeleton, Spark, Stat } from '@/components/admin/AdminBits.jsx';
import { BarChart, Donut, HBarList, LineChart } from '@/components/admin/charts/index.js';
import styles from './AdminOverview.module.css';

const RANGES = [7, 30, 90];

/* Said exactly this way on the Overview and on Website Analytics. */
const NOT_STARTED = 'Collection starts once the site runs on newgrowndiamond.com; no visits recorded yet.';

const when = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Money in its own currency: never converted, never summed across currencies. */
function money(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** A few labelled figures inside a panel. An unreadable one says so instead of showing 0. */
function Figures({ items }) {
  return (
    <dl className={styles.figures}>
      {items.filter(Boolean).map(([label, m, note]) => (
        <div key={label} className={styles.figure}>
          <dt>{label}</dt>
          <dd>
            {m?.ok
              ? <span className={styles.figureValue}>{m.value.toLocaleString()}</span>
              : <span className={styles.off} title={m?.error}>Unavailable</span>}
            {note && m?.ok && <span className={styles.figureNote}>{note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A panel body that is either a skeleton, the reason it failed, or the content. */
function Body({ loading, part, rows = 4, retry, children }) {
  if (loading) return <Skeleton rows={rows} />;
  if (part && !part.ok) return <ErrorState message={part.error ?? 'Could not be read.'} onRetry={retry} />;
  return children();
}

/** Website views: the four honest states — loading, refused, never started, none this period. */
function Views({ views, retry }) {
  if (views.status === 'loading' || !views.data) return <Skeleton rows={3} />;
  const v = views.data;
  if (!v.ok) {
    return v.missing ? <EmptyState>{v.error}</EmptyState> : <ErrorState message={v.error} onRetry={retry} />;
  }
  if (v.everRecorded === false) return <EmptyState>{NOT_STARTED}</EmptyState>;
  if (v.total === 0) return <EmptyState>No visits recorded in the last {v.days} days.</EmptyState>;
  return (
    <div className={styles.views}>
      <p className={styles.viewsTotal}>
        <b>{v.total.toLocaleString()}</b>
        <span>page views · {plural(v.sessions, 'session')}</span>
      </p>
      <Spark series={v.series} label={`Page views per day, last ${v.days} days`} />
      {v.capped && (
        <p className={styles.foot}>The trend is drawn from the most recent 20,000 views; the total is exact.</p>
      )}
    </div>
  );
}

/**
 * The Overview.
 *
 * Every figure on this page is read from the database on load. There is no
 * seeded state, no placeholder series and no illustrative percentage — a tile
 * either shows a number that came back from Supabase, or it says it could not
 * be read and why. Each panel fails on its own: one refused table costs its
 * panel, not the page.
 *
 * The range control re-queries rather than re-slicing a cached payload,
 * because the previous-period comparison needs twice the window and slicing
 * would quietly compare 30 days against nothing. While it reloads, the last
 * answer stays on screen, dimmed, and its labels keep the range it was read
 * for — a "7d" label over a 30-day number is exactly the mismatch this avoids.
 */
export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [views, setViews] = useState({ status: 'loading', data: null });
  const [recent, setRecent] = useState({ status: 'loading', rows: [], error: null });

  /* Only the latest request may write: a slow 90-day answer must not land on
     top of the 7-day one that was asked for after it. */
  const ticket = useRef(0);

  const load = useCallback((range) => {
    ticket.current += 1;
    const id = ticket.current;
    const current = () => id === ticket.current;

    overviewStats(range)
      .then((data) => { if (current()) setState({ status: 'ready', data, error: null }); })
      .catch((err) => {
        console.error('[NGD Admin] overview failed:', err);
        if (current()) setState({ status: 'error', data: null, error: err?.message || 'The dashboard could not be loaded.' });
      });

    pageViewSeries(range)
      .catch((err) => ({ ok: false, missing: false, error: err?.message || 'Visits could not be read.' }))
      .then((data) => { if (current()) setViews({ status: 'ready', data }); });

    recentInventory(8)
      .catch((err) => ({ ok: false, rows: [], error: err?.message || 'Could not be read.' }))
      .then((r) => { if (current()) setRecent({ status: r.ok ? 'ready' : 'error', rows: r.rows, error: r.error }); });
  }, []);

  useEffect(() => {
    // The requests resolve asynchronously; the initial state already supplies
    // the loading UI while this effect starts them.
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    load(days);
    return () => { ticket.current += 1; };
  }, [days, load]);

  const dimAll = () => {
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
    setViews((v) => ({ ...v, status: v.data ? 'refreshing' : 'loading' }));
  };

  const refresh = () => {
    dimAll();
    load(days);
  };

  const pickRange = (r) => {
    if (r === days) return;
    dimAll();
    setDays(r);
  };

  const d = state.data;
  const loading = !d && state.status === 'loading';
  const refreshing = state.status === 'refreshing' || views.status === 'refreshing';
  /* Labels follow the data on screen, not the button just pressed. */
  const shown = d?.days ?? days;
  const o = d?.orders;

  const sources = d ? Object.entries(d.sources) : [];
  const down = sources.filter(([, s]) => !s.ok);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Overview</h1>
        </div>
        <div className={styles.controls}>
          <div className={styles.ranges} role="group" aria-label="Reporting period">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={styles.range}
                data-on={r === days ? '' : undefined}
                aria-pressed={r === days}
                onClick={() => pickRange(r)}
              >
                {r}d
              </button>
            ))}
          </div>
          <button type="button" className={styles.refresh} onClick={refresh} disabled={refreshing}>
            <RefreshCw size={13} aria-hidden="true" data-spin={refreshing ? '' : undefined} />
            Refresh
          </button>
        </div>
      </header>

      {state.status === 'error' && <ErrorState message={state.error} onRetry={refresh} />}

      {(loading || d) && (
        <>
          {/* ---- headline figures ---- */}
          <div className={styles.kpis} data-refreshing={refreshing ? '' : undefined}>
            <Stat label="Live diamonds" metric={d?.diamonds.total} days={shown} loading={loading} />
            <Stat
              label="Total carat"
              metric={d?.diamonds.carat}
              days={shown}
              decimals={2}
              suffix="ct"
              loading={loading}
              hint="Live stock only"
            />
            <Stat label="Live jewellery" metric={d?.jewellery.total} days={shown} loading={loading} />
            <Stat label="Customers" metric={d?.customers.total} days={shown} loading={loading} hint="Accounts, staff excluded" />
            <Stat label={`New customers · ${shown}d`} metric={d?.customers.added} days={shown} loading={loading} />
            <Stat label={`Enquiries · ${shown}d`} metric={d?.enquiries.recent} days={shown} loading={loading} />
            <Stat label="Open enquiries" metric={d?.enquiries.open} days={shown} loading={loading} hint="New or in progress" />
            <Stat label={`Quotes · ${shown}d`} metric={d?.quotes.recent} days={shown} loading={loading} />
            <Stat label={`Orders · ${shown}d`} metric={o?.inRange} days={shown} loading={loading} hint="Cancelled excluded" />
          </div>

          <div className={styles.grid} data-refreshing={refreshing ? '' : undefined}>
            {/* ---- enquiries ---- */}
            <Panel
              title={`Enquiries per day · last ${shown} days`}
              className={styles.wide}
              action={<a className={styles.panelLink} href="/admin/enquiries">Open the inbox →</a>}
            >
              <Body loading={loading} part={d?.enquiries.byDay} rows={6} retry={refresh}>
                {() => (
                  <>
                    {d.enquiries.recent.value > 0 ? (
                      <LineChart
                        data={d.enquiries.byDay.series}
                        series={[{ key: 'value', label: 'Enquiries' }]}
                        label={`Enquiries received per day, last ${shown} days`}
                      />
                    ) : (
                      <EmptyState>No enquiries arrived in the last {shown} days.</EmptyState>
                    )}
                    <Figures
                      items={[
                        [`Received · ${shown}d`, d.enquiries.recent, 'All kinds'],
                        ['Open now', d.enquiries.open, 'New or in progress'],
                        ['Handled', d.enquiries.handled, 'Responded or closed'],
                        d.enquiries.other.value > 0 && ['Other status', d.enquiries.other, 'Outside both lists'],
                      ]}
                    />
                  </>
                )}
              </Body>
            </Panel>

            <Panel title={`Enquiries by kind · ${shown}d`}>
              <Body loading={loading} part={d?.enquiries.byKind} retry={refresh}>
                {() => (
                  <Donut
                    data={d.enquiries.byKind.items}
                    label={`Enquiries by kind, last ${shown} days`}
                    centreLabel="Received"
                    empty={`Nothing arrived in the last ${shown} days.`}
                  />
                )}
              </Body>
            </Panel>

            {/* ---- website ---- */}
            <Panel
              title={`Website views · ${views.data?.days ?? shown}d`}
              action={<a className={styles.panelLink} href="/admin/analytics">Website Analytics →</a>}
            >
              <Views views={views} retry={refresh} />
            </Panel>

            {/* ---- open work ---- */}
            <Panel title="Open work">
              <Body loading={loading} retry={refresh}>
                {() => (
                  <ul className={styles.work}>
                    {[
                      ['Enquiries', d.enquiries.open, 'new or in progress', '/admin/enquiries'],
                      ['Quotes', d.quotes.open, 'pending or reviewed', '/admin/quotes'],
                      ['Holds', d.holds.open, 'pending or active', '/admin/holds'],
                      ['Inspections', d.inspections.open, 'pending or scheduled', '/admin/inspections'],
                    ].map(([label, m, what, href]) => (
                      <li key={label}>
                        <a href={href}>
                          <span className={styles.workLabel}>{label}<small>{what}</small></span>
                          {m?.ok
                            ? <b className={styles.workCount} data-zero={m.value === 0 ? '' : undefined}>{m.value.toLocaleString()}</b>
                            : <span className={styles.off} title={m?.error}>Unavailable</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Body>
            </Panel>

            {/* ---- diamonds ---- */}
            <Panel
              title="Diamonds"
              className={styles.wide}
              action={<a className={styles.panelLink} href="/admin/diamonds">Manage stock →</a>}
            >
              <Body loading={loading} part={d?.diamonds.all} rows={6} retry={refresh}>
                {() => (
                  <>
                    <div className={styles.split}>
                      <Figures
                        items={[
                          ['Total', d.diamonds.all, 'Every stone, archived included'],
                          ['Active', d.diamonds.active, 'Live on the site'],
                          ['Inactive', d.diamonds.inactive,
                            `${d.diamonds.inactive.hidden} hidden · ${d.diamonds.inactive.archived} archived`],
                          ['Featured', d.diamonds.featured, 'Live and featured'],
                        ]}
                      />
                      <div>
                        <p className={styles.subhead}>Availability · current stock</p>
                        <Donut
                          data={d.diamonds.availability.items}
                          label="Diamond availability, current stock (live and hidden)"
                          centreLabel="Stones"
                          empty="No stock recorded."
                        />
                      </div>
                    </div>
                    <p className={styles.foot}>
                      Current stock means live and hidden stones; archived stones are
                      left out of the availability, shape, lab and growth splits.
                    </p>
                  </>
                )}
              </Body>
            </Panel>

            <Panel title="Shape · current stock">
              <Body loading={loading} part={d?.diamonds.byShape} retry={refresh}>
                {() => <HBarList items={d.diamonds.byShape.items} label="Current stock by shape" unit="stones" empty="No stock recorded." />}
              </Body>
            </Panel>

            <Panel title="Lab · current stock">
              <Body loading={loading} part={d?.diamonds.byLab} retry={refresh}>
                {() => <HBarList items={d.diamonds.byLab.items} label="Current stock by grading laboratory" unit="stones" empty="No stock recorded." />}
              </Body>
            </Panel>

            <Panel title="Growth method · current stock">
              <Body loading={loading} part={d?.diamonds.byGrowth} rows={2} retry={refresh}>
                {() => <HBarList items={d.diamonds.byGrowth.items} label="Current stock by growth method" unit="stones" empty="No stock recorded." />}
              </Body>
            </Panel>

            {/* ---- jewellery ---- */}
            <Panel title="Jewellery" action={<a className={styles.panelLink} href="/admin/jewellery">Manage →</a>}>
              <Body loading={loading} part={d?.jewellery.all} retry={refresh}>
                {() => (
                  <Figures
                    items={[
                      ['Total', d.jewellery.all, 'Every piece, archived included'],
                      ['Live', d.jewellery.live, 'On the site'],
                      ['Featured', d.jewellery.featured, 'Live and featured'],
                      ['Hidden', d.jewellery.unpublished, 'Saved, not published'],
                    ]}
                  />
                )}
              </Body>
            </Panel>

            {/* ---- customers ---- */}
            <Panel title="Customers" action={<a className={styles.panelLink} href="/admin/customers">All customers →</a>}>
              {/* No single `part`: profiles and favourites are separate reads,
                  and one refusing should not blank the other's figures. */}
              <Body loading={loading} retry={refresh}>
                {() => (
                  <>
                    <Figures
                      items={[
                        ['Customers', d.customers.total, 'Staff excluded'],
                        [`New · ${shown}d`, d.customers.added],
                        ['Favourites saved', d.customers.favourites],
                        ['With favourites', d.customers.withFavourites, 'Accounts that saved one'],
                      ]}
                    />
                    {d.customers.added.ok && (
                      <Spark series={d.customers.added.series} label={`New customer accounts per day, last ${shown} days`} />
                    )}
                  </>
                )}
              </Body>
            </Panel>

            {/* ---- orders & sales ---- */}
            <Panel
              title="Orders & sales · last 6 months"
              className={styles.wide}
              action={<a className={styles.panelLink} href="/admin/orders">Orders →</a>}
            >
              {loading && <Skeleton rows={6} />}
              {!loading && !o.ok && (o.missing
                ? <EmptyState>{o.error}</EmptyState>
                : <ErrorState message={`Orders could not be read: ${o.error}`} onRetry={refresh} />)}
              {!loading && o.ok && o.count.value + o.cancelled.value === 0 && (
                <EmptyState>No orders recorded yet. Orders are entered by the desk; nothing here is estimated.</EmptyState>
              )}
              {!loading && o.ok && o.count.value + o.cancelled.value > 0 && (
                <div className={styles.split}>
                  <div className={styles.stack}>
                    <Figures
                      items={[
                        ['Orders · 6 months', o.recent, 'Cancelled excluded'],
                        ['Items sold · 6 months', o.items],
                        ['All-time orders', o.count, 'Cancelled excluded'],
                        ['Cancelled', o.cancelled, 'All time'],
                      ]}
                    />
                    <div>
                      <p className={styles.subhead}>Revenue · 6 months</p>
                      {o.revenue.length > 0 ? (
                        <ul className={styles.money}>
                          {o.revenue.map((r) => (
                            <li key={r.currency}>
                              <b>{money(r.value, r.currency)}</b>
                              <span>{plural(r.orders, 'order')}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyState>No orders in the last 6 months.</EmptyState>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className={styles.subhead}>Orders per month</p>
                    <BarChart data={o.monthly} label="Orders per month, last 6 months, cancelled excluded" unit="orders" />
                  </div>
                </div>
              )}
              {!loading && o.ok && (
                <p className={styles.foot}>
                  Revenue is the sum of <code>orders.total_amount</code> per currency, cancelled
                  orders excluded. Currencies are never converted or added together.
                </p>
              )}
            </Panel>

            {/* ---- things that need doing ---- */}
            <Panel title="Needs attention">
              {loading ? <Skeleton rows={5} /> : (
                <div className={styles.alerts}>
                  {[
                    ['Live stones with no photograph', d.diamonds.noImage, '/admin/diamonds'],
                    ['Live stones with no certificate', d.diamonds.noCertificate, '/admin/diamonds'],
                    ['Diamonds saved but not published', d.diamonds.unpublished, '/admin/diamonds'],
                    ['Jewellery saved but not published', d.jewellery.unpublished, '/admin/jewellery'],
                    ['Holds past their expiry', d.holds.expired, '/admin/holds'],
                  ].map(([label, m, href]) => {
                    if (!m?.ok) {
                      return (
                        <p key={label} className={styles.alert} data-tone="off">
                          <CircleX size={14} aria-hidden="true" />
                          {label} — unavailable
                        </p>
                      );
                    }
                    const clear = m.value === 0;
                    const body = (
                      <>
                        {clear
                          ? <CircleCheck size={14} aria-hidden="true" />
                          : <span className={styles.count}>{m.value}</span>}
                        {label}
                      </>
                    );
                    return href && !clear ? (
                      <a key={label} className={styles.alert} data-tone="warn" href={href}>{body}</a>
                    ) : (
                      <p key={label} className={styles.alert} data-tone={clear ? 'ok' : 'warn'}>{body}</p>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* ---- trends ---- */}
            <Panel title={`Activity · last ${shown} days`} className={styles.wide}>
              {loading ? <Skeleton rows={3} /> : (
                <div className={styles.trends}>
                  {[
                    ['Stock added', d.diamonds.added],
                    ['New customers', d.customers.added],
                    ['Enquiries', d.enquiries.recent],
                    ['Quotes', d.quotes.recent],
                  ].map(([label, m]) => (
                    <div key={label} className={styles.trend}>
                      <p className={styles.trendLabel}>{label}</p>
                      {m?.ok ? (
                        <>
                          <p className={styles.trendValue}>{m.value}</p>
                          <Spark series={m.series} label={`${label}, ${shown} day trend`} />
                        </>
                      ) : (
                        <p className={styles.trendOff}>Unavailable</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* ---- recently added stock ---- */}
            <Panel
              title="Recently added stock"
              className={styles.wide}
              action={<a className={styles.panelLink} href="/admin/diamonds">All diamonds →</a>}
            >
              {recent.status === 'loading' && <Skeleton rows={5} />}
              {recent.status === 'error' && <ErrorState message={recent.error} />}
              {recent.status === 'ready' && recent.rows.length === 0 && (
                <EmptyState>No stock has been added yet.</EmptyState>
              )}
              {recent.status === 'ready' && recent.rows.length > 0 && (
                <ul className={styles.feed}>
                  {recent.rows.map((row, i) => (
                    <li key={row.id} className={styles.feedRow} style={{ '--i': i }}>
                      <a href={`/admin/diamonds/${row.id}/edit`}>
                        <b>{row.stock_number || row.public_id}</b>
                        <span>{Number(row.carat).toFixed(2)} ct {row.shape}</span>
                      </a>
                      <span
                        className={styles.pill}
                        data-tone={row.archived_at ? 'off' : row.active ? 'on' : 'hidden'}
                      >
                        {row.archived_at ? 'Archived' : row.active ? 'Live' : 'Hidden'}
                      </span>
                      <time dateTime={row.created_at}>{when(row.created_at)}</time>
                    </li>
                  ))}
                </ul>
              )}
              {/*
                Named for what it is: rows ordered by created_at. Who changed
                what is recorded separately, on the audit log.
              */}
              <p className={styles.foot}>
                Ordered by <code>created_at</code>. Who changed what is on
                the <a href="/admin/audit">Activity &amp; Audit Log</a>.
              </p>
            </Panel>

            {/* ---- quick actions ---- */}
            <Panel title="Quick actions">
              <div className={styles.actions}>
                <a className={styles.action} href="/admin/diamonds/new"><Plus size={14} aria-hidden="true" /> Add a diamond</a>
                <a className={styles.action} href="/admin/diamonds">Manage stock</a>
                <a className={styles.action} href="/admin/analytics">Website analytics</a>
                <a className={styles.action} href="/diamonds" target="_blank" rel="noopener noreferrer">View the storefront</a>
              </div>
            </Panel>

            {/* ---- connection ---- */}
            <Panel title="Data sources">
              {loading ? <Skeleton rows={6} /> : (
                <>
                  <ul className={styles.sources}>
                    {sources.map(([name, s]) => (
                      <li key={name} data-ok={s.ok ? '' : undefined}>
                        {s.ok ? <CircleCheck size={13} aria-hidden="true" /> : <CircleX size={13} aria-hidden="true" />}
                        <code>{name}</code>
                        <span>{s.ok ? 'reachable' : 'blocked'}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.foot}>
                    {down.length === 0
                      ? 'All tables answered.'
                      : `${down.length} table${down.length === 1 ? '' : 's'} refused this account.`}
                    {d.capped.length > 0 && ` Counts for ${d.capped.join(', ')} stop at 50,000 rows.`}
                    {' '}Last refreshed {when(d.generatedAt)}.
                  </p>
                </>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
