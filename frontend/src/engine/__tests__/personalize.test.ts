import { MENU_DATA } from '../../constants/menuData';
import { QUESTIONS } from '../../constants/akinatorQuestions';
import { createScoreSession } from '../scoreEngine';
import { answerQuestion, getResults, toRecommendSession } from '../recommendFlow';
import { personalAdjustments, recentMealAdjustments } from '../personalize';

describe('recentMealAdjustments', () => {
  it('3일 이내에 먹은 메뉴만 한 번씩 -2', () => {
    const now = new Date('2026-11-10T12:00:00Z').getTime();
    expect(
      recentMealAdjustments(
        [
          { menuName: '짬뽕', createdAt: '2026-11-09T12:00:00Z' },
          { menuName: '짬뽕', createdAt: '2026-11-08T12:00:00Z' },
          { menuName: '초밥', createdAt: '2026-11-01T12:00:00Z' },
          { menuName: '햄버거', createdAt: '2026-11-11T12:00:00Z' },
          { menuName: '피자', createdAt: 'not-a-date' },
        ],
        now
      )
    ).toEqual({ 짬뽕: -2 });
  });
});

describe('personalAdjustments (US-21)', () => {
  const now = new Date('2026-11-10T12:00:00Z').getTime();
  const yesterday = '2026-11-09T12:00:00Z';

  it('즐겨찾기 +1, 최근 먹은 메뉴 -2, 둘 다면 -1', () => {
    expect(
      personalAdjustments(
        {
          histories: [{ menuName: '짬뽕', createdAt: yesterday }, { menuName: '초밥', createdAt: yesterday }],
          favorites: [{ menuName: '초밥' }, { menuName: '피자' }, { menuName: '피자' }],
        },
        now
      )
    ).toEqual({ 짬뽕: -2, 초밥: -1, 피자: 1 });
  });

  const answered = () => {
    let s = toRecommendSession(createScoreSession(MENU_DATA));
    const q = (id: string) => QUESTIONS.find(x => x.id === id)!;
    s = answerQuestion(s, q('cuisine-korean'), 'yes');
    s = answerQuestion(s, q('soup'), 'yes');
    return s;
  };

  it('어제 먹은 메뉴는 같은 답에서 순위가 내려간다', () => {
    const session = answered();
    const plain = getResults(session, QUESTIONS);
    const top = plain[0].item.name;
    const adjusted = getResults(session, QUESTIONS, personalAdjustments({ histories: [{ menuName: top, createdAt: yesterday }], favorites: [] }, now));
    expect(adjusted[0].item.name).not.toBe(top);
  });

  it('즐겨찾기한 메뉴는 같은 점수의 다른 메뉴보다 앞선다', () => {
    const session = answered();
    const plain = getResults(session, QUESTIONS, {}, 10);
    // 1위와 점수가 같은 다른 메뉴가 있으면 그 메뉴를, 없으면 2위를 즐겨찾기
    const target = plain.find((r, i) => i > 0 && r.score === plain[0].score) ?? plain[1];
    const adjusted = getResults(session, QUESTIONS, personalAdjustments({ histories: [], favorites: [{ menuName: target.item.name }] }, now), 10);
    expect(adjusted.findIndex(r => r.item.name === target.item.name)).toBeLessThan(plain.findIndex(r => r.item.name === target.item.name));
  });
});
