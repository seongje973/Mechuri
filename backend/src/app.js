const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { sequelize, connectDB } = require('./config/db');

// Import Models to ensure they are registered with Sequelize before sync
const User = require('./models/User');
const Favorite = require('./models/Favorite');
const History = require('./models/History');

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
    await sequelize.sync({ alter: true });
    console.log('🔄 MySQL Database tables synchronized successfully.');
  } catch (error) {
    console.error('❌ Failed to sync MySQL database tables:', error.message);
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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
