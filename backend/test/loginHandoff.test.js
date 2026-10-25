const test = require('node:test');
const assert = require('node:assert');
const {
  createLoginCode,
  redeemLoginCode,
  resolveDevReturnHost,
  buildAppReturnUrl,
  CODE_TTL_MS
} = require('../src/auth/loginHandoff');

test('login code can be redeemed once', () => {
  const code = createLoginCode({ token: 't', user: { id: 1 } });
  assert.deepStrictEqual(redeemLoginCode(code), { token: 't', user: { id: 1 } });
  assert.strictEqual(redeemLoginCode(code), null);
});

test('login code expires', () => {
  const now = Date.now();
  const code = createLoginCode({ token: 't' }, now);
  assert.strictEqual(redeemLoginCode(code, now + CODE_TTL_MS + 1), null);
  assert.strictEqual(redeemLoginCode(undefined), null);
});

test('dev return host only accepts local/private hosts or the allow list', () => {
  const dev = { NODE_ENV: 'development' };
  assert.strictEqual(resolveDevReturnHost('192.168.0.12:8081', dev), '192.168.0.12:8081');
  assert.strictEqual(resolveDevReturnHost('10.0.2.2:8081', dev), '10.0.2.2:8081');
  assert.strictEqual(resolveDevReturnHost('attacker.example:8081', dev), null);
  assert.strictEqual(resolveDevReturnHost('127.0.0.1:8081/--/x";alert(1)//', dev), null);
  assert.strictEqual(resolveDevReturnHost('8.8.8.8:8081', dev), null);
  assert.strictEqual(
    resolveDevReturnHost('abc.exp.direct', { ...dev, EXPO_DEV_HOSTS: 'abc.exp.direct' }),
    'abc.exp.direct'
  );
  assert.strictEqual(resolveDevReturnHost('192.168.0.12:8081', { NODE_ENV: 'production' }), null);
});

test('app return url carries only the code', () => {
  const dev = { NODE_ENV: 'development' };
  assert.strictEqual(buildAppReturnUrl('abc', '192.168.0.12:8081', dev), 'exp://192.168.0.12:8081/--/auth?code=abc');
  assert.strictEqual(buildAppReturnUrl('abc', 'evil.com', dev), 'mechuri://auth?code=abc');
  assert.strictEqual(buildAppReturnUrl('abc', undefined, dev), 'mechuri://auth?code=abc');
});

test('POST /kakao/exchange returns the token once', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const express = require('express');
  const { router } = require('../src/routes/auth');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', router);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/auth/kakao/exchange`;
  try {
    const code = createLoginCode({ token: 'jwt', user: { id: 7 } });
    const post = body => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const first = await post({ code });
    assert.strictEqual(first.status, 200);
    assert.deepStrictEqual(await first.json(), { token: 'jwt', user: { id: 7 } });
    assert.strictEqual((await post({ code })).status, 400);
  } finally {
    server.close();
  }
});
