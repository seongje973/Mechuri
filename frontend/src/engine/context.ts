import { MenuItem } from '../constants/menuData';
import {
  BREAKFAST_END_HOUR,
  BREAKFAST_START_HOUR,
  COLD_DAY_TEMP,
  CONTEXT_BONUS,
  DINNER_END_HOUR,
  DINNER_START_HOUR,
  HOT_DAY_TEMP,
  LATE_NIGHT_END_HOUR,
  LATE_NIGHT_START_HOUR,
  LUNCH_END_HOUR,
  LUNCH_START_HOUR,
} from './config';

/**
 * 날씨·시간대 상황 보정 (L-02). 비 오는 날 국물, 더운 날 차가운 음식, 추운 날 따뜻한 국물, 늦은 밤 가벼운 음식에 +1.
 * 끼니: 아침엔 가벼운 음식, 평일 점심엔 혼자 먹기 좋은 만 원 이하, 금·토 저녁엔 여럿이 먹는 메뉴에 +1.
 * 질문 점수보다 약하게: 한 메뉴에 여러 규칙이 맞아도 CONTEXT_BONUS 한 번만 더하고, 처음 맞은 규칙의 이유를 쓴다.
 */

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'unknown';

export interface RecommendContext {
  /** 0~23, 기기 시각 */
  hour: number;
  /** 0(일)~6(토), 기기 요일. 없으면 요일 규칙은 쓰지 않는다 */
  day?: number;
  weather?: { condition: WeatherCondition; temperature: number | null } | null;
}

interface Rule {
  applies: (ctx: RecommendContext) => boolean;
  matches: (item: MenuItem) => boolean;
  reason: string;
}

const isLateNight = (hour: number) => hour >= LATE_NIGHT_START_HOUR || hour < LATE_NIGHT_END_HOUR;
const between = (hour: number, start: number, end: number) => hour >= start && hour < end;
const isWeekday = (day?: number) => day !== undefined && day >= 1 && day <= 5;
const temp = (ctx: RecommendContext) => ctx.weather?.temperature ?? null;

const RULES: Rule[] = [
  { applies: c => c.weather?.condition === 'rain', matches: m => m.soup, reason: '비 오는 날엔 국물' },
  { applies: c => c.weather?.condition === 'snow', matches: m => m.soup, reason: '눈 오는 날엔 국물' },
  { applies: c => (temp(c) ?? -Infinity) >= HOT_DAY_TEMP, matches: m => m.temperature === 'cold', reason: '더운 날 시원하게' },
  { applies: c => (temp(c) ?? Infinity) <= COLD_DAY_TEMP, matches: m => m.temperature === 'hot' && m.soup, reason: '추운 날 따끈하게' },
  { applies: c => isLateNight(c.hour), matches: m => m.weight === 'light', reason: '늦은 밤엔 가볍게' },
  { applies: c => between(c.hour, BREAKFAST_START_HOUR, BREAKFAST_END_HOUR), matches: m => m.weight === 'light', reason: '아침엔 가볍게' },
  {
    applies: c => isWeekday(c.day) && between(c.hour, LUNCH_START_HOUR, LUNCH_END_HOUR),
    matches: m => m.party === 'solo' && m.price === 'low',
    reason: '평일 점심엔 간단하게',
  },
  {
    applies: c => (c.day === 5 || c.day === 6) && between(c.hour, DINNER_START_HOUR, DINNER_END_HOUR),
    matches: m => m.party === 'group',
    reason: '금·토 저녁엔 여럿이',
  },
];

export interface ContextBoost {
  /** 메뉴 이름 → 보정 점수 */
  adjustments: Record<string, number>;
  /** 메뉴 이름 → 결과 화면 이유 칩 */
  reasons: Record<string, string>;
}

export const contextAdjustments = (menus: MenuItem[], ctx: RecommendContext): ContextBoost => {
  const active = RULES.filter(rule => rule.applies(ctx));
  const adjustments: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  menus.forEach(item => {
    const rule = active.find(r => r.matches(item));
    if (!rule) return;
    adjustments[item.name] = CONTEXT_BONUS;
    reasons[item.name] = rule.reason;
  });
  return { adjustments, reasons };
};

/** 보정값 여러 개를 더한다 */
export const mergeAdjustments = (...list: Record<string, number>[]): Record<string, number> =>
  list.reduce<Record<string, number>>((acc, adj) => {
    Object.entries(adj).forEach(([name, v]) => {
      acc[name] = (acc[name] ?? 0) + v;
    });
    return acc;
  }, {});

/** 이유 칩 여러 묶음을 합친다. 앞에 넘긴 묶음의 이유가 먼저 온다 */
export const mergeReasons = (...list: Record<string, string | string[]>[]): Record<string, string[]> =>
  list.reduce<Record<string, string[]>>((acc, reasons) => {
    Object.entries(reasons).forEach(([name, value]) => {
      acc[name] = Array.from(new Set([...(acc[name] ?? []), ...([] as string[]).concat(value)]));
    });
    return acc;
  }, {});
