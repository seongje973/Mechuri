import * as fs from 'fs';
import * as path from 'path';
import { MENU_DATA, CUISINES, getAvoidTags, SPICY_TAG_LEVEL } from '../menuData';
import { QUESTIONS, matchesQuestion } from '../akinatorQuestions';

const ALLOWED = {
  base: ['rice', 'noodle', 'bread', 'meat', 'etc'],
  spicy: [0, 1, 2, 3],
  temperature: ['hot', 'cold'],
  weight: ['light', 'normal', 'heavy'],
  price: ['low', 'mid', 'high'],
  serving: ['dine_in', 'delivery', 'both'],
  party: ['solo', 'group'],
  avoidTags: ['밀가루', '해산물', '날것', '오이', '가지'],
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

  it('메뉴 이름이 겹치지 않고, 기존 50개가 모두 있다', () => {
    const names = MENU_DATA.map(m => m.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(50);
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
