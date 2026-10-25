const test = require('node:test');
const assert = require('node:assert');
const {
  createLoginCode,
  redeemLoginCode,
  parseLoginState,
  resolveDevReturnHost,
  buildAppReturnUrl,
  sha256Hex,
  CODE_TTL_MS
} = require('../src/auth/loginHandoff');

const verifier = 'a'.repeat(64);
const challenge = sha256Hex(verifier);

test('login code can be redeemed once with the matching verifier', () => {
  const code = createLoginCode({ token: 't', user: { id: 1 } }, challenge);
  assert.deepStrictEqual(redeemLoginCode(code, verifier), { token: 't', user: { id: 1 } });
  assert.strictEqual(redeemLoginCode(code, verifier), null);
});

test('login code is bound to the app that started the login', () => {
  const code = createLoginCode({ token: 't' }, challenge);
  assert.strictEqual(redeemLoginCode(code, 'b'.repeat(64)), null);
  // 틀린 verifier로 한 번 시도하면 코드는 버려진다
  assert.strictEqual(redeemLoginCode(code, verifier), null);
  assert.strictEqual(redeemLoginCode(createLoginCode({ token: 't' }, challenge), undefined), null);
  assert.throws(() => createLoginCode({ token: 't' }, 'not-a-challenge'));
});

test('login code expires', () => {
  const now = Date.now();
  const code = createLoginCode({ token: 't' }, challenge, now);
  assert.strictEqual(redeemLoginCode(code, verifier, now + CODE_TTL_MS + 1), null);
});

test('state carries the dev host and the challenge', () => {
  assert.deepStrictEqual(parseLoginState(`192.168.0.12:8081|${challenge}`), { host: '192.168.0.12:8081', challenge });
  assert.deepStrictEqual(parseLoginState(`|${challenge}`), { host: undefined, challenge });
  assert.deepStrictEqual(parseLoginState('192.168.0.12:8081'), { host: '192.168.0.12:8081', challenge: undefined });
  assert.deepStrictEqual(parseLoginState(undefined), { host: undefined, challenge: undefined });
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

test('POST /kakao/exchange needs the verifier and works once', async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const express = require('express');
  const { router } = require('../src/routes/auth');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', router);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (path, body) =>
    fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const stolen = createLoginCode({ token: 'jwt', user: { id: 7 } }, challenge);
    assert.strictEqual((await post('/kakao/exchange', { code: stolen })).status, 400);

    const code = createLoginCode({ token: 'jwt', user: { id: 7 } }, challenge);
    const first = await post('/kakao/exchange', { code, verifier });
    assert.strictEqual(first.status, 200);
    assert.deepStrictEqual(await first.json(), { token: 'jwt', user: { id: 7 } });
    assert.strictEqual((await post('/kakao/exchange', { code, verifier })).status, 400);

    const callback = await fetch(`${base}/kakao/callback?code=x&state=192.168.0.12:8081`);
    assert.strictEqual(callback.status, 400);
  } finally {
    server.close();
  }
});
