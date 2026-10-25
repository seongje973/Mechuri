import { colors, darkColors, fonts, typography } from '..';
import { fontRegistration } from '../fontRegistration';

describe('theme', () => {
  test('다크 팔레트는 라이트와 같은 이름을 갖고 노른자는 그대로다', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(colors).sort());
    expect(darkColors.yolk).toBe(colors.yolk);
  });

  test('글자 스타일은 App.tsx가 로드하는 글꼴만 쓴다', () => {
    const registered = Object.keys(fontRegistration);
    expect([...registered].sort()).toEqual(Object.values(fonts).sort());
    for (const style of Object.values(typography)) {
      expect(registered).toContain(style.fontFamily);
    }
  });
});
