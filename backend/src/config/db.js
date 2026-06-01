const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false, // console log SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully with Sequelize.');
  } catch (error) {
    console.error('❌ Unable to connect to the MySQL database:');
    console.error(error.message);
    console.log('👉 Tip: Please make sure your MySQL server is running and .env configuration is correct.');
  }
};

module.exports = { sequelize, connectDB };
