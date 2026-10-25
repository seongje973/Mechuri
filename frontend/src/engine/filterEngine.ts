import { MenuItem, getAvoidTags } from '../constants/menuData';
import { Question, matchesQuestion } from '../constants/akinatorQuestions';

/**
 * 현재(필터 방식) 추천 로직. 화면 없이 테스트할 수 있도록 RecommendScreen에서 옮겨 왔다.
 * 새 점수 방식 엔진은 scoreEngine.ts. 화면은 S2(US-11~14)에서 그쪽으로 옮기고 나면 이 파일을 지운다.
 */

export type Answer = 'yes' | 'no' | 'dontknow';

export interface RecentMeal {
  menuName: string;
  category?: string;
}

export const MAX_QUESTIONS = 12;
const STOP_POOL_SIZE = 3;
const RECENT_MEAL_LOOKBACK = 5;
const RECENT_MENU_PENALTY = 20;
const RECENT_CATEGORY_PENALTY = 5;

export const parseAvoidTags = (raw?: string | null): string[] =>
  raw ? raw.split(',').filter(Boolean) : [];

/** 제외한 나라별 분류와 기피 태그를 뺀 시작 후보. 기피 태그로 전부 빠지면 기피 태그는 무시한다. */
export const buildInitialPool = (
  menus: MenuItem[],
  excludedCategories: string[],
  avoidTags: string[]
): MenuItem[] => {
  let pool = menus;
  if (excludedCategories.length > 0) {
    pool = pool.filter(item => !excludedCategories.includes(item.category));
  }
  if (avoidTags.length > 0) {
    const filtered = pool.filter(item => !getAvoidTags(item).some(tag => avoidTags.includes(tag)));
    if (filtered.length > 0) pool = filtered;
  }
  return pool;
};

/** 후보를 "예/아니오" 반반에 가장 가깝게 나누는 질문. 더 물을 게 없으면 null. */
export const pickNextQuestion = (
  pool: MenuItem[],
  questions: Question[],
  askedIds: string[]
): Question | null => {
  const remaining = questions.filter(q => !askedIds.includes(q.id));
  if (remaining.length === 0 || pool.length <= 1) return null;

  let best: Question | null = null;
  let minDeviation = Infinity;
  remaining.forEach(q => {
    const yesCount = pool.filter(item => matchesQuestion(item, q)).length;
    const deviation = Math.abs(yesCount - (pool.length - yesCount));
    if (deviation < minDeviation) {
      minDeviation = deviation;
      best = q;
    }
  });
  return best;
};

/** 답에 맞는 후보만 남긴다. 모두 지워지면 이전 후보를 그대로 둔다. */
export const applyAnswer = (pool: MenuItem[], question: Question, answer: Answer): MenuItem[] => {
  let next = pool;
  if (answer === 'yes') next = pool.filter(item => matchesQuestion(item, question));
  else if (answer === 'no') next = pool.filter(item => !matchesQuestion(item, question));
  return next.length === 0 ? [...pool] : next;
};

export const shouldStop = (pool: MenuItem[], questionCount: number, maxQuestions = MAX_QUESTIONS) =>
  pool.length <= STOP_POOL_SIZE || questionCount >= maxQuestions;

/** 최근 먹은 메뉴(-20)와 같은 분류(-5)를 감점해 순위를 매긴다. 동점은 원래 순서 유지. */
export const rankResults = (pool: MenuItem[], recentMeals: RecentMeal[]): MenuItem[] => {
  const recent = recentMeals.slice(0, RECENT_MEAL_LOOKBACK);
  const names = recent.map(m => m.menuName);
  const categories = recent.map(m => m.category);

  return pool
    .map(item => {
      let score = 100;
      if (names.includes(item.name)) score -= RECENT_MENU_PENALTY;
      if (categories.includes(item.category)) score -= RECENT_CATEGORY_PENALTY;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.item);
};
