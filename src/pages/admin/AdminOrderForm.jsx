import { useEffect, useMemo, useState } from 'react';
import { Gem, Plus, Search, Trash2 } from 'lucide-react';

import { useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import {
  COMMON_CURRENCIES,
  CURRENCY_PATTERN,
  DEFAULT_CURRENCY,
  MAX_CENTS,
  ORDER_STATUSES,
  STATUS_LABEL,
  createOrder,
  diamondLine,
  findOrdersForDiamond,
  formatMoney,
  markDiamondSold,
  parseAmount,
  parseCarat,
  searchCustomers,
  searchDiamonds,
  toCents,
} from '@/lib/supabase/queries/adminOrders.js';
import styles from './AdminOrders.module.css';

let seq = 0;
function blankLine(kind = 'diamond') {
  seq += 1;
  return { key: seq, kind, diamond: null, description: '', carat: '', price: '', quantity: '1', clash: null, pickError: '' };
}

const qtyOf = (text) => (/^\d{1,4}$/.test(String(text).trim()) ? Number(text) : 0);

/* Enter in a search box would otherwise submit the whole order form. */
const noSubmit = (e) => { if (e.key === 'Enter') e.preventDefault(); };

/**
 * Debounced server search. The result is tagged with the term it answers, so
 * a slow reply to "HJ" can never be shown under "HJH-7".
 */
function useSearch(term, fn, min = 2) {
  const [res, setRes] = useState({ status: 'idle', term: '', rows: [], error: null });
  const q = term.trim();

  useEffect(() => {
    if (q.length < min) return undefined;
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const rows = await fn(q);
        if (alive) setRes({ status: 'ready', term: q, rows, error: null });
      } catch (err) {
        if (alive) setRes({ status: 'error', term: q, rows: [], error: err.message || 'The search failed.' });
      }
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q, fn, min]);

  if (q.length < min) return { status: 'idle', rows: [], error: null };
  if (res.term !== q) return { status: 'loading', rows: res.rows, error: null };
  return res;
}

function Results({ res, empty, idle, onPick, render }) {
  if (res.status === 'idle') return idle ? <p className={styles.hint}>{idle}</p> : null;
  if (res.status === 'error') return <p className={styles.badText} role="alert">{res.error}</p>;
  if (res.status === 'loading' && !res.rows.length) return <p className={styles.hint}>Searching…</p>;
  if (!res.rows.length) return <p className={styles.hint}>{empty}</p>;
  return (
    <ul className={styles.results} aria-busy={res.status === 'loading' || undefined}>
      {res.rows.map((row) => (
        <li key={row.id}>
          <button type="button" className={styles.result} onClick={() => onPick(row)}>{render(row)}</button>
        </li>
      ))}
    </ul>
  );
}

function CustomerPicker({ value, onPick, invalid }) {
  const [term, setTerm] = useState('');
  const res = useSearch(term, searchCustomers);

  if (value) {
    return (
      <div className={styles.picked}>
        <span className={styles.pickedMain}>
          <b>{value.full_name || 'Unnamed account'}</b>
          <small>{[value.company_name, value.email, value.country].filter(Boolean).join(' · ') || 'No contact details on the profile'}</small>
          {value.role && value.role !== 'customer' && (
            <small className={styles.warnText}>This is a {value.role} account, not a customer account.</small>
          )}
          {value.account_status && value.account_status !== 'active' && (
            <small className={styles.warnText}>Account status: {value.account_status}.</small>
          )}
        </span>
        <button type="button" className={styles.ghostBtn} onClick={() => onPick(null)}>Change</button>
      </div>
    );
  }

  return (
    <div className={styles.picker}>
      <label className={styles.field}>
        <span>Find the customer</span>
        <span className={styles.searchWrap} data-invalid={invalid ? '' : undefined}>
          <Search size={14} aria-hidden="true" />
          <input
            className={styles.bare}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={noSubmit}
            placeholder="Name, email or company"
            autoComplete="off"
            spellCheck="false"
            aria-invalid={invalid || undefined}
          />
        </span>
      </label>
      <Results
        res={res}
        idle="Type at least two letters."
        empty="No account matches. The buyer needs a sign-in account before an order can be recorded for them."
        onPick={onPick}
        render={(p) => (
          <>
            <b>{p.full_name || p.email || 'Unnamed account'}</b>
            <small>
              {[p.company_name, p.email, p.country].filter(Boolean).join(' · ')}
              {p.role && p.role !== 'customer' ? ` · ${p.role}` : ''}
            </small>
          </>
        )}
      />
    </div>
  );
}

function DiamondPicker({ taken, onPick, invalid }) {
  const [term, setTerm] = useState('');
  const res = useSearch(term, searchDiamonds);

  return (
    <div className={styles.picker}>
      <label className={styles.field}>
        <span>Stock number</span>
        <span className={styles.searchWrap} data-invalid={invalid ? '' : undefined}>
          <Gem size={14} aria-hidden="true" />
          <input
            className={styles.bare}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={noSubmit}
            placeholder="e.g. HJH-777"
            autoComplete="off"
            spellCheck="false"
            aria-invalid={invalid || undefined}
          />
        </span>
      </label>
      <Results
        res={res}
        empty="No stone has that stock number."
        onPick={onPick}
        render={(d) => (
          <>
            <b>{d.stock_number || d.public_id}</b>
            <small>
              {diamondLine(d)} · {d.availability ?? 'no availability set'}
              {d.archived_at ? ' · archived' : ''}
              {taken.has(d.id) ? ' · already on this order' : ''}
            </small>
          </>
        )}
      />
    </div>
  );
}

function LineEditor({ line, index, currency, tried, taken, canRemove, onChange, onRemove, onPickDiamond }) {
  const unit = parseAmount(line.price);
  const qty = qtyOf(line.quantity);
  const total = unit != null && qty ? unit * qty : null;
  const d = line.diamond;
  const listed = d && Number(d.total_price) > 0 ? { cents: toCents(d.total_price), currency: d.currency || '' } : null;
  const caratBad = line.kind === 'other' && Number.isNaN(parseCarat(line.carat));
  const set = (key) => (e) => onChange(line.key, { [key]: e.target.value });
  const n = index + 1;

  return (
    <li className={styles.lineCard}>
      <div className={styles.lineHead}>
        <span className={styles.lineNo}>Line {n}</span>
        <div className={styles.seg} role="group" aria-label={`Line ${n}: what is being sold`}>
          <button
            type="button"
            className={styles.segBtn}
            data-on={line.kind === 'diamond' ? '' : undefined}
            aria-pressed={line.kind === 'diamond'}
            onClick={() => onChange(line.key, { kind: 'diamond' })}
          >
            Diamond
          </button>
          <button
            type="button"
            className={styles.segBtn}
            data-on={line.kind === 'other' ? '' : undefined}
            aria-pressed={line.kind === 'other'}
            onClick={() => onChange(line.key, { kind: 'other', diamond: null, clash: null, pickError: '' })}
          >
            Other item
          </button>
        </div>
        {canRemove && (
          <button type="button" className={styles.iconBtn} onClick={() => onRemove(line.key)} aria-label={`Remove line ${n}`} title="Remove this line">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {line.kind === 'diamond' && !d && (
        <DiamondPicker taken={taken} invalid={tried} onPick={(stone) => onPickDiamond(line.key, stone)} />
      )}
      {line.kind === 'diamond' && !d && tried && (
        <p className={styles.badText}>Choose the stone, or switch this line to “Other item”.</p>
      )}
      {line.pickError && <p className={styles.badText}>{line.pickError}</p>}

      {line.kind === 'diamond' && d && (
        <div className={styles.picked}>
          <span className={styles.pickedMain}>
            <b>{d.stock_number || d.public_id}</b>
            <small>{diamondLine(d)} · {d.availability ?? 'no availability set'}{d.archived_at ? ' · archived' : ''}</small>
            {listed && (
              <small>
                Listed at {formatMoney(listed.cents, listed.currency)}
                {listed.currency !== currency ? ` — not copied, because this order is in ${currency || 'another currency'} and amounts are never converted.` : '.'}
              </small>
            )}
            {d.availability === 'Sold' && <small className={styles.warnText}>This stone is already marked Sold.</small>}
            {line.clash?.ok && line.clash.orders.length > 0 && (
              <small className={styles.warnText}>
                Already on {line.clash.orders.map((o) => `${o.public_id} (${STATUS_LABEL[o.status] ?? o.status})`).join(', ')}.
              </small>
            )}
            {line.clash && !line.clash.ok && <small>Could not check whether this stone is on another order.</small>}
          </span>
          <button type="button" className={styles.ghostBtn} onClick={() => onChange(line.key, { diamond: null, clash: null })}>
            Change
          </button>
        </div>
      )}

      {(line.kind === 'other' || d) && (
        <div className={styles.lineGrid}>
          <label className={`${styles.field} ${styles.span2}`}>
            <span>Description</span>
            <input
              className={styles.input}
              value={line.description}
              onChange={set('description')}
              maxLength={300}
              placeholder={line.kind === 'other' ? 'What was sold, e.g. 18k ring setting' : ''}
              aria-invalid={(tried && !line.description.trim()) || undefined}
            />
          </label>
          {line.kind === 'other' && (
            <label className={styles.field}>
              <span>Carat (optional)</span>
              <input
                className={styles.input}
                inputMode="decimal"
                value={line.carat}
                onChange={set('carat')}
                aria-invalid={caratBad || undefined}
              />
            </label>
          )}
          <label className={styles.field}>
            <span>Unit price{currency ? ` (${currency})` : ''}</span>
            <input
              className={styles.input}
              inputMode="decimal"
              value={line.price}
              onChange={set('price')}
              placeholder="0.00"
              aria-invalid={(tried && unit == null) || (line.price.trim() !== '' && unit == null) || undefined}
            />
          </label>
          <label className={styles.field}>
            <span>Quantity</span>
            <input
              className={styles.input}
              inputMode="numeric"
              value={line.quantity}
              onChange={set('quantity')}
              readOnly={line.kind === 'diamond'}
              aria-invalid={(tried && !qty) || undefined}
            />
          </label>
          <p className={styles.lineTotal}>
            <span>Line total</span>
            <b>{total != null && CURRENCY_PATTERN.test(currency) ? formatMoney(total, currency, { exact: true }) : '—'}</b>
          </p>
        </div>
      )}
      {line.kind === 'diamond' && d && <p className={styles.hint}>A stone is one piece, so its quantity is fixed at 1.</p>}
    </li>
  );
}

/**
 * Record a sale.
 *
 * The desk writes orders; customers only read their own (0005's policies).
 * This page picks an account, adds lines — a stone from the inventory by its
 * stock number, or anything else by description — and writes the order and
 * then its lines. The total is the sum of the lines, computed in whole cents
 * and written as the order's total_amount. If the lines are refused, the
 * order just written is removed again, so no order without lines is left.
 *
 * Marking a stone Sold is OFFERED once the order exists, never done as part
 * of saving: a sale can be recorded after the fact, or for a stone that is
 * already marked, and the desk decides.
 */
export default function AdminOrderForm() {
  const [customer, setCustomer] = useState(null);
  const [lines, setLines] = useState(() => [blankLine('diamond')]);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [status, setStatus] = useState('confirmed');
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [stage, setStage] = useState('editing'); // editing | saving | done
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const dirty = stage !== 'done' && Boolean(
    customer || note.trim() || lines.some((l) => l.diamond || l.description.trim() || l.price.trim()),
  );
  useUnsavedGuard(dirty);

  const cur = currency.trim().toUpperCase();
  const taken = useMemo(() => new Set(lines.map((l) => l.diamond?.id).filter(Boolean)), [lines]);

  const change = (key, patch) => setLines((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key) => setLines((list) => list.filter((l) => l.key !== key));
  const add = (kind) => setLines((list) => [...list, blankLine(kind)]);

  const pickDiamond = (key, d) => {
    if (taken.has(d.id)) {
      change(key, { pickError: `${d.stock_number || d.public_id} is already on this order.` });
      return;
    }
    /* The listed price is copied only when it is in the order's currency. */
    const sameCurrency = (d.currency || '') === cur && Number(d.total_price) > 0;
    const carat = Number(d.carat);
    change(key, {
      diamond: d,
      pickError: '',
      clash: null,
      description: diamondLine(d),
      carat: Number.isFinite(carat) ? String(Math.round(carat * 100) / 100) : '',
      price: sameCurrency ? (toCents(d.total_price) / 100).toFixed(2) : '',
      quantity: '1',
    });
    /* Applied only if the line still holds this stone when the answer lands. */
    findOrdersForDiamond(d.id).then((clash) => {
      setLines((list) => list.map((l) => (l.key === key && l.diamond?.id === d.id ? { ...l, clash } : l)));
    });
  };

  const checks = useMemo(() => {
    const problems = [];
    if (!customer) problems.push('Choose the customer.');
    if (!CURRENCY_PATTERN.test(cur)) problems.push('The currency must be a three-letter code, such as INR or USD.');
    if (!lines.length) problems.push('Add at least one line.');
    let total = 0;
    let complete = true;
    lines.forEach((l, i) => {
      const n = i + 1;
      if (l.kind === 'diamond' && !l.diamond) {
        problems.push(`Line ${n}: choose the stone, or make it an “Other item”.`);
        complete = false;
        return;
      }
      if (!l.description.trim()) problems.push(`Line ${n}: add a description.`);
      const unit = parseAmount(l.price);
      const qty = qtyOf(l.quantity);
      if (unit == null) { problems.push(`Line ${n}: enter the unit price, e.g. 125000 or 4300.50.`); complete = false; }
      if (qty < 1) { problems.push(`Line ${n}: the quantity must be a whole number of at least 1.`); complete = false; }
      if (l.kind === 'other' && Number.isNaN(parseCarat(l.carat))) problems.push(`Line ${n}: the carat must be a number, such as 1.25.`);
      if (unit != null && qty >= 1) total += unit * qty;
    });
    if (total > MAX_CENTS) problems.push('The total is larger than the orders table can hold.');
    return { problems, total, complete };
  }, [customer, cur, lines]);

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    setError('');
    if (checks.problems.length || stage === 'saving') return;

    setStage('saving');
    try {
      const order = await createOrder({
        customer,
        status,
        currency: cur,
        note,
        items: lines.map((l) => {
          const carat = l.diamond ? Number(l.diamond.carat) : parseCarat(l.carat);
          return {
            diamond_id: l.diamond?.id ?? null,
            description: l.description,
            carat: Number.isFinite(carat) ? Math.round(carat * 100) / 100 : null,
            unit_cents: parseAmount(l.price),
            quantity: qtyOf(l.quantity),
          };
        }),
      });
      setResult({ order, customer, stones: lines.filter((l) => l.diamond).map((l) => l.diamond), sold: {} });
      setStage('done');
    } catch (err) {
      console.error('[NGD Admin] order create failed:', err);
      setError(err.message || 'The order could not be created.');
      setStage('editing');
    }
  }

  const sell = async (d) => {
    setResult((r) => ({ ...r, sold: { ...r.sold, [d.id]: 'busy' } }));
    try {
      await markDiamondSold(d);
      setResult((r) => ({ ...r, sold: { ...r.sold, [d.id]: 'done' } }));
    } catch (err) {
      console.error('[NGD Admin] mark sold failed:', err);
      setResult((r) => ({ ...r, sold: { ...r.sold, [d.id]: err.message || 'It could not be marked Sold.' } }));
    }
  };

  const reset = () => {
    setCustomer(null);
    setLines([blankLine('diamond')]);
    setCurrency(DEFAULT_CURRENCY);
    setStatus('confirmed');
    setNote('');
    setTried(false);
    setError('');
    setResult(null);
    setStage('editing');
  };

  /* ---------------- after saving ---------------- */

  if (stage === 'done' && result) {
    const { order } = result;
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Orders &amp; Sales</p>
            <h1>Order created</h1>
          </div>
        </header>

        <section className={`${styles.box} ${styles.narrow}`}>
          <p className={styles.msgOk} role="status">
            <b>{order.public_id}</b> is recorded for {result.customer.full_name || result.customer.email || 'the customer'} —{' '}
            {formatMoney(order.total_cents, order.currency, { exact: true })}, {STATUS_LABEL[order.status]?.toLowerCase()}.
            The customer can see it on their account.
          </p>

          {result.stones.length > 0 && (
            <div className={styles.sellBox}>
              <h2>Mark {result.stones.length === 1 ? 'the stone' : 'the stones'} as sold?</h2>
              <p className={styles.hint}>
                Optional. This sets the stone’s availability to Sold on the
                storefront — the same edit as in Diamonds — and records it in the
                audit log. Leave it if the stone should stay as it is.
              </p>
              <ul className={styles.stoneList}>
                {result.stones.map((d) => {
                  const s = result.sold[d.id];
                  const sold = s === 'done' || d.availability === 'Sold';
                  const failed = s && s !== 'busy' && s !== 'done' ? s : null;
                  return (
                    <li key={d.id}>
                      <span>
                        <b>{d.stock_number || d.public_id}</b>{' '}
                        <span className={styles.blank}>{s === 'done' ? 'Sold' : d.availability ?? 'No availability set'}</span>
                      </span>
                      {sold
                        ? <span className={styles.pill} data-tone="done">Sold</span>
                        : (
                          <button type="button" className={styles.ghostBtn} disabled={s === 'busy'} onClick={() => sell(d)}>
                            {s === 'busy' ? 'Saving…' : 'Mark as Sold'}
                          </button>
                        )}
                      {failed && <p className={styles.badText}>{failed}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className={styles.actionRow}>
            <a className={styles.save} href={`/admin/orders?open=${encodeURIComponent(order.public_id)}`}>Open the order</a>
            <a className={styles.ghostBtn} href="/admin/orders">All orders</a>
            <button type="button" className={styles.ghostBtn} onClick={reset}>Record another</button>
          </div>
        </section>
      </div>
    );
  }

  /* ---------------- the form ---------------- */

  const shownTotal = CURRENCY_PATTERN.test(cur) ? formatMoney(checks.total, cur, { exact: true }) : '—';

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Orders &amp; Sales</p>
          <h1>New order</h1>
          <p className={styles.sub}>Record a sale the desk has confirmed. The customer sees it on their account.</p>
        </div>
        <a className={styles.ghostBtn} href="/admin/orders">Back to orders</a>
      </header>

      <form className={styles.editor} onSubmit={onSubmit} noValidate>
        <div className={styles.form}>
          <section className={styles.box} aria-labelledby="order-customer">
            <h2 id="order-customer">Customer</h2>
            <CustomerPicker value={customer} onPick={setCustomer} invalid={tried && !customer} />
            <p className={styles.hint}>
              An order belongs to a sign-in account. A buyer without one has to
              register on the website first.
            </p>
          </section>

          <section className={styles.box} aria-labelledby="order-lines">
            <h2 id="order-lines">Lines</h2>
            {lines.length > 0 ? (
              <ol className={styles.lineList}>
                {lines.map((l, i) => (
                  <LineEditor
                    key={l.key}
                    line={l}
                    index={i}
                    currency={cur}
                    tried={tried}
                    taken={taken}
                    canRemove={lines.length > 1}
                    onChange={change}
                    onRemove={remove}
                    onPickDiamond={pickDiamond}
                  />
                ))}
              </ol>
            ) : (
              <p className={styles.hint}>No lines yet.</p>
            )}
            <div className={styles.actionRow}>
              <button type="button" className={styles.ghostBtn} onClick={() => add('diamond')}>
                <Gem size={14} aria-hidden="true" /> Add a diamond
              </button>
              <button type="button" className={styles.ghostBtn} onClick={() => add('other')}>
                <Plus size={14} aria-hidden="true" /> Add another item
              </button>
            </div>
          </section>

          <section className={styles.box} aria-labelledby="order-terms">
            <h2 id="order-terms">Terms</h2>
            <div className={styles.grid2}>
              <label className={styles.field}>
                <span>Currency</span>
                <input
                  className={styles.input}
                  list="order-currencies"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                  maxLength={3}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck="false"
                  aria-invalid={!CURRENCY_PATTERN.test(cur) || undefined}
                />
                <datalist id="order-currencies">
                  {COMMON_CURRENCIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <label className={styles.field}>
                <span>Starting status</span>
                <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {ORDER_STATUSES.filter((s) => s !== 'cancelled').map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className={styles.hint}>Every line is priced in this currency. Nothing is converted.</p>
            <label className={styles.field}>
              <span>Note to the customer (optional)</span>
              <textarea className={styles.input} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className={styles.hint}>
              The customer’s own account can read this note. Keep internal
              remarks out of it.
            </p>
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={styles.box} aria-labelledby="order-summary">
            <h2 id="order-summary">Summary</h2>
            <dl className={styles.sumList}>
              <div><dt>Customer</dt><dd>{customer ? customer.full_name || customer.email || 'Unnamed account' : '—'}</dd></div>
              <div><dt>Lines</dt><dd>{lines.length}</dd></div>
              <div><dt>Status</dt><dd>{STATUS_LABEL[status]}</dd></div>
              <div className={styles.sumTotal}><dt>Total</dt><dd>{shownTotal}</dd></div>
            </dl>
            {!checks.complete && lines.length > 0 && (
              <p className={styles.hint}>Lines without a valid price or quantity are not in the total yet.</p>
            )}
            <p className={styles.hint}>The total is the sum of the lines and is saved as the order’s total.</p>

            {tried && checks.problems.length > 0 && (
              <ul className={styles.problems} role="alert">
                {checks.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            {error && <p className={styles.msgBad} role="alert">{error}</p>}

            <button type="submit" className={styles.save} disabled={stage === 'saving'}>
              {stage === 'saving' ? 'Creating…' : 'Create the order'}
            </button>
          </section>
        </aside>
      </form>
    </div>
  );
}
