'use strict';

// 마이그레이션 이전에 sync({ alter: true })로 만들던 테이블 4개.
// 이미 sync로 테이블이 있는 개발 DB에서도 돌 수 있도록, 없는 테이블만 만든다.
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = (await queryInterface.showAllTables()).map(String);
    const has = (name) => existing.includes(name);
    const timestamps = {
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    };
    const userRef = (onDelete) => ({
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete
    });

    if (!has('Users')) {
      await queryInterface.createTable('Users', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: Sequelize.STRING, allowNull: false, unique: true },
        password: { type: Sequelize.STRING, allowNull: false },
        nickname: { type: Sequelize.STRING, allowNull: false },
        avoidTags: { type: Sequelize.TEXT, allowNull: true, defaultValue: '' },
        ...timestamps
      });
    }

    if (!has('Favorites')) {
      await queryInterface.createTable('Favorites', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: Sequelize.INTEGER, allowNull: false, ...userRef('CASCADE') },
        menuName: { type: Sequelize.STRING, allowNull: false },
        emoji: { type: Sequelize.STRING, allowNull: true },
        category: { type: Sequelize.STRING, allowNull: true },
        ...timestamps
      });
    }

    if (!has('Histories')) {
      await queryInterface.createTable('Histories', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: Sequelize.INTEGER, allowNull: false, ...userRef('CASCADE') },
        menuName: { type: Sequelize.STRING, allowNull: false },
        emoji: { type: Sequelize.STRING, allowNull: true },
        restaurantName: { type: Sequelize.STRING, allowNull: true },
        category: { type: Sequelize.STRING, allowNull: true },
        ...timestamps
      });
    }

    if (!has('Events')) {
      await queryInterface.createTable('Events', {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        type: { type: Sequelize.STRING(32), allowNull: false },
        sessionId: { type: Sequelize.STRING(64), allowNull: false },
        deviceId: { type: Sequelize.STRING(64), allowNull: false },
        userId: { type: Sequelize.INTEGER, allowNull: true, ...userRef('SET NULL') },
        payload: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        occurredAt: { type: Sequelize.DATE, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex('Events', ['sessionId'], { name: 'events_session_id' });
      await queryInterface.addIndex('Events', ['type', 'occurredAt'], { name: 'events_type_occurred_at' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Events');
    await queryInterface.dropTable('Histories');
    await queryInterface.dropTable('Favorites');
    await queryInterface.dropTable('Users');
  }
};
