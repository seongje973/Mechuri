import { MENU_DATA, MenuItem } from '../../constants/menuData';
import { QUESTIONS, Question } from '../../constants/akinatorQuestions';
import { createScoreSession } from '../scoreEngine';
import { MAX_QUESTIONS, ScoreAnswer } from '../config';
import {
  RecommendSession,
  answerQuestion,
  getResults,
  pickNextQuestion,
  shouldStop,
  toRecommendSession,
} from '../recommendFlow';

const q = (id: string) => QUESTIONS.find(x => x.id === id)!;
const byName = (name: string) => MENU_DATA.find(m => m.name === name) as MenuItem;
const start = (menus: MenuItem[] = MENU_DATA) => toRecommendSession(createScoreSession(menus));

/** 답을 고르는 함수로 끝까지 진행하고 물어본 질문 id를 돌려준다 */
const run = (choose: (q: Question, i: number) => ScoreAnswer, session: RecommendSession = start()) => {
  const asked: string[] = [];
  while (!shouldStop(session, QUESTIONS)) {
    const next = pickNextQuestion(session, QUESTIONS)!;
    session = answerQuestion(session, next, choose(next, asked.length));
    asked.push(next.id);
  }
  return { session, asked };
};

describe('다음 질문 고르기 (US-11)', () => {
  it('상황 질문 2개를 먼저 묻고, 그다음 취향 질문', () => {
    const { asked } = run(() => 'dontcare');
    expect(asked.slice(0, 2)).toEqual(['party-solo', 'serving-delivery']);
    expect(asked.slice(2).every(id => q(id).kind === 'taste')).toBe(true);
  });

  it('상황 질문은 필터: 혼자면 2인 이상 메뉴, 배달이면 매장 전용 메뉴가 빠진다', () => {
    let s = start();
    s = answerQuestion(s, q('party-solo'), 'yes');
    s = answerQuestion(s, q('serving-delivery'), 'yes');
    expect(s.candidates.some(m => m.party === 'group' || m.serving === 'dine_in')).toBe(false);
    expect(s.candidates.length).toBeGreaterThan(0);
    expect(s.situationReasons).toEqual(['혼밥 가능', '배달 OK']);
  });

  it('상황 필터로 후보가 0개가 되면 거르지 않는다', () => {
    let s = start([byName('삼겹살')]); // 2인 이상 메뉴만
    s = answerQuestion(s, q('party-solo'), 'yes');
    expect(s.candidates.map(m => m.name)).toEqual(['삼겹살']);
  });

  it('같은 답 순서면 같은 질문 순서가 나온다', () => {
    const answers: ScoreAnswer[] = ['yes', 'no', 'yes', 'probably', 'no', 'yes', 'dontcare'];
    const first = run((_, i) => answers[i % answers.length]).asked;
    const second = run((_, i) => answers[i % answers.length]).asked;
    expect(second).toEqual(first);
  });

  it('무작위 답 100회 시뮬레이션: 평균 질문 수 7개 이하, 매번 결과 3개와 이유가 나온다', () => {
    let seed = 42;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const options: ScoreAnswer[] = ['yes', 'probably', 'dontcare', 'no'];
    let totalQuestions = 0;
    for (let i = 0; i < 100; i++) {
      const { session, asked } = run(() => options[Math.floor(random() * options.length)]);
      totalQuestions += asked.length;
      const results = getResults(session, QUESTIONS);
      expect(results).toHaveLength(3);
      results.forEach(r => expect(r.reasons.length).toBeGreaterThan(0));
    }
    expect(totalQuestions / 100).toBeLessThanOrEqual(MAX_QUESTIONS);
  });
});

describe('멈추는 조건 (US-12)', () => {
  it('1위가 2위보다 3점 이상 앞서면 멈춘다', () => {
    let s = start([byName('짬뽕'), byName('짜장면'), byName('돈까스')]);
    expect(shouldStop(s, QUESTIONS)).toBe(false);
    s = answerQuestion(s, q('spicy'), 'yes'); // 짬뽕 +2, 나머지 -2 → 4점 차
    expect(shouldStop(s, QUESTIONS)).toBe(true);
  });

  it('7문항을 답하면 멈춘다', () => {
    const { session } = run(() => 'dontcare');
    expect(session.answers.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    let s = start();
    QUESTIONS.filter(x => x.kind === 'taste').slice(0, MAX_QUESTIONS).forEach(x => (s = answerQuestion(s, x, 'dontcare')));
    expect(shouldStop(s, QUESTIONS)).toBe(true);
  });

  it('더 물어볼 질문이 없으면 멈춘다', () => {
    // 속성이 완전히 같은 두 메뉴는 어떤 질문으로도 나눌 수 없다
    const a = byName('규동');
    const s = start([a, { ...a, name: '규동 곱빼기' }]);
    expect(pickNextQuestion(s, QUESTIONS)).toBeNull();
    expect(shouldStop(s, QUESTIONS)).toBe(true);
  });
});

describe('결과와 추천 이유 (US-12)', () => {
  it('1위 + 대안 2개를 주고, 이유 칩은 실제로 점수를 올린 답에서 나온다', () => {
    let s = start();
    s = answerQuestion(s, q('soup'), 'yes');
    s = answerQuestion(s, q('spicy'), 'no');
    s = answerQuestion(s, q('base-rice'), 'yes');
    const results = getResults(s, QUESTIONS);
    expect(results).toHaveLength(3);

    const top = results[0];
    expect(top.item.soup).toBe(true);
    expect(top.item.spicy).toBeLessThan(2);
    expect(top.item.base).toBe('rice');
    expect(top.reasons).toEqual(['국물 O', '밥', '안 매운 맛']);
    // 칩마다 그 메뉴의 양(+) 점수 근거가 있다
    results.forEach(r => {
      expect(r.contributions.filter(c => c.delta > 0).length).toBeGreaterThanOrEqual(Math.min(r.reasons.length, 1));
    });
  });

  it('점수 보정(최근 먹은 메뉴 감점 등)을 더해 순위를 매긴다', () => {
    let s = start([byName('김치찌개'), byName('된장찌개'), byName('육개장'), byName('순대국밥')]);
    s = answerQuestion(s, q('soup'), 'yes');
    const before = getResults(s, QUESTIONS).map(r => r.item.name);
    const after = getResults(s, QUESTIONS, { [before[0]]: -2 }).map(r => r.item.name);
    expect(after[0]).not.toBe(before[0]);
  });

  it('아무 답도 점수를 올리지 않았으면 나라별 분류를 이유로 보여준다', () => {
    const results = getResults(start(), QUESTIONS);
    results.forEach(r => expect(r.reasons).toEqual([r.item.category]));
  });
});
