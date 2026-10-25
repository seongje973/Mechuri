import { RECENT_MEAL_DAYS, RECENT_MEAL_PENALTY } from './config';

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
    if (Number.isNaN(eatenAt) || now - eatenAt > RECENT_MEAL_DAYS * DAY_MS) return;
    adjustments[meal.menuName] = RECENT_MEAL_PENALTY; // 여러 번 먹어도 한 번만 감점
  });
  return adjustments;
};
