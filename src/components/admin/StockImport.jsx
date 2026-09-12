import { useRef, useState } from 'react';

import { adminImportDiamonds, IMPORT_COLUMNS } from '@/lib/supabase/queries/diamonds.js';
import { parseCsv, coerceCell } from '@/lib/csv.js';
import styles from './StockImport.module.css';

/**
 * A whole stock price list, into the catalogue.
 *
 * WHY A CSV AND NOT THE .xlsx DIRECTLY. Reading a workbook in the browser means
 * shipping a spreadsheet parser to every visitor who ever opens the admin
 * bundle — several hundred kilobytes, for a screen used a few times a month.
 * The conversion is a one-line job at the desk (Excel: Save As → CSV UTF-8) and
 * the format is then something a person can open and check before it reaches
 * the live catalogue.
 *
 * THE FILE IS NEVER TRUSTED. It is parsed, the columns are matched against
 * IMPORT_COLUMNS and anything else is dropped, and the result is shown as
 * counts and a sample before a single row is written. The import only starts
 * when the person who is looking at those numbers presses the button.
 *
 * It writes through the ordinary signed-in session, so the database's own row
 * policies decide what is allowed — a non-admin gets the same refusal here as
 * anywhere else, from Postgres rather than from this component.
 */

export default function StockImport({ onDone }) {
  const input = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [problem, setProblem] = useState('');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  async function onFile(event) {
    const file = event.target.files?.[0];
    setProblem(''); setParsed(null); setResult(null); setProgress(null);
    if (!file) return;
    try {
      const table = parseCsv(await file.text());
      if (table.length < 2) throw new Error('The file has no rows under its header.');
      const header = table[0].map((h) => h.trim());
      const known = header.map((h) => (IMPORT_COLUMNS.includes(h) ? h : null));
      if (!known.includes('stock_number')) {
        throw new Error('No "stock_number" column. That is the one column an import cannot do without — it is how a stone already in the catalogue is recognised.');
      }
      const rows = table.slice(1).map((cells) => {
        const row = {};
        known.forEach((column, i) => { if (column) row[column] = coerceCell(column, cells[i]); });
        return row;
      }).filter((row) => row.stock_number);

      setParsed({
        rows,
        file: file.name,
        matched: known.filter(Boolean),
        ignored: header.filter((h) => !IMPORT_COLUMNS.includes(h)),
        skipped: table.length - 1 - rows.length,
      });
    } catch (e) {
      setProblem(e.message || 'That file could not be read.');
    }
  }

  async function run() {
    if (!parsed) return;
    setProgress({ done: 0, total: parsed.rows.length, written: 0, failures: 0 });
    try {
      const out = await adminImportDiamonds(parsed.rows, { onProgress: setProgress });
      setResult(out);
      onDone?.(out);
    } catch (e) {
      setProblem(e.message || 'The import stopped.');
    } finally {
      setProgress(null);
    }
  }

  const pct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <section className={styles.root} aria-labelledby="stock-import-title">
      <h3 id="stock-import-title" className={styles.title}>Import a stock list</h3>
      <p className={styles.lead}>
        A CSV of the stock price list. Stones are matched on <code>stock_number</code>:
        one already in the catalogue is brought up to date, one that is not is added.
        Nothing is deleted.
      </p>

      <input
        ref={input}
        className={styles.file}
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        disabled={Boolean(progress)}
      />

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {parsed && !result && (
        <div className={styles.preview}>
          <dl className={styles.counts}>
            <div><dt>File</dt><dd>{parsed.file}</dd></div>
            <div><dt>Stones</dt><dd>{parsed.rows.length.toLocaleString()}</dd></div>
            <div><dt>Columns used</dt><dd>{parsed.matched.length}</dd></div>
            {parsed.skipped > 0 && <div><dt>Rows without a stone number</dt><dd>{parsed.skipped}</dd></div>}
          </dl>
          {parsed.ignored.length > 0 && (
            <p className={styles.note}>
              Ignored columns: {parsed.ignored.join(', ')}
            </p>
          )}
          <button type="button" className={styles.go} onClick={run} disabled={Boolean(progress)}>
            {progress ? `Importing… ${pct}%` : `Import ${parsed.rows.length.toLocaleString()} stones`}
          </button>
        </div>
      )}

      {progress && (
        <div className={styles.progress}>
          <div className={styles.bar}><span style={{ width: `${pct}%` }} /></div>
          <p role="status">
            {progress.done.toLocaleString()} of {progress.total.toLocaleString()} ·
            {' '}{progress.written.toLocaleString()} written
            {progress.failures > 0 && ` · ${progress.failures} batch(es) refused`}
          </p>
        </div>
      )}

      {result && (
        <div className={styles.result} role="status">
          <p><strong>{result.written.toLocaleString()}</strong> of {result.total.toLocaleString()} stones are in the catalogue.</p>
          {result.failures.length > 0 && (
            <>
              <p className={styles.problem}>{result.failures.length} batch(es) were refused:</p>
              <ul className={styles.failures}>
                {result.failures.slice(0, 5).map((f) => (
                  <li key={f.from}>rows {f.from}–{f.to}: {f.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
