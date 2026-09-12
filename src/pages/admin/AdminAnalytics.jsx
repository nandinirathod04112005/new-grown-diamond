import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { ANALYTICS_HOSTS } from '@/lib/analytics.js';
import { ANALYTICS_CAP, loadAnalytics } from '@/lib/supabase/queries/adminAnalytics.js';
import { EmptyState, ErrorState, Panel, Skeleton, Stat } from '@/components/admin/AdminBits.jsx';
import { Donut, HBarList, LineChart } from '@/components/admin/charts/index.js';
import styles from './AdminAnalytics.module.css';

const RANGES = [7, 30, 90];

/* Said exactly this way here and on the Overview. */
const NOT_STARTED = 'Collection starts once the site runs on newgrowndiamond.com; no visits recorded yet.';

const on = (value) => ({ ok: true, value });
const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** How collection works — shown on every state, because it is what an empty page needs most. */
function HowCounted() {
  return (
    <Panel title="How visits are counted" className={styles.full}>
      <ul className={styles.facts}>
        <li>
          <b>Where.</b> Sent only from {ANALYTICS_HOSTS.map((h, i) => (
            <span key={h}>{i > 0 && (i === ANALYTICS_HOSTS.length - 1 ? ' and ' : ', ')}<code>{h}</code></span>
          ))}. Local development, LAN previews and review tunnels never write a row.
        </li>
        <li>
          <b>What.</b> One row per page view: the page path with its language
          prefix (<code>/hi/…</code>, <code>/gu/…</code>), a device size class
          (phone, tablet, desktop), the referring site’s name on the first page of
          a visit, and a random id kept for that browser tab. The contact form
          adds “started” and “sent”.
        </li>
        <li>
          <b>Never.</b> No cookies, no IP address, no account id, no query
          strings — the table has no column for any of them. Nothing is sent
          from <code>/admin</code>, when Do Not Track or Global Privacy Control
          is on, or from automated browsers.
        </li>
        <li>
          <b>Kept.</b> Until deleted. Migration 0002 describes a 90-day
          retention job; it only runs if it has been scheduled in the project.
        </li>
      </ul>
    </Panel>
  );
}

/**
 * Website Analytics.
 *
 * First-party and anonymous: every figure is counted from rows in
 * public.analytics_events for the chosen window, in this browser. While the
 * table is empty the page says why rather than drawing charts of zeros — an
 * empty chart and a quiet week look the same and mean opposite things.
 */
export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: 'loading', data: null });
  const ticket = useRef(0);

  const load = useCallback((range) => {
    ticket.current += 1;
    const id = ticket.current;
    loadAnalytics(range)
      .catch((err) => ({ ok: false, missing: false, error: err?.message || 'Visits could not be read.' }))
      .then((data) => { if (id === ticket.current) setState({ status: 'ready', data }); });
  }, []);

  useEffect(() => {
    // The request resolves asynchronously; the initial state already supplies
    // the loading UI while this effect starts it.
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    load(days);
    return () => { ticket.current += 1; };
  }, [days, load]);

  const dim = () => setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
  const refresh = () => { dim(); load(days); };
  const pickRange = (r) => {
    if (r === days) return;
    dim();
    setDays(r);
  };

  const a = state.data;
  const loading = !a;
  const refreshing = state.status === 'refreshing';
  /* Labels follow the data on screen, not the button just pressed. */
  const shown = a?.days ?? days;
  /* Rows exist, just none in this window: say that, not a row of zero tiles. */
  const quiet = a?.ok && a.everRecorded !== false && a.events === 0;
  const hasData = a?.ok && a.events > 0;
  const v = a?.views;
  const f = a?.funnel;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Website Analytics</h1>
          <p className={styles.sub}>Anonymous, first-party visit counts. No cookies, no personal data.</p>
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
          <button type="button" className={styles.refresh} onClick={refresh} disabled={refreshing || loading}>
            <RefreshCw size={13} aria-hidden="true" data-spin={refreshing ? '' : undefined} />
            Refresh
          </button>
        </div>
      </header>

      {loading && (
        <>
          <div className={styles.kpis}>
            {['Page views', 'Unique sessions', 'Pages per session', 'Enquiries started', 'Enquiries sent'].map((l) => (
              <Stat key={l} label={l} loading />
            ))}
          </div>
          <div className={styles.grid}>
            <Panel title="Page views and sessions per day" className={styles.full}><Skeleton rows={6} /></Panel>
            <Panel title="Top pages"><Skeleton rows={5} /></Panel>
            <Panel title="Languages"><Skeleton rows={3} /></Panel>
            <Panel title="Devices"><Skeleton rows={3} /></Panel>
          </div>
        </>
      )}

      {!loading && !a.ok && (
        a.missing ? (
          <Panel title="Not set up" className={styles.full}>
            <EmptyState>{a.error} Nothing on this screen is simulated; it stays empty until the table exists.</EmptyState>
          </Panel>
        ) : (
          <ErrorState message={a.error} onRetry={refresh} />
        )
      )}

      {!loading && a.ok && a.everRecorded === false && (
        <Panel title="No visits recorded yet" className={styles.full}>
          <p className={styles.lead}>{NOT_STARTED}</p>
          <p className={styles.note}>
            The counter is part of the site’s code. Charts appear here from the first
            recorded visit; until then there is nothing to draw, and zeros would only
            look like a very quiet month.
          </p>
        </Panel>
      )}

      {!loading && quiet && (
        <Panel title={`Last ${shown} days`} className={styles.full}>
          <EmptyState>
            No visits recorded in the last {shown} days.{shown < RANGES[RANGES.length - 1] && ' Try a longer period.'}
          </EmptyState>
        </Panel>
      )}

      {!loading && hasData && (
        <>
          {a.capped && (
            <p className={styles.notice} role="status">
              This period holds {a.total.toLocaleString()} events. The most recent{' '}
              {ANALYTICS_CAP.toLocaleString()} were read, so figures before{' '}
              {a.oldest ? dayLabel(a.oldest) : 'the start of the period'} are incomplete.
            </p>
          )}

          <div className={styles.kpis} data-refreshing={refreshing ? '' : undefined}>
            <Stat label={`Page views · ${shown}d`} metric={on(v.total)} days={shown} />
            <Stat label="Unique sessions" metric={on(v.sessions)} days={shown} hint="One per browser tab visit" />
            {v.sessions > 0 && (
              <Stat label="Pages per session" metric={on(v.total / v.sessions)} days={shown} decimals={1} />
            )}
            <Stat label="Enquiries started" metric={on(f.started)} days={shown} hint="Sessions that began the form" />
            <Stat label="Enquiries sent" metric={on(f.sent)} days={shown} hint="Sessions that sent it" />
          </div>

          <div className={styles.grid} data-refreshing={refreshing ? '' : undefined}>
            <Panel title={`Page views and sessions per day · last ${shown} days`} className={styles.full}>
              {v.total > 0 ? (
                <LineChart
                  data={v.perDay}
                  series={[
                    { key: 'views', label: 'Page views' },
                    { key: 'sessions', label: 'Unique sessions' },
                  ]}
                  label={`Page views and unique sessions per day, last ${shown} days`}
                  height={220}
                />
              ) : (
                <EmptyState>No page views recorded in the last {shown} days.</EmptyState>
              )}
            </Panel>

            <Panel title="Top pages" className={styles.wide}>
              <HBarList
                items={a.pages}
                limit={10}
                unit="views"
                label={`Most viewed pages, last ${shown} days`}
                empty={`No page views in the last ${shown} days.`}
              />
              <p className={styles.foot}>Pages are grouped across languages; the line under each shows the split.</p>
            </Panel>

            <Panel title="Languages">
              <Donut
                data={a.languages}
                label={`Page views by site language, last ${shown} days`}
                centreLabel="Views"
                empty={`No page views in the last ${shown} days.`}
              />
              <p className={styles.foot}>From the path: <code>/hi/…</code> Hindi, <code>/gu/…</code> Gujarati, no prefix English.</p>
            </Panel>

            <Panel title="Devices">
              <Donut
                data={a.devices}
                label={`Page views by device size, last ${shown} days`}
                centreLabel="Views"
                empty={`No page views in the last ${shown} days.`}
              />
              <p className={styles.foot}>By window width: under 768px phone, under 1100px tablet.</p>
            </Panel>

            <Panel title="Top referrers">
              <HBarList
                items={a.referrers}
                limit={8}
                unit="visits"
                label={`Sites visitors arrived from, last ${shown} days`}
                empty="No visit in this period arrived from another site."
              />
              <p className={styles.foot}>Recorded once per visit, on its first page, and only when it came from another site.</p>
            </Panel>

            <Panel title="Enquiry funnel">
              {f.started + f.sent + f.startedEvents + f.sentEvents === 0 ? (
                <EmptyState>No one used the enquiry form in the last {shown} days.</EmptyState>
              ) : (
                <>
                  <HBarList
                    items={[
                      { key: 'started', label: 'Started the form', value: f.started },
                      { key: 'sent', label: 'Sent an enquiry', value: f.sent },
                    ]}
                    ranked={false}
                    share={false}
                    keepZero
                    unit="sessions"
                    label={`Enquiry form, last ${shown} days`}
                  />
                  <p className={styles.rate}>
                    <b>{f.rate == null ? '—' : `${Math.round(f.rate * 100)}%`}</b>
                    <span>
                      {f.rate == null
                        ? 'No session started the form in this period, so there is no conversion to show.'
                        : `of sessions that started the form went on to send it (${f.converted.toLocaleString()} of ${f.started.toLocaleString()}).`}
                    </span>
                  </p>
                </>
              )}
              <p className={styles.foot}>Counted per session on the contact page, not per click.</p>
            </Panel>
          </div>

          <p className={styles.small}>
            Days are calendar days in your time zone. Figures are counted in this browser from{' '}
            {a.events.toLocaleString()} recorded {a.events === 1 ? 'event' : 'events'}.
          </p>
        </>
      )}

      {!loading && <HowCounted />}
    </div>
  );
}
