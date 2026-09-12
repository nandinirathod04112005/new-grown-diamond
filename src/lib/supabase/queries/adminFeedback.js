import { supabase } from '../client.js';
import { diffFor, recordAudit } from './adminInsights.js';
import { FEEDBACK_PAGE, FEEDBACK_PREFIX, parseFeedbackSubject } from './feedback.js';

/**
 * Feedback moderation, for active admins, on the tables that already exist.
 *
 * The feedback itself is an enquiry (queries/feedback.js explains why). What
 * the public sees is a site_content row, page = 'feedback', section =
 * 'fb-<enquiry reference>', written only when an admin approves. So:
 *
 *   waiting        no published row, enquiry not closed
 *   published      a published row exists
 *   not published  no published row, enquiry closed
 *
 * Approve writes (or re-publishes) the row and marks the enquiry responded;
 * reject and "back to waiting" unpublish it and set the enquiry closed or new.
 * Every step uses the existing policies: admins read and update enquiries,
 * and read, insert and update site_content. Nothing is deleted — enquiries
 * have no delete policy, and a rejected row stays as an unpublished record.
 *
 * The audit log records the decision only, never the client's words.
 */

const ENQUIRY_COLUMNS = 'id,public_id,full_name,email,subject,message,status,created_at,user_id';

export async function adminListFeedback() {
  if (!supabase) return { items: [] };
  const [enq, content] = await Promise.all([
    supabase.from('enquiries').select(ENQUIRY_COLUMNS)
      .like('subject', `${FEEDBACK_PREFIX} · %`)
      .order('created_at', { ascending: false }),
    supabase.from('site_content').select('id,section,published').eq('page', FEEDBACK_PAGE),
  ]);
  if (enq.error) throw enq.error;
  if (content.error) throw content.error;

  const rows = new Map((content.data ?? []).map((r) => [r.section, r]));
  const items = (enq.data ?? []).map((e) => {
    const facts = parseFeedbackSubject(e.subject);
    if (!facts) return null;
    const row = rows.get(`fb-${e.public_id}`);
    return {
      ...e,
      rating: facts.rating,
      topic: facts.topic,
      blog_slug: facts.blogSlug,
      city: facts.city,
      display_name: e.full_name,
      state: row?.published ? 'approved' : e.status === 'closed' ? 'rejected' : 'pending',
    };
  }).filter(Boolean);
  return { items };
}

async function setEnquiryStatus(row, status) {
  const { error } = await supabase.from('enquiries').update({ status }).eq('id', row.id);
  if (error) throw error;
}

/** Approve (publish), reject, or send back to waiting. */
export async function adminSetFeedbackState(row, next) {
  const section = `fb-${row.public_id}`;
  if (next === 'approved') {
    const { error } = await supabase.from('site_content').upsert({
      page: FEEDBACK_PAGE,
      section,
      heading: row.display_name,
      subheading: row.city,
      body: row.message,
      cta_href: row.blog_slug ? `/blogs/${row.blog_slug}` : null,
      draft: { rating: row.rating, topic: row.topic, blog_slug: row.blog_slug, received_at: row.created_at },
      published: true,
    }, { onConflict: 'page,section' });
    if (error) throw error;
    await setEnquiryStatus(row, 'responded');
  } else {
    /* Unpublish if it was ever published; there may be no row at all. */
    const { error } = await supabase.from('site_content').update({ published: false })
      .eq('page', FEEDBACK_PAGE).eq('section', section);
    if (error) throw error;
    await setEnquiryStatus(row, next === 'rejected' ? 'closed' : 'new');
  }
  await recordAudit({
    action: next === 'approved' ? 'publish' : next === 'rejected' ? 'unpublish' : 'status_change',
    entityType: 'feedback',
    entityId: row.public_id,
    entityLabel: `${row.display_name} · ${row.rating}★`,
    changes: diffFor('feedback', { status: row.state }, { status: next }),
  });
}
