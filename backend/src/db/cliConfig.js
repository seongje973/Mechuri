// sequelize-cli 설정 (.sequelizerc가 가리킨다). 환경 이름과 상관없이 같은 접속 정보를 쓴다.
const { buildDbOptions } = require('./options');

const options = buildDbOptions();
module.exports = {
  development: options,
  test: options,
  production: options
};
