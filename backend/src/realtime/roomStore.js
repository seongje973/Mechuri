const Room = require('../models/Room');
const Participant = require('../models/Participant');

// RoomSession이 쓰는 DB 저장소. 테스트에서는 같은 모양의 메모리 저장소로 바꿔 끼운다.

const toSessionParticipant = (p) => ({ id: p.id, nickname: p.nickname, answers: p.answers, leftAt: p.leftAt });

const roomStore = {
  /** 소켓 접속 토큰으로 참가자와 그 방을 찾는다 */
  async findByToken(token) {
    if (typeof token !== 'string' || !token) return null;
    const participant = await Participant.findOne({ where: { token }, include: Room });
    if (!participant) return null;
    return { participantId: participant.id, room: participant.Room.get({ plain: true }) };
  },

  async loadParticipants(roomId) {
    const rows = await Participant.findAll({ where: { roomId }, order: [['id', 'ASC']] });
    return rows.map(toSessionParticipant);
  },

  async saveRoom(roomId, patch) {
    await Room.update(patch, { where: { id: roomId } });
  },

  async saveAnswers(participantId, answers) {
    await Participant.update({ answers }, { where: { id: participantId } });
  },

  async removeParticipant(participantId) {
    await Participant.destroy({ where: { id: participantId } });
  },

  async markLeft(participantId) {
    await Participant.update({ leftAt: new Date() }, { where: { id: participantId } });
  }
};

module.exports = { roomStore, toSessionParticipant };
