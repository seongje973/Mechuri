import { StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../../theme';

export const styles = StyleSheet.create({
  code: { fontSize: 44, lineHeight: 56, fontFamily: fonts.display, letterSpacing: 10, color: colors.ink, marginVertical: 4 },
  invite: {
    backgroundColor: colors.brandSoft, borderRadius: radii.sm, minHeight: 48,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  inviteText: { fontSize: 15, fontFamily: fonts.heavy, color: colors.brandText },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.fill },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.brandText },
  name: { flex: 1, fontSize: 15, color: colors.ink, fontFamily: fonts.bold },
  statusPill: { borderRadius: radii.full, backgroundColor: colors.fill, paddingHorizontal: 10, paddingVertical: 4 },
  statusOn: { backgroundColor: colors.brand },
  statusOff: { backgroundColor: colors.chiliSoft },
  status: { fontSize: 12, color: colors.subtle, fontFamily: fonts.bold },
  statusOnText: { color: colors.onBrand },
  statusOffText: { color: colors.chiliText },
  leave: { alignItems: 'center', marginTop: 18, minHeight: 44, justifyContent: 'center' },
  leaveText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textDecorationLine: 'underline' },
});
