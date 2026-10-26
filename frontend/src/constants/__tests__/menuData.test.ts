import * as fs from 'fs';
import * as path from 'path';
import { MENU_DATA, CUISINES, getAvoidTags, SPICY_TAG_LEVEL } from '../menuData';
import { QUESTIONS, matchesQuestion } from '../akinatorQuestions';
import { checkMenu, MIN_MENUS, MIN_PER_CUISINE } from '../../../scripts/checkMenu';

const ALLOWED = {
  base: ['rice', 'noodle', 'bread', 'meat', 'etc'],
  spicy: [0, 1, 2, 3],
  temperature: ['hot', 'cold'],
  weight: ['light', 'normal', 'heavy'],
  price: ['low', 'mid', 'high'],
  serving: ['dine_in', 'delivery', 'both'],
  party: ['solo', 'group'],
  avoidTags: ['밀가루', '메밀', '유제품', '달걀', '갑각류', '해산물', '견과류', '날것', '돼지고기', '소고기', '닭고기', '오이', '가지', '고수'],
};

describe('메뉴 데이터 v2', () => {
  it('모든 메뉴가 속성 10가지를 기준표의 값으로 갖고 있다', () => {
    MENU_DATA.forEach(item => {
      const where = `${item.name}`;
      expect([where, CUISINES.includes(item.category)]).toEqual([where, true]);
      expect([where, ALLOWED.base.includes(item.base)]).toEqual([where, true]);
      expect([where, typeof item.soup]).toEqual([where, 'boolean']);
      expect([where, ALLOWED.spicy.includes(item.spicy)]).toEqual([where, true]);
      expect([where, ALLOWED.temperature.includes(item.temperature)]).toEqual([where, true]);
      expect([where, ALLOWED.weight.includes(item.weight)]).toEqual([where, true]);
      expect([where, ALLOWED.price.includes(item.price)]).toEqual([where, true]);
      expect([where, ALLOWED.serving.includes(item.serving)]).toEqual([where, true]);
      expect([where, ALLOWED.party.includes(item.party)]).toEqual([where, true]);
      expect([where, item.avoidTags.every(t => ALLOWED.avoidTags.includes(t))]).toEqual([where, true]);
      expect([where, item.name.length > 0 && item.emoji.length > 0 && item.desc.length > 0]).toEqual([where, true]);
    });
  });

  it('메뉴 이름이 겹치지 않고, 100개 이상이다', () => {
    const names = MENU_DATA.map(m => m.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(100);
  });

  it('나라별 분류 6개가 모두 8개 이상이다', () => {
    CUISINES.forEach(cuisine => {
      const count = MENU_DATA.filter(m => m.category === cuisine).length;
      expect([cuisine, count >= 8]).toEqual([cuisine, true]);
    });
  });

  it('분식·아시안으로 재분류했다', () => {
    const byName = Object.fromEntries(MENU_DATA.map(m => [m.name, m]));
    expect(byName['떡볶이'].category).toBe('분식');
    expect(byName['쌀국수'].category).toBe('아시안');
    expect(byName['팟타이'].category).toBe('아시안');
  });

  it('맵기 2 이상이면 매운맛 기피 태그가 자동으로 붙는다', () => {
    MENU_DATA.forEach(item => {
      expect(getAvoidTags(item).includes('매운맛')).toBe(item.spicy >= SPICY_TAG_LEVEL);
    });
  });
});

describe('속성 기반 질문', () => {
  it('질문 정의에 메뉴 이름이 하나도 없다', () => {
    const source = fs.readFileSync(path.join(__dirname, '../akinatorQuestions.ts'), 'utf8');
    const found = MENU_DATA.map(m => m.name).filter(name => source.includes(`'${name}'`));
    expect(found).toEqual([]);
  });

  it('질문 id가 겹치지 않고, 모든 질문이 메뉴를 "예"와 "아니오"로 나눈다', () => {
    expect(new Set(QUESTIONS.map(q => q.id)).size).toBe(QUESTIONS.length);
    QUESTIONS.forEach(q => {
      const yes = MENU_DATA.filter(item => matchesQuestion(item, q)).length;
      expect([q.id, yes > 0 && yes < MENU_DATA.length]).toEqual([q.id, true]);
    });
  });

  it('상황 질문과 취향 질문이 구분돼 있다', () => {
    expect(QUESTIONS.filter(q => q.kind === 'situation').map(q => q.attribute).sort()).toEqual(['party', 'price', 'serving']);
  });
});

describe('메뉴 데이터 검사 (check:menu)', () => {
  it('현재 데이터는 오류도 확인 필요도 없다', () => {
    expect(checkMenu()).toEqual([]);
  });

  it('누락·이상값·중복·개수 부족을 오류로 잡는다', () => {
    const base = MENU_DATA[0];
    const broken = [
      { ...base, desc: '' },
      { ...base, name: '이상한 메뉴', spicy: 5, serving: 'takeout', avoidTags: ['매운맛', '땅콩'] },
      { ...base },
    ] as unknown as typeof MENU_DATA;
    const messages = checkMenu(broken).filter(i => i.level === 'error').map(i => `${i.menu}: ${i.message}`);
    expect(messages).toEqual(expect.arrayContaining([
      expect.stringContaining('desc가 비어 있음'),
      expect.stringContaining("spicy '5'"),
      expect.stringContaining("serving 'takeout'"),
      expect.stringContaining("'매운맛'은"),
      expect.stringContaining("'땅콩'"),
      expect.stringContaining('이름이 겹침'),
      expect.stringContaining(`${MIN_MENUS}개 이상`),
      expect.stringContaining(`${MIN_PER_CUISINE}개 이상`),
    ]));
  });

  it('밀가루 태그 없는 면 요리는 확인 필요로 알린다', () => {
    const noodle = { ...MENU_DATA[0], name: '새 국수', base: 'noodle' as const, avoidTags: [] };
    expect(checkMenu([noodle]).filter(i => i.level === 'warning').map(i => i.menu)).toEqual(['새 국수']);
  });
});
