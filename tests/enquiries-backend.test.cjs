'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sql = read('supabase/enquiries.sql');
const contact = read('assets/js/contact.js');
const customer = read('assets/js/customer-enquiries.js');
const admin = read('assets/js/admin-enquiries.js');
const contactHtml = read('contact.html');

for (const column of ['public_id', 'user_id', 'full_name', 'company_name', 'email',
  'mobile', 'country', 'subject', 'message', 'product_type', 'diamond_id',
  'jewellery_id', 'status', 'admin_note', 'created_at', 'updated_at']) {
  assert.match(sql, new RegExp(`\\b${column}\\b`), `missing enquiries.${column}`);
}
assert.match(sql, /alter table public\.enquiries enable row level security/i);
assert.match(sql, /status in \('new', 'in_progress', 'responded', 'closed'\)/i);
assert.match(sql, /enquiries_message_length[\s\S]*>= 20/i);
assert.match(sql, /enquiries_email_format/i);

// There is deliberately no anonymous SELECT or customer UPDATE policy.
assert.match(sql, /for insert to anon[\s\S]*user_id is null/i);
assert.match(sql, /for insert to authenticated[\s\S]*user_id = auth\.uid\(\)/i);
assert.match(sql, /for select to authenticated[\s\S]*user_id = auth\.uid\(\)/i);
assert.match(sql, /active admin reads all enquiries[\s\S]*public\.is_active_admin\(\)/i);
assert.match(sql, /active admin updates enquiries[\s\S]*public\.is_active_admin\(\)/i);
assert.doesNotMatch(sql, /customer updates enquiries/i);
assert.doesNotMatch(sql, /grant select[^;]*to anon/i);
assert.doesNotMatch(sql, /service_role/i);

assert.match(contactHtml, /name="website"[^>]*tabindex="-1"/i);
assert.match(contact, /sb\.auth\.getUser\(\)/);
assert.match(contact, /payload\.user_id\s*=\s*auth\.data/);
assert.doesNotMatch(contactHtml, /name="user_id"/i);
assert.match(contact, /await sb\.from\('enquiries'\)\.insert\(payload\)/);
assert.match(contact, /ENQ-/);
assert.match(contact, /result\.error\.code !== '23505'/);
assert.match(contact, /We could not send your enquiry/);
assert.doesNotMatch(contact, /alertBox\([^\n]*error\.message/);

assert.match(customer, /from\('enquiries'\)/);
assert.match(customer, /\.eq\('user_id',auth\.user\.id\)/);
assert.match(customer, /textContent=v==null/);
assert.match(admin, /from\('enquiries'\)\.select/);
assert.match(admin, /from\('enquiries'\)\.update\(changes\)/);
assert.match(admin, /textContent = v == null/);

console.log('PASS  real enquiry backend contract and security checks');
