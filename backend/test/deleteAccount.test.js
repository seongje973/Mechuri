const test = require('node:test');
const assert = require('node:assert');
const { deleteAccount } = require('../src/user/deleteAccount');

const fakeDb = (users) => {
  const calls = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const table = (name, count) => ({
    destroy: async ({ where, transaction: t }) => {
      assert.strictEqual(t, transaction);
      calls.push([name, where.userId]);
      return count;
    }
  });
  return {
    calls,
    sequelize: { transaction: async fn => fn(transaction) },
    User: {
      findByPk: async (id, { transaction: t }) => {
        assert.strictEqual(t, transaction);
        return users.includes(id) ? { destroy: async () => calls.push(['User', id]) } : null;
      }
    },
    History: table('History', 5),
    Favorite: table('Favorite', 2),
    Event: table('Event', 7),
    Participant: {
      update: async (values, { where, transaction: t }) => {
        assert.strictEqual(t, transaction);
        assert.deepStrictEqual(values, { userId: null, avoidTags: '' });
        calls.push(['Participant', where.userId]);
        return [3];
      }
    }
  };
};

test('deletes the account and everything tied to it in one transaction', async () => {
  const db = fakeDb([1]);
  assert.deepStrictEqual(await deleteAccount({ userId: 1, ...db }), { histories: 5, favorites: 2, events: 7, participants: 3 });
  assert.deepStrictEqual(db.calls, [['History', 1], ['Favorite', 1], ['Event', 1], ['Participant', 1], ['User', 1]]);
});

test('unknown account deletes nothing', async () => {
  const db = fakeDb([1]);
  assert.strictEqual(await deleteAccount({ userId: 2, ...db }), null);
  assert.deepStrictEqual(db.calls, []);
});
