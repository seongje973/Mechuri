import { StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

export const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { fontSize: 14, fontFamily: fonts.bold, color: colors.muted },
  timer: { fontSize: 14, fontFamily: fonts.bold, color: colors.brandText },
  bar: { height: 8, borderRadius: 999, backgroundColor: colors.fill, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.brand },
  questionCard: { paddingVertical: 28, alignItems: 'center' },
  mascot: { fontSize: 13, color: colors.brandText, fontFamily: fonts.bold },
  question: { fontSize: 22, fontFamily: fonts.display, color: colors.ink, textAlign: 'center', marginTop: 10, lineHeight: 30 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  link: { padding: 8 },
  linkText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textDecorationLine: 'underline' },
});
