'use strict';

// 닫힌 방 기록 정리(src/realtime/roomCleanup.js)가 expiresAt으로 찾는다.
// 개발 DB에서는 sync({ alter: true })가 모델의 인덱스를 먼저 만들었을 수 있다.
module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('Rooms');
    if (indexes.some((index) => index.name === 'rooms_expires_at')) return;
    await queryInterface.addIndex('Rooms', ['expiresAt'], { name: 'rooms_expires_at' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Rooms', 'rooms_expires_at');
  }
};
