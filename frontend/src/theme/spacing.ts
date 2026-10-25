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
 * 그림자 대신 "아래로 눌린 두께": 아래쪽에 짙은 4px 테두리.
 * 누르면 테두리가 1px로 줄고 그만큼 내려간다.
 */
export const depth = {
  raised: { borderBottomWidth: 4, borderBottomColor: colors.yolkDeep },
  pressed: { borderBottomWidth: 1, borderBottomColor: colors.yolkDeep, transform: [{ translateY: 2 }] },
  card: { borderWidth: 1, borderColor: colors.line, borderBottomWidth: 4 },
} satisfies Record<string, ViewStyle>;
