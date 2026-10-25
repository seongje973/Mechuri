const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createEventsRouter, normalizeEvent, MAX_BATCH } = require('../src/routes/events');

const SECRET = 'test-secret';
const deviceId = 'device-1234abcd';
const sessionId = 'session-1234abcd';

const startServer = async (Event) => {
  const app = express();
  app.use(express.json());
  app.use('/api/events', createEventsRouter({ Event, jwtSecret: SECRET }));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const post = async (body, headers = {}) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
    return { status: res.status, body: await res.json() };
  };
  return { post, close: () => server.close() };
};

const fakeEvent = () => {
  const saved = [];
  return { saved, bulkCreate: async (rows) => { saved.push(...rows); return rows; } };
};

test('valid events become rows with payload and occurredAt', () => {
  const now = new Date('2026-12-14T03:00:00Z');
  const { row } = normalizeEvent(
    { type: 'question_answer', sessionId, payload: { questionId: 'soup', answer: 'yes' }, occurredAt: '2026-12-14T02:59:00Z' },
    { deviceId, now }
  );
  assert.deepStrictEqual(row, {
    type: 'question_answer',
    sessionId,
    deviceId,
    userId: null,
    payload: { questionId: 'soup', answer: 'yes' },
    occurredAt: new Date('2026-12-14T02:59:00Z')
  });
  assert.strictEqual(normalizeEvent({ type: 'rec_start', sessionId, deviceId }, { now }).row.occurredAt, now);
});

test('future or broken client times fall back to server time', () => {
  const now = new Date('2026-12-14T03:00:00Z');
  for (const occurredAt of ['2026-12-15T00:00:00Z', 'not-a-date']) {
    assert.strictEqual(normalizeEvent({ type: 'rec_start', sessionId, deviceId, occurredAt }, { now }).row.occurredAt, now);
  }
});

test('invalid events are rejected with a reason', () => {
  const cases = [
    [{ type: 'click', sessionId, deviceId }, /type/],
    [{ type: 'rec_start', sessionId: 'short', deviceId }, /sessionId/],
    [{ type: 'rec_start', sessionId }, /deviceId/],
    [{ type: 'rec_start', sessionId, deviceId: 'has space 12345' }, /deviceId/],
    [{ type: 'question_answer', sessionId, deviceId, payload: { questionId: 'soup', answer: 'maybe' } }, /answer/],
    [{ type: 'result_shown', sessionId, deviceId, payload: {} }, /menu/],
    [{ type: 'accept', sessionId, deviceId, payload: { action: 'share', menu: '짬뽕' } }, /action/],
    [{ type: 'reject', sessionId, deviceId, payload: [] }, /payload/],
    [{ type: 'rec_start', sessionId, deviceId, payload: { note: 'x'.repeat(3000) } }, /too large/]
  ];
  for (const [raw, pattern] of cases) {
    assert.match(normalizeEvent(raw).error, pattern, JSON.stringify(raw).slice(0, 80));
  }
});

test('POST saves a single guest event', async () => {
  const Event = fakeEvent();
  const server = await startServer(Event);
  try {
    const res = await server.post({ type: 'rec_start', sessionId, deviceId });
    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(res.body, { saved: 1 });
    assert.strictEqual(Event.saved[0].userId, null);
  } finally {
    server.close();
  }
});

test('POST batch uses the shared deviceId and links a logged-in user', async () => {
  const Event = fakeEvent();
  const server = await startServer(Event);
  try {
    const token = jwt.sign({ id: 7 }, SECRET);
    const res = await server.post(
      {
        deviceId,
        events: [
          { type: 'result_shown', sessionId, payload: { menu: '짬뽕' } },
          { type: 'accept', sessionId, payload: { action: 'delivery', menu: '짬뽕' } }
        ]
      },
      { authorization: `Bearer ${token}` }
    );
    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(Event.saved.map((r) => [r.type, r.deviceId, r.userId]), [
      ['result_shown', deviceId, 7],
      ['accept', deviceId, 7]
    ]);
  } finally {
    server.close();
  }
});

test('POST with a bad token still records the event as a guest', async () => {
  const Event = fakeEvent();
  const server = await startServer(Event);
  try {
    const res = await server.post({ type: 'rec_start', sessionId, deviceId }, { authorization: 'Bearer nope' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(Event.saved[0].userId, null);
  } finally {
    server.close();
  }
});

test('POST batch saves nothing when one event is invalid', async () => {
  const Event = fakeEvent();
  const server = await startServer(Event);
  try {
    const res = await server.post({
      deviceId,
      events: [{ type: 'rec_start', sessionId }, { type: 'reject', sessionId, payload: {} }]
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /^events\[1\]: payload\.menu/);
    assert.strictEqual(Event.saved.length, 0);

    const empty = await server.post({ deviceId, events: [] });
    assert.strictEqual(empty.status, 400);
    const tooMany = await server.post({ deviceId, events: Array(MAX_BATCH + 1).fill({ type: 'rec_start', sessionId }) });
    assert.strictEqual(tooMany.status, 400);
  } finally {
    server.close();
  }
});

test('POST falls back to a guest row when the token user no longer exists', async () => {
  const saved = [];
  let calls = 0;
  const Event = {
    bulkCreate: async (rows) => {
      calls += 1;
      if (rows.some((r) => r.userId !== null)) {
        const error = new Error('fk');
        error.name = 'SequelizeForeignKeyConstraintError';
        throw error;
      }
      saved.push(...rows);
    }
  };
  const server = await startServer(Event);
  try {
    const token = jwt.sign({ id: 99 }, SECRET);
    const res = await server.post({ type: 'rec_start', sessionId, deviceId }, { authorization: `Bearer ${token}` });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(calls, 2);
    assert.strictEqual(saved[0].userId, null);
  } finally {
    server.close();
  }
});
