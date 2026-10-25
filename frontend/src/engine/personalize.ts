import { FAVORITE_BONUS, RECENT_MEAL_DAYS, RECENT_MEAL_PENALTY } from './config';

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
