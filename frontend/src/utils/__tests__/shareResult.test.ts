import { buildShareMessage } from '../shareResult';

describe('buildShareMessage', () => {
  it('메뉴와 이유를 담는다', () => {
    const msg = buildShareMessage({ name: '김치찌개', emoji: '🍲' }, ['한식', '국물 O']);
    expect(msg).toContain('오늘 메뉴는 🍲 김치찌개!');
    expect(msg).toContain('이유: 한식 · 국물 O');
  });

  it('이유가 없으면 이유 줄을 뺀다', () => {
    expect(buildShareMessage({ name: '김밥', emoji: '🍙' }, [])).not.toContain('이유');
  });
});
