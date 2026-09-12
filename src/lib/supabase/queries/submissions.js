import { supabase } from '../client.js';
import { createEnquiry } from './enquiries.js';
import { explainSendError } from './feedback.js';

/**
 * Articles sent in by clients for the journal.
 *
 * Like feedback, a submission is a message to the desk and travels as an
 * enquiry — the subject is "Article submission · <title>" and the message is
 * the article, with its summary on a first "Summary:" line when one is given.
 * Nothing is published by sending: the desk reads it, and an admin can open it
 * as a journal DRAFT from the Control Centre (queries/adminSubmissions.js),
 * edit it and publish it there.
 */

export const ARTICLE_PREFIX = 'Article submission';
const SEP = ' · ';

export const ARTICLE_LIMITS = { name: 80, title: 150, summary: 300, bodyMin: 300, bodyMax: 20000 };

const one = (s, max) => String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export function articleSubject(title) {
  return `${ARTICLE_PREFIX}${SEP}${one(title, ARTICLE_LIMITS.title)}`;
}

/** The parts of a submission back out of its enquiry, or null. */
export function parseArticle(enquiry) {
  const subject = String(enquiry?.subject ?? '');
  if (!subject.startsWith(`${ARTICLE_PREFIX}${SEP}`)) return null;
  const title = subject.slice(ARTICLE_PREFIX.length + SEP.length).trim();
  let text = String(enquiry.message ?? '');
  let summary = '';
  const m = text.match(/^Summary: (.*)\n\n/);
  if (m) {
    summary = m[1].trim();
    text = text.slice(m[0].length);
  }
  return { title, summary, body: text.trim() };
}

/** Send an article to the desk. Returns the enquiry reference. */
export async function submitArticle({ name, email, title, summary, body }) {
  /* `reason` as explainSendError gives it, so the form can say this in the visitor's language. */
  if (!supabase) throw Object.assign(new Error('This deployment is not connected to its database.'), { reason: 'unconfigured' });
  const lead = one(summary, ARTICLE_LIMITS.summary);
  const text = String(body ?? '').replace(/\r\n/g, '\n').trim().slice(0, ARTICLE_LIMITS.bodyMax);
  try {
    return await createEnquiry({
      fullName: one(name, ARTICLE_LIMITS.name),
      email: String(email ?? '').trim(),
      subject: articleSubject(title),
      message: lead ? `Summary: ${lead}\n\n${text}` : text,
    });
  } catch (error) {
    throw explainSendError(error);
  }
}
