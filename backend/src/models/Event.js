const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

// 지표용 이벤트 (US-23). 계산 쿼리는 backend/sql/metrics.sql
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING(32),
    allowNull: false
  },
  // 추천 한 번(시작부터 결과까지)을 묶는 앱 쪽 ID
  sessionId: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  // 게스트도 기록되도록 앱 설치마다 만드는 기기 ID
  deviceId: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  // 앱에서 일어난 시각. 오프라인으로 모았다 보내도 순서가 맞도록 따로 둔다
  occurredAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['sessionId'] },
    { fields: ['type', 'occurredAt'] }
  ]
});

User.hasMany(Event, { foreignKey: 'userId', onDelete: 'SET NULL' });
Event.belongsTo(User, { foreignKey: 'userId' });

module.exports = Event;
