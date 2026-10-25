const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Room = require('../models/Room');
const Participant = require('../models/Participant');
const User = require('../models/User');
const { getRoomRegistry } = require('../realtime');
const { toSessionParticipant } = require('../realtime/roomStore');

const { ROOM_TTL_MS, MAX_PARTICIPANTS, generateRoomCode, normalizeRoomCode, isValidRoomCode, isRoomExpired } = Room;
const NICKNAME_MAX_LENGTH = 20;
const CODE_ATTEMPTS = 10;

const EXPIRED_MESSAGE = '만료된 방이에요. 새 방을 만들어 주세요.';

// 게스트도 참가할 수 있으므로 토큰은 선택. 있으면 회원의 기피 태그를 가져온다.
const readOptionalUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    return await User.findByPk(decoded.id);
  } catch (error) {
    return null;
  }
};

const readNickname = (body, user) => {
  const raw = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const nickname = raw || (user ? user.nickname : '');
  if (!nickname) return { error: '닉네임을 입력해 주세요.' };
  if (nickname.length > NICKNAME_MAX_LENGTH) return { error: `닉네임은 ${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요.` };
  return { nickname };
};

// 게스트는 직접 고른 기피 태그를 보낼 수 있다 (배열 또는 쉼표 구분 문자열)
const readAvoidTags = (body, user) => {
  const value = body.avoidTags;
  const tags = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
  if (tags) return tags.map((t) => String(t).trim()).filter(Boolean).join(',');
  return user ? user.avoidTags || '' : '';
};

const roomView = (room, participantCount) => ({
  code: room.code,
  status: isRoomExpired(room) ? 'expired' : room.status,
  expiresAt: room.expiresAt,
  participantCount,
  maxParticipants: MAX_PARTICIPANTS
});

const participantView = (p) => ({ id: p.id, nickname: p.nickname, token: p.token });

// 같은 코드를 쓰는 살아 있는 방 (만료된 방의 코드는 다시 쓴다)
const findLiveRoom = (code, options = {}) =>
  Room.findOne({
    where: { code, status: { [Op.ne]: 'expired' }, expiresAt: { [Op.gt]: new Date() } },
    order: [['id', 'DESC']],
    ...options
  });

const createParticipant = async (room, { nickname, avoidTags, user }, transaction) =>
  Participant.create({
    roomId: room.id,
    userId: user ? user.id : null,
    nickname,
    avoidTags,
    token: Participant.generateToken()
  }, { transaction });

// 방 만들기: 만든 사람이 방장
router.post('/', async (req, res) => {
  try {
    const user = await readOptionalUser(req);
    const { nickname, error } = readNickname(req.body || {}, user);
    if (error) return res.status(400).json({ error });
    const avoidTags = readAvoidTags(req.body || {}, user);

    const result = await sequelize.transaction(async (transaction) => {
      let code = null;
      for (let i = 0; i < CODE_ATTEMPTS && !code; i++) {
        const candidate = generateRoomCode();
        // 같은 코드를 동시에 고르는 두 요청이 둘 다 통과하지 않게 (코드에 unique 제약이 없어서)
        await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:code))', { replacements: { code: candidate }, transaction });
        if (!(await findLiveRoom(candidate, { transaction }))) code = candidate;
      }
      if (!code) throw new Error('Could not allocate a room code.');

      const room = await Room.create({ code, expiresAt: new Date(Date.now() + ROOM_TTL_MS) }, { transaction });
      const participant = await createParticipant(room, { nickname, avoidTags, user }, transaction);
      await room.update({ hostParticipantId: participant.id }, { transaction });
      return { room, participant };
    });

    res.status(201).json({
      room: roomView(result.room, 1),
      participant: participantView(result.participant)
    });
  } catch (error) {
    console.error('⚠️ Failed to create room:', error.message);
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

// 초대 링크를 열었을 때 방 상태 확인 (만료 안내용)
router.get('/:code', async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    if (!isValidRoomCode(code)) return res.status(404).json({ error: '방을 찾을 수 없어요.', reason: 'NOT_FOUND' });

    const room = await Room.findOne({ where: { code }, order: [['id', 'DESC']] });
    if (!room) return res.status(404).json({ error: '방을 찾을 수 없어요.', reason: 'NOT_FOUND' });
    if (isRoomExpired(room)) return res.status(410).json({ error: EXPIRED_MESSAGE, reason: 'ROOM_EXPIRED' });

    const count = await Participant.count({ where: { roomId: room.id, leftAt: null } });
    res.json({ room: roomView(room, count) });
  } catch (error) {
    console.error('⚠️ Failed to load room:', error.message);
    res.status(500).json({ error: 'Failed to load room.' });
  }
});

// 코드로 참가. 게스트는 닉네임만 있으면 된다.
router.post('/:code/join', async (req, res) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    if (!isValidRoomCode(code)) return res.status(404).json({ error: '방을 찾을 수 없어요.', reason: 'NOT_FOUND' });

    const user = await readOptionalUser(req);
    const { nickname, error } = readNickname(req.body || {}, user);
    if (error) return res.status(400).json({ error });
    const avoidTags = readAvoidTags(req.body || {}, user);

    const outcome = await sequelize.transaction(async (transaction) => {
      const room = await Room.findOne({ where: { code }, order: [['id', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
      if (!room) return { status: 404, body: { error: '방을 찾을 수 없어요.', reason: 'NOT_FOUND' } };
      if (isRoomExpired(room)) return { status: 410, body: { error: EXPIRED_MESSAGE, reason: 'ROOM_EXPIRED' } };
      if (room.status !== 'waiting') {
        return { status: 409, body: { error: '이미 시작한 방이에요.', reason: 'ALREADY_STARTED' } };
      }

      // 방 행을 잠근 상태에서 세므로 동시에 들어와도 4명을 넘지 않는다
      const count = await Participant.count({ where: { roomId: room.id, leftAt: null }, transaction });
      if (count >= MAX_PARTICIPANTS) {
        return { status: 409, body: { error: `방이 가득 찼어요. (최대 ${MAX_PARTICIPANTS}명)`, reason: 'ROOM_FULL' } };
      }

      const participant = await createParticipant(room, { nickname, avoidTags, user }, transaction);
      return { status: 201, room, participant, count: count + 1 };
    });

    if (outcome.status !== 201) return res.status(outcome.status).json(outcome.body);

    // 대기실이 열려 있으면 목록에 바로 보이게
    const session = getRoomRegistry()?.get(outcome.room.id);
    if (session) session.addParticipant(toSessionParticipant(outcome.participant));

    res.status(201).json({
      room: roomView(outcome.room, outcome.count),
      participant: participantView(outcome.participant)
    });
  } catch (error) {
    console.error('⚠️ Failed to join room:', error.message);
    res.status(500).json({ error: 'Failed to join room.' });
  }
});

module.exports = router;
