const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const User = require('../models/User');
const Favorite = require('../models/Favorite');
const History = require('../models/History');
const { sequelize } = require('../config/db');
const { ImportError, normalizeImportPayload, planImport } = require('../user/guestImport');

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

// 10. POST Import guest data (로그인 직후 기기에 있던 게스트 기록을 계정으로 옮긴다)
router.post('/import', async (req, res) => {
  let payload;
  try {
    payload = normalizeImportPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error instanceof ImportError ? error.message : 'Invalid import payload.' });
  }

  try {
    const userId = req.user.id;
    const result = await sequelize.transaction(async transaction => {
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return null;

      const menuNames = [...new Set([...payload.histories, ...payload.favorites].map(item => item.menuName))];
      const [existingHistories, existingFavorites] = await Promise.all([
        History.findAll({ where: { userId, menuName: menuNames }, attributes: ['menuName', 'createdAt'], transaction }),
        Favorite.findAll({ where: { userId }, attributes: ['menuName'], transaction })
      ]);

      const plan = planImport(payload, {
        histories: existingHistories,
        favorites: existingFavorites,
        avoidTags: user.avoidTags
      });

      // createdAt은 게스트가 실제로 먹은 시각을 그대로 둔다
      await History.bulkCreate(plan.histories.map(h => ({ ...h, userId })), { transaction, silent: true });
      await Favorite.bulkCreate(plan.favorites.map(f => ({ ...f, userId })), { transaction, silent: true });
      user.avoidTags = plan.avoidTags;
      await user.save({ transaction });

      return { histories: plan.histories.length, favorites: plan.favorites.length, avoidTags: user.avoidTags };
    });

    if (!result) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      message: 'Guest data imported successfully! 🐣',
      imported: { histories: result.histories, favorites: result.favorites },
      avoidTags: result.avoidTags
    });
  } catch (error) {
    console.error('❌ Guest Import Error:', error.message);
    return res.status(500).json({ error: 'Failed to import guest data.' });
  }
});

module.exports = router;
