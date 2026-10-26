'use strict';

// 취향 설정 열 (src/models/User.js preferences). null이면 아직 설정하지 않은 사용자.
// 개발 DB에서는 sync({ alter: true })가 먼저 만들었을 수 있으므로 없을 때만 더한다.
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('Users');
    if (!columns.preferences) {
      await queryInterface.addColumn('Users', 'preferences', { type: Sequelize.JSON, allowNull: true });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'preferences');
  }
};
