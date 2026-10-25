const { Op } = require('sequelize');

// 닫힌 방 기록(방, 참가자, 답)은 닫힌 뒤 30일이 지나면 지운다 (개인정보 처리방침).
// 방은 늦어도 expiresAt에 닫히므로 그보다 30일 뒤면 확실히 지울 수 있고,
// 더 일찍 끝나거나 만료 처리된 방은 그 상태로 바뀐 시각(updatedAt)부터 센다.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

const purgeClosedRooms = async ({ Room, Participant, sequelize, now = Date.now(), retentionMs = RETENTION_MS, batchSize = BATCH_SIZE }) => {
  const cutoff = new Date(now - retentionMs);
  const where = {
    [Op.or]: [
      { expiresAt: { [Op.lt]: cutoff } },
      { status: { [Op.in]: ['finished', 'expired'] }, updatedAt: { [Op.lt]: cutoff } }
    ]
  };
  const total = { rooms: 0, participants: 0 };
  for (;;) {
    const deleted = await sequelize.transaction(async (transaction) => {
      const rows = await Room.findAll({ where, attributes: ['id'], limit: batchSize, order: [['id', 'ASC']], transaction });
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return null;
      const participants = await Participant.destroy({ where: { roomId: { [Op.in]: ids } }, transaction });
      const rooms = await Room.destroy({ where: { id: { [Op.in]: ids } }, transaction });
      return { rooms, participants };
    });
    if (!deleted) break;
    total.rooms += deleted.rooms;
    total.participants += deleted.participants;
    if (deleted.rooms < batchSize) break;
  }
  return total;
};

/** 서버가 떠 있는 동안 주기적으로 지운다. 실패해도 다음 주기에 다시 한다. */
const startRoomCleanup = ({ intervalMs = CLEANUP_INTERVAL_MS, ...deps } = {}) => {
  const run = async () => {
    try {
      const { rooms, participants } = await purgeClosedRooms({
        Room: require('../models/Room'),
        Participant: require('../models/Participant'),
        sequelize: require('../config/db').sequelize,
        ...deps
      });
      if (rooms > 0) console.log(`🧹 Deleted ${rooms} closed rooms and ${participants} participants older than 30 days.`);
    } catch (error) {
      console.error('⚠️ Room cleanup failed:', error.message);
    }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
};

module.exports = { purgeClosedRooms, startRoomCleanup, RETENTION_MS };
