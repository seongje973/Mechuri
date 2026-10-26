const test = require('node:test');
const assert = require('node:assert');
const { ImportError, normalizeImportPayload, planImport, MAX_HISTORIES } = require('../src/user/guestImport');

const now = new Date('2026-10-25T12:00:00.000Z');

test('payload is cleaned: blank menus dropped, bad or future dates become now, tags deduped', () => {
  const payload = normalizeImportPayload({
    histories: [
      { menuName: ' 김치찌개 ', emoji: '🍲', createdAt: '2026-10-20T08:00:00.000Z' },
      { menuName: '초밥', createdAt: 'not-a-date' },
      { menuName: '라멘', createdAt: '2030-01-01T00:00:00.000Z' },
      { menuName: '' },
      null
    ],
    favorites: [{ menuName: '초밥', category: '일식' }],
    avoidTags: '오이, 가지,오이,'
  }, now);

  assert.deepStrictEqual(payload.histories.map(h => h.menuName), ['김치찌개', '초밥', '라멘']);
  assert.strictEqual(payload.histories[0].createdAt.toISOString(), '2026-10-20T08:00:00.000Z');
  assert.strictEqual(payload.histories[1].createdAt, now);
  assert.strictEqual(payload.histories[2].createdAt, now);
  assert.strictEqual(payload.histories[1].emoji, null);
  assert.deepStrictEqual(payload.favorites.map(f => f.menuName), ['초밥']);
  assert.deepStrictEqual(payload.avoidTags, ['오이', '가지']);
  assert.deepStrictEqual(normalizeImportPayload({}, now), { histories: [], favorites: [], avoidTags: [], preferences: null });
});

test('payload with wrong shapes or too many items is rejected', () => {
  assert.throws(() => normalizeImportPayload(null), ImportError);
  assert.throws(() => normalizeImportPayload({ histories: 'x' }), ImportError);
  assert.throws(() => normalizeImportPayload({ favorites: {} }), ImportError);
  const many = Array.from({ length: MAX_HISTORIES + 1 }, (_, i) => ({ menuName: `m${i}` }));
  assert.throws(() => normalizeImportPayload({ histories: many }), ImportError);
});

test('merge keeps one favorite per menu, skips already imported histories, unions avoid tags', () => {
  const payload = normalizeImportPayload({
    histories: [
      { menuName: '김치찌개', createdAt: '2026-10-20T08:00:00.000Z' },
      { menuName: '김치찌개', createdAt: '2026-10-21T08:00:00.000Z' },
      { menuName: '김치찌개', createdAt: '2026-10-21T08:00:00.000Z' }
    ],
    favorites: [{ menuName: '초밥' }, { menuName: '짬뽕' }, { menuName: '짬뽕' }],
    avoidTags: ['오이', '해산물']
  }, now);

  const plan = planImport(payload, {
    histories: [{ menuName: '김치찌개', createdAt: new Date('2026-10-20T08:00:00.000Z') }],
    favorites: [{ menuName: '초밥' }],
    avoidTags: '매운맛,오이'
  });

  assert.deepStrictEqual(plan.histories.map(h => h.createdAt.toISOString()), ['2026-10-21T08:00:00.000Z']);
  assert.deepStrictEqual(plan.favorites.map(f => f.menuName), ['짬뽕']);
  assert.strictEqual(plan.avoidTags, '매운맛,오이,해산물');
});

test('importing the same guest data twice adds nothing the second time', () => {
  const payload = normalizeImportPayload({
    histories: [{ menuName: '초밥', createdAt: '2026-10-20T08:00:00.000Z' }],
    favorites: [{ menuName: '초밥' }],
    avoidTags: ['오이']
  }, now);
  const first = planImport(payload, { histories: [], favorites: [], avoidTags: '' });
  const second = planImport(payload, { histories: first.histories, favorites: first.favorites, avoidTags: first.avoidTags });
  assert.strictEqual(second.histories.length, 0);
  assert.strictEqual(second.favorites.length, 0);
  assert.strictEqual(second.avoidTags, '오이');
});

test('guest preferences are used only when the account has none', () => {
  const guest = normalizeImportPayload({ preferences: { likedCuisines: ['일식'], spicy: 'hot' } }, now);
  assert.deepStrictEqual(planImport(guest, {}).preferences, { likedCuisines: ['일식'], spicy: 'hot' });

  const account = { likedCuisines: ['한식'], spicy: 'mild' };
  assert.deepStrictEqual(planImport(guest, { preferences: account }).preferences, account);
  assert.strictEqual(planImport(normalizeImportPayload({}, now), {}).preferences, null);
  assert.throws(() => normalizeImportPayload({ preferences: { spicy: 'very' } }), ImportError);
});
