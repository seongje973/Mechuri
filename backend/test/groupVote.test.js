const test = require('node:test');
const assert = require('node:assert');
const { RoomSession } = require('../src/realtime/roomSession');
const { createFakeClock } = require('./helpers/fakeClock');

const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const CANDIDATES = ['김치찌개', '짜장면', '초밥', '파스타'];

// 질문을 다 끝낸 방에서 시작한다
const finishedRoom = ({ ids = [1, 2, 3], random = () => 0.5 } = {}) => {
  const clock = createFakeClock();
  const events = [];
  const session = new RoomSession({
    room: { id: 10, code: 'ABCD', status: 'waiting', expiresAt: clock.now() + 2 * HOUR, hostParticipantId: ids[0] },
    participants: ids.map((id) => ({ id, nickname: `p${id}`, avoidTags: id === 2 ? '매운맛,날것' : '' })),
    emit: (event, payload) => events.push({ event, payload }),
    clock,
    options: { random }
  });
  ids.forEach((id) => session.connect(id, `s${id}`));
  ids.slice(1).forEach((id) => session.setReady(id, true));
  session.start(ids[0]);
  while (session.status === 'playing') session.next(ids[0]);
  const last = (name) => [...events].reverse().find((e) => e.event === name)?.payload;
  return { session, clock, events, last };
};

test('finished payload and snapshot carry everyone\'s avoid tags for group scoring', () => {
  const { session, last } = finishedRoom();
  const finished = last('room:finished');
  assert.deepStrictEqual(finished.answers.find((a) => a.participantId === 2).avoidTags, ['매운맛', '날것']);
  assert.strictEqual(session.snapshot().result.answers.length, 3);
});

test('a vote can only open after the questions, with 2-4 distinct menus', () => {
  const { session } = finishedRoom();
  assert.throws(() => session.openVote(1, ['김치찌개']), { code: 'INVALID_CANDIDATES' });
  assert.throws(() => session.openVote(1, ['김치찌개', '김치찌개']), { code: 'INVALID_CANDIDATES' });
  assert.throws(() => session.castVote(1, '김치찌개'), { code: 'NO_VOTE' });
  const opened = session.openVote(2, CANDIDATES);
  assert.deepStrictEqual(opened.candidates, CANDIDATES);
  // 다른 폰이 늦게 같은 요청을 보내도 같은 투표
  assert.deepStrictEqual(session.openVote(3, ['라멘', '우동']).candidates, CANDIDATES);
});

test('majority wins once everyone has voted, and the server picks one winner for all', () => {
  const { session, last } = finishedRoom();
  session.openVote(1, CANDIDATES);
  session.castVote(1, '초밥');
  assert.throws(() => session.castVote(1, '짜장면'), { code: 'ALREADY_VOTED' });
  assert.throws(() => session.castVote(2, '떡볶이'), { code: 'INVALID_VOTE' });
  session.castVote(2, '초밥');
  assert.strictEqual(last('vote:result'), undefined);
  session.castVote(3, '짜장면');
  const result = last('vote:result');
  assert.strictEqual(result.winner, '초밥');
  assert.deepStrictEqual(result.tally, { 김치찌개: 0, 짜장면: 1, 초밥: 2, 파스타: 0 });
  assert.strictEqual(session.snapshot().vote.winner, '초밥');
  assert.throws(() => session.castVote(3, '초밥'), { code: 'VOTE_CLOSED' });
});

test('a tie is broken at random among the tied menus only', () => {
  const { session, last } = finishedRoom({ ids: [1, 2], random: () => 0.99 });
  session.openVote(1, CANDIDATES);
  session.castVote(1, '김치찌개');
  session.castVote(2, '파스타');
  assert.strictEqual(last('vote:result').winner, '파스타');

  const other = finishedRoom({ ids: [1, 2], random: () => 0 });
  other.session.openVote(1, CANDIDATES);
  other.session.castVote(1, '김치찌개');
  other.session.castVote(2, '파스타');
  assert.strictEqual(other.last('vote:result').winner, '김치찌개');
});

test('the vote closes after the timeout with the votes it has', () => {
  const { session, clock, last } = finishedRoom();
  session.openVote(1, CANDIDATES);
  session.castVote(1, '짜장면');
  clock.advance(59 * SECOND);
  assert.strictEqual(last('vote:result'), undefined);
  clock.advance(1 * SECOND);
  assert.strictEqual(last('vote:result').winner, '짜장면');
});

test('someone who leaves during the vote is not waited for', () => {
  const { session, last } = finishedRoom();
  session.openVote(1, CANDIDATES);
  session.castVote(1, '초밥');
  session.castVote(2, '초밥');
  session.leave(3);
  assert.strictEqual(last('vote:result').winner, '초밥');
});
