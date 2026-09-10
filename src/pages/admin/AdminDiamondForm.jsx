import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  adminCreateDiamond,
  adminGetDiamond,
  adminUpdateDiamond,
  newPublicId,
  uploadDiamondImage,
} from '@/lib/supabase/queries/diamonds.js';
import { diamondImageUrl } from '@/lib/supabase/storage.js';
import styles from './Admin.module.css';

const SHAPES = ['Round', 'Oval', 'Emerald', 'Cushion', 'Pear', 'Radiant', 'Princess', 'Marquise', 'Heart', 'Asscher'];
const COLOURS = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
const CLARITY = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2'];
const GRADES = ['Ideal', 'Excellent', 'Very Good', 'Good'];
const LABS = ['IGI', 'GIA', 'SGL', 'Other'];
const GROWTH = ['CVD', 'HPHT'];
const AVAILABILITY = ['In Stock', 'On Request', 'Reserved', 'Sold'];

const BLANK = {
  stock_number: '', shape: 'Round', carat: '', color: 'D', clarity: 'VS1',
  cut: 'Excellent', polish: 'Excellent', symmetry: 'Excellent', fluorescence: 'None',
  laboratory: 'IGI', report_number: '', certificate_number: '', certificate_url: '',
  measurements: '', depth_percentage: '', table_percentage: '', ratio: '',
  growth_method: 'CVD', availability: 'In Stock',
  total_price: '', price_per_carat: '', currency: 'USD',
  price_visible: false, featured: false, active: true,
};

const NUMERIC = ['carat', 'depth_percentage', 'table_percentage', 'ratio', 'total_price', 'price_per_carat'];

/** Empty numeric inputs must reach Postgres as null, never as an empty string. */
function toPayload(form) {
  const out = {};
  for (const [key, value] of Object.entries(form)) {
    if (NUMERIC.includes(key)) {
      out[key] = value === '' || value === null ? null : Number(value);
    } else if (typeof value === 'string') {
      out[key] = value.trim() === '' ? null : value.trim();
    } else {
      out[key] = value;
    }
  }
  return out;
}

const MAX_BYTES = 5 * 1024 * 1024; // the bucket's own limit

/**
 * Add or edit one stone, photograph included.
 *
 * The image goes to the diamond-images bucket first and the returned storage
 * path is written to the row, which is the layout the production site already
 * uses. Both the upload and the write are refused by the database for anyone
 * who is not an active admin: this form is a convenience, never the security
 * boundary.
 */
export default function AdminDiamondForm({ id }) {
  const editing = Boolean(id);
  const [form, setForm] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [existingPath, setExistingPath] = useState('');
  /* The row as it was loaded, kept so the audit entry can say what actually
     changed rather than listing every column the form submits. */
  const [loaded, setLoaded] = useState(null);
  const [stage, setStage] = useState(editing ? 'loading' : 'ready');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const loadRow = useCallback(async () => {
    try {
      const row = await adminGetDiamond(id);
      if (!row) {
        setError('That stone could not be found.');
        setStage('ready');
        return;
      }
      const next = { ...BLANK };
      for (const key of Object.keys(BLANK)) {
        if (row[key] !== null && row[key] !== undefined) next[key] = row[key];
      }
      setForm(next);
      setLoaded(row);
      setExistingPath(row.image_path || '');
      setStage('ready');
    } catch (err) {
      console.error('[NGD Admin] load stone failed:', err);
      setError('That stone could not be loaded.');
      setStage('ready');
    }
  }, [id]);

  useEffect(() => {
    // Loading an existing row is external-system synchronisation; loadRow's
    // state writes occur only after its database promise resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    if (editing) loadRow();
  }, [editing, loadRow]);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : diamondImageUrl(existingPath)),
    [file, existingPath],
  );

  // Object URLs are revoked on replacement, or the tab leaks a blob per pick.
  useEffect(() => {
    if (!file) return undefined;
    const url = previewUrl;
    return () => URL.revokeObjectURL(url);
  }, [file, previewUrl]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function onPickFile(e) {
    const picked = e.target.files?.[0];
    setError('');
    if (!picked) {
      setFile(null);
      return;
    }
    if (!picked.type.startsWith('image/')) {
      setError('That file is not an image.');
      e.target.value = '';
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(`That image is ${(picked.size / 1048576).toFixed(1)} MB. The bucket limit is 5 MB.`);
      e.target.value = '';
      return;
    }
    setFile(picked);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setDone('');

    if (!String(form.stock_number).trim()) {
      setError('Give the stone a stock number.');
      return;
    }
    if (form.carat === '' || Number(form.carat) <= 0) {
      setError('Enter the carat weight.');
      return;
    }

    setStage('saving');
    try {
      if (editing) {
        const payload = toPayload(form);
        if (file) payload.image_path = await uploadDiamondImage(form.public_id || id, file);
        await adminUpdateDiamond(id, payload, {
          previous: loaded,
          publicId: loaded?.public_id || form.public_id,
          label: form.stock_number || loaded?.stock_number,
        });
        if (payload.image_path) setExistingPath(payload.image_path);
        setFile(null);
        setDone('Saved. The public inventory is updated.');
      } else {
        const publicId = newPublicId();
        const payload = { ...toPayload(form), public_id: publicId };
        if (file) payload.image_path = await uploadDiamondImage(publicId, file);
        await adminCreateDiamond(payload);
        window.location.assign('/admin/diamonds');
        return;
      }
    } catch (err) {
      console.error('[NGD Admin] save failed:', err);
      // Constraint and policy messages are the useful ones, so they are shown.
      setError(err?.message || 'The stone could not be saved.');
    } finally {
      setStage('ready');
    }
  }

  if (stage === 'loading') {
    return (
      <main className={styles.page}>
        <p className={styles.muted}>Loading the stone…</p>
      </main>
    );
  }

  const sel = (key, label, options) => (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={form[key] ?? ''} onChange={set(key)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  const txt = (key, label, type = 'text', extra = {}) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input type={type} value={form[key] ?? ''} onChange={set(key)} {...extra} />
    </label>
  );

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>{editing ? 'Edit diamond' : 'Add a diamond'}</h1>
          <p>Anything saved here appears on the public inventory immediately.</p>
        </div>
        <a className={styles.ghost} href="/admin/diamonds">Back to stock</a>
      </header>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {done && <p className={styles.ok} role="status">{done}</p>}

        <fieldset className={styles.fieldset}>
          <legend>Photograph</legend>
          <div className={styles.grid3}>
            <div className={styles.drop}>
              <input type="file" accept="image/*" onChange={onPickFile} aria-label="Diamond photograph" />
              <span>JPEG, PNG or WebP, up to 5 MB</span>
            </div>
            {previewUrl
              ? <img className={styles.preview} src={previewUrl} alt="Selected diamond photograph" />
              : <p className={styles.muted}>No photograph yet. The card falls back to house artwork.</p>}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Identity</legend>
          <div className={styles.grid3}>
            {txt('stock_number', 'Stock number', 'text', { required: true })}
            {sel('shape', 'Shape', SHAPES)}
            {sel('availability', 'Availability', AVAILABILITY)}
            {sel('growth_method', 'Growth method', GROWTH)}
          </div>
          <div className={styles.grid3} style={{ marginTop: '1rem' }}>
            <label className={styles.check}>
              <input type="checkbox" checked={form.active} onChange={set('active')} />
              Visible on the site
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={form.featured} onChange={set('featured')} />
              Featured
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Grading</legend>
          <div className={styles.grid3}>
            {txt('carat', 'Carat', 'number', { step: '0.01', min: '0', required: true, inputMode: 'decimal' })}
            {sel('color', 'Colour', COLOURS)}
            {sel('clarity', 'Clarity', CLARITY)}
            {sel('cut', 'Cut', GRADES)}
            {sel('polish', 'Polish', GRADES)}
            {sel('symmetry', 'Symmetry', GRADES)}
            {txt('fluorescence', 'Fluorescence')}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Report</legend>
          <div className={styles.grid3}>
            {sel('laboratory', 'Laboratory', LABS)}
            {txt('report_number', 'Report number')}
            {txt('certificate_number', 'Certificate number')}
            {txt('certificate_url', 'Certificate URL', 'url')}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Proportions</legend>
          <div className={styles.grid3}>
            {txt('measurements', 'Measurements')}
            {txt('depth_percentage', 'Depth %', 'number', { step: '0.1' })}
            {txt('table_percentage', 'Table %', 'number', { step: '0.1' })}
            {txt('ratio', 'Ratio', 'number', { step: '0.01' })}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Price</legend>
          <div className={styles.grid3}>
            {txt('total_price', 'Total price', 'number', { step: '0.01', min: '0' })}
            {txt('price_per_carat', 'Price per carat', 'number', { step: '0.01', min: '0' })}
            {txt('currency', 'Currency')}
            <label className={styles.check}>
              <input type="checkbox" checked={form.price_visible} onChange={set('price_visible')} />
              Show price publicly
            </label>
          </div>
        </fieldset>

        <div className={styles.formActions}>
          <button className={styles.primary} type="submit" disabled={stage === 'saving'}>
            {stage === 'saving' ? 'Saving…' : editing ? 'Save changes' : 'Add the diamond'}
          </button>
          <a className={styles.ghost} href="/admin/diamonds">Cancel</a>
        </div>
      </form>
    </main>
  );
}
