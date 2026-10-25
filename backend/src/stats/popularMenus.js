// 홈 화면 "요즘 많이 고른 메뉴": 실제 식사 기록(History)만 센다. 기록이 없으면 빈 목록이다.
const popularMenus = async ({ History, sequelize, limit = 5 }) => {
  const rows = await History.findAll({
    attributes: [
      'menuName',
      [sequelize.fn('MAX', sequelize.col('emoji')), 'emoji'],
      [sequelize.fn('MAX', sequelize.col('category')), 'category'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['menuName'],
    order: [[sequelize.literal('"count"'), 'DESC'], ['menuName', 'ASC']],
    limit,
    raw: true
  });

  return rows.map((row, idx) => ({
    rank: idx + 1,
    menuName: row.menuName,
    emoji: row.emoji,
    category: row.category,
    count: parseInt(row.count, 10) || 0
  }));
};

module.exports = { popularMenus };
