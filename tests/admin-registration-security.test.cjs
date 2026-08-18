'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const frontend = [read('register.html'), read('assets/js/register.js'),
  read('assets/js/supabase-config.js')].join('\n');
const fn = read('supabase/functions/register-admin/index.ts');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(!frontend.includes('ADMIN_SIGNUP_CODE'), 'secret environment name leaked into frontend');
expect(!frontend.includes("role: 'admin'") && !frontend.includes("role = 'admin'"),
  'frontend directly assigns the admin role');
expect(fn.includes("Deno.env.get('ADMIN_SIGNUP_CODE')"), 'function does not read the code secret');
expect(fn.includes("role: 'admin'") && fn.includes("account_status: 'active'"),
  'function does not perform the privileged admin profile update');
expect(fn.includes('MAX_ATTEMPTS') && fn.includes('429'), 'function has no attempt throttling');
expect(!/ADMIN_SIGNUP_CODE\s*=/.test(fn), 'function contains a hardcoded signup code');

console.log('PASS  admin registration secrets and role assignment stay server-side');
