'use strict';

// 카카오 로그인 1회용 코드 저장소 (src/models/LoginCode.js). 메모리에 두던 것을 DB로 옮겼다.
// 개발 DB에서는 sync({ alter: true })가 먼저 만들었을 수 있으므로 없을 때만 만든다.
module.exports = {
  async up(queryInterface, Sequelize) {
    if ((await queryInterface.showAllTables()).map(String).includes('LoginCodes')) return;
    await queryInterface.createTable('LoginCodes', {
      codeHash: { type: Sequelize.STRING(64), primaryKey: true },
      challenge: { type: Sequelize.STRING(64), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('LoginCodes', ['expiresAt'], { name: 'login_codes_expires_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LoginCodes');
  }
};
