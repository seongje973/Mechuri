import { StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../theme';

export const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: 12,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: radii.full, backgroundColor: colors.line, marginBottom: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 36 },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, textAlign: 'center', marginBottom: 8 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', marginBottom: 8 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 18, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.brandDeep },
  chipText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  chipTextOn: { fontFamily: fonts.bold },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 8 },
  saveBtn: {
    marginTop: 26,
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: { fontFamily: fonts.heavy, fontSize: 16, color: colors.onBrand },
  disabled: { opacity: 0.6 },
  error: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.chiliText, textAlign: 'center', marginVertical: 24 },
  laterBtn: { marginTop: 10, padding: 8, alignItems: 'center' },
  laterText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted },
});
