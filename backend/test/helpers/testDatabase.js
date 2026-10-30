// db.test.js는 TEST_DATABASE_URL DB의 public 스키마를 지운다.
// 주소를 잘못 줘서 개발·운영 DB가 지워지지 않도록, 아래를 모두 만족할 때만 그 주소를 쓴다.
//   1. DB 이름이 _test로 끝난다 (예: mechuri_test)
//   2. 호스트가 이 컴퓨터다 (localhost, 127.0.0.1, ::1). 원격 DB는 ALLOW_REMOTE_TEST_DB=true를 줘야 한다
//   3. NODE_ENV가 production이 아니고, 서버가 쓰는 DB(DATABASE_URL 또는 DB_*)와 다른 DB다
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

// 같은 DB인지 비교할 때 쓰는 "호스트:포트/이름". 로컬 주소는 하나로 묶는다
const targetKey = (host, port, name) => `${LOCAL_HOSTS.includes(host) ? 'local' : host}:${port || '5432'}/${name}`;

const serverTargetKey = (env) => {
  if (env.DATABASE_URL) {
    try {
      const server = new URL(env.DATABASE_URL);
      return targetKey(server.hostname, server.port, decodeURIComponent(server.pathname.replace(/^\//, '')));
    } catch {
      return null;
    }
  }
  return env.DB_NAME ? targetKey(env.DB_HOST || 'localhost', env.DB_PORT, env.DB_NAME) : null;
};

/** 안전하지 않으면 이유를 담아 throw한다 */
const assertSafeTestDatabaseUrl = (url, env = process.env) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid URL');
  }
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!/_test$/.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName}": the test database name must end with _test`);
  }
  if (!LOCAL_HOSTS.includes(parsed.hostname) && env.ALLOW_REMOTE_TEST_DB !== 'true') {
    throw new Error(`Refusing to reset a database on "${parsed.hostname}": set ALLOW_REMOTE_TEST_DB=true to use a remote test database`);
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset a database when NODE_ENV=production');
  }
  if (targetKey(parsed.hostname, parsed.port, dbName) === serverTargetKey(env)) {
    throw new Error('Refusing to reset the database: TEST_DATABASE_URL points at the server database');
  }
  return dbName;
};

module.exports = { assertSafeTestDatabaseUrl };
