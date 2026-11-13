import { MENU_DATA } from '../../constants/menuData';
import { QUESTIONS } from '../../constants/akinatorQuestions';
import { createScoreSession } from '../scoreEngine';
import { getResults, toRecommendSession } from '../recommendFlow';
import { contextAdjustments, mergeAdjustments } from '../context';
import { CONTEXT_BONUS } from '../config';

const noon = { hour: 12 };

describe('contextAdjustments (L-02)', () => {
  it('맑은 낮에는 보정이 없다', () => {
    expect(contextAdjustments(MENU_DATA, { ...noon, weather: { condition: 'clear', temperature: 18 } }).adjustments).toEqual({});
    expect(contextAdjustments(MENU_DATA, noon).adjustments).toEqual({});
  });

  it('비 오는 날엔 국물 메뉴만 +1', () => {
    const { adjustments, reasons } = contextAdjustments(MENU_DATA, { ...noon, weather: { condition: 'rain', temperature: 15 } });
    const boosted = MENU_DATA.filter(m => adjustments[m.name]);
    expect(boosted.length).toBeGreaterThan(0);
    expect(boosted.every(m => m.soup)).toBe(true);
    expect(MENU_DATA.filter(m => m.soup).every(m => adjustments[m.name] === CONTEXT_BONUS)).toBe(true);
    expect(reasons[boosted[0].name]).toBe('비 오는 날엔 국물');
  });

  it('더운 날엔 차가운 음식, 늦은 밤엔 가벼운 음식', () => {
    const hot = contextAdjustments(MENU_DATA, { ...noon, weather: { condition: 'clear', temperature: 31 } }).adjustments;
    expect(MENU_DATA.filter(m => hot[m.name]).every(m => m.temperature === 'cold')).toBe(true);

    const night = contextAdjustments(MENU_DATA, { hour: 23 }).adjustments;
    expect(MENU_DATA.filter(m => night[m.name]).every(m => m.weight === 'light')).toBe(true);
    expect(contextAdjustments(MENU_DATA, { hour: 4 }).adjustments).toEqual({});
  });

  it('아침엔 가벼운 음식, 평일 점심엔 혼자 먹기 좋은 만 원 이하, 금·토 저녁엔 여럿이 먹는 메뉴', () => {
    const boosted = (ctx: { hour: number; day?: number }) => {
      const { adjustments } = contextAdjustments(MENU_DATA, ctx);
      return MENU_DATA.filter(m => adjustments[m.name]);
    };
    const morning = boosted({ hour: 8, day: 3 });
    expect(morning.length).toBeGreaterThan(0);
    expect(morning.every(m => m.weight === 'light')).toBe(true);

    const lunch = contextAdjustments(MENU_DATA, { hour: 12, day: 3 });
    expect(lunch.reasons['김치찌개']).toBe('평일 점심엔 간단하게');
    expect(boosted({ hour: 12, day: 3 }).every(m => m.party === 'solo' && m.price === 'low')).toBe(true);
    expect(boosted({ hour: 12, day: 0 })).toEqual([]); // 일요일 점심

    const friday = boosted({ hour: 19, day: 5 });
    expect(friday.length).toBeGreaterThan(0);
    expect(friday.every(m => m.party === 'group')).toBe(true);
    expect(boosted({ hour: 19, day: 2 })).toEqual([]);
  });

  it('규칙이 여러 개 맞아도 한 메뉴에 한 번만 더한다', () => {
    const { adjustments } = contextAdjustments(MENU_DATA, { hour: 23, weather: { condition: 'rain', temperature: 2 } });
    expect(Math.max(...Object.values(adjustments))).toBe(CONTEXT_BONUS);
  });

  it('보정값을 더하고, 결과 이유 칩에 상황 이유를 붙인다', () => {
    expect(mergeAdjustments({ a: 1, b: -2 }, { b: 1, c: 1 })).toEqual({ a: 1, b: -1, c: 1 });

    const session = toRecommendSession(createScoreSession(MENU_DATA));
    const { adjustments, reasons } = contextAdjustments(MENU_DATA, { ...noon, weather: { condition: 'rain', temperature: 15 } });
    const [top] = getResults(session, QUESTIONS, adjustments, 3, reasons);
    expect(top.item.soup).toBe(true);
    expect(top.reasons).toContain('비 오는 날엔 국물');
  });
});
