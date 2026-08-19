'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const registerHtml = read('register.html');
const registerJs = read('assets/js/register.js');
const edgeFunction = read('supabase/functions/register-admin/index.ts');
const migration = read('supabase/migrations/20260818000000_admin_signup_attempts.sql');

assert.match(registerHtml, /option value="customer" selected>Customer/);
assert.match(registerHtml, /option value="admin">Admin/);
assert.match(registerHtml, /class="[^"]*d-none[^"]*" id="reg-admin-code-group"/);
assert.match(registerJs, /functions\.invoke\('register-admin'/);
assert.doesNotMatch(registerJs, /role\s*:\s*['"]admin['"]/i,
  'the browser must never assign the admin role');
assert.doesNotMatch(registerJs + registerHtml, /service[_-]?role|SUPABASE_SERVICE_ROLE_KEY/i,
  'browser assets must not mention or contain a service-role credential');

assert.match(edgeFunction, /Deno\.env\.get\('ADMIN_SIGNUP_CODE'\)/);
assert.match(edgeFunction, /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
assert.match(edgeFunction, /auth\.admin\.createUser/);
assert.match(edgeFunction, /role:\s*'admin'/);
assert.match(edgeFunction, /account_status:\s*'active'/);
assert.doesNotMatch(edgeFunction, /ADMIN_SIGNUP_CODE\s*=\s*['"][^'"]+['"]/,
  'the signup code must only come from the Edge Function secret');
assert.match(edgeFunction, /return response\([^;]*'invalid_admin_code'\)/);
assert.doesNotMatch(edgeFunction, /JSON\.stringify\([^)]*signupCode/,
  'the real code must never be returned');

assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all[^;]+from anon, authenticated/i);
assert.match(edgeFunction, /count >= 5/);
assert.match(edgeFunction, /blocked_until/);

console.log('PASS secure admin registration source and privilege boundaries');
