// 회원 탈퇴: 계정과 계정에 묶인 기록을 모두 지운다 (DELETE /api/user/account)
// DB의 ON DELETE 설정(sync alter로 만들어진 테이블은 빠져 있을 수 있음)에 기대지 않고 직접 지운다.

/**
 * @returns {Promise<null | { histories: number, favorites: number, events: number }>} 계정이 없으면 null
 */
const deleteAccount = async ({ userId, sequelize, User, History, Favorite, Event }) =>
  sequelize.transaction(async transaction => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return null;

    const where = { userId };
    const histories = await History.destroy({ where, transaction });
    const favorites = await Favorite.destroy({ where, transaction });
    // 지표 이벤트 중 이 계정에 묶인 것은 지운다. 로그인 없이 남긴 기기 ID만 있는 이벤트는 사람을 알 수 없으므로 남긴다
    const events = Event ? await Event.destroy({ where, transaction }) : 0;
    await user.destroy({ transaction });

    return { histories, favorites, events };
  });

module.exports = { deleteAccount };
