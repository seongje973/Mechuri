import { StyleSheet } from 'react-native';
import { colors, fonts, layout, radii } from '../../theme';

/** 같이 정하기 화면들이 함께 쓰는 스타일. 홈과 같은 회색 바탕 + 흰 카드, 주 버튼만 테마색 */

export const gs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, lineHeight: 30, letterSpacing: -0.5, fontFamily: fonts.display, color: colors.ink, paddingHorizontal: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20, paddingHorizontal: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 20, marginTop: 12 },
  label: { fontSize: 14, fontFamily: fonts.heavy, color: colors.ink, marginBottom: 10 },
  input: {
    backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.lineStrong,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink, fontFamily: fonts.body,
  },
  primary: {
    backgroundColor: colors.brand, borderRadius: radii.md, minHeight: layout.buttonHeight,
    justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingHorizontal: 16,
  },
  primaryText: { fontSize: 17, fontFamily: fonts.heavy, color: colors.onBrand },
  secondary: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.lineStrong,
    minHeight: layout.buttonHeight, justifyContent: 'center', alignItems: 'center', marginTop: 12, paddingHorizontal: 16,
  },
  secondaryText: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  disabled: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radii.full, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  /** 못 먹는 재료로 고른 칩 */
  chipAvoid: { backgroundColor: colors.chiliSoft, borderColor: colors.chili },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  error: { color: colors.chili, fontFamily: fonts.body, fontSize: 13, marginTop: 10 },
  mascot: { fontSize: 15, color: colors.brandText, fontFamily: fonts.bold, marginTop: 12 },
});
