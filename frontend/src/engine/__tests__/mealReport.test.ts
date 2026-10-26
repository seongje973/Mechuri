import { buildMealReport, reportInsight } from '../mealReport';

const at = (iso: string, category: string | null) => ({ menuName: 'x', category, createdAt: iso });

describe('식사 리포트', () => {
  const now = new Date(2026, 9, 26);

  it('이번 달 기록만 종류별로 세고 많은 순으로 4개까지', () => {
    const report = buildMealReport(
      [
        at(new Date(2026, 9, 1).toISOString(), '한식'),
        at(new Date(2026, 9, 3).toISOString(), '한식'),
        at(new Date(2026, 9, 4).toISOString(), '일식'),
        at(new Date(2026, 9, 5).toISOString(), null),
        at(new Date(2026, 8, 30).toISOString(), '양식'),
      ],
      now,
    );
    expect(report.month).toBe(10);
    expect(report.total).toBe(4);
    expect(report.categories[0]).toEqual({ name: '한식', count: 2 });
    expect(report.categories.map(c => c.name)).toEqual(expect.arrayContaining(['일식', '기타']));
  });

  it('한 줄 요약은 받침에 맞는 조사를 쓴다', () => {
    const report = { month: 10, total: 5, categories: [{ name: '한식', count: 3 }, { name: '분식', count: 2 }] };
    expect(reportInsight(report)).toBe('이번 달은 한식을 제일 많이 먹었어요. 총 5끼 중 3끼예요.');
    expect(reportInsight({ ...report, categories: [{ name: '양식', count: 3 }, { name: '스시', count: 1 }] }))
      .toContain('양식을');
    expect(reportInsight({ month: 10, total: 0, categories: [] })).toContain('이거 먹을래요');
  });
});
