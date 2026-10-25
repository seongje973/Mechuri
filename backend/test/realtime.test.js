const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { io: connectClient } = require('socket.io-client');
const { attachRealtime } = require('../src/realtime');

// DB 대신 메모리 저장소로 실제 소켓 연결을 확인한다
const createMemoryStore = ({ ignoreLeftAt = false } = {}) => {
  const rooms = new Map();
  const participants = new Map();
  return {
    addRoom: (room) => rooms.set(room.id, { status: 'waiting', currentIndex: 0, questionIds: null, ...room }),
    addParticipant: (p) => participants.set(p.id, { answers: [], leftAt: null, ...p }),
    async findByToken(token) {
      const p = [...participants.values()].find((x) => x.token === token);
      if (!p || (p.leftAt && !ignoreLeftAt)) return null;
      return { participantId: p.id, participant: { ...p }, room: { ...rooms.get(p.roomId) } };
    },
    async loadParticipants(roomId) {
      return [...participants.values()].filter((p) => p.roomId === roomId).sort((a, b) => a.id - b.id);
    },
    async saveRoom(id, patch) { Object.assign(rooms.get(id), patch); },
    async saveAnswers(id, answers) { participants.get(id).answers = answers; },
    async removeParticipant(id) { participants.delete(id); },
    async markLeft(id) { participants.get(id).leftAt = new Date(); },
    rooms,
    participants
  };
};

const startServer = async (options, storeOptions) => {
  const store = createMemoryStore(storeOptions);
  const server = http.createServer();
  const realtime = attachRealtime(server, { store, options });
  await new Promise((resolve) => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;
  const clients = [];
  const connect = () => {
    const socket = connectClient(url, { transports: ['websocket'], reconnection: false });
    clients.push(socket);
    return socket;
  };
  const stop = async () => {
    clients.forEach((c) => c.disconnect());
    await realtime.close();
  };
  return { store, connect, stop };
};

const call = (socket, event, payload = {}) => new Promise((resolve) => socket.emit(event, payload, resolve));
const nextEvent = (socket, event, predicate = () => true) =>
  new Promise((resolve) => {
    const handler = (payload) => {
      if (!predicate(payload)) return;
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

const seedRoom = (store, { expiresAt = Date.now() + 60 * 60 * 1000 } = {}) => {
  store.addRoom({ id: 1, code: 'ABCD', expiresAt, hostParticipantId: 1 });
  store.addParticipant({ id: 1, roomId: 1, nickname: '방장', token: 'host-token' });
  store.addParticipant({ id: 2, roomId: 1, nickname: '친구', token: 'guest-token' });
};

test('two phones see the same waiting room and play the same questions', async () => {
  const ctx = await startServer();
  try {
    seedRoom(ctx.store);
    const host = ctx.connect();
    const guest = ctx.connect();

    const joined = await call(host, 'join', { token: 'host-token' });
    assert.strictEqual(joined.ok, true);
    assert.strictEqual(joined.participantId, 1);

    const hostSeesGuest = nextEvent(host, 'room:state', (s) => s.participants.some((p) => p.id === 2 && p.connected));
    assert.strictEqual((await call(guest, 'join', { token: 'guest-token' })).ok, true);
    const state = await hostSeesGuest;
    assert.deepStrictEqual(state.participants.map((p) => p.nickname), ['방장', '친구']);
    assert.ok(!JSON.stringify(state).includes('token'));

    assert.strictEqual((await call(host, 'start')).error, 'NOT_READY');
    assert.strictEqual((await call(guest, 'ready', { ready: true })).ok, true);

    const hostQuestion = nextEvent(host, 'question');
    const guestQuestion = nextEvent(guest, 'question');
    assert.strictEqual((await call(host, 'start')).ok, true);
    const [q1, q2] = await Promise.all([hostQuestion, guestQuestion]);
    assert.strictEqual(q1.questionId, q2.questionId);

    const second = nextEvent(guest, 'question', (q) => q.index === 1);
    await call(host, 'answer', { questionId: q1.questionId, answer: 'yes' });
    await call(guest, 'answer', { questionId: q1.questionId, answer: 'no' });
    assert.strictEqual((await second).index, 1);
    assert.strictEqual(ctx.store.rooms.get(1).currentIndex, 1);
  } finally {
    await ctx.stop();
  }
});

test('reconnecting with the same token resumes the current question', async () => {
  const ctx = await startServer();
  try {
    seedRoom(ctx.store);
    const host = ctx.connect();
    const guest = ctx.connect();
    await call(host, 'join', { token: 'host-token' });
    await call(guest, 'join', { token: 'guest-token' });
    await call(guest, 'ready');
    const asked = nextEvent(host, 'question');
    await call(host, 'start');
    const question = await asked;

    await call(host, 'answer', { questionId: question.questionId, answer: 'yes' });
    guest.disconnect();

    const back = ctx.connect();
    const rejoined = await call(back, 'join', { token: 'guest-token' });
    assert.strictEqual(rejoined.state.question.questionId, question.questionId);
    assert.deepStrictEqual(rejoined.state.question.answeredIds, [1]);
  } finally {
    await ctx.stop();
  }
});

test('joining with a bad token or an expired room is refused with a message', async () => {
  const ctx = await startServer();
  try {
    seedRoom(ctx.store, { expiresAt: Date.now() - 1000 });
    const socket = ctx.connect();
    assert.strictEqual((await call(socket, 'join', { token: 'nope' })).error, 'INVALID_TOKEN');
    const expired = await call(socket, 'join', { token: 'host-token' });
    assert.strictEqual(expired.error, 'ROOM_EXPIRED');
    assert.ok(expired.message.includes('만료'));
    assert.strictEqual((await call(socket, 'ready')).error, 'NOT_JOINED');
  } finally {
    await ctx.stop();
  }
});

const startPlaying = async (ctx) => {
  const host = ctx.connect();
  const guest = ctx.connect();
  await call(host, 'join', { token: 'host-token' });
  await call(guest, 'join', { token: 'guest-token' });
  await call(guest, 'ready');
  const asked = nextEvent(host, 'question');
  await call(host, 'start');
  return { host, guest, question: await asked };
};

test('someone who left cannot rejoin, and their socket gets no room events', async () => {
  // 나가기가 DB에 아직 저장되기 전처럼, 저장소가 나간 사람을 돌려주는 경우도 막는다
  for (const ignoreLeftAt of [false, true]) {
    const ctx = await startServer(undefined, { ignoreLeftAt });
    try {
      seedRoom(ctx.store);
      ctx.store.addParticipant({ id: 3, roomId: 1, nickname: '셋째', token: 'third-token' });
      const third = ctx.connect();
      await call(third, 'join', { token: 'third-token' });
      await call(third, 'ready');
      const { host, guest } = await startPlaying(ctx);
      await call(third, 'leave');
      await new Promise((resolve) => setTimeout(resolve, 20));

      const again = ctx.connect();
      let received = 0;
      again.onAny(() => { received += 1; });
      const result = await call(again, 'join', { token: 'third-token' });
      assert.strictEqual(result.error, ignoreLeftAt ? 'NOT_IN_ROOM' : 'INVALID_TOKEN');
      assert.strictEqual((await call(again, 'ready')).error, 'NOT_JOINED');

      await call(host, 'ready', { ready: true }); // 방에 아무 방송이나 일으킨다
      const stateSeen = nextEvent(guest, 'room:state');
      await call(guest, 'leave');
      await stateSeen;
      assert.strictEqual(received, 0);
    } finally {
      await ctx.stop();
    }
  }
});

test('a participant the open session does not know yet is added on join', async () => {
  const ctx = await startServer();
  try {
    seedRoom(ctx.store);
    const host = ctx.connect();
    await call(host, 'join', { token: 'host-token' });
    // 세션을 불러온 뒤에 DB에만 생긴 참가자 (HTTP 참가와 겹친 경우)
    ctx.store.addParticipant({ id: 3, roomId: 1, nickname: '늦게 옴', token: 'late-token' });
    const late = ctx.connect();
    const result = await call(late, 'join', { token: 'late-token' });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.state.participants.map((p) => p.id), [1, 2, 3]);
  } finally {
    await ctx.stop();
  }
});
