const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, connectDB } = require('./config/db');

// Import Models to ensure they are registered with Sequelize before sync
const User = require('./models/User');
const Favorite = require('./models/Favorite');
const History = require('./models/History');
const Room = require('./models/Room');
const Participant = require('./models/Participant');
const Event = require('./models/Event');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database & Sync Tables
const initDatabase = async () => {
  await connectDB();
  try {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    await sequelize.sync(isDevelopment ? { alter: true } : undefined);
    console.log(
      `🔄 Database tables synchronized successfully. (alter mode: ${isDevelopment ? 'on' : 'off'})`
    );
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
const roomsRouter = require('./routes/rooms');
const { attachRealtime } = require('./realtime');

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/events', require('./routes/events').createEventsRouter({ Event }));

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
// 같이 정하기 실시간 진행 (Socket.IO는 같은 포트를 쓴다)
attachRealtime(server);
