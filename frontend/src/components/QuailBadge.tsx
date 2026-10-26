import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

type Props = {
  /** 동그라미 지름. 안의 메추리도 같이 커진다 */
  size?: number;
  /** 동그라미 바탕색. 기본은 테마색의 연한 톤 */
  background?: string;
};

/**
 * 탐정 메추리 "추리"를 동그라미 안에 작게 그린 배지. 이미지 에셋이 생기기 전까지 도형으로 그린다.
 * 홈 카드, 추리 질문 카드, 내정보 프로필에 같은 모양으로 쓴다.
 */
export default function QuailBadge({ size = 44, background = colors.brandSoft }: Props) {
  const s = size / 44;
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.plume, { fontSize: 13 * s, lineHeight: 15 * s, top: 3 * s, left: 19 * s }]}>?</Text>
      <View style={[styles.body, { width: 26 * s, height: 26 * s, borderRadius: 13 * s, top: 12 * s, left: 9 * s }]} />
      <View style={[styles.eye, { width: 4 * s, height: 4 * s, borderRadius: 2 * s, top: 21 * s, left: 25 * s }]} />
      <View
        style={[
          styles.beak,
          {
            top: 22 * s,
            left: 34 * s,
            borderTopWidth: 3 * s,
            borderBottomWidth: 3 * s,
            borderLeftWidth: 6 * s,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
