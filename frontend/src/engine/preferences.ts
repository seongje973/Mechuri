import { CUISINES, Cuisine, MenuItem, SPICY_TAG_LEVEL } from '../constants/menuData';
import {
  LEARNED_CUISINE_BONUS,
  LEARN_DAYS,
  LEARN_MIN_MEALS,
  LEARN_MIN_SHARE,
  LIKED_CUISINE_BONUS,
  SPICY_LOVER_BONUS,
  SPICY_MILD_PENALTY_PER_LEVEL,
} from './config';

/** 매운맛 취향. 아예 못 먹으면 기피 태그 '매운맛'으로 후보에서 뺀다 */
export type SpicyPreference = 'mild' | 'normal' | 'hot';

/** 취향 설정. 로그인하면 서버(User.preferences), 게스트는 기기에 저장한다 */
export interface TastePreferences {
  likedCuisines: Cuisine[];
  spicy: SpicyPreference | null;
}

export const EMPTY_PREFERENCES: TastePreferences = { likedCuisines: [], spicy: null };

const SPICY_VALUES: SpicyPreference[] = ['mild', 'normal', 'hot'];

/** 저장소·서버에서 읽은 값을 정리한다. 모르는 값은 버린다 */
export const normalizePreferences = (value: unknown): TastePreferences => {
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const liked = Array.isArray(v.likedCuisines) ? v.likedCuisines : [];
  return {
    likedCuisines: CUISINES.filter(c => liked.includes(c)),
    spicy: SPICY_VALUES.includes(v.spicy as SpicyPreference) ? (v.spicy as SpicyPreference) : null,
  };
};

export interface CategoryMeal {
  menuName: string;
  category?: string | null;
  createdAt: string | number | Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 최근 30일 기록에서 자주 먹는 나라별 음식. 기록 3개 이상, 40% 이상 먹은 것만.
 * 기록에 분류가 없으면 메뉴 이름으로 찾는다.
 */
export const learnedCuisines = (meals: CategoryMeal[], menus: MenuItem[], now: number = Date.now()): Cuisine[] => {
  const byName = new Map(menus.map(m => [m.name, m.category]));
  const counts = new Map<Cuisine, number>();
  let total = 0;
  meals.forEach(meal => {
    const eatenAt = new Date(meal.createdAt).getTime();
    const elapsed = now - eatenAt;
    if (Number.isNaN(eatenAt) || elapsed < 0 || elapsed > LEARN_DAYS * DAY_MS) return;
    const category = (CUISINES as string[]).includes(meal.category ?? '')
      ? (meal.category as Cuisine)
      : byName.get(meal.menuName);
    if (!category) return;
    total += 1;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  });
  if (total < LEARN_MIN_MEALS) return [];
  return CUISINES.filter(c => (counts.get(c) ?? 0) / total >= LEARN_MIN_SHARE);
};

export interface PreferenceBoost {
  /** 메뉴 이름 → 보정 점수 */
  adjustments: Record<string, number>;
  /** 메뉴 이름 → 결과 화면 이유 칩 */
  reasons: Record<string, string[]>;
}

/**
 * 취향 보정: 직접 고른 좋아하는 나라별 음식 +1 (안 골랐으면 기록에서 배운 것 +0.5),
 * "매운 거 좋아요"면 맵기 2 이상 +1, "안 매운 게 좋아요"면 맵기 1당 -0.5.
 */
export const preferenceAdjustments = (
  menus: MenuItem[],
  preferences: TastePreferences,
  meals: CategoryMeal[] = [],
  now: number = Date.now()
): PreferenceBoost => {
  const learned = learnedCuisines(meals, menus, now);
  const adjustments: Record<string, number> = {};
  const reasons: Record<string, string[]> = {};
  const add = (name: string, delta: number, reason?: string) => {
    adjustments[name] = (adjustments[name] ?? 0) + delta;
    if (reason) reasons[name] = [...(reasons[name] ?? []), reason];
  };

  menus.forEach(item => {
    if (preferences.likedCuisines.includes(item.category)) {
      add(item.name, LIKED_CUISINE_BONUS, `좋아하는 ${item.category}`);
    } else if (learned.includes(item.category)) {
      add(item.name, LEARNED_CUISINE_BONUS, `요즘 자주 먹는 ${item.category}`);
    }
    if (preferences.spicy === 'hot' && item.spicy >= SPICY_TAG_LEVEL) {
      add(item.name, SPICY_LOVER_BONUS, '매운 거 좋아해서');
    } else if (preferences.spicy === 'mild' && item.spicy > 0) {
      add(item.name, SPICY_MILD_PENALTY_PER_LEVEL * item.spicy);
    }
  });
  return { adjustments, reasons };
};
