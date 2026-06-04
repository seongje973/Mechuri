const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const History = sequelize.define('History', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  menuName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  emoji: {
    type: DataTypes.STRING,
    allowNull: true
  },
  restaurantName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// Associations
User.hasMany(History, { foreignKey: 'userId', onDelete: 'CASCADE' });
History.belongsTo(User, { foreignKey: 'userId' });

module.exports = History;
