import { StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

export const styles = StyleSheet.create({
  lead: { fontSize: 15, fontFamily: fonts.bold, color: colors.brandText, marginTop: 4, paddingHorizontal: 4 },
  winnerCard: { padding: 0, overflow: 'hidden' },
  winnerImage: { height: 170, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  winnerEmoji: { fontFamily: fonts.body, fontSize: 72 },
  winnerBody: { padding: 20 },
  winnerBadge: { alignSelf: 'flex-start', backgroundColor: colors.brand, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  winnerBadgeText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.onBrand },
  winnerName: { fontSize: 30, lineHeight: 40, letterSpacing: -1, fontFamily: fonts.display, color: colors.ink, marginTop: 8 },
  winnerDesc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 4 },
  waitTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  other: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 4 },
});
