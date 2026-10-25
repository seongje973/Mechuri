const { Sequelize } = require('sequelize');
const { buildDbOptions } = require('../db/options');

const { url, database, username, password, ...options } = buildDbOptions();
const sequelize = url
  ? new Sequelize(url, options)
  : new Sequelize(database, username, password, options);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Database connected successfully with Sequelize.');
  } catch (error) {
    console.error('❌ Unable to connect to the PostgreSQL database:');
    console.error(error.message);
    console.log('👉 Tip: Please make sure your PostgreSQL server is running and .env configuration is correct.');
  }
};

module.exports = { sequelize, connectDB };
