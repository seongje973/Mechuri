'use strict';

// 같이 정하기 방(src/models/Room.js)과 참가자(src/models/Participant.js).
// 개발 DB에서는 sync({ alter: true })가 먼저 만들었을 수 있으므로 없는 테이블만 만든다.
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = (await queryInterface.showAllTables()).map(String);
    const timestamps = {
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    };

    if (!existing.includes('Rooms')) {
      await queryInterface.createTable('Rooms', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: Sequelize.STRING(4), allowNull: false },
        status: {
          type: Sequelize.ENUM('waiting', 'playing', 'finished', 'expired'),
          allowNull: false,
          defaultValue: 'waiting'
        },
        expiresAt: { type: Sequelize.DATE, allowNull: false },
        hostParticipantId: { type: Sequelize.INTEGER, allowNull: true },
        questionIds: { type: Sequelize.JSONB, allowNull: true },
        currentIndex: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        ...timestamps
      });
      await queryInterface.addIndex('Rooms', ['code'], { name: 'rooms_code' });
    }

    if (!existing.includes('Participants')) {
      await queryInterface.createTable('Participants', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        roomId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Rooms', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        nickname: { type: Sequelize.STRING(20), allowNull: false },
        avoidTags: { type: Sequelize.TEXT, allowNull: true, defaultValue: '' },
        token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        leftAt: { type: Sequelize.DATE, allowNull: true },
        answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        ...timestamps
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Participants', {});
    await queryInterface.dropTable('Rooms', {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Rooms_status";');
  }
};
