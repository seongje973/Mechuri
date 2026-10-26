import type { HistoryEntry } from '../storage/userData';

/** 내정보 탭 "이번 달 식사 리포트" 계산 */
export interface MealReport {
  month: number;
  total: number;
  /** 많이 먹은 순서, 최대 4개 */
  categories: { name: string; count: number }[];
}

/** 이번 달 식사 기록을 종류별로 센다. 종류가 없는 기록은 '기타'로 묶는다 */
export const buildMealReport = (histories: HistoryEntry[], now: Date = new Date()): MealReport => {
  const counts = new Map<string, number>();
  let total = 0;
  for (const h of histories) {
    const d = new Date(h.createdAt);
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
    const name = h.category || '기타';
    counts.set(name, (counts.get(name) ?? 0) + 1);
    total += 1;
  }
  const categories = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  return { month: now.getMonth() + 1, total, categories };
};

/** 받침 있으면 '을', 없으면 '를' */
const objectParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '을(를)';
  return code % 28 === 0 ? '를' : '을';
};

/** 리포트 아래 한 줄 요약 */
export const reportInsight = (report: MealReport): string => {
  if (report.total === 0) return "추천 결과에서 '이거 먹을래요'를 누르면 여기에 쌓여요.";
  const top = report.categories[0];
  if (report.categories.length === 1) return `이번 달은 ${top.name}만 ${top.count}번 먹었어요.`;
  return `이번 달은 ${top.name}${objectParticle(top.name)} 제일 많이 먹었어요. 총 ${report.total}끼 중 ${top.count}끼예요.`;
};
