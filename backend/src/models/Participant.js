const crypto = require('crypto');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Room = require('./Room');
const User = require('./User');

const Participant = sequelize.define('Participant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  // 게스트는 null
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  nickname: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  avoidTags: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '' // User.avoidTags와 같은 쉼표 구분 형식
  },
  // 소켓 접속과 재접속 때 본인 확인용. 참가 응답으로 한 번만 내려준다.
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  // 진행 중 나가기를 누른 사람. 자리는 비지만 지금까지의 답은 남는다.
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // [{ questionId, answer }] — 그룹 점수(US-27)가 쓴다
  answers: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true
});

Participant.generateToken = () => crypto.randomBytes(24).toString('hex');

Room.hasMany(Participant, { foreignKey: 'roomId', onDelete: 'CASCADE' });
Participant.belongsTo(Room, { foreignKey: 'roomId' });
User.hasMany(Participant, { foreignKey: 'userId', onDelete: 'SET NULL' });
Participant.belongsTo(User, { foreignKey: 'userId' });

module.exports = Participant;
