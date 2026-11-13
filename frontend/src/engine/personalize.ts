import { MenuItem } from '../constants/menuData';
import {
  FAVORITE_BONUS,
  POPULAR_BONUS,
  RECENT_MEAL_DAYS,
  RECENT_MEAL_PENALTY,
  REJECT_LEARN_DAYS,
  REJECT_MAX_PENALTY,
  REJECT_PENALTY,
  REJECT_SIMILAR_PENALTY,
  SIMILAR_MEAL_DAYS,
  SIMILAR_MEAL_PENALTY,
} from './config';
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

/**
 * 최근 14일 안에 "틀렸어요"로 거절한 메뉴는 거절한 횟수만큼 감점하고(-3까지), 비슷한 메뉴도 약하게 감점한다.
 * rejections: 거절한 메뉴 이름과 시각
 */
export const rejectionAdjustments = (rejections: MealRecord[], menus: MenuItem[], now: number = Date.now()): Record<string, number> => {
  const counts = new Map<string, number>();
  rejections.forEach(r => {
    const elapsed = now - new Date(r.createdAt).getTime();
    if (elapsed >= 0 && elapsed <= REJECT_LEARN_DAYS * DAY_MS) counts.set(r.menuName, (counts.get(r.menuName) ?? 0) + 1);
  });
  const rejected = menus.filter(m => counts.has(m.name));
  const adjustments: Record<string, number> = {};
  menus.forEach(item => {
    const count = counts.get(item.name);
    if (count) {
      adjustments[item.name] = Math.max(REJECT_MAX_PENALTY, count * REJECT_PENALTY);
    } else if (rejected.some(r => isSimilarMenu(r, item))) {
      adjustments[item.name] = REJECT_SIMILAR_PENALTY;
    }
  });
  return adjustments;
};

/** 인기 순위에 든 메뉴에 작은 보너스. 점수가 같을 때 데이터 순서 대신 많이 고른 메뉴가 앞선다 */
export const popularAdjustments = (ranking: { menuName: string }[]): Record<string, number> =>
  Object.fromEntries(ranking.map(r => [r.menuName, POPULAR_BONUS]));

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
