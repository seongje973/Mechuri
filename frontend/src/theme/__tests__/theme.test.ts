import { brandThemes, colors, darkColors, fonts, typography } from '..';
import { fontRegistration } from '../fontRegistration';

describe('theme', () => {
  test('다크 팔레트는 라이트와 같은 이름을 갖고 테마색은 그대로다', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(colors).sort());
    expect(darkColors.brand).toBe(colors.brand);
  });

  test('글자 스타일은 App.tsx가 로드하는 글꼴만 쓴다', () => {
    const registered = Object.keys(fontRegistration);
    expect([...registered].sort()).toEqual(Object.values(fonts).sort());
    for (const style of Object.values(typography)) {
      expect(registered).toContain(style.fontFamily);
    }
  });

  test('테마색 후보는 모두 같은 이름을 갖는다', () => {
    const keys = Object.keys(brandThemes.tomato).sort();
    for (const theme of Object.values(brandThemes)) {
      expect(Object.keys(theme).sort()).toEqual(keys);
    }
  });
});
