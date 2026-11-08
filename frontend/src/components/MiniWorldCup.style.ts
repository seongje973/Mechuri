import { StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

export const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  round: { fontSize: 13, fontFamily: fonts.bold, color: colors.brandText, marginBottom: 6 },
  title: { fontSize: 20, fontFamily: fonts.display, color: colors.ink, marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brandSoft,
  },
  emoji: { fontSize: 44, marginBottom: 10 },
  name: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  category: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 },
});
