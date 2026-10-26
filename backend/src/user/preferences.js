// 취향 설정 (좋아하는 나라별 음식, 매운맛 정도). User.preferences에 JSON으로 저장한다.
// null은 "아직 한 번도 설정하지 않음"이라 앱이 로그인 직후 설정 화면을 띄운다.

const CUISINES = ['한식', '중식', '일식', '양식', '분식', '아시안'];
const SPICY = ['mild', 'normal', 'hot'];

class PreferencesError extends Error {}

/** 요청 본문을 저장할 모양으로 정리한다. 모르는 나라별 음식은 빼고, 형식이 틀리면 PreferencesError */
const normalizePreferences = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PreferencesError('preferences must be an object.');
  }
  const liked = value.likedCuisines === undefined || value.likedCuisines === null ? [] : value.likedCuisines;
  if (!Array.isArray(liked)) throw new PreferencesError('likedCuisines must be an array.');
  const spicy = value.spicy === undefined ? null : value.spicy;
  if (spicy !== null && !SPICY.includes(spicy)) throw new PreferencesError(`spicy must be one of ${SPICY.join(', ')} or null.`);
  return {
    likedCuisines: CUISINES.filter(c => liked.includes(c)),
    spicy
  };
};

/** DB에 저장된 값을 읽는다. 깨진 값은 설정하지 않은 것(null)으로 본다 */
const readPreferences = stored => {
  if (stored === undefined || stored === null) return null;
  try {
    return normalizePreferences(typeof stored === 'string' ? JSON.parse(stored) : stored);
  } catch {
    return null;
  }
};

module.exports = { CUISINES, SPICY, PreferencesError, normalizePreferences, readPreferences };
