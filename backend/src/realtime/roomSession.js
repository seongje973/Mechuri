const { pickQuestionOrder } = require('./questionOrder');
const { GroupVote } = require('./groupVote');

// 같이 정하기 방 하나의 진행 상태. 소켓과 DB를 모르고, 바깥에서 받은
// emit(이벤트를 방 전체에 보냄)과 store(DB 저장)만 부른다. 그래서 테스트에서 시계를 바꿔 끼울 수 있다.

const ANSWERS = ['yes', 'probably', 'dontcare', 'no'];
const DEFAULT_ANSWER = 'dontcare';

const DEFAULT_OPTIONS = {
  // 이 시간 안에 답하지 않으면 '상관없음'으로 넘어간다 (US-26)
  answerTimeoutMs: 30 * 1000,
  // 연결이 끊긴 뒤 이 시간 안에 돌아오면 그대로 이어서 한다 (US-30).
  // 넘기면 대기실에서는 방에서 빠지고, 진행 중에는 그 사람을 기다리지 않는다.
  disconnectGraceMs: 30 * 1000,
  // 동점 투표 (US-28). 이 시간 안에 안 낸 표는 빼고 센다
  voteTimeoutMs: 60 * 1000,
  minParticipantsToStart: 2,
  random: Math.random
};

const systemClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle)
};

// Participant.avoidTags는 쉼표 구분 문자열. 메모리에서는 배열로 둔다.
const readAvoidTags = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
};

class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const noopStore = {
  saveRoom: async () => {},
  saveAnswers: async () => {},
  removeParticipant: async () => {},
  markLeft: async () => {}
};

class RoomSession {
  /**
   * @param room { id, code, status, expiresAt, hostParticipantId, questionIds, currentIndex }
   * @param participants [{ id, nickname, answers, leftAt }] (참가 순서대로)
   */
  constructor({ room, participants = [], emit, store = noopStore, clock = systemClock, options = {}, onClose }) {
    this.id = room.id;
    this.code = room.code;
    this.status = room.status;
    this.expiresAt = new Date(room.expiresAt).getTime();
    this.hostId = room.hostParticipantId;
    this.questionIds = room.questionIds || null;
    this.currentIndex = room.currentIndex || 0;
    this.emit = emit;
    this.store = { ...noopStore, ...store };
    this.clock = clock;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.onClose = onClose;

    this.participants = new Map();
    for (const p of participants) this._addMember(p);

    this.questionDeadline = null;
    this.questionTimer = null;
    this.vote = null;
    this.voteTimer = null;
    this.expiryTimer = this.clock.setTimeout(() => this.expire(), Math.max(0, this.expiresAt - this.clock.now()));

    const host = this.participants.get(this.hostId);
    if (!host || host.left) this._handOffHost();
    // 서버가 다시 떴을 때 진행 중이던 방은 현재 질문부터 다시 묻는다
    if (this.status === 'playing') this._askCurrentQuestion();
  }

  _addMember(p) {
    const member = {
      id: p.id,
      nickname: p.nickname,
      avoidTags: readAvoidTags(p.avoidTags),
      answers: Array.isArray(p.answers) ? [...p.answers] : [],
      left: Boolean(p.leftAt),
      connected: false,
      away: false,
      ready: false,
      socketId: null,
      graceTimer: null
    };
    this.participants.set(p.id, member);
    if (!member.left) this._startGraceTimer(member);
    return member;
  }

  _member(participantId) {
    const member = this.participants.get(participantId);
    if (!member || member.left) throw new RoomError('NOT_IN_ROOM', '이 방의 참가자가 아니에요.');
    return member;
  }

  _assertOpen() {
    if (this.status === 'expired') throw new RoomError('ROOM_EXPIRED', '만료된 방이에요. 새 방을 만들어 주세요.');
  }

  /** 아직 방에 남아 있는 사람 (나가기 누른 사람 제외) */
  activeMembers() {
    return [...this.participants.values()].filter((m) => !m.left);
  }

  /** 지금 질문에서 답을 기다려야 하는 사람 */
  _awaitedMembers() {
    return this.activeMembers().filter((m) => !m.away);
  }

  // ---- 접속 ----

  /** HTTP로 새로 참가한 사람을 대기실 목록에 바로 보여준다 */
  addParticipant(p) {
    if (this.participants.has(p.id)) return;
    this._addMember(p);
    if (this.hostId == null) this._handOffHost();
    this._broadcastState();
  }

  /** 소켓 접속(첫 접속과 재접속 모두). 이전 소켓이 있으면 그 id를 돌려줘서 끊게 한다. */
  connect(participantId, socketId) {
    this._assertOpen();
    const member = this._member(participantId);
    const previousSocketId = member.socketId !== socketId ? member.socketId : null;
    this._clearGraceTimer(member);
    member.connected = true;
    member.away = false;
    member.socketId = socketId;
    this._broadcastState();
    return { previousSocketId, state: this.snapshot() };
  }

  /** 소켓이 끊김. 다른 소켓으로 이미 다시 들어온 경우(socketId 불일치)는 무시한다. */
  disconnect(participantId, socketId) {
    const member = this.participants.get(participantId);
    if (!member || member.left || member.socketId !== socketId) return;
    member.connected = false;
    member.socketId = null;
    this._startGraceTimer(member);
    this._broadcastState();
  }

  _startGraceTimer(member) {
    this._clearGraceTimer(member);
    member.graceTimer = this.clock.setTimeout(() => this._onGraceExpired(member.id), this.options.disconnectGraceMs);
  }

  _clearGraceTimer(member) {
    if (member.graceTimer) this.clock.clearTimeout(member.graceTimer);
    member.graceTimer = null;
  }

  _onGraceExpired(participantId) {
    const member = this.participants.get(participantId);
    if (!member || member.left || member.connected) return;
    member.graceTimer = null;
    if (this.status === 'waiting') {
      // 대기실에서 오래 안 보이면 자리를 비워준다 (최대 4명이라서)
      this._removeMember(member);
      return;
    }
    member.away = true;
    if (this.hostId === member.id) this._handOffHost();
    this._broadcastState();
    if (this.status === 'playing') this._advanceIfEveryoneAnswered();
    this._decideIfEveryoneVoted();
  }

  /** 스스로 나가기 */
  leave(participantId) {
    const member = this._member(participantId);
    if (this.status === 'waiting') {
      this._removeMember(member);
      return;
    }
    this._clearGraceTimer(member);
    member.left = true;
    member.connected = false;
    member.socketId = null;
    this._persist(this.store.markLeft(member.id));
    if (this.hostId === member.id) this._handOffHost();
    this._broadcastState();
    if (this.status === 'playing') this._advanceIfEveryoneAnswered();
    this._decideIfEveryoneVoted();
  }

  _removeMember(member) {
    this._clearGraceTimer(member);
    this.participants.delete(member.id);
    this._persist(this.store.removeParticipant(member.id));
    if (this.hostId === member.id) this._handOffHost();
    this._broadcastState();
  }

  /** 방장이 나가면 참가 순서상 다음 사람, 접속해 있는 사람을 먼저 */
  _handOffHost() {
    const candidates = this.activeMembers();
    const next = candidates.find((m) => m.connected) || candidates.find((m) => !m.away) || candidates[0];
    const nextId = next ? next.id : null;
    if (nextId === this.hostId) return;
    this.hostId = nextId;
    this._persist(this.store.saveRoom(this.id, { hostParticipantId: nextId }));
    if (nextId != null) this.emit('host:changed', { hostId: nextId });
  }

  // ---- 대기실 ----

  setReady(participantId, ready) {
    this._assertOpen();
    const member = this._member(participantId);
    if (this.status !== 'waiting') throw new RoomError('NOT_WAITING', '이미 시작한 방이에요.');
    member.ready = Boolean(ready);
    this._broadcastState();
  }

  /** 방장이 시작. 방장 말고 모두 접속해서 준비를 눌러야 한다. */
  start(participantId) {
    this._assertOpen();
    this._member(participantId);
    if (this.status !== 'waiting') throw new RoomError('NOT_WAITING', '이미 시작한 방이에요.');
    if (this.hostId !== participantId) throw new RoomError('NOT_HOST', '방장만 시작할 수 있어요.');
    const members = this.activeMembers();
    if (members.length < this.options.minParticipantsToStart) {
      throw new RoomError('NOT_ENOUGH_PARTICIPANTS', `${this.options.minParticipantsToStart}명 이상 모여야 시작할 수 있어요.`);
    }
    if (members.some((m) => m.id !== this.hostId && !(m.connected && m.ready))) {
      throw new RoomError('NOT_READY', '아직 준비하지 않은 사람이 있어요.');
    }
    this.status = 'playing';
    this.questionIds = pickQuestionOrder(this.options.random);
    this.currentIndex = 0;
    for (const m of members) m.answers = [];
    this._persist(this.store.saveRoom(this.id, {
      status: 'playing',
      questionIds: this.questionIds,
      currentIndex: 0
    }));
    this._broadcastState();
    this._askCurrentQuestion();
  }

  // ---- 질문 진행 ----

  currentQuestionId() {
    return this.status === 'playing' ? this.questionIds[this.currentIndex] : null;
  }

  _answerOf(member, questionId) {
    const record = member.answers.find((a) => a.questionId === questionId);
    return record ? record.answer : null;
  }

  _askCurrentQuestion() {
    this._clearQuestionTimer();
    this.questionDeadline = this.clock.now() + this.options.answerTimeoutMs;
    this.questionTimer = this.clock.setTimeout(() => this._onQuestionTimeout(), this.options.answerTimeoutMs);
    this.emit('question', this._questionPayload());
    // 서버 재시작 직후처럼 이미 모두 답한 상태일 수도 있다
    this._advanceIfEveryoneAnswered();
  }

  _questionPayload() {
    const questionId = this.currentQuestionId();
    if (!questionId) return null;
    return {
      index: this.currentIndex,
      total: this.questionIds.length,
      questionId,
      deadline: this.questionDeadline,
      answeredIds: this.activeMembers().filter((m) => this._answerOf(m, questionId)).map((m) => m.id)
    };
  }

  answer(participantId, questionId, answer) {
    this._assertOpen();
    const member = this._member(participantId);
    if (this.status !== 'playing') throw new RoomError('NOT_PLAYING', '진행 중인 질문이 없어요.');
    if (questionId !== this.currentQuestionId()) throw new RoomError('STALE_QUESTION', '이미 지나간 질문이에요.');
    if (!ANSWERS.includes(answer)) throw new RoomError('INVALID_ANSWER', '알 수 없는 답이에요.');
    if (this._answerOf(member, questionId)) throw new RoomError('ALREADY_ANSWERED', '이미 답했어요.');
    member.answers.push({ questionId, answer });
    this._persist(this.store.saveAnswers(member.id, member.answers));
    this.emit('answered', { questionId, participantId, answeredIds: this._questionPayload().answeredIds });
    this._advanceIfEveryoneAnswered();
  }

  /** 방장이 기다리지 않고 넘김. 답하지 않은 사람은 '상관없음' */
  next(participantId) {
    this._assertOpen();
    this._member(participantId);
    if (this.status !== 'playing') throw new RoomError('NOT_PLAYING', '진행 중인 질문이 없어요.');
    if (this.hostId !== participantId) throw new RoomError('NOT_HOST', '방장만 넘길 수 있어요.');
    this._advance();
  }

  _advanceIfEveryoneAnswered() {
    if (this.status !== 'playing') return;
    const questionId = this.currentQuestionId();
    const awaited = this._awaitedMembers();
    if (awaited.length > 0 && awaited.every((m) => this._answerOf(m, questionId))) this._advance();
  }

  _onQuestionTimeout() {
    this.questionTimer = null;
    if (this.status === 'playing') this._advance();
  }

  _advance() {
    this._clearQuestionTimer();
    const questionId = this.currentQuestionId();
    // 답 안 한 사람(자리 비움 포함)은 '상관없음'으로 채워서 모두 같은 길이의 답을 갖게 한다
    for (const m of this.activeMembers()) {
      if (!this._answerOf(m, questionId)) {
        m.answers.push({ questionId, answer: DEFAULT_ANSWER });
        this._persist(this.store.saveAnswers(m.id, m.answers));
      }
    }
    if (this.currentIndex + 1 >= this.questionIds.length) {
      this._finish();
      return;
    }
    this.currentIndex += 1;
    this._persist(this.store.saveRoom(this.id, { currentIndex: this.currentIndex }));
    this._askCurrentQuestion();
  }

  _finish() {
    this.status = 'finished';
    this.questionDeadline = null;
    this._persist(this.store.saveRoom(this.id, { status: 'finished' }));
    // 그룹 점수(US-27)는 이 답을 받아서 계산한다
    this.emit('room:finished', { questionIds: this.questionIds, answers: this.answersByParticipant() });
    this._broadcastState();
  }

  answersByParticipant() {
    return [...this.participants.values()].map((m) => ({
      participantId: m.id,
      nickname: m.nickname,
      left: m.left,
      avoidTags: m.avoidTags,
      answers: m.answers
    }));
  }

  // ---- 동점 투표 (US-28) ----

  /**
   * 그룹 점수는 앱이 계산하고(모두 같은 답과 같은 메뉴 데이터라 결과가 같다), 1·2위가 비슷하면
   * 아무나 상위 후보를 보낸다. 먼저 온 것으로 열고, 이미 열렸으면 그 투표를 그대로 돌려준다.
   */
  openVote(participantId, candidates) {
    this._assertOpen();
    this._member(participantId);
    if (this.status !== 'finished') throw new RoomError('NOT_FINISHED', '질문이 다 끝난 뒤에 투표할 수 있어요.');
    if (this.vote) return this._voteView();
    const names = GroupVote.readCandidates(candidates);
    if (!names) throw new RoomError('INVALID_CANDIDATES', '투표 후보는 서로 다른 메뉴 2~4개여야 해요.');
    this.vote = new GroupVote({ candidates: names, deadline: this.clock.now() + this.options.voteTimeoutMs });
    this.voteTimer = this.clock.setTimeout(() => this._onVoteTimeout(), this.options.voteTimeoutMs);
    this.emit('vote:started', this._voteView());
    return this._voteView();
  }

  castVote(participantId, menu) {
    this._assertOpen();
    this._member(participantId);
    if (!this.vote) throw new RoomError('NO_VOTE', '진행 중인 투표가 없어요.');
    if (this.vote.winner) throw new RoomError('VOTE_CLOSED', '이미 끝난 투표예요.');
    if (!this.vote.candidates.includes(menu)) throw new RoomError('INVALID_VOTE', '후보에 없는 메뉴예요.');
    if (this.vote.hasVoted(participantId)) throw new RoomError('ALREADY_VOTED', '이미 투표했어요.');
    this.vote.cast(participantId, menu);
    this.emit('vote:cast', { participantId, votedIds: this._voteView().votedIds });
    this._decideIfEveryoneVoted();
  }

  _decideIfEveryoneVoted() {
    if (!this.vote || this.vote.winner) return;
    const awaited = this._awaitedMembers();
    if (awaited.length > 0 && awaited.every((m) => this.vote.hasVoted(m.id))) this._decideVote();
  }

  _onVoteTimeout() {
    this.voteTimer = null;
    if (this.vote && !this.vote.winner) this._decideVote();
  }

  _decideVote() {
    this._clearVoteTimer();
    this.vote.decide(this.activeMembers().map((m) => m.id), this.options.random);
    this.emit('vote:result', this._voteView());
    this._broadcastState();
  }

  _voteView() {
    return this.vote ? this.vote.view(this.activeMembers().map((m) => m.id)) : null;
  }

  _clearVoteTimer() {
    if (this.voteTimer) this.clock.clearTimeout(this.voteTimer);
    this.voteTimer = null;
  }

  _clearQuestionTimer() {
    if (this.questionTimer) this.clock.clearTimeout(this.questionTimer);
    this.questionTimer = null;
  }

  // ---- 만료 ----

  expire() {
    if (this.status === 'expired') return;
    this.status = 'expired';
    this.close();
    this._persist(this.store.saveRoom(this.id, { status: 'expired' }));
    this.emit('room:expired', { code: this.code, message: '만료된 방이에요. 새 방을 만들어 주세요.' });
    if (this.onClose) this.onClose(this);
  }

  /** 타이머를 모두 정리 (만료나 서버 종료 때) */
  close() {
    this._clearQuestionTimer();
    this._clearVoteTimer();
    if (this.expiryTimer) this.clock.clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    for (const m of this.participants.values()) this._clearGraceTimer(m);
  }

  // ---- 상태 공유 ----

  snapshot() {
    return {
      code: this.code,
      status: this.status,
      expiresAt: new Date(this.expiresAt).toISOString(),
      hostId: this.hostId,
      participants: this.activeMembers().map((m) => ({
        id: m.id,
        nickname: m.nickname,
        ready: m.ready,
        connected: m.connected,
        away: m.away
      })),
      question: this._questionPayload(),
      // 끝난 뒤 다시 들어온 사람도 같은 결과를 계산할 수 있게
      result: this.status === 'finished' ? { questionIds: this.questionIds, answers: this.answersByParticipant() } : null,
      vote: this._voteView()
    };
  }

  _broadcastState() {
    this.emit('room:state', this.snapshot());
  }

  _persist(promise) {
    Promise.resolve(promise).catch((error) => console.error(`⚠️ Failed to save room ${this.code}:`, error.message));
  }
}

module.exports = { RoomSession, RoomError, ANSWERS, DEFAULT_ANSWER, DEFAULT_OPTIONS };
