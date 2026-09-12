import { supabase } from '../client.js';
import { diffFor, recordAudit } from './adminInsights.js';
import { adminCreateBlog, slugify } from './adminBlogs.js';
import { ARTICLE_PREFIX, parseArticle } from './submissions.js';

/**
 * Articles clients have sent in, for the journal editor.
 *
 * They are enquiries whose subject begins "Article submission · ". Opening one
 * makes a journal DRAFT from it — never a published post — and marks the
 * enquiry responded; declining marks it closed. Admins read and update
 * enquiries and write blogs under the existing policies.
 */

export async function adminListSubmissions() {
  if (!supabase) return { items: [] };
  const { data, error } = await supabase
    .from('enquiries')
    .select('id,public_id,full_name,email,subject,message,status,created_at')
    .like('subject', `${ARTICLE_PREFIX} · %`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return {
    items: (data ?? []).map((e) => ({ ...e, article: parseArticle(e) })).filter((e) => e.article),
  };
}

async function setStatus(sub, status) {
  const { error } = await supabase.from('enquiries').update({ status }).eq('id', sub.id);
  if (error) throw error;
  await recordAudit({
    action: 'status_change',
    entityType: 'submission',
    entityId: sub.public_id,
    entityLabel: sub.article.title,
    changes: diffFor('submission', sub, { status }),
  });
}

/**
 * Open a submission as a draft post. A slug already in use gets the enquiry
 * reference appended, so importing never collides with an existing post.
 */
export async function adminOpenSubmission(sub, takenSlugs = new Set()) {
  const base = slugify(sub.article.title) || 'client-article';
  const slug = takenSlugs.has(base) ? `${base}-${sub.public_id.slice(4).toLowerCase()}` : base;
  const row = await adminCreateBlog({
    slug,
    title: sub.article.title,
    excerpt: sub.article.summary,
    body: sub.article.body,
    author_name: sub.full_name,
    published: false,
  });
  await setStatus(sub, 'responded');
  return row;
}

export async function adminDeclineSubmission(sub) {
  await setStatus(sub, 'closed');
}
