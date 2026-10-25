const crypto = require('crypto');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 같이 정하기 방. 진행 중 상태(누가 답했는지, 타이머)는 src/realtime 메모리에 있고,
// 여기에는 다시 띄울 때 필요한 것만 저장한다.
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_PARTICIPANTS = 4;
const CODE_LENGTH = 4;
// 헷갈리는 글자(0/O, 1/I/L)는 뺀다
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const ROOM_STATUS = ['waiting', 'playing', 'finished', 'expired'];

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 만료된 방의 코드는 다시 쓰므로 unique가 아니다. 살아 있는 방끼리만 겹치지 않게 만든다.
  code: {
    type: DataTypes.STRING(CODE_LENGTH),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(...ROOM_STATUS),
    allowNull: false,
    defaultValue: 'waiting'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  hostParticipantId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // 서버가 정한 질문 순서 (akinatorQuestions.ts의 id 배열)
  questionIds: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  currentIndex: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: true,
  indexes: [{ fields: ['code'] }, { fields: ['expiresAt'] }]
});

const generateRoomCode = (randomInt = crypto.randomInt) =>
  Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

const normalizeRoomCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '');

const isValidRoomCode = (code) =>
  code.length === CODE_LENGTH && [...code].every((ch) => CODE_ALPHABET.includes(ch));

const isRoomExpired = (room, now = Date.now()) =>
  room.status === 'expired' || new Date(room.expiresAt).getTime() <= now;

module.exports = Room;
module.exports.ROOM_TTL_MS = ROOM_TTL_MS;
module.exports.MAX_PARTICIPANTS = MAX_PARTICIPANTS;
module.exports.generateRoomCode = generateRoomCode;
module.exports.normalizeRoomCode = normalizeRoomCode;
module.exports.isValidRoomCode = isValidRoomCode;
module.exports.isRoomExpired = isRoomExpired;
