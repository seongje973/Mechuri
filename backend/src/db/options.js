require('dotenv').config();

// 서버와 sequelize-cli(마이그레이션)가 같은 접속 정보를 쓰도록 한 곳에서 만든다.
// DATABASE_URL이 있으면 그것을 쓰고 (Render 등 배포 환경), 없으면 DB_* 값을 쓴다 (로컬 docker-compose).
// DB_SSL=true 면 SSL로 접속한다. 외부에서 클라우드 DB에 붙을 때 필요하다.
const buildDbOptions = (env = process.env) => {
  const common = {
    dialect: 'postgres',
    logging: false, // console log SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
  if (env.DB_SSL === 'true') {
    common.dialectOptions = { ssl: { require: true, rejectUnauthorized: false } };
  }
  if (env.DATABASE_URL) {
    return { ...common, url: env.DATABASE_URL };
  }
  return {
    ...common,
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 5432,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD
  };
};

module.exports = { buildDbOptions };
