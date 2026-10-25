// 홈 화면 "요즘 많이 고른 메뉴": 실제 식사 기록(History)만 센다. 기록이 없으면 빈 목록이다.
const popularMenus = async ({ History, sequelize, limit = 5 }) => {
  const rows = await History.findAll({
    attributes: [
      'menuName',
      // 이모지와 카테고리는 같은 기록(가장 최근 것)에서 함께 가져온다
      [sequelize.literal('(ARRAY_AGG("emoji" ORDER BY "id" DESC))[1]'), 'emoji'],
      [sequelize.literal('(ARRAY_AGG("category" ORDER BY "id" DESC))[1]'), 'category'],
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
