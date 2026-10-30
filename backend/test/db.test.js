// 실제 PostgreSQL이 필요한 테스트. TEST_DATABASE_URL이 있을 때만 돈다.
// ⚠️ 그 DB의 public 스키마를 지우고 다시 만든다. 개발 DB 말고 빈 테스트용 DB를 쓰세요.
//   이름이 _test로 끝나는 로컬 DB만 받는다 (helpers/testDatabase.js).
//   예: TEST_DATABASE_URL=postgres://postgres:mechuri_password@127.0.0.1:5432/mechuri_test npm test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { assertSafeTestDatabaseUrl } = require('./helpers/testDatabase');

// 서버 설정(.env의 NODE_ENV, DATABASE_URL, DB_*)까지 읽은 뒤에 검사한다
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const skip = TEST_DATABASE_URL ? false : 'TEST_DATABASE_URL not set';

const backendDir = path.join(__dirname, '..');
const migrate = (...args) =>
  execFileSync(process.execPath, [require.resolve('sequelize-cli/lib/sequelize'), ...args], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DB_SSL: '' },
    stdio: 'pipe'
  });

test('database', { skip }, async (t) => {
  // 서버용 DATABASE_URL을 덮어쓰기 전에 확인한다
  assertSafeTestDatabaseUrl(TEST_DATABASE_URL);
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { sequelize } = require('../src/config/db');
  // 새 모델을 추가하고 마이그레이션을 빠뜨리면 첫 테스트가 실패한다
  const modelsDir = path.join(backendDir, 'src/models');
  const models = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.js')).map((f) => require(path.join(modelsDir, f)));
  const {
    createDbLoginCodeStore,
    setLoginCodeStore,
    createLoginCode,
    redeemLoginCode,
    sha256Hex,
    CODE_TTL_MS
  } = require('../src/auth/loginHandoff');
  const dbName = sequelize.getDatabaseName();
  assert.match(dbName, /_test$/, `Refusing to reset schema of non-test database "${dbName}"`);
  const resetSchema = () => sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  try {
    await t.test('migrations create every column the models use', async () => {
      await resetSchema();
      migrate('db:migrate');
      for (const model of models) {
        const columns = await sequelize.getQueryInterface().describeTable(model.getTableName());
        for (const [name, attr] of Object.entries(model.rawAttributes)) {
          const column = columns[attr.field || name];
          assert.ok(column, `${model.name}.${name} is missing from the migrated table`);
          assert.strictEqual(column.allowNull, attr.allowNull !== false && !attr.primaryKey, `${model.name}.${name} nullability`);
        }
        assert.strictEqual(Object.keys(columns).length, Object.keys(model.rawAttributes).length, `${model.name} has extra columns`);
      }
    });

    await t.test('migrations can be undone and redone', async () => {
      migrate('db:migrate:undo:all');
      assert.deepStrictEqual((await sequelize.getQueryInterface().showAllTables()).filter((n) => n !== 'SequelizeMeta'), []);
      migrate('db:migrate');
    });

    await t.test('migrations adopt a database that sync() already created', async () => {
      await resetSchema();
      await sequelize.sync();
      migrate('db:migrate');
      const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
      assert.ok(rows.length >= 2);
    });

    await t.test('login codes in the DB are single use, bound and expire', async () => {
      const LoginCode = require('../src/models/LoginCode');
      setLoginCodeStore(createDbLoginCodeStore(LoginCode));
      const verifier = 'a'.repeat(64);
      const challenge = sha256Hex(verifier);

      const code = await createLoginCode({ token: 'jwt', user: { id: 7 } }, challenge);
      assert.strictEqual(await LoginCode.count({ where: { codeHash: code } }), 0, 'raw code must not be stored');
      const [first, second] = await Promise.all([redeemLoginCode(code, verifier), redeemLoginCode(code, verifier)]);
      assert.deepStrictEqual([first, second].filter(Boolean), [{ token: 'jwt', user: { id: 7 } }]);

      const wrong = await createLoginCode({ token: 'jwt' }, challenge);
      assert.strictEqual(await redeemLoginCode(wrong, 'b'.repeat(64)), null);
      assert.strictEqual(await redeemLoginCode(wrong, verifier), null);

      const now = Date.now();
      const old = await createLoginCode({ token: 'jwt' }, challenge, now - CODE_TTL_MS - 1);
      assert.strictEqual(await redeemLoginCode(old, verifier, now), null);

      // 새 코드를 만들 때 만료된 행을 치운다
      await LoginCode.create({ codeHash: 'f'.repeat(64), challenge, payload: {}, expiresAt: new Date(now - 1) });
      await createLoginCode({ token: 'jwt' }, challenge, now);
      assert.strictEqual(await LoginCode.count({ where: { codeHash: 'f'.repeat(64) } }), 0);
    });
  } finally {
    await sequelize.close();
  }
});
