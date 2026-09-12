import { supabase } from '../client.js';
import { recordAudit } from './adminInsights.js';
import {
  ANNOUNCEMENT_SECTION,
  CONTENT_PAGE,
  INTRO_FIELDS,
  INTRO_ROUTES,
  LANGS,
  LIMITS,
  hasControlChars,
  isHttpsUrl,
  isInternalPath,
  looksLikeHtml,
  refreshSiteContent,
} from '@/lib/siteContentStore.js';
import { PAGES } from '@/pages/siteContent.js';
import { localizePage } from '@/pages/siteContent.i18n.js';

/**
 * Website Content, for active admins, on public.site_content and its existing
 * policies (admin read / insert / update / delete, public read of published
 * rows). No new table, column, policy or function.
 *
 * ROWS (page = 'content'; page = 'feedback' is the client feedback and is
 * never read or written here):
 *
 *   section 'announcement'
 *     body       English message          cta_label  English link text
 *     cta_href   internal path or https URL
 *     published  the bar is on
 *     draft      { v: 1,
 *                  live:    { hi: { message, link_label }, gu: {…}, ends_at },
 *                  pending: an unpublished edit, or null }
 *
 *   section '/about' | '/education' | … (one row per editorial route)
 *     subheading English eyebrow   heading English title   body English intro
 *                (null = the built-in text)
 *     published  the override is live
 *     draft      { v: 1, live: { hi: {eyebrow,title,intro}, gu: {…} },
 *                  pending: { en, hi, gu } or null }
 *
 * The storefront selects `draft->live` only. `pending` is still in the row,
 * and a published row is publicly readable as a whole — so an unpublished
 * draft of a LIVE item can be read through the public API by anyone who asks
 * for it. Nothing here is secret, but it is not private either.
 *
 * EVERY WRITE IS CONDITIONAL on the row being as it was read (its id and
 * updated_at), so two administrators — or two tabs — cannot silently
 * overwrite each other. The loser is told to reload.
 */

export const CONTENT_COLUMNS = 'id,page,section,heading,subheading,body,cta_label,cta_href,published,draft,updated_at';

/* ---------------- plumbing shared with queries/siteSettings.js ---------------- */

export function explainWriteError(error) {
  const message = error?.message ?? '';
  if (error?.code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new Error('The database refused this change. Only an active administrator can edit the website — sign in again if your session has expired.');
  }
  if (error?.code === 'PGRST205' || /could not find the table|relation .* does not exist/i.test(message)) {
    return new Error('The site_content table is not available on this project.');
  }
  return new Error(message || 'The change could not be saved.');
}

const conflict = () => new Error(
  'This was changed somewhere else (another tab or administrator) after you opened it. Reload the page to see the latest version, then make your change again.',
);

async function actorId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/**
 * Insert or conditionally update one site_content row. `known` is the row as
 * last read (or null for a row that did not exist). Returns the row as saved.
 */
export async function writeSiteContentRow(page, section, patch, known) {
  if (!supabase) throw new Error('This deployment is not connected to its database.');
  const payload = { ...patch, updated_by: await actorId() };

  if (known?.id) {
    const { data, error } = await supabase
      .from('site_content')
      .update(payload)
      .eq('id', known.id)
      .eq('updated_at', known.updated_at)
      .select(CONTENT_COLUMNS);
    if (error) throw explainWriteError(error);
    if (!data?.length) throw conflict();
    return data[0];
  }

  const { data, error } = await supabase
    .from('site_content')
    .insert({ page, section, ...payload })
    .select(CONTENT_COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') throw conflict();
    throw explainWriteError(error);
  }
  return data;
}

/** Delete one row, only if it is still the version that was read. */
export async function deleteSiteContentRow(known) {
  if (!supabase) throw new Error('This deployment is not connected to its database.');
  if (!known?.id) return;
  const { data, error } = await supabase
    .from('site_content')
    .delete()
    .eq('id', known.id)
    .eq('updated_at', known.updated_at)
    .select('id');
  if (error) throw explainWriteError(error);
  if (!data?.length) throw conflict();
}

/* A value as the audit log should hold it: short, and null for empty. */
const short = (value) => (value == null || value === '' ? null : String(value).slice(0, 80));

function flatten(value, prefix, out) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, out);
  } else if (Array.isArray(value)) {
    value.forEach((inner, i) => flatten(inner, `${prefix}.${i + 1}`, out));
  } else {
    out[prefix] = value;
  }
  return out;
}

/**
 * {field: [before, after]} for the fields that moved, in the shape the audit
 * screen reads. Only the item's own public words and switches — the same text
 * the website shows — and never more than twelve fields.
 */
export function auditChanges(before, after) {
  const a = flatten(before ?? {}, '', {});
  const b = flatten(after ?? {}, '', {});
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (String(a[key] ?? '') === String(b[key] ?? '')) continue;
    out[key] = [short(a[key]), short(b[key])];
    if (Object.keys(out).length >= 12) break;
  }
  return out;
}

/* ---------------- shapes ---------------- */

export const ROUTE_LABELS = {
  '/about': 'Our story',
  '/education': 'Education',
  '/cvd-vs-natural': 'CVD vs natural',
  '/shapes': 'Shapes',
  '/price-and-size': 'Price and size',
  '/why-lab-grown': 'Why lab-grown',
};

export const LANG_LABELS = { en: 'English', hi: 'Hindi', gu: 'Gujarati' };

const str = (value) => (typeof value === 'string' ? value : '');
const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
/* One line of plain text: runs of whitespace (newlines included) become one space. */
const tidy = (value) => str(value).replace(/\s+/g, ' ').trim();

export const blankIntro = () => Object.fromEntries(LANGS.map((lang) => [lang, { eyebrow: '', title: '', intro: '' }]));

export const blankAnnouncement = () => ({
  enabled: true,
  message: { en: '', hi: '', gu: '' },
  linkLabel: { en: '', hi: '', gu: '' },
  href: '',
  endsAt: null,
});

function coerceIntro(value) {
  const source = obj(value);
  return Object.fromEntries(LANGS.map((lang) => [
    lang,
    Object.fromEntries(INTRO_FIELDS.map((field) => [field, str(obj(source[lang])[field])])),
  ]));
}

function coerceAnnouncement(value) {
  const source = obj(value);
  const blank = blankAnnouncement();
  return {
    enabled: source.enabled !== false,
    message: Object.fromEntries(LANGS.map((lang) => [lang, str(obj(source.message)[lang])])),
    linkLabel: Object.fromEntries(LANGS.map((lang) => [lang, str(obj(source.linkLabel)[lang])])),
    href: str(source.href),
    endsAt: typeof source.endsAt === 'string' && source.endsAt ? source.endsAt : blank.endsAt,
  };
}

/** The page's own words in each language — what "built-in" means. */
export function builtInIntro(route) {
  return Object.fromEntries(LANGS.map((lang) => {
    const page = localizePage(route, PAGES[route], lang);
    return [lang, { eyebrow: page.eyebrow, title: page.title, intro: page.intro }];
  }));
}

function introModel(row) {
  if (!row) return { row: null, published: false, live: null, pending: null };
  const draft = obj(row.draft);
  const liveJson = obj(draft.live);
  const live = {
    en: { eyebrow: str(row.subheading), title: str(row.heading), intro: str(row.body) },
    hi: coerceIntro({ hi: liveJson.hi }).hi,
    gu: coerceIntro({ gu: liveJson.gu }).gu,
  };
  const hasLive = LANGS.some((lang) => INTRO_FIELDS.some((field) => live[lang][field]));
  return {
    row,
    published: Boolean(row.published),
    live: hasLive ? live : null,
    pending: draft.pending ? coerceIntro(draft.pending) : null,
  };
}

function announcementModel(row) {
  if (!row) return { row: null, published: false, live: null, pending: null };
  const draft = obj(row.draft);
  const live = obj(draft.live);
  const hasLive = Boolean(str(row.body));
  return {
    row,
    published: Boolean(row.published),
    live: hasLive
      ? {
        enabled: Boolean(row.published),
        message: { en: str(row.body), hi: str(obj(live.hi).message), gu: str(obj(live.gu).message) },
        linkLabel: { en: str(row.cta_label), hi: str(obj(live.hi).link_label), gu: str(obj(live.gu).link_label) },
        href: str(row.cta_href),
        endsAt: typeof live.ends_at === 'string' && live.ends_at ? live.ends_at : null,
      }
      : null,
    pending: draft.pending ? coerceAnnouncement(draft.pending) : null,
  };
}

/** Everything under page = 'content', as editor models. */
export async function loadWebsiteContent() {
  if (!supabase) return { unconfigured: true, announcement: announcementModel(null), intros: Object.fromEntries(INTRO_ROUTES.map((r) => [r, introModel(null)])) };
  const { data, error } = await supabase.from('site_content').select(CONTENT_COLUMNS).eq('page', CONTENT_PAGE);
  if (error) throw explainWriteError(error);
  const rows = new Map((data ?? []).map((row) => [row.section, row]));
  return {
    unconfigured: false,
    announcement: announcementModel(rows.get(ANNOUNCEMENT_SECTION) ?? null),
    intros: Object.fromEntries(INTRO_ROUTES.map((route) => [route, introModel(rows.get(route) ?? null)])),
  };
}

/* ---------------- validation ---------------- */

function checkText(errors, key, value, max) {
  if (!value) return;
  if (looksLikeHtml(value)) errors[key] = 'Plain text only — HTML tags are not allowed.';
  else if (hasControlChars(value, true)) errors[key] = 'This contains characters that cannot be shown. Retype it as plain text.';
  else if (value.length > max) errors[key] = `Keep it to ${max} characters (now ${value.length}).`;
}

/** Errors keyed 'en.title', 'hi.intro', … */
export function validateIntro(values) {
  const errors = {};
  for (const lang of LANGS) {
    for (const field of INTRO_FIELDS) checkText(errors, `${lang}.${field}`, tidy(values[lang]?.[field]), LIMITS[field]);
  }
  return errors;
}

const introEmpty = (values) => LANGS.every((lang) => INTRO_FIELDS.every((field) => !tidy(values[lang]?.[field])));

/** Errors keyed 'message.en', 'linkLabel.hi', 'href', 'endsAt', 'form'. */
export function validateAnnouncement(values, { publishing = false } = {}) {
  const errors = {};
  for (const lang of LANGS) {
    checkText(errors, `message.${lang}`, tidy(values.message?.[lang]), LIMITS.message);
    checkText(errors, `linkLabel.${lang}`, tidy(values.linkLabel?.[lang]), LIMITS.linkLabel);
  }
  const href = str(values.href).trim();
  const anyLabel = LANGS.some((lang) => tidy(values.linkLabel?.[lang]));
  if (href && !isInternalPath(href) && !isHttpsUrl(href)) {
    errors.href = 'Use a path on this site that starts with / (for example /diamonds), or a full https:// address.';
  } else if (!href && anyLabel) {
    errors.href = 'Add where the link goes, or clear the link text.';
  }
  if (values.endsAt && !Number.isFinite(Date.parse(values.endsAt))) errors.endsAt = 'This date could not be read.';
  if (publishing) {
    if (!tidy(values.message?.en) && !errors['message.en']) errors['message.en'] = 'The English message is required — it is shown wherever a translation is missing.';
    if (href && !tidy(values.linkLabel?.en) && !errors['linkLabel.en']) errors['linkLabel.en'] = 'Add the link text in English.';
    if (values.enabled && values.endsAt && Date.parse(values.endsAt) <= Date.now()) errors.endsAt = 'This end date has already passed, so the bar would never show. Clear it or pick a later date.';
  }
  return errors;
}

/* ---------------- tidy values for storage ---------------- */

function tidyIntro(values) {
  return Object.fromEntries(LANGS.map((lang) => [
    lang,
    Object.fromEntries(INTRO_FIELDS.map((field) => [field, tidy(values[lang]?.[field])])),
  ]));
}

function tidyAnnouncement(values) {
  return {
    enabled: values.enabled !== false,
    message: Object.fromEntries(LANGS.map((lang) => [lang, tidy(values.message?.[lang])])),
    linkLabel: Object.fromEntries(LANGS.map((lang) => [lang, tidy(values.linkLabel?.[lang])])),
    href: str(values.href).trim(),
    endsAt: values.endsAt || null,
  };
}

const draftOf = (model, pending, live) => ({ v: 1, live: live ?? obj(model.row?.draft).live ?? null, pending });
const orNull = (value) => value || null;

/* ---------------- page introductions ---------------- */

const introLabel = (route) => `Page intro · ${ROUTE_LABELS[route] ?? route}`;

function done(action, route, label, changes) {
  recordAudit({ action, entityType: 'content', entityId: route, entityLabel: label, changes });
  refreshSiteContent();
}

/** Keep an unpublished edit. Nothing on the website changes. */
export async function saveIntroDraft(route, values, model) {
  const pending = tidyIntro(values);
  const row = await writeSiteContentRow(CONTENT_PAGE, route, {
    draft: draftOf(model, pending),
    ...(model.row ? {} : { published: false }),
  }, model.row);
  done('content_update', route, `${introLabel(route)} (draft)`, auditChanges(model.pending ?? model.live, pending));
  return introModel(row);
}

/** Publish: English into the columns, Hindi and Gujarati into draft.live. */
export async function publishIntro(route, values, model) {
  const clean = tidyIntro(values);
  if (introEmpty(clean)) {
    throw new Error('Every field is empty, which is the built-in text. Use "Revert to built-in" instead.');
  }
  const row = await writeSiteContentRow(CONTENT_PAGE, route, {
    subheading: orNull(clean.en.eyebrow),
    heading: orNull(clean.en.title),
    body: orNull(clean.en.intro),
    cta_label: null,
    cta_href: null,
    published: true,
    draft: { v: 1, live: { hi: clean.hi, gu: clean.gu }, pending: null },
  }, model.row);
  done('publish', route, introLabel(route), auditChanges(
    { ...(model.live ?? {}), live: model.published },
    { ...clean, live: true },
  ));
  return introModel(row);
}

/** Take the override off the website, keeping the saved words. */
export async function unpublishIntro(route, model) {
  const row = await writeSiteContentRow(CONTENT_PAGE, route, { published: false }, model.row);
  done('unpublish', route, introLabel(route), { live: ['yes', 'no'] });
  return introModel(row);
}

/** Drop the unpublished edit. A row that only ever held a draft goes. */
export async function discardIntroDraft(route, model) {
  if (!model.row) return introModel(null);
  if (!model.live && !model.published) {
    await deleteSiteContentRow(model.row);
    done('content_update', route, `${introLabel(route)} (draft discarded)`, {});
    return introModel(null);
  }
  const row = await writeSiteContentRow(CONTENT_PAGE, route, { draft: draftOf(model, null) }, model.row);
  done('content_update', route, `${introLabel(route)} (draft discarded)`, {});
  return introModel(row);
}

/** Delete the row: the page shows its built-in words in every language. */
export async function revertIntro(route, model) {
  await deleteSiteContentRow(model.row);
  done('delete', route, `${introLabel(route)} (reverted to built-in)`, auditChanges(model.live, null));
  return introModel(null);
}

/* ---------------- the announcement bar ---------------- */

const ANNOUNCEMENT_LABEL = 'Announcement bar';

export async function saveAnnouncementDraft(values, model) {
  const pending = tidyAnnouncement(values);
  const row = await writeSiteContentRow(CONTENT_PAGE, ANNOUNCEMENT_SECTION, {
    draft: draftOf(model, pending),
    ...(model.row ? {} : { published: false }),
  }, model.row);
  done('content_update', ANNOUNCEMENT_SECTION, `${ANNOUNCEMENT_LABEL} (draft)`, auditChanges(model.pending ?? model.live, pending));
  return announcementModel(row);
}

/**
 * Publish the form. "Show on the website" off publishes the words but keeps
 * the bar hidden (published = false), ready to switch on later.
 */
export async function publishAnnouncement(values, model) {
  const clean = tidyAnnouncement(values);
  const row = await writeSiteContentRow(CONTENT_PAGE, ANNOUNCEMENT_SECTION, {
    heading: null,
    subheading: null,
    body: clean.message.en,
    cta_label: clean.href ? orNull(clean.linkLabel.en) : null,
    cta_href: orNull(clean.href),
    published: clean.enabled,
    draft: {
      v: 1,
      live: {
        hi: { message: clean.message.hi, link_label: clean.href ? clean.linkLabel.hi : '' },
        gu: { message: clean.message.gu, link_label: clean.href ? clean.linkLabel.gu : '' },
        ends_at: clean.endsAt,
      },
      pending: null,
    },
  }, model.row);
  done(clean.enabled ? 'publish' : 'unpublish', ANNOUNCEMENT_SECTION, ANNOUNCEMENT_LABEL, auditChanges(model.live, clean));
  return announcementModel(row);
}

/** Switch the bar off at once, keeping its words and any draft. */
export async function turnOffAnnouncement(model) {
  const row = await writeSiteContentRow(CONTENT_PAGE, ANNOUNCEMENT_SECTION, { published: false }, model.row);
  done('unpublish', ANNOUNCEMENT_SECTION, ANNOUNCEMENT_LABEL, { enabled: ['yes', 'no'] });
  return announcementModel(row);
}

export async function discardAnnouncementDraft(model) {
  if (!model.row) return announcementModel(null);
  if (!model.live && !model.published) {
    await deleteSiteContentRow(model.row);
    done('content_update', ANNOUNCEMENT_SECTION, `${ANNOUNCEMENT_LABEL} (draft discarded)`, {});
    return announcementModel(null);
  }
  const row = await writeSiteContentRow(CONTENT_PAGE, ANNOUNCEMENT_SECTION, { draft: draftOf(model, null) }, model.row);
  done('content_update', ANNOUNCEMENT_SECTION, `${ANNOUNCEMENT_LABEL} (draft discarded)`, {});
  return announcementModel(row);
}

/** Delete the row: the built-in site has no announcement bar. */
export async function revertAnnouncement(model) {
  await deleteSiteContentRow(model.row);
  done('delete', ANNOUNCEMENT_SECTION, `${ANNOUNCEMENT_LABEL} (removed)`, auditChanges(model.live, null));
  return announcementModel(null);
}
