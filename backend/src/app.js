const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, connectDB } = require('./config/db');

// Import Models to ensure they are registered with Sequelize before sync
const User = require('./models/User');
const Favorite = require('./models/Favorite');
const History = require('./models/History');
const Event = require('./models/Event');
require('./models/LoginCode');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database & Sync Tables
// 운영(NODE_ENV=production)은 테이블을 건드리지 않는다. 스키마는 마이그레이션(npm run db:migrate)으로만 바꾼다.
// 개발은 편하도록 sync({ alter: true })를 계속 쓴다. 마이그레이션으로 개발하고 싶으면 DB_SYNC=off.
const initDatabase = async () => {
  await connectDB();
  if (process.env.NODE_ENV === 'production' || process.env.DB_SYNC === 'off') {
    console.log('🔄 Database sync skipped. Run `npm run db:migrate` to update tables.');
    return;
  }
  try {
    await sequelize.sync({ alter: true });
    console.log('🔄 Database tables synchronized successfully. (alter mode: on)');
  } catch (error) {
    console.error('❌ Failed to sync database tables:', error.message);
  }
};
initDatabase();

// Basic Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MeChuri API Server!',
    status: 'Running',
    timestamp: new Date()
  });
});

// Register API Routes
const { router: authRouter } = require('./routes/auth');
const userRouter = require('./routes/user');
const restaurantRouter = require('./routes/restaurant');

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api/events', require('./routes/events').createEventsRouter({ Event }));

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
