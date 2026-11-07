import { StyleSheet } from 'react-native';
import { colors, fonts, layout, radii, spacing, typography } from '../theme';

export const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 8,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
  },
  appTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.brand,
  },
  headerButton: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 24,
    paddingHorizontal: 22,
    gap: 18,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingText: {
    flex: 1,
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 37,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  ctaButton: {
    height: layout.buttonHeight,
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.button,
    color: colors.onBrand,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    minHeight: 64,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  listDesc: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  sectionTitleInline: {
    ...typography.heading,
    color: colors.ink,
  },
  rankingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 22,
  },
  rankingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  refreshBtn: {
    minHeight: layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  refreshBtnText: {
    ...typography.caption,
    color: colors.muted,
  },
  rankingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  rankingLoadingText: {
    ...typography.caption,
    color: colors.muted,
    marginLeft: spacing.sm,
  },
  rankingEmptyText: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rankNumber: {
    width: 22,
    fontSize: 15,
    fontFamily: fonts.display,
    color: colors.ink,
    textAlign: 'center',
  },
  rankTop: {
    color: colors.brand,
  },
  rankMenuEmoji: {
    fontSize: 20,
    marginHorizontal: 10,
  },
  rankMenuName: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  rankMenuCategory: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  loginText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    paddingRight: spacing.sm,
  },
  loginGo: {
    color: colors.brandText,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
});
