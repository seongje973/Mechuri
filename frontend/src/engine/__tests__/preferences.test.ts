import { MENU_DATA } from '../../constants/menuData';
import { QUESTIONS } from '../../constants/akinatorQuestions';
import { createScoreSession } from '../scoreEngine';
import { getResults, toRecommendSession } from '../recommendFlow';
import { mergeReasons } from '../context';
import { EMPTY_PREFERENCES, learnedCuisines, normalizePreferences, preferenceAdjustments } from '../preferences';

const now = new Date('2026-11-10T12:00:00Z').getTime();
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

describe('normalizePreferences', () => {
  it('모르는 값은 버리고 나라별 순서를 지킨다', () => {
    expect(normalizePreferences({ likedCuisines: ['아시안', '피자', '한식'], spicy: 'very' })).toEqual({
      likedCuisines: ['한식', '아시안'],
      spicy: null,
    });
    expect(normalizePreferences(null)).toEqual(EMPTY_PREFERENCES);
  });
});

describe('learnedCuisines', () => {
  it('최근 30일 기록 3개 이상 중 40% 이상 먹은 나라별 음식만', () => {
    const meals = [
      { menuName: '초밥', category: '일식', createdAt: daysAgo(1) },
      { menuName: '라멘', createdAt: daysAgo(5) }, // 분류가 없으면 메뉴 이름으로
      { menuName: '김치찌개', category: '한식', createdAt: daysAgo(10) },
      { menuName: '규동', category: '일식', createdAt: daysAgo(40) }, // 30일 지남
    ];
    expect(learnedCuisines(meals, MENU_DATA, now)).toEqual(['일식']);
  });

  it('기록이 3개 미만이면 배우지 않는다', () => {
    const meals = [
      { menuName: '초밥', category: '일식', createdAt: daysAgo(1) },
      { menuName: '라멘', category: '일식', createdAt: daysAgo(2) },
    ];
    expect(learnedCuisines(meals, MENU_DATA, now)).toEqual([]);
  });
});

describe('preferenceAdjustments', () => {
  it('좋아하는 나라별 음식 +1, 기록에서 배운 것은 +0.5 (직접 고른 것과 겹치면 한 번만)', () => {
    const meals = ['초밥', '라멘', '규동'].map(menuName => ({ menuName, category: '일식', createdAt: daysAgo(2) }));
    const { adjustments, reasons } = preferenceAdjustments(
      MENU_DATA,
      { likedCuisines: ['한식'], spicy: null },
      meals,
      now
    );
    expect(adjustments['된장찌개']).toBe(1);
    expect(reasons['된장찌개']).toEqual(['좋아하는 한식']);
    expect(adjustments['우동']).toBe(0.5);
    expect(reasons['우동']).toEqual(['요즘 자주 먹는 일식']);
    expect(adjustments['피자']).toBeUndefined();

    const liked = preferenceAdjustments(MENU_DATA, { likedCuisines: ['일식'], spicy: null }, meals, now);
    expect(liked.adjustments['우동']).toBe(1);
  });

  it('매운 거 좋아요면 맵기 2 이상 +1, 안 매운 게 좋아요면 맵기 1당 -0.5', () => {
    const hot = preferenceAdjustments(MENU_DATA, { likedCuisines: [], spicy: 'hot' }, [], now);
    expect(hot.adjustments['쭈꾸미볶음']).toBe(1);
    expect(hot.reasons['쭈꾸미볶음']).toEqual(['매운 거 좋아해서']);
    expect(hot.adjustments['비빔밥']).toBeUndefined(); // 맵기 1

    const mild = preferenceAdjustments(MENU_DATA, { likedCuisines: [], spicy: 'mild' }, [], now);
    expect(mild.adjustments['쭈꾸미볶음']).toBe(-1.5);
    expect(mild.adjustments['비빔밥']).toBe(-0.5);
    expect(mild.adjustments['된장찌개']).toBeUndefined();
    expect(mild.reasons['쭈꾸미볶음']).toBeUndefined();
  });

  it('답이 같으면 좋아하는 나라별 음식이 1위로 오르고 이유 칩에 보인다', () => {
    const session = toRecommendSession(createScoreSession(MENU_DATA));
    const plain = getResults(session, QUESTIONS);
    expect(plain[0].item.category).not.toBe('아시안');

    const { adjustments, reasons } = preferenceAdjustments(MENU_DATA, { likedCuisines: ['아시안'], spicy: null }, [], now);
    const [top] = getResults(session, QUESTIONS, adjustments, undefined, mergeReasons({}, reasons));
    expect(top.item.category).toBe('아시안');
    expect(top.reasons).toContain('좋아하는 아시안');
  });
});

describe('mergeReasons', () => {
  it('날씨 이유와 취향 이유를 순서대로 합친다', () => {
    expect(mergeReasons({ 우동: '비 오는 날엔 국물' }, { 우동: ['좋아하는 일식'], 초밥: ['좋아하는 일식'] })).toEqual({
      우동: ['비 오는 날엔 국물', '좋아하는 일식'],
      초밥: ['좋아하는 일식'],
    });
  });
});
