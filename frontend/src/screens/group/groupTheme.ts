import { StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

/** 같이 정하기 화면들이 함께 쓰는 스타일. 색과 글꼴은 src/theme 토큰을 쓴다 */

export const gs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: fonts.display, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 16 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.muted, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink,
  },
  primary: {
    backgroundColor: colors.yolk, borderRadius: 16, borderBottomWidth: 4, borderBottomColor: colors.yolkDeep,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  primaryText: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  secondary: {
    backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, borderBottomWidth: 4,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  secondaryText: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  disabled: { opacity: 0.45 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.shell, borderColor: colors.quail },
  chipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  error: { color: colors.chili, fontFamily: fonts.body, fontSize: 13, marginTop: 10 },
  mascot: { fontSize: 15, color: colors.feather, fontFamily: fonts.bold, marginTop: 12 },
});
