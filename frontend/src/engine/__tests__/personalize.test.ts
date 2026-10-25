import { recentMealAdjustments } from '../personalize';

describe('recentMealAdjustments', () => {
  it('3일 이내에 먹은 메뉴만 한 번씩 -2', () => {
    const now = new Date('2026-11-10T12:00:00Z').getTime();
    expect(
      recentMealAdjustments(
        [
          { menuName: '짬뽕', createdAt: '2026-11-09T12:00:00Z' },
          { menuName: '짬뽕', createdAt: '2026-11-08T12:00:00Z' },
          { menuName: '초밥', createdAt: '2026-11-01T12:00:00Z' },
          { menuName: '피자', createdAt: 'not-a-date' },
        ],
        now
      )
    ).toEqual({ 짬뽕: -2 });
  });
});
