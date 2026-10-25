const test = require('node:test');
const assert = require('node:assert');
const { Op } = require('sequelize');
const { purgeClosedRooms, RETENTION_MS } = require('../src/realtime/roomCleanup');

const DAY = 24 * 60 * 60 * 1000;

// where 조건을 직접 해석하는 작은 가짜 저장소 (실제 SQL은 로컬 PostgreSQL로 확인).
// 실제 Op 키는 심볼이라 Object.entries에 안 잡히므로 따로 꺼낸다
const entries = (where) => [...Object.entries(where), ...Object.getOwnPropertySymbols(where).map((s) => [s, where[s]])];
const match = (row, where) => entries(where).every(([key, cond]) => {
  if (key === Op.or) return cond.some((w) => match(row, w));
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if (cond[Op.lt] !== undefined) return row[key] < cond[Op.lt];
    if (cond[Op.in] !== undefined) return cond[Op.in].includes(row[key]);
  }
  return row[key] === cond;
});

const fakeDb = (rooms, participants) => {
  const transactions = [];
  return {
    transactions,
    sequelize: { transaction: async (fn) => { const t = {}; transactions.push(t); return fn(t); } },
    Room: {
      findAll: async ({ where, limit }) => rooms.filter((r) => match(r, where)).slice(0, limit).map((r) => ({ id: r.id })),
      destroy: async ({ where }) => {
        const before = rooms.length;
        for (let i = rooms.length - 1; i >= 0; i--) if (match(rooms[i], where)) rooms.splice(i, 1);
        return before - rooms.length;
      }
    },
    Participant: {
      destroy: async ({ where }) => {
        const before = participants.length;
        for (let i = participants.length - 1; i >= 0; i--) if (match(participants[i], where)) participants.splice(i, 1);
        return before - participants.length;
      }
    }
  };
};

test('deletes only rooms closed more than 30 days ago, with their participants', async () => {
  const now = Date.UTC(2026, 11, 1);
  const old = new Date(now - RETENTION_MS - DAY);
  const recent = new Date(now - RETENTION_MS + DAY);
  const rooms = [
    { id: 1, status: 'waiting', expiresAt: old, updatedAt: old }, // 버려진 방도 만료 시각 기준으로 지운다
    { id: 2, status: 'finished', expiresAt: recent, updatedAt: old }, // 일찍 끝난 방은 끝난 시각 기준
    { id: 3, status: 'finished', expiresAt: recent, updatedAt: recent },
    { id: 4, status: 'playing', expiresAt: recent, updatedAt: old } // 아직 안 닫힌 방은 updatedAt이 오래돼도 남긴다
  ];
  const participants = [1, 1, 2, 3, 4].map((roomId, i) => ({ id: i + 1, roomId }));
  const db = fakeDb(rooms, participants);
  assert.deepStrictEqual(await purgeClosedRooms({ ...db, now }), { rooms: 2, participants: 3 });
  assert.deepStrictEqual(rooms.map((r) => r.id), [3, 4]);
  assert.deepStrictEqual(participants.map((p) => p.roomId), [3, 4]);
});

test('deletes in batches until nothing is left', async () => {
  const now = Date.UTC(2026, 11, 1);
  const old = new Date(now - RETENTION_MS - DAY);
  const rooms = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, status: 'expired', expiresAt: old, updatedAt: old }));
  const db = fakeDb(rooms, []);
  assert.deepStrictEqual(await purgeClosedRooms({ ...db, now, batchSize: 2 }), { rooms: 5, participants: 0 });
  assert.strictEqual(db.transactions.length, 3);
});
