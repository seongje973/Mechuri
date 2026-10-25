'use strict';

// 앱이 재전송한 이벤트를 걸러 내는 eventId 열과 (deviceId, eventId) 고유 인덱스 (src/models/Event.js).
// 개발 DB에서는 sync({ alter: true })가 먼저 만들었을 수 있으므로 없는 것만 더한다.
// eventId가 비어 있는 예전 행은 Postgres 고유 인덱스에서 서로 겹치지 않는다.
const INDEX_NAME = 'events_device_id_event_id';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('Events');
    if (!columns.eventId) {
      await queryInterface.addColumn('Events', 'eventId', { type: Sequelize.STRING(64), allowNull: true });
    }
    const indexes = await queryInterface.showIndex('Events');
    if (!indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.addIndex('Events', ['deviceId', 'eventId'], { name: INDEX_NAME, unique: true });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Events', INDEX_NAME);
    await queryInterface.removeColumn('Events', 'eventId');
  }
};
