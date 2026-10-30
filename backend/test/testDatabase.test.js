const test = require('node:test');
const assert = require('node:assert');
const { assertSafeTestDatabaseUrl } = require('./helpers/testDatabase');

const LOCAL = 'postgres://postgres:pw@127.0.0.1:5432/mechuri_test';

test('accepts a local database whose name ends with _test', () => {
  assert.strictEqual(assertSafeTestDatabaseUrl(LOCAL, {}), 'mechuri_test');
  assert.strictEqual(assertSafeTestDatabaseUrl('postgres://u:p@localhost/app_test', {}), 'app_test');
});

test('rejects names that only contain "test"', () => {
  for (const name of ['latest', 'contest', 'mechuri_test_backup', 'test_mechuri', 'mechuri']) {
    assert.throws(() => assertSafeTestDatabaseUrl(`postgres://u:p@127.0.0.1/${name}`, {}), /must end with _test/);
  }
});

test('rejects a remote host unless ALLOW_REMOTE_TEST_DB=true', () => {
  const remote = 'postgres://u:p@dpg-abc.singapore-postgres.render.com/mechuri_test';
  assert.throws(() => assertSafeTestDatabaseUrl(remote, {}), /ALLOW_REMOTE_TEST_DB/);
  assert.strictEqual(assertSafeTestDatabaseUrl(remote, { ALLOW_REMOTE_TEST_DB: 'true' }), 'mechuri_test');
});

test('rejects production and the server database', () => {
  assert.throws(() => assertSafeTestDatabaseUrl(LOCAL, { NODE_ENV: 'production' }), /NODE_ENV=production/);
  assert.throws(() => assertSafeTestDatabaseUrl(LOCAL, { DATABASE_URL: LOCAL }), /same as DATABASE_URL/);
});

test('rejects an invalid URL', () => {
  assert.throws(() => assertSafeTestDatabaseUrl('not a url', {}), /not a valid URL/);
});
