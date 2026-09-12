import { supabase } from '../client.js';
import { recordAudit } from './adminInsights.js';
import {
  CONTENT_COLUMNS,
  auditChanges,
  deleteSiteContentRow,
  explainWriteError,
  writeSiteContentRow,
} from './siteContentAdmin.js';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  SETTINGS_PAGE,
  SETTINGS_SECTION,
  SOCIAL_NETWORKS,
  hasControlChars,
  isEmail,
  isHttpsUrl,
  isPhoneDisplay,
  isTel,
  looksLikeHtml,
  mergeSettings,
  refreshSiteContent,
} from '@/lib/siteContentStore.js';

/**
 * Settings — the business details the website prints — for active admins.
 *
 * There is no settings table, and none is added. The details are ONE row of
 * public.site_content: page = 'settings', section = 'business', published,
 * with the whole set in its jsonb column as { v: 1, live: {…} }:
 *
 *   desk      { phone, tel, email }          the enquiry line and desk email
 *   whatsapp  '+919913999794'                every wa.me link on the site
 *   offices   four × { city, address, phone, tel, email, lines: [{ phone, tel }] }
 *   social    { facebook, linkedin, instagram, x, pinterest }   '' hides one
 *
 * One row so a save is one conditional write: a visitor never sees a new desk
 * number beside an old email. `phone` is how a number is printed and `tel`
 * how it is dialled (E.164), kept apart as siteContent.js always kept them.
 *
 * Saving publishes; there is no draft stage for contact details. Reverting
 * deletes the row, and the site goes back to the built-in details.
 */

/** The saved row (or null) and the details as the website shows them. */
export async function loadSettings() {
  if (!supabase) return { unconfigured: true, row: null, settings: DEFAULT_SETTINGS };
  const { data, error } = await supabase
    .from('site_content')
    .select(CONTENT_COLUMNS)
    .eq('page', SETTINGS_PAGE)
    .eq('section', SETTINGS_SECTION)
    .maybeSingle();
  if (error) throw explainWriteError(error);
  return {
    unconfigured: false,
    row: data ?? null,
    settings: data?.published ? mergeSettings(data.draft?.live) : DEFAULT_SETTINGS,
    /* A row somebody switched off by hand: its values, shown for editing. */
    unpublished: data && !data.published ? mergeSettings(data.draft?.live) : null,
  };
}

/* ---------------- tidying and checking ---------------- */

const one = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

/** The form as it should be stored: trimmed, one line per field. */
export function tidySettings(form) {
  return {
    desk: { phone: one(form.desk.phone), tel: one(form.desk.tel).replace(/\s/g, ''), email: one(form.desk.email) },
    whatsapp: one(form.whatsapp).replace(/\s/g, ''),
    offices: form.offices.map((office) => ({
      city: one(office.city),
      address: one(office.address),
      phone: one(office.phone),
      tel: one(office.tel).replace(/\s/g, ''),
      email: one(office.email),
      lines: office.lines
        .map((line) => ({ phone: one(line.phone), tel: one(line.tel).replace(/\s/g, '') }))
        .filter((line) => line.phone || line.tel),
    })),
    social: Object.fromEntries(SOCIAL_NETWORKS.map(({ key }) => [key, one(form.social[key])])),
  };
}

const MESSAGES = {
  phone: 'Use digits, spaces and + ( ) - only, with at least 7 digits.',
  tel: 'Write it as + then the country code and number, digits only — for example +919913999794.',
  email: 'This does not look like an email address.',
  url: 'Use a full https:// address, or leave it empty to hide this icon.',
};

const digitsOf = (value) => String(value ?? '').replace(/\D/g, '');

function checkLine(errors, key, value, max, label) {
  if (!value) errors[key] = `${label} is required.`;
  else if (looksLikeHtml(value)) errors[key] = 'Plain text only — HTML tags are not allowed.';
  else if (hasControlChars(value)) errors[key] = 'This contains characters that cannot be shown. Retype it.';
  else if (value.length > max) errors[key] = `Keep it to ${max} characters (now ${value.length}).`;
}

function checkNumber(errors, warnings, prefix, phone, tel) {
  if (!isPhoneDisplay(phone)) errors[`${prefix}phone`] = MESSAGES.phone;
  if (!isTel(tel)) errors[`${prefix}tel`] = MESSAGES.tel;
  else if (isPhoneDisplay(phone) && digitsOf(phone) !== digitsOf(tel)) {
    warnings[`${prefix}tel`] = 'The printed and dialled numbers have different digits. Check they are the same line.';
  }
}

/**
 * { errors, warnings } keyed by field path ('desk.tel', 'offices.2.email',
 * 'offices.2.lines.0.tel', 'social.x'). Errors block the save; warnings
 * are shown and do not.
 */
export function validateSettings(values) {
  const errors = {};
  const warnings = {};

  checkNumber(errors, warnings, 'desk.', values.desk.phone, values.desk.tel);
  if (!isEmail(values.desk.email)) errors['desk.email'] = MESSAGES.email;
  if (!isTel(values.whatsapp)) errors.whatsapp = MESSAGES.tel;

  values.offices.forEach((office, i) => {
    const at = `offices.${i}.`;
    checkLine(errors, `${at}city`, office.city, LIMITS.city, 'A city');
    checkLine(errors, `${at}address`, office.address, LIMITS.address, 'An address');
    checkNumber(errors, warnings, at, office.phone, office.tel);
    if (office.email && !isEmail(office.email)) errors[`${at}email`] = MESSAGES.email;
    if (office.lines.length > LIMITS.lines) errors[`${at}lines`] = `At most ${LIMITS.lines} further numbers.`;
    office.lines.forEach((line, j) => checkNumber(errors, warnings, `${at}lines.${j}.`, line.phone, line.tel));
  });

  for (const { key } of SOCIAL_NETWORKS) {
    const url = values.social[key];
    if (url && !isHttpsUrl(url)) errors[`social.${key}`] = MESSAGES.url;
  }

  return { errors, warnings };
}

/* ---------------- writing ---------------- */

/**
 * Save and publish. `values` must already have passed validateSettings.
 * Returns the saved row.
 */
export async function publishSettings(values, known, previous) {
  const row = await writeSiteContentRow(SETTINGS_PAGE, SETTINGS_SECTION, {
    heading: 'Business details',
    subheading: null,
    body: null,
    cta_label: null,
    cta_href: null,
    published: true,
    draft: { v: 1, live: values },
  }, known);
  recordAudit({
    action: known ? 'update' : 'create',
    entityType: 'settings',
    entityId: SETTINGS_SECTION,
    entityLabel: 'Business details',
    changes: auditChanges(previous, values),
  });
  refreshSiteContent();
  return row;
}

/** Delete the row; the website shows the built-in details again. */
export async function revertSettings(known, previous) {
  await deleteSiteContentRow(known);
  recordAudit({
    action: 'delete',
    entityType: 'settings',
    entityId: SETTINGS_SECTION,
    entityLabel: 'Business details (reverted to built-in)',
    changes: auditChanges(previous, DEFAULT_SETTINGS),
  });
  refreshSiteContent();
}
