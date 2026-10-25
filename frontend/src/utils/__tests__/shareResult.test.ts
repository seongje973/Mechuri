import { Alert, Share } from 'react-native';
import { buildShareMessage, shareResult } from '../shareResult';

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

describe('shareResult', () => {
  afterEach(() => jest.restoreAllMocks());

  it('공유 시트가 실패하면 알림을 띄운다', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('nope'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await shareResult({ name: '김밥', emoji: '🍙' }, []);
    expect(alert).toHaveBeenCalled();
  });
});
