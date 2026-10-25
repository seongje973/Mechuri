import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MenuItem } from '../constants/menuData';

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
  round: { fontSize: 13, fontWeight: '700', color: '#F5A623', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#3b2f1e', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#fde7c0',
  },
  emoji: { fontSize: 44, marginBottom: 10 },
  name: { fontSize: 17, fontWeight: '800', color: '#3b2f1e' },
  category: { fontSize: 12, color: '#9a8a74', marginTop: 4 },
});
