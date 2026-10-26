const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avoidTags: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '' // Comma-separated list like "매운맛,오이,가지"
  },
  // 취향 설정 { likedCuisines, spicy } (src/user/preferences.js). null이면 아직 설정하지 않음
  preferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  }
}, {
  timestamps: true
});

module.exports = User;
