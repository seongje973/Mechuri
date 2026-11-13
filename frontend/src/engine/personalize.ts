import { MenuItem } from '../constants/menuData';
import { FAVORITE_BONUS, RECENT_MEAL_DAYS, RECENT_MEAL_PENALTY, SIMILAR_MEAL_DAYS, SIMILAR_MEAL_PENALTY } from './config';
import { isSimilarMenu } from './similarity';

export interface MealRecord {
  menuName: string;
  createdAt: string | number | Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 최근 3일 안에 먹은 메뉴는 감점한다 (같은 메뉴를 연달아 추천하지 않기). 메뉴 이름 → 점수 보정 */
export const recentMealAdjustments = (meals: MealRecord[], now: number = Date.now()): Record<string, number> => {
  const adjustments: Record<string, number> = {};
  meals.forEach(meal => {
    const eatenAt = new Date(meal.createdAt).getTime();
    const elapsed = now - eatenAt;
    if (Number.isNaN(eatenAt) || elapsed < 0 || elapsed > RECENT_MEAL_DAYS * DAY_MS) return;
    adjustments[meal.menuName] = RECENT_MEAL_PENALTY; // 여러 번 먹어도 한 번만 감점
  });
  return adjustments;
};

/**
 * 최근 2일 안에 먹은 메뉴와 비슷한 메뉴도 약하게 감점한다 (어제 김치찌개를 먹었으면 다른 찌개도 덜 나오게).
 * 먹은 메뉴 자체는 recentMealAdjustments가 감점하므로 여기서는 뺀다.
 */
export const similarMealAdjustments = (meals: MealRecord[], menus: MenuItem[], now: number = Date.now()): Record<string, number> => {
  const byName = new Map(menus.map(m => [m.name, m]));
  const recent = meals
    .filter(meal => {
      const elapsed = now - new Date(meal.createdAt).getTime();
      return elapsed >= 0 && elapsed <= SIMILAR_MEAL_DAYS * DAY_MS;
    })
    .map(meal => byName.get(meal.menuName))
    .filter((item): item is MenuItem => !!item);
  const adjustments: Record<string, number> = {};
  menus.forEach(item => {
    if (!recent.includes(item) && recent.some(eaten => isSimilarMenu(eaten, item))) {
      adjustments[item.name] = SIMILAR_MEAL_PENALTY;
    }
  });
  return adjustments;
};

export interface PersonalData {
  histories: MealRecord[];
  favorites: { menuName: string }[];
}

/**
 * 결과 순위 보정 (US-21): 즐겨찾기 +1, 3일 안에 먹은 메뉴 -2. 둘 다면 더한다.
 * 게스트·로그인 모두 저장소(storage/userData)에서 읽은 같은 모양의 기록을 넘긴다.
 */
export const personalAdjustments = ({ histories, favorites }: PersonalData, now: number = Date.now()): Record<string, number> => {
  const adjustments = recentMealAdjustments(histories, now);
  new Set(favorites.map(f => f.menuName)).forEach(name => {
    adjustments[name] = (adjustments[name] ?? 0) + FAVORITE_BONUS;
  });
  return adjustments;
};
