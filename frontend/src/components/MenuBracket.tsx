import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * 메뉴 2~4개로 하는 작은 토너먼트. 둘씩 붙여서 고르고, 남은 하나가 우승이다.
 * 홀수면 마지막 메뉴는 다음 판으로 바로 올라간다. 같이 정하기 동점 투표(US-28)에서 쓰고,
 * 다른 화면에서도 메뉴 목록만 넘기면 쓸 수 있다.
 */

export interface BracketMenu {
  name: string;
  emoji?: string;
  desc?: string;
}

export interface BracketColors {
  surface: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
}

const DEFAULT_COLORS: BracketColors = { surface: '#FFFFFF', line: '#EAD9C0', ink: '#2E2219', muted: '#75604F', accent: '#F5A623' };

interface Props {
  menus: BracketMenu[];
  onFinish: (winner: BracketMenu) => void;
  colors?: BracketColors;
}

interface BracketState {
  /** 이번 판에 남은 메뉴 */
  round: BracketMenu[];
  /** 이번 판에서 이긴 메뉴 */
  winners: BracketMenu[];
}

export const roundLabel = (size: number) => (size <= 2 ? '결승' : `${size % 2 ? size + 1 : size}강`);

/** 고른 결과로 다음 상태. 우승이 정해지면 winner를 함께 돌려준다 */
export const advanceBracket = (state: BracketState, picked: BracketMenu): BracketState & { winner?: BracketMenu } => {
  const rest = state.round.slice(2);
  let winners = [...state.winners, picked];
  if (rest.length >= 2) return { round: rest, winners };
  winners = [...winners, ...rest]; // 짝이 없는 메뉴는 부전승
  if (winners.length === 1) return { round: [], winners, winner: winners[0] };
  return { round: winners, winners: [] };
};

export default function MenuBracket({ menus, onFinish, colors = DEFAULT_COLORS }: Props) {
  const initial = useMemo<BracketState>(() => ({ round: menus, winners: [] }), [menus]);
  const [state, setState] = useState<BracketState>(initial);
  const [roundSize, setRoundSize] = useState(menus.length);
  const [match, setMatch] = useState(1);

  if (state.round.length < 2) return null;
  const [left, right] = state.round;
  const matchesInRound = Math.floor(roundSize / 2);

  const pick = (menu: BracketMenu) => {
    const next = advanceBracket(state, menu);
    if (next.winner) {
      setState(next);
      onFinish(next.winner);
      return;
    }
    if (next.winners.length === 0) {
      setRoundSize(next.round.length);
      setMatch(1);
    } else {
      setMatch(m => m + 1);
    }
    setState(next);
  };

  const card = (menu: BracketMenu) => (
    <TouchableOpacity
      key={menu.name}
      accessibilityRole="button"
      accessibilityLabel={`${menu.name} 고르기`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
      onPress={() => pick(menu)}
    >
      <Text style={styles.emoji}>{menu.emoji ?? '🍽️'}</Text>
      <Text style={[styles.name, { color: colors.ink }]}>{menu.name}</Text>
      {menu.desc ? <Text style={[styles.desc, { color: colors.muted }]} numberOfLines={2}>{menu.desc}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={[styles.round, { color: colors.accent }]}>
        {roundLabel(roundSize)}{matchesInRound > 1 ? ` ${match}/${matchesInRound}` : ''}
      </Text>
      <View style={styles.row}>
        {card(left)}
        <Text style={[styles.vs, { color: colors.muted }]}>VS</Text>
        {card(right)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { flex: 1, borderRadius: 16, borderWidth: 1, borderBottomWidth: 4, paddingVertical: 18, paddingHorizontal: 10, alignItems: 'center' },
  emoji: { fontSize: 36 },
  name: { fontSize: 17, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  desc: { fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 16 },
  vs: { fontSize: 13, fontWeight: '800', marginHorizontal: 8 },
});
