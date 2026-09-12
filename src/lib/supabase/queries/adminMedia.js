import { supabase } from '../client.js';
import { BLOG_BUCKET, DIAMOND_BUCKET, publicUrl } from '../storage.js';
import { COLLECTIONS_PAGE, coverOf } from './adminCatalogue.js';
import { diffFor, recordAudit } from './adminInsights.js';
import { isMissingTable } from './blogs.js';

/**
 * The Storage buckets this project actually has.
 *
 * Both are real and already in use — diamond-images is written by the diamond
 * form, site-media (under journal/) by the journal editor. A blog-images
 * bucket was once proposed and never created. They are named here rather than
 * discovered, because listing buckets needs a privileged key and the whole
 * point of this console is that it runs on the publishable one.
 *
 * ALT TEXT AND CAPTIONS live in public.media (migration 0001): one row per
 * file, identified by (bucket, path) — the table's own unique key — so they
 * are written with an upsert on that pair. Public read, admin write.
 *
 * WHERE A FILE IS USED is still NOT stored. It is answered live, each time,
 * by reading diamonds.image_path, blogs.cover_path and collection covers — a
 * check rather than an index, so it is always current and never claims more
 * than it knows.
 */
export const BUCKETS = [
  {
    id: DIAMOND_BUCKET,
    label: 'Diamond images',
    /* Where a reference to a file in this bucket would be found. */
    usedBy: { table: 'diamonds', column: 'image_path', name: 'stock_number' },
  },
  {
    /* site-media: journal covers live under journal/. The blog-images
       bucket this entry used to name was never created. */
    id: BLOG_BUCKET,
    label: 'Site media',
    usedBy: { table: 'blogs', column: 'cover_path', name: 'title' },
  },
];

const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const VIDEO = /\.(mp4|webm|mov|m4v)$/i;
const DOC = /\.(pdf|txt|csv|json)$/i;

export const kindOf = (name) => (IMAGE.test(name) ? 'image' : VIDEO.test(name) ? 'video' : DOC.test(name) ? 'document' : 'other');

export const prettySize = (bytes) => {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Everything in a bucket, folders walked one level deep.
 *
 * Storage's list() does not recurse. The diamond bucket stores under
 * `diamonds/<public_id>/<file>`, so a flat list of the root returns only
 * folder entries — which is why this descends into them. Two levels is what
 * the existing key format produces; anything deeper is listed as a folder
 * rather than guessed at.
 */
export async function listBucket(bucketId) {
  if (!supabase) return { ok: false, files: [], error: 'Not connected to the database.' };

  const page = async (prefix) => {
    const { data, error } = await supabase.storage.from(bucketId).list(prefix, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) throw error;
    return data ?? [];
  };

  try {
    const root = await page('');
    const files = [];
    const folders = [];

    for (const entry of root) {
      // Storage marks a folder by having no id and no metadata.
      if (entry.id === null || !entry.metadata) folders.push(entry.name);
      else files.push({ ...entry, path: entry.name });
    }

    /* Folders are walked in parallel; one unreadable folder does not lose the
       rest of the bucket. */
    const nested = await Promise.all(folders.map(async (folder) => {
      try {
        const inner = await page(folder);
        return inner.flatMap((e) => {
          if (e.id === null || !e.metadata) {
            // A third level exists in the diamond bucket: diamonds/<id>/file.
            return [{ name: e.name, path: `${folder}/${e.name}`, isFolder: true }];
          }
          return [{ ...e, path: `${folder}/${e.name}` }];
        });
      } catch (err) {
        console.error(`[NGD Admin] could not list ${bucketId}/${folder}:`, err);
        return [];
      }
    }));

    const second = nested.flat();
    const deeper = await Promise.all(second.filter((e) => e.isFolder).map(async (folder) => {
      try {
        const inner = await page(folder.path);
        return inner
          .filter((e) => e.id !== null && e.metadata)
          .map((e) => ({ ...e, path: `${folder.path}/${e.name}` }));
      } catch { return []; }
    }));

    const all = [...files, ...second.filter((e) => !e.isFolder), ...deeper.flat()];

    return {
      ok: true,
      error: null,
      files: all.map((f) => ({
        path: f.path,
        name: f.name,
        kind: kindOf(f.name),
        size: f.metadata?.size ?? null,
        mime: f.metadata?.mimetype ?? null,
        createdAt: f.created_at ?? f.metadata?.lastModified ?? null,
        url: publicUrl(bucketId, f.path),
      })),
    };
  } catch (err) {
    console.error(`[NGD Admin] bucket ${bucketId} unavailable:`, err);
    return { ok: false, files: [], error: err.message || 'This bucket could not be listed.' };
  }
}

/**
 * Which stored paths a table is currently pointing at.
 *
 * A live read rather than a stored index, so it cannot drift. Returns a Map
 * from path to a readable owner, and `null` when the table itself could not be
 * read — which the screen renders as "usage unknown" rather than as "unused",
 * because deleting on the strength of a failed query is exactly the mistake
 * this is here to prevent.
 *
 * Collection covers (site_content, page = 'collections') are checked too, in
 * either bucket. If that read fails the whole answer is `null`: one
 * unreadable source of references is enough to make "unused" unknowable.
 */
export async function usageFor(bucket) {
  const spec = bucket.usedBy;
  if (!spec || !supabase) return null;
  const [{ data, error }, covers] = await Promise.all([
    supabase
      .from(spec.table)
      .select(`${spec.column},${spec.name}`)
      .not(spec.column, 'is', null),
    collectionCovers(bucket.id),
  ]);
  if (error) {
    console.error(`[NGD Admin] usage check on ${spec.table} failed:`, error);
    return null;
  }
  if (covers === null) return null;
  const map = new Map();
  (data ?? []).forEach((row) => {
    const p = row[spec.column];
    if (p) map.set(p, row[spec.name] ?? spec.table);
  });
  covers.forEach((label, p) => map.set(p, map.has(p) ? `${map.get(p)} + ${label}` : label));
  return map;
}

/**
 * Paths used as a collection cover in this bucket, as path → label.
 *
 * A missing site_content table means nothing can reference a file from it, so
 * that is an empty Map. Any other failure is null (usage unknown). A cover
 * whose bucket was not recorded counts in BOTH buckets: a false "in use" costs
 * a refused delete, a false "unused" costs a broken collection.
 */
async function collectionCovers(bucketId) {
  const { data, error } = await supabase
    .from('site_content')
    .select('section,heading,image_path,draft')
    .eq('page', COLLECTIONS_PAGE)
    .not('image_path', 'is', null);
  if (error) {
    if (isMissingTable(error)) return new Map();
    console.error('[NGD Admin] usage check on collection covers failed:', error);
    return null;
  }
  const map = new Map();
  (data ?? []).forEach((row) => {
    const cover = coverOf(row);
    if (!cover || /^https:\/\//i.test(cover.path)) return;
    if (cover.bucketKnown && cover.bucket !== bucketId) return;
    map.set(cover.path, `Collection · ${row.heading || row.section}`);
  });
  return map;
}

/**
 * Upload, with progress.
 *
 * supabase-js has no progress callback on Storage uploads, so this goes
 * through XHR against the same REST endpoint with the same session token —
 * which is what supabase-js does internally anyway. The token is read from the
 * live session and never stored; RLS on storage.objects is what authorises the
 * write, exactly as it would through the SDK.
 */
export async function uploadWithProgress(bucketId, path, file, onProgress) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Your session has expired. Sign in again.');

  const base = supabase.storageUrl ?? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${base}/object/${bucketId}/${encodeURI(path)}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({ path });
      else {
        let msg = `Upload failed (${xhr.status}).`;
        try { msg = JSON.parse(xhr.responseText).message ?? msg; } catch { /* keep the status */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('The upload could not reach the server.'));
    xhr.send(file);
  });
}

/** Remove a file. Callers must establish it is unused first. */
export async function removeFile(bucketId, path) {
  const { error } = await supabase.storage.from(bucketId).remove([path]);
  if (error) throw error;
}

/* ======================= alt text and captions ======================= */

export const MEDIA_LIMITS = { alt: 250, caption: 500 };
const META_COLUMNS = 'id,bucket,path,alt_text,caption,created_at';

/**
 * The media rows for one bucket, as a Map from path to row.
 *
 * A file with no row simply has no alt text yet; rows are created on first
 * save. `missing` (table absent) and `error` (unreadable) are reported apart
 * from an empty Map, so the screen never offers an editor it cannot save.
 */
export async function listMediaMeta(bucketId) {
  if (!supabase) return { ok: false, missing: false, map: new Map(), error: 'Not connected to the database.' };
  const { data, error } = await supabase
    .from('media')
    .select(META_COLUMNS)
    .eq('bucket', bucketId)
    .limit(5000);
  if (error) {
    if (isMissingTable(error)) return { ok: false, missing: true, map: new Map(), error: null };
    console.error(`[NGD Admin] media rows for ${bucketId} unavailable:`, error);
    return { ok: false, missing: false, map: new Map(), error: error.message || 'Alt text could not be read.' };
  }
  return { ok: true, missing: false, map: new Map((data ?? []).map((r) => [r.path, r])), error: null };
}

/** Select-then-write by (bucket, path), for a table without the unique key. */
async function writeByPath(bucket, path, values) {
  const found = await supabase.from('media').select('id').eq('bucket', bucket).eq('path', path).limit(1).maybeSingle();
  if (found.error) return found;
  if (found.data) return supabase.from('media').update(values).eq('id', found.data.id).select(META_COLUMNS).single();
  return supabase.from('media').insert({ bucket, path, ...values }).select(META_COLUMNS).single();
}

/**
 * Save alt text and a caption for one stored file.
 *
 * Keyed by (bucket, path), which 0001 declares unique, so this is a single
 * upsert on that pair: the first save creates the row, later saves update it,
 * and uploaded_by is never overwritten because it is not in the payload. If
 * the live table turned out to lack that constraint (Postgres 42P10), it falls
 * back to select-then-insert/update on the same pair rather than failing.
 *
 * Empty fields are stored as null, so "no alt text" is one state, not two.
 */
export async function saveMediaMeta({ bucket, path, altText, caption, previous, label }) {
  if (!supabase) throw new Error('Not connected to the database.');
  const text = (v, max) => {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    return s === '' ? null : s;
  };
  const values = { alt_text: text(altText, MEDIA_LIMITS.alt), caption: text(caption, MEDIA_LIMITS.caption) };

  let result = await supabase
    .from('media')
    .upsert({ bucket, path, ...values }, { onConflict: 'bucket,path' })
    .select(META_COLUMNS)
    .single();
  if (result.error?.code === '42P10') result = await writeByPath(bucket, path, values);

  const { data, error } = result;
  if (error) {
    if (error.code === '42501' || /row-level security|permission denied/i.test(error.message ?? '')) {
      throw new Error('The database refused this change. Only an active administrator can edit alt text.');
    }
    if (isMissingTable(error)) throw new Error('The media table is not on this project, so alt text cannot be saved.');
    throw new Error(error.message || 'The alt text could not be saved.');
  }

  /* The texts themselves are not logged; the entry records that the file's
     description was set or changed. */
  await recordAudit({
    action: previous ? 'update' : 'create',
    entityType: 'media',
    entityId: path,
    entityLabel: `${label || path} · alt text and caption`,
    changes: diffFor('media', previous, { path, bucket }),
  });
  return data;
}

/**
 * Delete a file and the alt text that described it.
 *
 * The file goes first; only then is its media row removed, so a refused
 * delete never leaves a live file without its description. A row that cannot
 * be removed is left behind with a warning — it describes nothing and harms
 * nothing, and the delete the operator asked for has already happened.
 */
export async function deleteMediaFile(bucketId, path, label) {
  await removeFile(bucketId, path);
  const { error } = await supabase.from('media').delete().eq('bucket', bucketId).eq('path', path);
  if (error && !isMissingTable(error)) console.warn('[NGD Admin] media row not removed:', error.message);
  await recordAudit({
    action: 'media_delete',
    entityType: 'media',
    entityId: path,
    entityLabel: label ?? null,
    changes: diffFor('media', { path, bucket: bucketId }, { path: null, bucket: null }),
  });
}

/** The audit entry for a Media Library upload. Never blocks the upload. */
export async function recordMediaUpload(bucketId, path, label) {
  await recordAudit({
    action: 'media_upload',
    entityType: 'media',
    entityId: path,
    entityLabel: label ?? null,
    changes: diffFor('media', null, { path, bucket: bucketId }),
  });
}
