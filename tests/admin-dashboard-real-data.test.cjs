'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('admin/dashboard.html', 'utf8');
const js = fs.readFileSync('assets/js/admin-dashboard.js', 'utf8');

assert.equal((html.match(/data-admin-kpi="/g) || []).length, 7);
for (const key of ['diamonds', 'jewellery', 'customers', 'pending_quotes',
  'pending_holds', 'pending_inspections', 'enquiries']) {
  assert.match(html, new RegExp(`data-admin-kpi="${key}"`));
}
assert.doesNotMatch(html, /Demo figures|Demo feed|data-admin-kpi-chip/);
assert.match(html, /data-admin-activity-loading/);
assert.match(js, /No recent activity/);
assert.match(js, /Some dashboard data could not be loaded/);
assert.match(js, /count: 'exact', head: true/);
assert.doesNotMatch(js, /service_role|SUPABASE_SERVICE/);
for (const page of ['diamonds', 'jewellery', 'customers', 'quotes', 'holds',
  'inspections', 'enquiries']) {
  assert.match(html, new RegExp(`data-admin-action="${page}" href="${page}\\.html"`));
}

// Syntax-check the browser controller without running its DOM bootstrap.
new vm.Script(js, { filename: 'assets/js/admin-dashboard.js' });
console.log('PASS  admin dashboard real-data structure and controller checks');
