// 닫힌 지 30일 지난 방 기록을 한 번 지운다. 서버가 6시간마다 알아서 하지만, cron으로 돌리고 싶을 때:
//   npm run rooms:purge
require('dotenv').config();
const { sequelize } = require('../src/config/db');
const Room = require('../src/models/Room');
const Participant = require('../src/models/Participant');
const { purgeClosedRooms } = require('../src/realtime/roomCleanup');

purgeClosedRooms({ Room, Participant, sequelize })
  .then(({ rooms, participants }) => console.log(`Deleted ${rooms} rooms and ${participants} participants.`))
  .catch((error) => {
    console.error('Room cleanup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
