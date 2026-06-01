const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Database Connection
connectDB();

// Basic Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to MeChuri API Server!',
    status: 'Running',
    timestamp: new Date()
  });
});

// Restaurant API Route
const restaurantRouter = require('./routes/restaurant');
app.use('/api/restaurants', restaurantRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
