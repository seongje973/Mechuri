const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const axios = require('axios');

process.env.KAKAO_REST_API_KEY = 'test-key';
const restaurantRouter = require('../src/routes/restaurant');
const { CACHE_TTL_MS, buildCacheKey, clearRestaurantCache } = restaurantRouter;

const kakaoDoc = {
  place_name: '테스트 김치찌개',
  distance: '120',
  category_name: '음식점 > 한식 > 찌개,전골',
  place_url: 'http://place.map.kakao.com/1',
  road_address_name: '서울 강남구 테헤란로 1',
  address_name: '서울 강남구 역삼동 1',
  x: '127.028',
  y: '37.498'
};

let kakaoCalls = [];
axios.get = async (url, config) => {
  kakaoCalls.push(config.params);
  return { data: { documents: [kakaoDoc] } };
};

let server;
let baseUrl;
const realNow = Date.now;

test.before(async () => {
  const app = express();
  app.use('/api/restaurants', restaurantRouter);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/restaurants`;
});

test.after(() => server.close());

test.beforeEach(() => {
  kakaoCalls = [];
  clearRestaurantCache();
  Date.now = realNow;
  console.log = () => {};
});

const search = async (query) => {
  const res = await fetch(`${baseUrl}?${new URLSearchParams(query)}`);
  return res.json();
};

test('same keyword nearby is served from cache within 10 minutes', async () => {
  const first = await search({ keyword: '김치찌개', x: '127.02761', y: '37.49794' });
  // 약 10m 떨어진 곳에서 다시 찾아도 같은 칸으로 반올림된다
  const second = await search({ keyword: '김치찌개', x: '127.02770', y: '37.49800' });

  assert.strictEqual(kakaoCalls.length, 1);
  assert.strictEqual(first.cached, undefined);
  assert.strictEqual(second.cached, true);
  assert.deepStrictEqual(second.restaurants, first.restaurants);
  assert.strictEqual(kakaoCalls[0].radius, 1500);
  assert.strictEqual(kakaoCalls[0].category_group_code, 'FD6');
});

test('different keyword or far coordinates call Kakao again', async () => {
  await search({ keyword: '김치찌개', x: '127.0276', y: '37.4979' });
  await search({ keyword: '초밥', x: '127.0276', y: '37.4979' });
  await search({ keyword: '김치찌개', x: '127.0400', y: '37.4979' });
  assert.strictEqual(kakaoCalls.length, 3);
});

test('cache entries expire after 10 minutes', async () => {
  const start = realNow();
  Date.now = () => start;
  await search({ keyword: '김치찌개', x: '127.0276', y: '37.4979' });
  Date.now = () => start + CACHE_TTL_MS - 1;
  await search({ keyword: '김치찌개', x: '127.0276', y: '37.4979' });
  assert.strictEqual(kakaoCalls.length, 1);
  Date.now = () => start + CACHE_TTL_MS + 1;
  await search({ keyword: '김치찌개', x: '127.0276', y: '37.4979' });
  assert.strictEqual(kakaoCalls.length, 2);
});

test('failed Kakao calls return 502 and are not cached', async () => {
  const realGet = axios.get;
  axios.get = async () => {
    kakaoCalls.push('fail');
    throw new Error('quota');
  };
  const failed = await fetch(`${baseUrl}?keyword=김치찌개&x=127.0276&y=37.4979`);
  axios.get = realGet;
  const real = await search({ keyword: '김치찌개', x: '127.0276', y: '37.4979' });

  assert.strictEqual(failed.status, 502);
  assert.strictEqual((await failed.json()).restaurants, undefined);
  assert.strictEqual(real.cached, undefined);
  assert.strictEqual(kakaoCalls.length, 2);
});

test('Kakao results carry no invented rating or ranking badge', async () => {
  const { restaurants } = await search({ keyword: '김치찌개', x: '127.0276', y: '37.4979' });
  assert.deepStrictEqual(Object.keys(restaurants[0]).sort(), [
    'address', 'category', 'distance', 'latitude', 'longitude', 'name', 'url'
  ]);
  assert.strictEqual(restaurants[0].distance, '120m');
});

const withEnv = async (env, fn) => {
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.entries(env).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
  try {
    await fn();
  } finally {
    Object.entries(saved).forEach(([k, v]) => (v === undefined ? delete process.env[k] : (process.env[k] = v)));
  }
};

test('without a Kakao key the API says so instead of inventing restaurants', async () => {
  for (const key of [undefined, 'your_kakao_rest_api_key']) {
    await withEnv({ KAKAO_REST_API_KEY: key, RESTAURANT_MOCK: undefined }, async () => {
      const res = await fetch(`${baseUrl}?keyword=김치찌개`);
      assert.strictEqual(res.status, 503);
      assert.strictEqual((await res.json()).error, 'restaurant_search_unavailable');
    });
  }
  assert.strictEqual(kakaoCalls.length, 0);
});

test('RESTAURANT_MOCK=true gives clearly labeled samples, never in production', async () => {
  await withEnv({ KAKAO_REST_API_KEY: undefined, RESTAURANT_MOCK: 'true', NODE_ENV: 'development' }, async () => {
    const body = await search({ keyword: '김치찌개' });
    assert.strictEqual(body.mock, true);
    assert.ok(body.restaurants.every((r) => r.name.startsWith('[샘플]') && r.rating === undefined));
  });
  await withEnv({ KAKAO_REST_API_KEY: undefined, RESTAURANT_MOCK: 'true', NODE_ENV: 'production' }, async () => {
    const res = await fetch(`${baseUrl}?keyword=김치찌개`);
    assert.strictEqual(res.status, 503);
  });
});

test('array or blank keyword is rejected with 400', async () => {
  const array = await fetch(`${baseUrl}?keyword=a&keyword=b`);
  const blank = await fetch(`${baseUrl}?keyword=%20`);
  assert.strictEqual(array.status, 400);
  assert.strictEqual(blank.status, 400);
  assert.strictEqual(kakaoCalls.length, 0);
});

test('cache key rounds coordinates to about 100m and trims the keyword', () => {
  assert.strictEqual(buildCacheKey(' 김치찌개 ', '127.02761', '37.49794'), '127.028,37.498|김치찌개');
});
