import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination } from '../src/lib/supabase/loginDestination.js';

const session = { user: { id: 'signed-in-user', user_metadata: { role: 'admin' } } };
function client(data, error = null) {
  return { from(table) {
    assert.equal(table, 'profiles');
    return { select() { return { eq(column, id) {
      assert.equal(column, 'id');
      assert.equal(id, session.user.id);
      return { maybeSingle: async () => ({ data, error }) };
    } }; } };
  } };
}
test('only an active database admin goes to the admin panel', async () => {
  assert.equal(await loginDestination(client({ role: 'admin', account_status: 'active' }), session), '/admin');
  for (const profile of [null, { role: 'customer', account_status: 'active' }, { role: 'admin', account_status: 'suspended' }]) {
    assert.equal(await loginDestination(client(profile), session), '/account');
  }
  assert.equal(await loginDestination(client(null, { message: 'unavailable' }), session), '/account');
  assert.equal(await loginDestination({ from() { throw new Error('offline'); } }, session), '/account');
  assert.equal(await loginDestination(null, null), '/login');
});
