import { StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

export const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
  },
  plume: {
    position: 'absolute',
    fontFamily: fonts.display,
    color: colors.quailDark,
  },
  body: {
    position: 'absolute',
    backgroundColor: colors.quail,
  },
  eye: {
    position: 'absolute',
    backgroundColor: colors.ink,
  },
  beak: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.beak,
  },
});
