import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MenuItem } from '../constants/menuData';
import { colors, fonts } from '../theme';

interface MiniWorldCupProps {
  /** 2개 이상 짝수 권장. 홀수면 마지막 메뉴는 부전승 */
  menus: MenuItem[];
  title?: string;
  onWinner: (menu: MenuItem) => void;
}

const roundLabel = (size: number) => (size <= 2 ? '결승' : `${size}강`);

/** 몇 개 안 되는 후보를 1:1로 골라 하나를 남긴다. "틀렸어요" 두 번째 (US-15)와 같이 정하기 투표 (US-28)에서 쓴다 */
export default function MiniWorldCup({ menus, title = '둘 중 하나만 골라 주세요', onWinner }: MiniWorldCupProps) {
  const [round, setRound] = useState<MenuItem[]>(menus);
  const [winners, setWinners] = useState<MenuItem[]>([]);
  const [index, setIndex] = useState(0);

  const pick = (menu: MenuItem) => {
    const nextWinners = [...winners, menu];
    let nextIndex = index + 2;
    // 짝이 없는 마지막 메뉴는 그대로 다음 판으로
    if (nextIndex === round.length - 1) {
      nextWinners.push(round[nextIndex]);
      nextIndex += 1;
    }
    if (nextIndex < round.length) {
      setWinners(nextWinners);
      setIndex(nextIndex);
      return;
    }
    if (nextWinners.length === 1) {
      onWinner(nextWinners[0]);
      return;
    }
    setRound(nextWinners);
    setWinners([]);
    setIndex(0);
  };

  const pair = round.slice(index, index + 2);
  if (pair.length < 2) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.round}>{roundLabel(round.length)} · {index / 2 + 1}번째</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {pair.map(menu => (
          <TouchableOpacity key={menu.name} style={styles.card} onPress={() => pick(menu)} activeOpacity={0.85}>
            <Text style={styles.emoji}>{menu.emoji}</Text>
            <Text style={styles.name}>{menu.name}</Text>
            <Text style={styles.category}>{menu.category}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  round: { fontSize: 13, fontFamily: fonts.bold, color: colors.feather, marginBottom: 6 },
  title: { fontSize: 20, fontFamily: fonts.display, color: colors.ink, marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.yolkSoft,
  },
  emoji: { fontSize: 44, marginBottom: 10 },
  name: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  category: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 },
});
