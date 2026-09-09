import { supabase } from '../client.js';
import { BLOG_BUCKET, DIAMOND_BUCKET, publicUrl } from '../storage.js';

/**
 * The Storage buckets this project actually has.
 *
 * Both are real and already in use — diamond-images is written by the diamond
 * form, blog-images by the blog editor. They are named here rather than
 * discovered, because listing buckets needs a privileged key and the whole
 * point of this console is that it runs on the publishable one.
 *
 * WHAT IS MISSING AND WHY IT MATTERS: there is no `media` table. So alt text,
 * captions, upload attribution and a durable record of where a file is used
 * have nowhere to live. What CAN be answered honestly is "is this file
 * referenced by a row right now", by reading diamonds.image_path and
 * blogs.cover_path — which is what the usage column below does. That is a
 * live check rather than a stored index, so it is always current and it never
 * claims more than it knows.
 */
export const BUCKETS = [
  {
    id: DIAMOND_BUCKET,
    label: 'Diamond images',
    /* Where a reference to a file in this bucket would be found. */
    usedBy: { table: 'diamonds', column: 'image_path', name: 'stock_number' },
  },
  {
    id: BLOG_BUCKET,
    label: 'Blog images',
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
 */
export async function usageFor(bucket) {
  const spec = bucket.usedBy;
  if (!spec || !supabase) return null;
  const { data, error } = await supabase
    .from(spec.table)
    .select(`${spec.column},${spec.name}`)
    .not(spec.column, 'is', null);
  if (error) {
    console.error(`[NGD Admin] usage check on ${spec.table} failed:`, error);
    return null;
  }
  const map = new Map();
  (data ?? []).forEach((row) => {
    const p = row[spec.column];
    if (p) map.set(p, row[spec.name] ?? spec.table);
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
