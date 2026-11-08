import { StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../theme';

export const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  grabber: { width: 44, height: 5, borderRadius: radii.full, backgroundColor: colors.line, marginBottom: 16 },
  mascot: { fontSize: 44, marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, textAlign: 'center', marginBottom: 8 },
  body: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 22, color: colors.muted, textAlign: 'center', marginBottom: 22 },
  kakaoBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.kakao,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  kakaoText: { fontFamily: fonts.bold, fontSize: 16, color: colors.kakaoText },
  devBtn: { marginTop: 14, padding: 6 },
  devText: { fontFamily: fonts.body, fontSize: 13, color: colors.brandText, textDecorationLine: 'underline' },
  laterBtn: { marginTop: 10, padding: 8 },
  laterText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
});
