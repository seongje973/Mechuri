import type { TextStyle } from 'react-native';

/**
 * 글꼴 이름. App.tsx가 expo-font로 로드한 이름과 같아야 한다.
 * 안드로이드는 커스텀 글꼴에서 fontWeight를 무시하므로 굵기마다 다른 이름을 쓴다.
 */
export const fonts = {
  /** 큰 제목, 메뉴 이름, 추리의 질문 */
  display: 'NotoSansKR_900Black',
  /** 소제목, 강조 버튼 */
  heavy: 'NotoSansKR_800ExtraBold',
  /** 본문 */
  body: 'NotoSansKR_400Regular',
  medium: 'NotoSansKR_500Medium',
  /** 버튼, 소제목 */
  bold: 'NotoSansKR_700Bold',
} as const;

/** 최종 조합안 타이포그래피 (크기/줄높이). 제목은 자간을 조금 좁힌다 */
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  button: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 24 },
  /** 4단계 답변 버튼(응/아마도/상관없어/아니) */
  answer: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 24 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
