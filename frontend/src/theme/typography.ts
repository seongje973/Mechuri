import type { TextStyle } from 'react-native';

/**
 * 글꼴 이름. App.tsx가 expo-font로 로드한 이름과 같아야 한다.
 * 안드로이드는 커스텀 글꼴에서 fontWeight를 무시하므로 굵기마다 다른 이름을 쓴다.
 */
export const fonts = {
  /** 제목과 추리의 대사 */
  display: 'Jua_400Regular',
  /** 본문 */
  body: 'NotoSansKR_400Regular',
  medium: 'NotoSansKR_500Medium',
  /** 버튼, 소제목 */
  bold: 'NotoSansKR_700Bold',
} as const;

/** 디자인 가이드 03 · 타이포그래피 (크기/줄높이) */
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  button: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  /** 4단계 답변 버튼(응/아마도/상관없어/아니) */
  answer: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
