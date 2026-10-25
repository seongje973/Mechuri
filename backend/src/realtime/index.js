const { Server } = require('socket.io');
const { RoomSession, RoomError } = require('./roomSession');
const { isRoomExpired } = require('../models/Room');

// Socket.IO 연결. 방마다 RoomSession 하나를 메모리에 두고 (서버 한 대 기준),
// 처음 접속할 때 DB에서 불러온다.
//
// 앱 → 서버: join { code, token }, ready { ready }, start, answer { questionId, answer }, next, leave
//   모두 ack(콜백)로 { ok: true, ... } 또는 { ok: false, error, message }를 돌려준다.
// 서버 → 앱: room:state, question, answered, host:changed, room:finished, room:expired

const channelOf = (code) => `room:${code}`;

class RoomRegistry {
  constructor({ store, emitToRoom, options, clock }) {
    this.store = store;
    this.emitToRoom = emitToRoom;
    this.options = options;
    this.clock = clock;
    this.sessions = new Map(); // room id → RoomSession
    this.loading = new Map(); // room id → Promise<RoomSession>
  }

  get(roomId) {
    return this.sessions.get(roomId) || null;
  }

  /** 메모리에 없으면 DB에서 불러와 만든다. 같은 방을 동시에 두 번 만들지 않는다. */
  async open(room) {
    if (this.sessions.has(room.id)) return this.sessions.get(room.id);
    if (!this.loading.has(room.id)) {
      const promise = this.store.loadParticipants(room.id).then((participants) => {
        const session = new RoomSession({
          room,
          participants,
          emit: (event, payload) => this.emitToRoom(room.code, event, payload),
          store: this.store,
          clock: this.clock,
          options: this.options,
          onClose: (s) => this.sessions.delete(s.id)
        });
        this.sessions.set(room.id, session);
        return session;
      }).finally(() => this.loading.delete(room.id));
      this.loading.set(room.id, promise);
    }
    return this.loading.get(room.id);
  }

  closeAll() {
    for (const session of this.sessions.values()) session.close();
    this.sessions.clear();
  }
}

let activeRegistry = null;

/** 라우터가 HTTP 참가를 대기실에 바로 알릴 때 쓴다. 소켓 서버가 없으면 null. */
const getRoomRegistry = () => activeRegistry;

const toAckError = (error) => {
  if (error instanceof RoomError) return { ok: false, error: error.code, message: error.message };
  console.error('⚠️ Realtime handler failed:', error);
  return { ok: false, error: 'SERVER_ERROR', message: '잠시 후 다시 시도해 주세요.' };
};

const attachRealtime = (httpServer, { store = require('./roomStore').roomStore, options, clock, cors = { origin: '*' } } = {}) => {
  const io = new Server(httpServer, { cors });
  const registry = new RoomRegistry({
    store,
    options,
    clock,
    emitToRoom: (code, event, payload) => io.to(channelOf(code)).emit(event, payload)
  });
  activeRegistry = registry;

  io.on('connection', (socket) => {
    // join 전에는 비어 있다
    let membership = null; // { roomId, participantId, code }

    const handle = (fn) => async (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : () => {};
      try {
        ack({ ok: true, ...(await fn(args[0] || {})) });
      } catch (error) {
        ack(toAckError(error));
      }
    };

    const session = () => {
      const s = membership && registry.get(membership.roomId);
      if (!s) throw new RoomError('NOT_JOINED', '먼저 방에 들어와 주세요.');
      return s;
    };

    socket.on('join', handle(async ({ token }) => {
      const found = await store.findByToken(token);
      if (!found) throw new RoomError('INVALID_TOKEN', '방 참가 정보가 없어요. 코드로 다시 참가해 주세요.');
      if (isRoomExpired(found.room)) throw new RoomError('ROOM_EXPIRED', '만료된 방이에요. 새 방을 만들어 주세요.');
      const s = await registry.open(found.room);
      // 같은 소켓으로 다른 방에 들어가면 이전 방에서는 끊긴 것으로 친다
      if (membership && membership.participantId !== found.participantId) {
        const old = registry.get(membership.roomId);
        if (old) old.disconnect(membership.participantId, socket.id);
        socket.leave(channelOf(membership.code));
      }
      membership = { roomId: s.id, participantId: found.participantId, code: s.code };
      socket.join(channelOf(s.code));
      const { previousSocketId, state } = s.connect(found.participantId, socket.id);
      if (previousSocketId) io.sockets.sockets.get(previousSocketId)?.disconnect(true);
      return { participantId: found.participantId, state };
    }));

    socket.on('ready', handle(async ({ ready = true }) => {
      session().setReady(membership.participantId, ready);
    }));

    socket.on('start', handle(async () => {
      session().start(membership.participantId);
    }));

    socket.on('answer', handle(async ({ questionId, answer }) => {
      session().answer(membership.participantId, questionId, answer);
    }));

    socket.on('next', handle(async () => {
      session().next(membership.participantId);
    }));

    socket.on('leave', handle(async () => {
      session().leave(membership.participantId);
      socket.leave(channelOf(membership.code));
      membership = null;
    }));

    socket.on('disconnect', () => {
      if (!membership) return;
      const s = registry.get(membership.roomId);
      if (s) s.disconnect(membership.participantId, socket.id);
    });
  });

  const close = () => {
    registry.closeAll();
    if (activeRegistry === registry) activeRegistry = null;
    return new Promise((resolve) => io.close(() => resolve()));
  };

  return { io, registry, close };
};

module.exports = { attachRealtime, getRoomRegistry, RoomRegistry };
