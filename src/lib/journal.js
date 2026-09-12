import { JOURNAL_ARCHIVE } from '@/content/journalPosts.js';
import ARCHIVE_COPY from '@/content/journalPosts.copy.js';
import { JOURNAL_COVER_ALT, JOURNAL_COVERS } from '@/content/journalCovers.js';
import { pickCopy } from '@/i18n/useCopy.js';
import { getPublishedBlog, listPublishedBlogs } from '@/lib/supabase/queries/blogs.js';
import { blogCoverUrl } from '@/lib/supabase/storage.js';

/**
 * The journal as a reader sees it: the previous site's five articles, plus
 * every post published from the Control Centre, as one list.
 *
 * One shape for both, so no page has to know where a post came from:
 *
 *   { slug, title, excerpt, paragraphs[], cover, figure, dateLabel, dateTime,
 *     author, minutes, source: 'archive' | 'editor' }
 *
 * WHEN THE TWO MEET. A published editor post with the same slug as an archive
 * article replaces it — that is how the archive is edited: copy it into the
 * editor, change it, publish. If that post has no cover of its own it keeps the
 * archive's photograph, because an uploaded image is the one thing the copy
 * could not carry over.
 *
 * ORDER. Editor posts first, newest first by their publish date, then the
 * archive in the order the old site listed it. The archive has day and month
 * but no year, so it cannot be interleaved by date without inventing one.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const WORDS_PER_MINUTE = 200;

export function readingMinutes(text) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Paragraphs from stored text: split on blank lines, single breaks kept. */
export function toParagraphs(text) {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** A shortened excerpt at a word boundary, for cards that show a line or two. */
export function shorten(text, max = 180) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/* The site's other two languages, as Intl names them for dates. English keeps
   the hand-built format, so its dates never depend on the browser's locale. */
const DATE_LOCALE = { hi: 'hi-IN', gu: 'gu-IN' };

function formatDate(iso, locale = 'en') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (DATE_LOCALE[locale]) {
    return d.toLocaleDateString(DATE_LOCALE[locale], { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fromArchive(a) {
  const text = a.body.join(' ');
  return {
    slug: a.slug,
    title: a.title,
    excerpt: text,
    paragraphs: a.body,
    cover: JOURNAL_COVERS[a.cover] ?? null,
    figure: a.figure ? JOURNAL_COVERS[a.figure] ?? null : null,
    dateLabel: a.date ? `${a.date.day} ${MONTHS[a.date.month - 1]}` : null,
    dateTime: a.date ? `--${String(a.date.month).padStart(2, '0')}-${String(a.date.day).padStart(2, '0')}` : null,
    author: null,
    minutes: readingMinutes(text),
    source: 'archive',
  };
}

function fromEditor(row, archived) {
  const paragraphs = toParagraphs(row.body);
  const text = paragraphs.join(' ');
  const url = blogCoverUrl(row.cover_path);
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || shorten(text, 220),
    paragraphs,
    cover: url
      ? { src: url, fit: 'cover', alt: '' }
      : archived?.cover ?? null,
    figure: archived?.figure ?? null,
    dateLabel: row.published_at ? formatDate(row.published_at) : null,
    dateTime: row.published_at ?? null,
    author: row.author_name || null,
    minutes: readingMinutes(`${row.excerpt ?? ''} ${text}`),
    source: 'editor',
  };
}

const ARCHIVE = JOURNAL_ARCHIVE.map(fromArchive);
const ARCHIVE_BY_SLUG = new Map(ARCHIVE.map((p) => [p.slug, p]));

/** The archive alone, synchronously — what shows before the database answers. */
export function archivePosts() {
  return ARCHIVE;
}

export function archivePost(slug) {
  return ARCHIVE_BY_SLUG.get(slug) ?? null;
}

/* ---------------- in the reader's language ---------------- */

const ARCHIVE_SOURCE = new Map(JOURNAL_ARCHIVE.map((a) => [a.slug, a]));
const COVER_KEY = new Map(Object.entries(JOURNAL_COVERS).map(([key, cover]) => [cover, key]));
const ARCHIVE_WORDS = {};

function archiveWords(locale) {
  if (!ARCHIVE_WORDS[locale]) ARCHIVE_WORDS[locale] = pickCopy(ARCHIVE_COPY, locale);
  return ARCHIVE_WORDS[locale];
}

/** An archive photograph with its description in `locale`; any other image as it is. */
function localCover(cover, locale) {
  const alt = cover ? JOURNAL_COVER_ALT[locale]?.[COVER_KEY.get(cover)] : null;
  return alt ? { ...cover, alt } : cover;
}

/**
 * A post as a Hindi or Gujarati reader sees it.
 *
 * Only what the site itself wrote is translated: an archive article's title
 * and text (content/journalPosts.copy.js), its photographs' descriptions and
 * the month in its date. A post written in the Control Centre keeps its words
 * exactly as they were written — including one that has replaced an archive
 * article — and only its date is given in the reader's language. Reading time
 * stays the English article's. For English, and for any language without a
 * translation, the post comes back untouched.
 */
export function localizePost(post, locale) {
  if (!post || !DATE_LOCALE[locale]) return post;
  const source = post.source === 'archive' ? ARCHIVE_SOURCE.get(post.slug) : null;
  const words = source ? archiveWords(locale).posts?.[post.slug] : null;
  return {
    ...post,
    ...(words ? { title: words.title, excerpt: words.body.join(' '), paragraphs: words.body } : null),
    cover: localCover(post.cover, locale),
    figure: localCover(post.figure, locale),
    dateLabel: source
      ? (source.date ? dayMonth(source.date, locale) : null)
      : (post.dateTime ? formatDate(post.dateTime, locale) : null),
  };
}

/* An archive date — day and month, no year — in `locale`. The year given to
   Date is only a leap year so that 29 February exists; it is never shown. */
function dayMonth({ day, month }, locale) {
  return new Date(2000, month - 1, day).toLocaleDateString(DATE_LOCALE[locale], { day: 'numeric', month: 'long' });
}

/** The same for a list. English gets the very same list back. */
export function localizePosts(posts, locale) {
  return DATE_LOCALE[locale] ? posts.map((p) => localizePost(p, locale)) : posts;
}

/**
 * The whole journal.
 *
 * Never throws: if the database is unreachable the archive is still the
 * journal, and `editorFailed` says the published list could not be read so the
 * page can mention it quietly instead of pretending there is nothing more.
 */
export async function loadJournal() {
  try {
    const r = await listPublishedBlogs();
    const editor = (r.posts ?? []).map((row) => fromEditor(row, ARCHIVE_BY_SLUG.get(row.slug)));
    const replaced = new Set(editor.map((p) => p.slug));
    return {
      posts: [...editor, ...ARCHIVE.filter((p) => !replaced.has(p.slug))],
      editorFailed: false,
    };
  } catch (error) {
    console.error('[NGD journal]', error);
    return { posts: ARCHIVE, editorFailed: true };
  }
}

/**
 * One post by slug: the editor's published version if there is one, else the
 * archive's. `status` is 'ready' | 'notfound' | 'error'; an archive article
 * is ready even when the database cannot be reached.
 */
export async function loadPost(slug) {
  const archived = ARCHIVE_BY_SLUG.get(slug) ?? null;
  try {
    const r = await getPublishedBlog(slug);
    if (r.post) return { status: 'ready', post: fromEditor(r.post, archived) };
    return archived ? { status: 'ready', post: archived } : { status: 'notfound', post: null };
  } catch (error) {
    console.error('[NGD journal]', error);
    return archived ? { status: 'ready', post: archived } : { status: 'error', post: null };
  }
}
