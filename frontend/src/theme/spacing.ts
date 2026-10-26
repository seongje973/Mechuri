import type { ViewStyle } from 'react-native';
import { colors } from './colors';

/** 간격은 4의 배수 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const layout = {
  /** 화면 좌우 여백 */
  screenPadding: 20,
  buttonHeight: 56,
  answerHeight: 64,
  /** 엄지로 누르기 좋은 최소 크기 */
  minTouch: 44,
  /** 마스코트 최소 크기 */
  mascotMin: 40,
} as const;

/**
 * 최종 조합안은 평평한 흰 카드에 테두리 없이 그림자도 거의 없다.
 * raised/pressed는 누를 때 살짝 어두워지는 정도만, card는 흰 카드 기본 모양.
 */
export const depth = {
  raised: {},
  pressed: { opacity: 0.85 },
  card: { backgroundColor: colors.surface, borderRadius: 24 },
  /** 지도 위 떠 있는 버튼·시트 */
  float: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
} satisfies Record<string, ViewStyle>;
