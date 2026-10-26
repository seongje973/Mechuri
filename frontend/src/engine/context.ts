import { MenuItem } from '../constants/menuData';
import {
  COLD_DAY_TEMP,
  CONTEXT_BONUS,
  HOT_DAY_TEMP,
  LATE_NIGHT_END_HOUR,
  LATE_NIGHT_START_HOUR,
} from './config';

/**
 * 날씨·시간대 상황 보정 (L-02). 비 오는 날 국물, 더운 날 차가운 음식, 추운 날 따뜻한 국물, 늦은 밤 가벼운 음식에 +1.
 * 질문 점수보다 약하게: 한 메뉴에 여러 규칙이 맞아도 CONTEXT_BONUS 한 번만 더하고, 처음 맞은 규칙의 이유를 쓴다.
 */

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'unknown';

export interface RecommendContext {
  /** 0~23, 기기 시각 */
  hour: number;
  weather?: { condition: WeatherCondition; temperature: number | null } | null;
}

interface Rule {
  applies: (ctx: RecommendContext) => boolean;
  matches: (item: MenuItem) => boolean;
  reason: string;
}

const isLateNight = (hour: number) => hour >= LATE_NIGHT_START_HOUR || hour < LATE_NIGHT_END_HOUR;
const temp = (ctx: RecommendContext) => ctx.weather?.temperature ?? null;

const RULES: Rule[] = [
  { applies: c => c.weather?.condition === 'rain', matches: m => m.soup, reason: '비 오는 날엔 국물' },
  { applies: c => c.weather?.condition === 'snow', matches: m => m.soup, reason: '눈 오는 날엔 국물' },
  { applies: c => (temp(c) ?? -Infinity) >= HOT_DAY_TEMP, matches: m => m.temperature === 'cold', reason: '더운 날 시원하게' },
  { applies: c => (temp(c) ?? Infinity) <= COLD_DAY_TEMP, matches: m => m.temperature === 'hot' && m.soup, reason: '추운 날 따끈하게' },
  { applies: c => isLateNight(c.hour), matches: m => m.weight === 'light', reason: '늦은 밤엔 가볍게' },
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
