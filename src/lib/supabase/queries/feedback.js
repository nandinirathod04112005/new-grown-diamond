import { supabase } from '../client.js';
import { createEnquiry } from './enquiries.js';

/**
 * Client feedback, built entirely on tables and policies the live project
 * already has — no new table, no new policy.
 *
 * SENDING. Feedback is a message to the desk, so it goes where messages to
 * the desk go: public.enquiries, through the same createEnquiry() the contact
 * form uses. Its existing policies let a guest or a signed-in customer insert
 * a 'new' row and nothing else — no status, no admin note, no one else's id.
 * The subject carries the rating and topic in a fixed, readable form
 * ("Feedback · 4/5 · service · Pune"), so the desk can read it in the ordinary
 * inbox and the Feedback screen can parse it.
 *
 * PUBLISHING. Nothing a client writes is public until an admin approves it.
 * Approving copies the display parts — name, city, words, rating — into
 * public.site_content under page = 'feedback', published. That table's
 * policies already allow exactly this: anyone may read a published row, and
 * only an active admin may write one. The enquiry itself stays private.
 *
 * site_content has no rating column, so for page = 'feedback' the row's
 * `draft` jsonb carries the item's facts: { rating, topic, blog_slug,
 * received_at }. A feedback row is never edited through a draft, so the field
 * is not needed for its usual purpose there.
 */

export const FEEDBACK_PAGE = 'feedback';
export const FEEDBACK_PREFIX = 'Feedback';

export const TOPICS = [
  ['general', 'General'],
  ['diamonds', 'Diamonds'],
  ['jewellery', 'Jewellery'],
  ['service', 'Service'],
  ['website', 'This website'],
  ['journal', 'The journal'],
];

export const TOPIC_LABEL = Object.fromEntries(TOPICS);

/* message: the enquiries table requires at least 20 characters. */
export const LIMITS = { name: 60, city: 60, messageMin: 20, messageMax: 1000 };

/* The enquiries table's own email rule, so the form refuses what it would. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "11 Sep 2026" — the same for every visitor, whatever their locale.
 *
 * The site's own language is the exception: on the Hindi and Gujarati pages
 * (`locale` 'hi' or 'gu') the month is written in that language, in the same
 * day, short month, year form. English never depends on the browser.
 */
export function feedbackDate(iso, locale = 'en') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (locale === 'hi' || locale === 'gu') {
    return d.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'gu-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------------- the subject line ---------------- */

const SEP = ' · ';
const clean = (s, max) => String(s ?? '').replace(/[·\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** "Feedback · 4/5 · service · Pune" or "Feedback · 5/5 · article:<slug>". */
export function feedbackSubject({ rating, topic, blogSlug, city }) {
  const about = blogSlug ? `article:${clean(blogSlug, 120)}` : (TOPIC_LABEL[topic] ? topic : 'general');
  const place = clean(city, LIMITS.city);
  return [FEEDBACK_PREFIX, `${rating}/5`, about, place].filter(Boolean).join(SEP);
}

/** The reverse, or null when a subject is not a feedback subject. */
export function parseFeedbackSubject(subject) {
  const parts = String(subject ?? '').split(SEP);
  if (parts[0] !== FEEDBACK_PREFIX) return null;
  const rating = Number.parseInt(parts[1], 10);
  if (!(rating >= 1 && rating <= 5)) return null;
  const about = parts[2] ?? 'general';
  const blogSlug = about.startsWith('article:') ? about.slice('article:'.length) : null;
  return {
    rating,
    topic: blogSlug ? 'journal' : (TOPIC_LABEL[about] ? about : 'general'),
    blogSlug,
    city: parts.slice(3).join(SEP) || null,
  };
}

/* ---------------- the public wall ---------------- */

const WALL_COLUMNS = 'section,heading,subheading,body,draft,created_at';

function fromContent(row) {
  const facts = row.draft && typeof row.draft === 'object' ? row.draft : {};
  const rating = Number(facts.rating);
  return {
    id: row.section,
    display_name: row.heading || 'A client',
    city: row.subheading || null,
    message: row.body || '',
    rating: rating >= 1 && rating <= 5 ? rating : 5,
    topic: TOPIC_LABEL[facts.topic] ? facts.topic : 'general',
    blog_slug: facts.blog_slug || null,
    created_at: facts.received_at || row.created_at,
  };
}

/** Approved feedback, newest first — only rows an admin has published. */
export async function loadFeedbackWall({ limit = 24, blogSlug = null, topic = null } = {}) {
  if (!supabase) return { items: [], unconfigured: true };
  let q = supabase
    .from('site_content')
    .select(WALL_COLUMNS)
    .eq('page', FEEDBACK_PAGE)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (blogSlug) q = q.eq('draft->>blog_slug', blogSlug);
  if (topic) q = q.eq('draft->>topic', topic);
  const { data, error } = await q;
  if (error) throw error;
  return { items: (data ?? []).map(fromContent).filter((f) => f.message) };
}

/** How many approved pieces there are, and their average rating. */
export async function loadFeedbackSummary() {
  if (!supabase) return { count: 0, average: null, unconfigured: true };
  const { data, error } = await supabase
    .from('site_content')
    .select('draft')
    .eq('page', FEEDBACK_PAGE)
    .eq('published', true)
    .limit(1000);
  if (error) throw error;
  const ratings = (data ?? []).map((r) => Number(r.draft?.rating)).filter((n) => n >= 1 && n <= 5);
  const count = ratings.length;
  return { count, average: count ? Math.round((ratings.reduce((s, n) => s + n, 0) / count) * 10) / 10 : null };
}

/* ---------------- sending ---------------- */

/*
 * A refusal keeps its English sentence as the Error's message and names
 * itself in `reason` ('email', 'message', 'name', 'session', 'failed',
 * 'unconfigured'), so a form can show the same sentence in the visitor's
 * language (components/feedback/Feedback.copy.js) without this file knowing
 * about languages.
 */
const refusal = (reason, message) => Object.assign(new Error(message), { reason });

/** A sentence a client can act on, for each refusal they can actually hit. */
export function explainSendError(error) {
  const code = error?.code;
  const msg = error?.message ?? '';
  if (code === '23514' && /email/.test(msg)) return refusal('email', 'That email address does not look right. Check it and try again.');
  if (code === '23514' && /message/.test(msg)) return refusal('message', 'Please write a little more — at least 20 characters.');
  if (code === '23514' && /full_name/.test(msg)) return refusal('name', 'Please enter your name.');
  if (code === '42501' || /row-level security/i.test(msg)) return refusal('session', 'Please sign in again, or sign out and send it as a guest.');
  return refusal('failed', 'It could not be sent just now. Please try again in a moment.');
}

/**
 * Send feedback to the desk. Returns the enquiry reference.
 * `blogSlug` ties it to one journal article.
 */
export async function submitFeedback({ rating, message, name, email, city, topic = 'general', blogSlug = null }) {
  if (!supabase) throw refusal('unconfigured', 'This deployment is not connected to its database.');
  try {
    return await createEnquiry({
      fullName: clean(name, LIMITS.name),
      email: String(email ?? '').trim(),
      subject: feedbackSubject({ rating, topic, blogSlug, city }),
      message: String(message ?? '').trim(),
    });
  } catch (error) {
    throw explainSendError(error);
  }
}

/**
 * The signed-in client's own feedback and where each stands. Their enquiries
 * are theirs to read under the existing policy; whether one is on the website
 * is read from the published wall, which anyone may read.
 */
export async function listMyFeedback() {
  if (!supabase) return { items: [] };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { items: [] };
  const { data, error } = await supabase
    .from('enquiries')
    .select('public_id,subject,message,status,created_at')
    .eq('user_id', session.user.id)
    .like('subject', `${FEEDBACK_PREFIX}${SEP}%`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []).map((r) => ({ ...r, facts: parseFeedbackSubject(r.subject) })).filter((r) => r.facts);
  let live = new Set();
  if (rows.length) {
    const { data: pub } = await supabase
      .from('site_content')
      .select('section')
      .eq('page', FEEDBACK_PAGE)
      .eq('published', true)
      .in('section', rows.map((r) => `fb-${r.public_id}`));
    live = new Set((pub ?? []).map((p) => p.section));
  }
  return {
    items: rows.map((r) => ({
      id: r.public_id,
      rating: r.facts.rating,
      topic: r.facts.topic,
      blog_slug: r.facts.blogSlug,
      city: r.facts.city,
      message: r.message,
      created_at: r.created_at,
      status: live.has(`fb-${r.public_id}`) ? 'approved' : r.status === 'closed' ? 'rejected' : 'pending',
    })),
  };
}
