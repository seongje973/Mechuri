const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { createWeatherRouter, toCondition, CACHE_TTL_MS } = require('../src/routes/weather');

const startServer = async (options) => {
  const app = express();
  app.use('/api/weather', createWeatherRouter(options));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const get = async (query) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/weather?${query}`);
    return { status: res.status, body: await res.json() };
  };
  return { get, close: () => server.close() };
};

const fakeFetch = (current) => {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ current }) };
  };
  return { impl, calls };
};

test('WMO 코드를 4가지 상태로 바꾼다', () => {
  assert.strictEqual(toCondition(0), 'clear');
  assert.strictEqual(toCondition(3), 'cloudy');
  assert.strictEqual(toCondition(61), 'rain');
  assert.strictEqual(toCondition(81), 'rain');
  assert.strictEqual(toCondition(95), 'rain');
  assert.strictEqual(toCondition(73), 'snow');
  assert.strictEqual(toCondition(NaN), 'unknown');
});

test('현재 날씨를 돌려주고 30분 동안 캐시한다', async () => {
  let clock = 1_000_000;
  const { impl, calls } = fakeFetch({ temperature_2m: 18.4, weather_code: 63 });
  const server = await startServer({ fetchImpl: impl, now: () => clock });
  try {
    const first = await server.get('lat=37.4979&lng=127.0276');
    assert.strictEqual(first.status, 200);
    assert.deepStrictEqual(first.body, { condition: 'rain', temperature: 18.4, cached: false });

    clock += 60 * 1000;
    const second = await server.get('lat=37.4981&lng=127.0279');
    assert.strictEqual(second.body.cached, true);
    assert.strictEqual(calls.length, 1);

    clock += CACHE_TTL_MS;
    await server.get('lat=37.4979&lng=127.0276');
    assert.strictEqual(calls.length, 2);
  } finally {
    server.close();
  }
});

test('좌표가 없거나 이상하면 400', async () => {
  const server = await startServer({ fetchImpl: fakeFetch({}).impl });
  try {
    assert.strictEqual((await server.get('lat=abc&lng=127')).status, 400);
    assert.strictEqual((await server.get('lat=91&lng=127')).status, 400);
    assert.strictEqual((await server.get('lng=127')).status, 400);
  } finally {
    server.close();
  }
});

test('날씨 API가 실패하면 503', async () => {
  const server = await startServer({
    fetchImpl: async () => {
      throw new Error('down');
    }
  });
  try {
    assert.strictEqual((await server.get('lat=37.5&lng=127')).status, 503);
  } finally {
    server.close();
  }
});
