const test = require('node:test');
const assert = require('node:assert');
const { RoomSession } = require('../src/realtime/roomSession');
const { createFakeClock } = require('./helpers/fakeClock');

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

const setup = ({ participants = [{ id: 1, nickname: '방장' }, { id: 2, nickname: '친구' }], room = {} } = {}) => {
  const clock = createFakeClock();
  const events = [];
  const saved = { room: [], answers: {}, removed: [], left: [] };
  const store = {
    saveRoom: async (id, patch) => saved.room.push(patch),
    saveAnswers: async (id, answers) => { saved.answers[id] = answers; },
    removeParticipant: async (id) => saved.removed.push(id),
    markLeft: async (id) => saved.left.push(id)
  };
  const session = new RoomSession({
    room: { id: 10, code: 'ABCD', status: 'waiting', expiresAt: clock.now() + 2 * HOUR, hostParticipantId: 1, ...room },
    participants,
    emit: (event, payload) => events.push({ event, payload }),
    store,
    clock,
    options: { random: () => 0.5 }
  });
  const last = (name) => [...events].reverse().find((e) => e.event === name)?.payload;
  return { session, clock, events, saved, last };
};

const startWithEveryone = (ctx, ids = [1, 2]) => {
  ids.forEach((id) => ctx.session.connect(id, `s${id}`));
  ids.filter((id) => id !== ctx.session.hostId).forEach((id) => ctx.session.setReady(id, true));
  ctx.session.start(ctx.session.hostId);
};

test('only the host starts, and only after everyone else is ready', () => {
  const ctx = setup();
  ctx.session.connect(1, 's1');
  ctx.session.connect(2, 's2');
  assert.throws(() => ctx.session.start(1), { code: 'NOT_READY' });
  ctx.session.setReady(2, true);
  assert.throws(() => ctx.session.start(2), { code: 'NOT_HOST' });
  ctx.session.start(1);
  assert.strictEqual(ctx.session.status, 'playing');
  const question = ctx.last('question');
  assert.strictEqual(question.index, 0);
  assert.strictEqual(question.total, 7);
  assert.strictEqual(question.questionId, 'serving-delivery');
});

test('a host alone cannot start', () => {
  const ctx = setup({ participants: [{ id: 1, nickname: '방장' }] });
  ctx.session.connect(1, 's1');
  assert.throws(() => ctx.session.start(1), { code: 'NOT_ENOUGH_PARTICIPANTS' });
});

test('everyone gets the same question and it moves on once all answered', () => {
  const ctx = setup();
  startWithEveryone(ctx);
  const first = ctx.session.currentQuestionId();
  ctx.session.answer(1, first, 'yes');
  assert.strictEqual(ctx.session.currentIndex, 0);
  assert.deepStrictEqual(ctx.last('answered').answeredIds, [1]);
  assert.throws(() => ctx.session.answer(1, first, 'no'), { code: 'ALREADY_ANSWERED' });
  assert.throws(() => ctx.session.answer(2, 'cold', 'no'), { code: 'STALE_QUESTION' });
  assert.throws(() => ctx.session.answer(2, first, 'maybe'), { code: 'INVALID_ANSWER' });
  ctx.session.answer(2, first, 'no');
  assert.strictEqual(ctx.session.currentIndex, 1);
  assert.strictEqual(ctx.last('question').index, 1);
});

test('after 30 seconds the missing answer becomes "dontcare"', () => {
  const ctx = setup();
  startWithEveryone(ctx);
  const first = ctx.session.currentQuestionId();
  ctx.session.answer(1, first, 'yes');
  ctx.clock.advance(29 * SECOND);
  assert.strictEqual(ctx.session.currentIndex, 0);
  ctx.clock.advance(1 * SECOND);
  assert.strictEqual(ctx.session.currentIndex, 1);
  assert.deepStrictEqual(ctx.saved.answers[2], [{ questionId: first, answer: 'dontcare' }]);
});

test('the host can skip ahead with next', () => {
  const ctx = setup();
  startWithEveryone(ctx);
  assert.throws(() => ctx.session.next(2), { code: 'NOT_HOST' });
  ctx.session.next(1);
  assert.strictEqual(ctx.session.currentIndex, 1);
});

test('answering every question finishes the room with everyone\'s answers', () => {
  const ctx = setup();
  startWithEveryone(ctx);
  for (let i = 0; i < 7; i++) {
    const id = ctx.session.currentQuestionId();
    ctx.session.answer(1, id, 'yes');
    ctx.session.answer(2, id, 'no');
  }
  assert.strictEqual(ctx.session.status, 'finished');
  const finished = ctx.last('room:finished');
  assert.strictEqual(finished.questionIds.length, 7);
  assert.strictEqual(finished.answers.length, 2);
  assert.ok(finished.answers.every((p) => p.answers.length === 7));
  assert.ok(ctx.saved.room.some((patch) => patch.status === 'finished'));
});

test('coming back within 30 seconds returns to the same question', () => {
  const ctx = setup();
  startWithEveryone(ctx);
  const first = ctx.session.currentQuestionId();
  ctx.session.answer(1, first, 'yes');
  ctx.session.disconnect(2, 's2');
  ctx.clock.advance(20 * SECOND);
  // 아직 2번을 기다리는 중이라 질문이 그대로다
  assert.strictEqual(ctx.session.currentQuestionId(), first);
  const { state } = ctx.session.connect(2, 's2-new');
  assert.strictEqual(state.question.questionId, first);
  assert.deepStrictEqual(state.question.answeredIds, [1]);
  ctx.session.answer(2, first, 'no');
  assert.strictEqual(ctx.session.currentIndex, 1);
});

test('a stale disconnect from an old socket is ignored', () => {
  const ctx = setup();
  ctx.session.connect(2, 's2');
  const { previousSocketId } = ctx.session.connect(2, 's2-new');
  assert.strictEqual(previousSocketId, 's2');
  ctx.session.disconnect(2, 's2');
  assert.strictEqual(ctx.session.snapshot().participants.find((p) => p.id === 2).connected, true);
});

test('someone gone for good no longer holds up the questions', () => {
  const ctx = setup({ participants: [{ id: 1, nickname: 'a' }, { id: 2, nickname: 'b' }, { id: 3, nickname: 'c' }] });
  startWithEveryone(ctx, [1, 2, 3]);
  ctx.session.disconnect(3, 's3');
  ctx.clock.advance(30 * SECOND); // 첫 질문은 시간 초과로 넘어가고, 3번은 자리 비움이 된다
  assert.strictEqual(ctx.session.currentIndex, 1);
  const second = ctx.session.currentQuestionId();
  ctx.session.answer(1, second, 'yes');
  ctx.session.answer(2, second, 'yes');
  assert.strictEqual(ctx.session.currentIndex, 2);
  assert.deepStrictEqual(ctx.saved.answers[3].map((a) => a.answer), ['dontcare', 'dontcare']);
});

test('when the host leaves, the next person becomes host', () => {
  const ctx = setup({ participants: [{ id: 1, nickname: 'a' }, { id: 2, nickname: 'b' }, { id: 3, nickname: 'c' }] });
  startWithEveryone(ctx, [1, 2, 3]);
  ctx.session.leave(1);
  assert.strictEqual(ctx.session.hostId, 2);
  assert.deepStrictEqual(ctx.last('host:changed'), { hostId: 2 });
  assert.deepStrictEqual(ctx.saved.left, [1]);
  ctx.session.next(2);
  assert.strictEqual(ctx.session.currentIndex, 1);
});

test('a host who drops off is replaced after the grace period, preferring connected people', () => {
  const ctx = setup({ participants: [{ id: 1, nickname: 'a' }, { id: 2, nickname: 'b' }, { id: 3, nickname: 'c' }] });
  startWithEveryone(ctx, [1, 2, 3]);
  ctx.session.disconnect(2, 's2');
  ctx.session.disconnect(1, 's1');
  ctx.clock.advance(10 * SECOND);
  assert.strictEqual(ctx.session.hostId, 1);
  ctx.clock.advance(20 * SECOND);
  assert.strictEqual(ctx.session.hostId, 3);
});

test('leaving the waiting room frees the seat and hands off the host', () => {
  const ctx = setup();
  ctx.session.connect(1, 's1');
  ctx.session.connect(2, 's2');
  ctx.session.leave(1);
  assert.deepStrictEqual(ctx.saved.removed, [1]);
  assert.strictEqual(ctx.session.hostId, 2);
  assert.deepStrictEqual(ctx.last('room:state').participants.map((p) => p.id), [2]);
});

test('someone who never shows up in the waiting room is dropped after the grace period', () => {
  const ctx = setup();
  ctx.session.connect(1, 's1');
  ctx.session.addParticipant({ id: 3, nickname: '늦게 옴' });
  assert.deepStrictEqual(ctx.last('room:state').participants.map((p) => p.id), [1, 2, 3]);
  ctx.clock.advance(30 * SECOND);
  assert.deepStrictEqual(ctx.saved.removed.sort(), [2, 3]);
  assert.deepStrictEqual(ctx.session.snapshot().participants.map((p) => p.id), [1]);
});

test('the room expires two hours after it was made', () => {
  const ctx = setup();
  startWithEveryone(ctx);
  ctx.clock.advance(2 * HOUR);
  assert.strictEqual(ctx.session.status, 'expired');
  assert.ok(ctx.last('room:expired').message.includes('만료'));
  assert.throws(() => ctx.session.connect(1, 's1-new'), { code: 'ROOM_EXPIRED' });
  assert.strictEqual(ctx.clock.pending(), 0);
});

test('a room restored after a server restart resumes at the saved question', () => {
  const ctx = setup({
    room: { status: 'playing', questionIds: ['serving-delivery', 'price-low', 'soup'], currentIndex: 1 },
    participants: [
      { id: 1, nickname: 'a', answers: [{ questionId: 'serving-delivery', answer: 'yes' }, { questionId: 'price-low', answer: 'no' }] },
      { id: 2, nickname: 'b', answers: [{ questionId: 'serving-delivery', answer: 'no' }] }
    ]
  });
  assert.strictEqual(ctx.last('question').questionId, 'price-low');
  assert.deepStrictEqual(ctx.last('question').answeredIds, [1]);
  ctx.session.connect(2, 's2');
  ctx.session.answer(2, 'price-low', 'yes');
  assert.strictEqual(ctx.session.currentQuestionId(), 'soup');
});
