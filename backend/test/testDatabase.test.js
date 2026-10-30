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
  assert.throws(() => assertSafeTestDatabaseUrl(LOCAL, { DATABASE_URL: LOCAL }), /server database/);
});

test('rejects the server database written another way', () => {
  // 포트 생략, localhost와 127.0.0.1
  assert.throws(() => assertSafeTestDatabaseUrl('postgres://u:p@localhost/mechuri_test', { DATABASE_URL: LOCAL }), /server database/);
  // DATABASE_URL 없이 DB_* 로 접속하는 서버
  const dbEnv = { DB_HOST: '127.0.0.1', DB_PORT: '5432', DB_NAME: 'mechuri_test' };
  assert.throws(() => assertSafeTestDatabaseUrl(LOCAL, dbEnv), /server database/);
  assert.strictEqual(assertSafeTestDatabaseUrl(LOCAL, { ...dbEnv, DB_NAME: 'mechuri_db' }), 'mechuri_test');
});

test('rejects an invalid URL', () => {
  assert.throws(() => assertSafeTestDatabaseUrl('not a url', {}), /not a valid URL/);
});
