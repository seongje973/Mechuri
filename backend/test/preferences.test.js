const test = require('node:test');
const assert = require('node:assert');
const { PreferencesError, normalizePreferences, readPreferences } = require('../src/user/preferences');

test('preferences keep known cuisines in a fixed order and a valid spicy level', () => {
  assert.deepStrictEqual(
    normalizePreferences({ likedCuisines: ['아시안', '한식', '피자', '한식'], spicy: 'hot' }),
    { likedCuisines: ['한식', '아시안'], spicy: 'hot' }
  );
  assert.deepStrictEqual(normalizePreferences({}), { likedCuisines: [], spicy: null });
  assert.deepStrictEqual(normalizePreferences({ likedCuisines: null, spicy: null }), { likedCuisines: [], spicy: null });
});

test('preferences with wrong shapes are rejected', () => {
  assert.throws(() => normalizePreferences(null), PreferencesError);
  assert.throws(() => normalizePreferences([]), PreferencesError);
  assert.throws(() => normalizePreferences({ likedCuisines: '한식' }), PreferencesError);
  assert.throws(() => normalizePreferences({ spicy: 3 }), PreferencesError);
});

test('stored preferences: missing or broken values read as never set', () => {
  assert.strictEqual(readPreferences(null), null);
  assert.strictEqual(readPreferences(undefined), null);
  assert.strictEqual(readPreferences('not json'), null);
  assert.deepStrictEqual(readPreferences('{"likedCuisines":["중식"],"spicy":"mild"}'), { likedCuisines: ['중식'], spicy: 'mild' });
  assert.deepStrictEqual(readPreferences({ likedCuisines: ['양식'] }), { likedCuisines: ['양식'], spicy: null });
});
