import { MENU_DATA, MenuItem } from '../../constants/menuData';
import { AKINATOR_PROPERTIES } from '../../constants/akinatorQuestions';
import {
  applyAnswer,
  buildInitialPool,
  parseAvoidTags,
  pickNextQuestion,
  rankResults,
  shouldStop
} from '../filterEngine';

const byName = (name: string) => MENU_DATA.find(m => m.name === name) as MenuItem;
const question = (id: string) => AKINATOR_PROPERTIES.find(q => q.id === id)!;

describe('buildInitialPool', () => {
  it('제외한 분류와 기피 태그가 걸린 메뉴를 뺀다', () => {
    const pool = buildInitialPool(MENU_DATA, ['양식'], parseAvoidTags('매운맛,해산물'));
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.some(m => m.category === '양식')).toBe(false);
    expect(pool.some(m => m.tags.includes('매운맛') || m.tags.includes('해산물'))).toBe(false);
  });

  it('기피 태그로 후보가 전부 사라지면 기피 태그를 무시한다', () => {
    const pool = buildInitialPool([byName('김치찌개')], [], ['매운맛']);
    expect(pool.map(m => m.name)).toEqual(['김치찌개']);
  });
});

describe('pickNextQuestion', () => {
  it('예/아니오가 가장 반반에 가까운 질문을 고르고, 더 없으면 null', () => {
    const pool = [byName('짜장면'), byName('짬뽕'), byName('김치찌개'), byName('삼겹살')];
    // 면 2 : 나머지 2 로 정확히 반반인 첫 질문
    expect(pickNextQuestion(pool, AKINATOR_PROPERTIES, [])?.id).toBe('isNoodle');
    expect(pickNextQuestion(pool, AKINATOR_PROPERTIES, AKINATOR_PROPERTIES.map(q => q.id))).toBeNull();
    expect(pickNextQuestion([byName('짜장면')], AKINATOR_PROPERTIES, [])).toBeNull();
  });
});

describe('applyAnswer', () => {
  const pool = [byName('짜장면'), byName('김치찌개'), byName('삼겹살')];

  it('예는 맞는 메뉴만, 아니오는 안 맞는 메뉴만, 모르겠음은 그대로 남긴다', () => {
    expect(applyAnswer(pool, question('isNoodle'), 'yes').map(m => m.name)).toEqual(['짜장면']);
    expect(applyAnswer(pool, question('isNoodle'), 'no').map(m => m.name)).toEqual(['김치찌개', '삼겹살']);
    expect(applyAnswer(pool, question('isNoodle'), 'dontknow')).toHaveLength(3);
  });

  it('모순된 답으로 후보가 0개가 되면 이전 후보로 되돌린다', () => {
    const noodles = applyAnswer(pool, question('isNoodle'), 'yes');
    expect(applyAnswer(noodles, question('isNoodle'), 'no').map(m => m.name)).toEqual(['짜장면']);
  });
});

describe('rankResults', () => {
  it('최근 먹은 메뉴는 뒤로, 같은 분류는 조금 뒤로 보낸다', () => {
    const pool = [byName('짜장면'), byName('초밥'), byName('김치찌개')];
    const ranked = rankResults(pool, [{ menuName: '짜장면', category: '중식' }, { menuName: '비빔밥', category: '한식' }]);
    expect(ranked.map(m => m.name)).toEqual(['초밥', '김치찌개', '짜장면']);
  });
});

describe('전체 흐름', () => {
  it('모두 "예"로 답해도 최대 질문 수 안에 결과가 1개 이상 나온다', () => {
    let pool = buildInitialPool(MENU_DATA, [], []);
    const asked: string[] = [];
    let count = 0;
    for (;;) {
      const q = pickNextQuestion(pool, AKINATOR_PROPERTIES, asked);
      if (!q) break;
      count += 1;
      pool = applyAnswer(pool, q, 'yes');
      asked.push(q.id);
      if (shouldStop(pool, count)) break;
    }
    expect(pool.length).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(AKINATOR_PROPERTIES.length);
  });
});
