import { supabase } from '../client.js';

const PRODUCT_TYPES = new Set(['diamond', 'jewellery']);

export function productRequestFromSearch(search = '') {
  const params = new URLSearchParams(search);
  if (params.get('stone')) return { type: 'diamond', reference: params.get('stone').slice(0, 120) };
  if (params.get('piece')) return { type: 'jewellery', reference: params.get('piece').slice(0, 120) };

  const type = params.get('product_type');
  const reference = params.get('product');
  if (PRODUCT_TYPES.has(type) && reference) return { type, reference: reference.slice(0, 120) };
  return null;
}

function enquiryPublicId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `ENQ-${Array.from(bytes, (byte) => (byte % 36).toString(36)).join('').toUpperCase()}`;
}

async function authenticatedUser() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  // Validate an existing token with Auth before attaching its user id. RLS is
  // still the authority, but stale browser state should not make a guest
  // enquiry fail the authenticated insert policy in a confusing way.
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

async function resolveProduct(request) {
  if (!request) return null;
  const table = request.type === 'diamond' ? 'diamonds' : 'jewellery';
  const key = request.type === 'diamond' ? 'stock_number' : 'sku';
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq(key, request.reference)
    .maybeSingle();

  if (error) throw error;
  return data ? { type: request.type, id: data.id } : null;
}

/**
 * Inserts only customer-owned enquiry fields. There is deliberately no
 * `.select()` after the insert: anonymous submitters have INSERT but no SELECT
 * permission under the existing RLS contract.
 */
export async function createEnquiry(fields, productRequest) {
  if (!supabase) throw new Error('Supabase is not configured');

  const [user, product] = await Promise.all([
    authenticatedUser(),
    resolveProduct(productRequest),
  ]);

  const payload = {
    user_id: user?.id ?? null,
    full_name: fields.fullName,
    company_name: fields.companyName || null,
    email: fields.email,
    mobile: fields.mobile || null,
    country: fields.country || null,
    subject: fields.subject,
    message: fields.message,
  };

  if (product) {
    payload.product_type = product.type;
    payload[product.type === 'diamond' ? 'diamond_id' : 'jewellery_id'] = product.id;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    payload.public_id = enquiryPublicId();
    const { error } = await supabase.from('enquiries').insert(payload);
    if (!error) return payload.public_id;
    if (error.code !== '23505') throw error;
  }

  throw new Error('Could not allocate a unique enquiry reference');
}
