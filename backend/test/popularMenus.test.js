const test = require('node:test');
const assert = require('node:assert');
const { popularMenus } = require('../src/stats/popularMenus');

const fakeSequelize = {
  fn: (name, col) => `${name}(${col})`,
  col: name => name,
  literal: sql => sql
};

const fakeHistory = rows => {
  const History = {
    findAll: async options => {
      History.options = options;
      return rows;
    }
  };
  return History;
};

test('ranks real history rows and numbers them from 1', async () => {
  const History = fakeHistory([
    { menuName: '김치찌개', emoji: '🍲', category: '한식', count: '3' },
    { menuName: '라멘', emoji: '🍜', category: '일식', count: '1' }
  ]);
  assert.deepStrictEqual(await popularMenus({ History, sequelize: fakeSequelize }), [
    { rank: 1, menuName: '김치찌개', emoji: '🍲', category: '한식', count: 3 },
    { rank: 2, menuName: '라멘', emoji: '🍜', category: '일식', count: 1 }
  ]);
  assert.deepStrictEqual(History.options.group, ['menuName']);
  assert.strictEqual(History.options.limit, 5);
});

test('no history means an empty ranking, not made-up numbers', async () => {
  assert.deepStrictEqual(await popularMenus({ History: fakeHistory([]), sequelize: fakeSequelize }), []);
});
