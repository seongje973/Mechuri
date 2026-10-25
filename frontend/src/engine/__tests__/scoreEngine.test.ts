import { MENU_DATA, MenuItem, getAvoidTags } from '../../constants/menuData';
import { QUESTIONS } from '../../constants/akinatorQuestions';
import { applyScoreAnswer, createScoreSession, rankCandidates } from '../scoreEngine';
import { ANSWER_SCORES } from '../config';

const q = (id: string) => QUESTIONS.find(x => x.id === id)!;
const byName = (name: string) => MENU_DATA.find(m => m.name === name) as MenuItem;

describe('점수 방식 엔진', () => {
  it('답변 4종 점수표대로 점수를 더한다', () => {
    const pool = [byName('짜장면'), byName('김치찌개')]; // 짜장면만 면
    const start = createScoreSession(pool);
    const scoreAfter = (answer: 'yes' | 'probably' | 'dontcare' | 'no') =>
      applyScoreAnswer(start, q('base-noodle'), answer).scores;

    expect(scoreAfter('yes')).toEqual({ 짜장면: 2, 김치찌개: -2 });
    expect(scoreAfter('probably')).toEqual({ 짜장면: 1, 김치찌개: 0 });
    expect(scoreAfter('dontcare')).toEqual({ 짜장면: 0, 김치찌개: 0 });
    expect(scoreAfter('no')).toEqual({ 짜장면: -2, 김치찌개: 1 });
    expect(ANSWER_SCORES.yes).toEqual({ match: 2, miss: -2 });
  });

  it('모순된 답 3개를 넣어도 후보가 0개가 되지 않는다', () => {
    let session = createScoreSession(MENU_DATA);
    session = applyScoreAnswer(session, q('soup'), 'yes');
    session = applyScoreAnswer(session, q('soup'), 'no');
    session = applyScoreAnswer(session, q('cold'), 'yes');
    session = applyScoreAnswer(session, q('cold'), 'no');
    expect(session.candidates).toHaveLength(MENU_DATA.length);
    expect(rankCandidates(session).length).toBe(MENU_DATA.length);
  });

  it('기피 태그가 걸린 메뉴는 점수와 관계없이 결과에 없다', () => {
    let session = createScoreSession(MENU_DATA, { avoidTags: ['해산물', '매운맛'] });
    // 해산물 메뉴에 유리한 답만 골라도
    session = applyScoreAnswer(session, q('raw'), 'yes');
    session = applyScoreAnswer(session, q('spicy'), 'yes');
    session = applyScoreAnswer(session, q('cuisine-japanese'), 'yes');
    const ranked = rankCandidates(session);
    expect(ranked.length).toBeGreaterThan(0);
    ranked.forEach(r => {
      expect(getAvoidTags(r.item).some(t => t === '해산물' || t === '매운맛')).toBe(false);
    });
  });

  it('제외한 나라별 분류는 후보에서 빠진다', () => {
    const session = createScoreSession(MENU_DATA, { excludedCategories: ['양식', '분식'] });
    expect(session.candidates.some(m => m.category === '양식' || m.category === '분식')).toBe(false);
  });

  it('점수를 올리고 내린 근거를 메뉴별로 남긴다 (0점 변화는 남기지 않음)', () => {
    let session = createScoreSession([byName('짬뽕'), byName('돈까스')]);
    session = applyScoreAnswer(session, q('soup'), 'yes');
    session = applyScoreAnswer(session, q('spicy'), 'dontcare');
    session = applyScoreAnswer(session, q('spicy'), 'probably');

    expect(session.contributions['짬뽕']).toEqual([
      { questionId: 'soup', answer: 'yes', matched: true, delta: 2 },
      { questionId: 'spicy', answer: 'probably', matched: true, delta: 1 },
    ]);
    expect(session.contributions['돈까스']).toEqual([{ questionId: 'soup', answer: 'yes', matched: false, delta: -2 }]);
    expect(session.answers.map(a => a.answer)).toEqual(['yes', 'dontcare', 'probably']);
  });

  it('점수 높은 순으로 정렬하고, 동점은 메뉴 데이터 순서를 지킨다', () => {
    let session = createScoreSession(MENU_DATA);
    session = applyScoreAnswer(session, q('base-noodle'), 'yes');
    session = applyScoreAnswer(session, q('soup'), 'yes');
    session = applyScoreAnswer(session, q('spicy'), 'yes');
    const ranked = rankCandidates(session);
    expect(ranked[0].item.name).toBe('짬뽕'); // 면 + 국물 + 매운맛을 모두 가진 첫 메뉴
    expect(ranked[0].score).toBe(6);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
    expect(rankCandidates(session).map(r => r.item.name)).toEqual(ranked.map(r => r.item.name));
  });

  it('이전 상태를 바꾸지 않는다', () => {
    const start = createScoreSession(MENU_DATA);
    applyScoreAnswer(start, q('soup'), 'yes');
    expect(Object.values(start.scores).every(s => s === 0)).toBe(true);
    expect(start.answers).toEqual([]);
  });
});
