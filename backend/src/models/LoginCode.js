const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 카카오 로그인 1회용 코드 (src/auth/loginHandoff.js). 서버가 여러 대이거나 재시작해도 교환할 수 있도록 DB에 둔다.
// 코드 원문은 저장하지 않고 SHA-256만 저장한다. 교환하거나 만료되면 행을 지운다.
const LoginCode = sequelize.define('LoginCode', {
  codeHash: {
    type: DataTypes.STRING(64),
    primaryKey: true
  },
  // 앱이 보낸 PKCE challenge (verifier의 SHA-256)
  challenge: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  // 교환할 때 앱에 돌려줄 { token, user }
  payload: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['expiresAt'] }
  ]
});

module.exports = LoginCode;
