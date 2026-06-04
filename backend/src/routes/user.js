const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const History = require('../models/History');

// Apply authMiddleware to all routes here
router.use(authMiddleware);

// 1. GET User Stats (Eaten Count, Favorites Count, Avoid Count)
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const eatenCount = await History.count({ where: { userId } });
    const favoritesCount = await Favorite.count({ where: { userId } });
    
    const user = await User.findByPk(userId);
    const avoidCount = user.avoidTags ? user.avoidTags.split(',').filter(Boolean).length : 0;

    return res.json({
      eatenCount,
      favoritesCount,
      avoidCount
    });
  } catch (error) {
    console.error('❌ Stats Retrieve Error:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve user statistics.' });
  }
});

// 2. GET User Favorites
router.get('/favorites', async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    return res.json({ favorites });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve favorites.' });
  }
});

// 3. POST User Favorite (Add)
router.post('/favorites', async (req, res) => {
  try {
    const userId = req.user.id;
    const { menuName, emoji, category } = req.body;

    if (!menuName) {
      return res.status(400).json({ error: 'Menu name is required.' });
    }

    // Check duplicate
    const existing = await Favorite.findOne({ where: { userId, menuName } });
    if (existing) {
      return res.json({ message: 'Menu is already in favorites.', favorite: existing });
    }

    const favorite = await Favorite.create({
      userId,
      menuName,
      emoji,
      category
    });

    return res.json({ message: 'Added to favorites successfully! ❤️', favorite });
  } catch (error) {
    console.error('❌ Favorite Add Error:', error.message);
    return res.status(500).json({ error: 'Failed to add favorite.' });
  }
});

// 4. DELETE User Favorite (Remove)
router.delete('/favorites', async (req, res) => {
  try {
    const userId = req.user.id;
    const { menuName } = req.body;

    if (!menuName) {
      return res.status(400).json({ error: 'Menu name is required.' });
    }

    await Favorite.destroy({ where: { userId, menuName } });
    return res.json({ message: 'Removed from favorites successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove favorite.' });
  }
});

// 5. GET User Histories
router.get('/histories', async (req, res) => {
  try {
    const histories = await History.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50 // Limit to last 50 entries
    });
    return res.json({ histories });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve histories.' });
  }
});

// 6. POST User History (Log meal)
router.post('/histories', async (req, res) => {
  try {
    const userId = req.user.id;
    const { menuName, emoji, restaurantName, category } = req.body;

    if (!menuName) {
      return res.status(400).json({ error: 'Menu name is required.' });
    }

    const history = await History.create({
      userId,
      menuName,
      emoji,
      restaurantName,
      category
    });

    return res.json({ message: 'Eaten meal logged successfully! 📅', history });
  } catch (error) {
    console.error('❌ History Log Error:', error.message);
    return res.status(500).json({ error: 'Failed to log eating history.' });
  }
});

// 7. DELETE User Histories (Clear all)
router.delete('/histories', async (req, res) => {
  try {
    await History.destroy({ where: { userId: req.user.id } });
    return res.json({ message: 'Eating history cleared successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear eating history.' });
  }
});

// 8. GET User Avoid Tags
router.get('/avoid-tags', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    return res.json({ avoidTags: user.avoidTags || '' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve avoid tags.' });
  }
});

// 9. PUT User Avoid Tags (Update)
router.put('/avoid-tags', async (req, res) => {
  try {
    const userId = req.user.id;
    const { avoidTags } = req.body; // Comma separated string e.g., "매운맛,오이"

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.avoidTags = avoidTags !== undefined ? avoidTags : '';
    await user.save();

    return res.json({
      message: 'Avoid tags updated successfully! 🚫',
      avoidTags: user.avoidTags
    });
  } catch (error) {
    console.error('❌ Avoid Tags Update Error:', error.message);
    return res.status(500).json({ error: 'Failed to update avoid tags.' });
  }
});

module.exports = router;
